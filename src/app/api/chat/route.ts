import type Groq from "groq-sdk";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { groq, MODELS, aiEnabled } from "@/services/ai/groq";
import { buildSnapshot } from "@/services/ai/context";
import { SYSTEM_PROMPT, renderSnapshot } from "@/services/ai/prompts";
import { tools, runTool } from "@/services/ai/tools";
import { chatSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const maxDuration = 30;

type Message = Groq.Chat.Completions.ChatCompletionMessageParam;

/** Una sola ronda de herramientas: suficiente para responder, imposible de ciclar. */
const MAX_TOOL_ROUNDS = 1;

/** Límite por usuario y hora. Existe desde el día uno aunque haya un solo usuario. */
const HOURLY_LIMIT = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("No autorizado", { status: 401 });
  const userId = session.user.id;

  // Degradación elegante: sin clave de Groq el resto de la app sigue viva.
  if (!aiEnabled()) {
    return new Response("El asistente no está configurado todavía.", { status: 503 });
  }

  const parsed = chatSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Formato inválido", { status: 400 });

  const recent = await prisma.chatMessage.count({
    where: { userId, role: "USER", createdAt: { gte: new Date(Date.now() - 3_600_000) } },
  });
  if (recent >= HOURLY_LIMIT) {
    return new Response("Demasiadas consultas por ahora. Inténtalo en un rato.", { status: 429 });
  }

  const snapshot = await buildSnapshot(userId);
  const history = parsed.data.messages.slice(-8); // ventana corta
  const lastUser = [...history].reverse().find((m) => m.role === "user");

  const conversation: Message[] = [
    { role: "system", content: SYSTEM_PROMPT.replace("{{SNAPSHOT}}", renderSnapshot(snapshot)) },
    ...history.map((m) => ({ role: m.role, content: m.content }) as Message),
  ];

  if (lastUser) {
    await prisma.chatMessage.create({
      data: { userId, role: "USER", content: lastUser.content },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));
      let answer = "";

      try {
        for (let round = 0; ; round++) {
          const useTools = round < MAX_TOOL_ROUNDS;

          const completion = await groq.chat.completions.create({
            model: MODELS.chat,
            stream: true,
            temperature: 0.4,
            max_tokens: 800,
            messages: conversation,
            ...(useTools && { tools, tool_choice: "auto" as const }),
          });

          /*
           * El streaming entrega las llamadas a herramienta troceadas: cada
           * delta trae un fragmento de los argumentos JSON, identificado por
           * `index`. Hay que reensamblarlos antes de poder ejecutar nada.
           */
          const calls: Array<{ id: string; name: string; args: string }> = [];

          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta;

            for (const call of delta?.tool_calls ?? []) {
              const slot = (calls[call.index] ??= { id: "", name: "", args: "" });
              if (call.id) slot.id = call.id;
              if (call.function?.name) slot.name = call.function.name;
              if (call.function?.arguments) slot.args += call.function.arguments;
            }

            const text = delta?.content ?? "";
            if (text) {
              answer += text;
              send(text);
            }
          }

          const pending = calls.filter((c) => c?.name);
          if (pending.length === 0) break;

          conversation.push({
            role: "assistant",
            content: answer || null,
            tool_calls: pending.map((c) => ({
              id: c.id,
              type: "function" as const,
              function: { name: c.name, arguments: c.args || "{}" },
            })),
          } as Message);

          for (const call of pending) {
            let result: unknown;
            try {
              const args = call.args ? JSON.parse(call.args) : {};
              // El userId se inyecta desde la sesión, jamás desde el modelo.
              result = await runTool(call.name, args, userId);
            } catch {
              result = { ok: false, error: "La herramienta falló" };
            }
            conversation.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify(result),
            } as Message);
          }
        }

        if (answer.trim()) {
          await prisma.chatMessage.create({
            data: { userId, role: "ASSISTANT", content: answer },
          });
        }
      } catch (err) {
        // Se registra en el servidor: si esto se traga en silencio, un fallo
        // del proveedor es indistinguible de una respuesta vacia.
        console.error("[chat]", err);
        send("\n\nSe interrumpió la respuesta. Vuelve a intentarlo.");
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      // Evita que un proxy intermedio acumule la respuesta y anule el streaming.
      "X-Accel-Buffering": "no",
    },
  });
}
