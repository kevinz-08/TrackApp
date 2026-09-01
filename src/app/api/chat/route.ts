import { auth } from "@/auth";
import { groq, MODELS, aiEnabled } from "@/services/ai/groq";
import { buildSnapshot } from "@/services/ai/context";
import { SYSTEM_PROMPT, renderSnapshot } from "@/services/ai/prompts";
import { chatSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("No autorizado", { status: 401 });

  // Degradación elegante: sin clave de Groq el resto de la app sigue viva.
  if (!aiEnabled()) {
    return new Response("El asistente no está configurado todavía.", { status: 503 });
  }

  const parsed = chatSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Formato inválido", { status: 400 });

  const snapshot = await buildSnapshot(session.user.id);

  const stream = await groq.chat.completions.create({
    model: MODELS.chat,
    stream: true,
    temperature: 0.4,
    max_tokens: 800,
    messages: [
      { role: "system", content: SYSTEM_PROMPT.replace("{{SNAPSHOT}}", renderSnapshot(snapshot)) },
      ...parsed.data.messages.slice(-8), // Ventana corta de historial
    ],
  });

  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) controller.enqueue(encoder.encode(text));
          }
        } catch {
          controller.enqueue(encoder.encode("\n\n(Se interrumpió la respuesta.)"));
        } finally {
          controller.close();
        }
      },
    }),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
