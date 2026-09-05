import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { aiEnabled } from "@/services/ai/groq";
import { buildSnapshot } from "@/services/ai/context";
import { buildSystemPrompt } from "@/services/ai/prompts";
import { runAgent, type Message } from "@/services/ai/agent";
import { chatSchema } from "@/lib/validation/schemas";
import { chatExpiryFrom, titleFrom } from "@/services/chat/history";

export const runtime = "nodejs";
export const maxDuration = 30;

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

  const history = parsed.data.messages.slice(-8); // ventana corta
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  if (!lastUser) return new Response("No hay nada que responder", { status: 400 });

  /*
   * La conversación se resuelve ANTES de hablar con Groq, por dos motivos: su
   * id viaja en una cabecera de la respuesta y las cabeceras se cierran al
   * empezar el streaming, y así un id ajeno se rechaza sin haber gastado una
   * llamada al modelo.
   *
   * El `sessionId` del cuerpo es entrada del cliente, no una credencial: se
   * comprueba contra `userId` y contra `expiresAt` en el mismo `findFirst`. Sin
   * esa comprobación, un id adivinado colgaría mensajes de la conversación de
   * otro.
   */
  const now = new Date();
  let sessionId: string;

  if (parsed.data.sessionId) {
    const owned = await prisma.chatSession.findFirst({
      where: { id: parsed.data.sessionId, userId, expiresAt: { gt: now } },
      select: { id: true },
    });
    // 404 y no 403: para quien pregunta, una conversación ajena y una que ya
    // se borró por retención son indistinguibles, y así debe seguir siendo.
    if (!owned) return new Response("Esa conversación ya no está disponible", { status: 404 });
    sessionId = owned.id;
  } else {
    const created = await prisma.chatSession.create({
      data: {
        userId,
        title: titleFrom(lastUser.content),
        expiresAt: chatExpiryFrom(now),
      },
      select: { id: true },
    });
    sessionId = created.id;
  }

  const snapshot = await buildSnapshot(userId);

  const conversation: Message[] = [
    { role: "system", content: buildSystemPrompt(snapshot, parsed.data.route) },
    ...history.map((m) => ({ role: m.role, content: m.content }) as Message),
  ];

  // Escribir a través de la conversación y no de la tabla de mensajes es lo que
  // mantiene `updatedAt` al día: `@updatedAt` se dispara con el update, y ese
  // campo es el que ordena el historial.
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { messages: { create: { userId, role: "USER", content: lastUser.content } } },
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));
      let answer = "";

      try {
        /*
         * El bucle vive en `runAgent`: aquí solo se traducen sus eventos a
         * bytes. Esa separación es lo que permite que el trabajo proactivo del
         * cron use exactamente el mismo razonamiento sin duplicarlo.
         */
        const agent = runAgent(conversation, { userId, route: parsed.data.route });

        let step = await agent.next();
        while (!step.done) {
          if (step.value.type === "text") {
            answer += step.value.value;
            send(step.value.value);
          }
          step = await agent.next();
        }

        const { usage } = step.value;
        // Una línea por conversación: sin esto, "¿cuánto cuesta un usuario al
        // mes?" solo se puede responder mirando la factura de Groq.
        console.info(
          `[chat] usage user=${userId} route=${parsed.data.route ?? "-"} prompt=${usage.promptTokens} completion=${usage.completionTokens} rounds=${usage.rounds}`,
        );

        if (answer.trim()) {
          await prisma.chatSession.update({
            where: { id: sessionId },
            data: { messages: { create: { userId, role: "ASSISTANT", content: answer } } },
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
      // Con qué conversación habló el cliente. Es la única vía para devolver el
      // id de una recién creada sin ensuciar el cuerpo, que es texto plano en
      // streaming y no un sobre JSON.
      "X-Chat-Session": sessionId,
      // Evita que un proxy intermedio acumule la respuesta y anule el streaming.
      "X-Accel-Buffering": "no",
    },
  });
}
