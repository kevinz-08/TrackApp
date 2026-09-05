import type Groq from "groq-sdk";
import { groq, MODELS } from "@/services/ai/groq";
import { runTool, toolsFor } from "@/services/ai/tools/registry";
import type { ToolContext } from "@/services/ai/tools/define";

export type Message = Groq.Chat.Completions.ChatCompletionMessageParam;

/**
 * Dos rondas, no una.
 *
 * Con una sola el modelo podía consultar o actuar, pero no encadenar: "¿cuánto
 * llevo en comida? y regístrame el almuerzo de 20 mil" necesita dos. Dos cubre
 * lo que se ve en la práctica y sigue acotando el gasto de forma dura — el
 * bucle no puede ciclar porque el freno es un contador, no una heurística.
 */
const MAX_TOOL_ROUNDS = 2;

export type AgentEvent =
  { type: "text"; value: string } | { type: "tool"; name: string; ok: boolean };

export type AgentUsage = { promptTokens: number; completionTokens: number; rounds: number };

/**
 * El bucle de razonamiento, independiente del transporte.
 *
 * Es un generador asíncrono y no un `ReadableStream` porque tiene dos
 * consumidores con necesidades distintas: el chat convierte cada evento en
 * bytes para el navegador, y el trabajo proactivo del cron acumula el texto y
 * descarta el resto. Con un stream habría que duplicar el bucle; así el bucle
 * es uno y la diferencia vive en quien lo consume.
 *
 * El valor de retorno del generador es la respuesta completa junto al consumo;
 * se obtiene del `value` del último `next()`, no de los eventos.
 */
export async function* runAgent(
  conversation: Message[],
  ctx: ToolContext,
  options: { model?: string; temperature?: number; maxTokens?: number } = {},
): AsyncGenerator<AgentEvent, { answer: string; usage: AgentUsage }> {
  const tools = toolsFor(ctx.route);
  const usage: AgentUsage = { promptTokens: 0, completionTokens: 0, rounds: 0 };
  let answer = "";

  for (let round = 0; ; round++) {
    usage.rounds = round + 1;
    const useTools = round < MAX_TOOL_ROUNDS && tools.length > 0;

    const completion = await groq.chat.completions.create({
      model: options.model ?? MODELS.chat,
      stream: true,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 800,
      messages: conversation,
      ...(useTools && { tools, tool_choice: "auto" as const }),
    });

    /*
     * El streaming entrega las llamadas a herramienta troceadas: cada delta
     * trae un fragmento de los argumentos JSON, identificado por `index`. Hay
     * que reensamblarlos antes de poder ejecutar nada.
     */
    const calls: Array<{ id: string; name: string; args: string }> = [];
    let roundText = "";

    for await (const chunk of completion) {
      // El consumo llega en el último chunk, fuera de `choices`. Es la única
      // vía de saber lo que cuesta una conversación sin estimar tokens a mano.
      const chunkUsage = (
        chunk as { x_groq?: { usage?: { prompt_tokens?: number; completion_tokens?: number } } }
      ).x_groq?.usage;
      if (chunkUsage) {
        usage.promptTokens += chunkUsage.prompt_tokens ?? 0;
        usage.completionTokens += chunkUsage.completion_tokens ?? 0;
      }

      const delta = chunk.choices[0]?.delta;

      for (const call of delta?.tool_calls ?? []) {
        const slot = (calls[call.index] ??= { id: "", name: "", args: "" });
        if (call.id) slot.id = call.id;
        if (call.function?.name) slot.name = call.function.name;
        if (call.function?.arguments) slot.args += call.function.arguments;
      }

      const text = delta?.content ?? "";
      if (text) {
        roundText += text;
        answer += text;
        yield { type: "text", value: text };
      }
    }

    const pending = calls.filter((c) => c?.name);
    if (pending.length === 0) return { answer, usage };

    conversation.push({
      role: "assistant",
      content: roundText || null,
      tool_calls: pending.map((c) => ({
        id: c.id,
        type: "function" as const,
        function: { name: c.name, arguments: c.args || "{}" },
      })),
    } as Message);

    for (const call of pending) {
      let outcome;
      try {
        const args = call.args ? JSON.parse(call.args) : {};
        // El userId se inyecta desde la sesión, jamás desde el modelo.
        outcome = await runTool(call.name, args, ctx);
      } catch {
        // JSON malformado del modelo: no es un fallo de la herramienta, y el
        // mensaje tiene que decírselo para que reintente bien.
        outcome = { ok: false as const, error: "Los argumentos no son JSON válido" };
      }

      yield { type: "tool", name: call.name, ok: outcome.ok };
      conversation.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(outcome),
      } as Message);
    }
  }
}

/**
 * Recorre el agente hasta el final y devuelve solo el resultado.
 * Para consumidores que no muestran nada mientras piensa, como el cron.
 */
export async function runAgentToCompletion(conversation: Message[], ctx: ToolContext) {
  const it = runAgent(conversation, ctx);
  let step = await it.next();
  while (!step.done) step = await it.next();
  return step.value;
}
