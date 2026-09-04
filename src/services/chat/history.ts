import { prisma } from "@/lib/prisma";

/**
 * Historial de conversaciones y su política de retención.
 *
 * La retención es de treinta días **desde la creación**, no desde el último
 * mensaje. Es deliberado y tiene un filo: una conversación que se retoma cada
 * semana desaparece igual al cumplir el mes, en mitad de su uso. La alternativa
 * —ventana deslizante sobre `updatedAt`— es un solo cambio en `chatExpiryFrom`
 * y en el barrido, pero convierte "se borra a los 30 días" en "se borra a los
 * 30 días de silencio", que ya no es la misma promesa.
 *
 * El borrado NO se delega a la caducidad de la base: PostgreSQL no tiene TTL de
 * filas. Lo hace el cron, y las lecturas filtran por `expiresAt` igualmente,
 * para que una noche sin cron no resucite una conversación vencida.
 */
export const CHAT_TTL_DAYS = 30;

const DAY_MS = 86_400_000;

export const chatExpiryFrom = (from: Date) => new Date(from.getTime() + CHAT_TTL_DAYS * DAY_MS);

/** Días enteros que le quedan a la conversación. 0 = se borra hoy. */
export const daysLeft = (expiresAt: Date, now = new Date()) =>
  Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS));

/**
 * Título de la conversación: el primer mensaje del usuario, recortado por
 * palabra. Sale del texto y no del modelo a propósito —el historial tiene que
 * ser legible aunque Groq esté caído—, y por eso mismo nunca queda vacío: un
 * mensaje de una sola palabra larguísima se corta a lo bruto antes que dejar
 * una fila sin nombre.
 */
export function titleFrom(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 48) return clean || "Conversación";

  const cut = clean.slice(0, 48);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 24 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Borra lo vencido. Los mensajes caen por `onDelete: Cascade`, así que esto es
 * un solo rango sobre el índice de `expiresAt`.
 */
export async function purgeExpiredChats(now = new Date()) {
  const { count } = await prisma.chatSession.deleteMany({ where: { expiresAt: { lte: now } } });
  return { deletedSessions: count };
}

/**
 * Conversaciones vivas del usuario, la más reciente primero.
 *
 * El filtro por `expiresAt` es la red de seguridad del cron: si el barrido no
 * corrió anoche, la conversación vencida no aparece igualmente. Ese es el
 * contrato que ve el usuario; el borrado físico es un detalle de la base.
 */
export async function listSessions(userId: string, now = new Date()) {
  const rows = await prisma.chatSession.findMany({
    where: { userId, expiresAt: { gt: now } },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      expiresAt: true,
      _count: { select: { messages: true } },
    },
  });

  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    messages: s._count.messages,
    daysLeft: daysLeft(s.expiresAt, now),
    // Formateado en el servidor: si lo hace el cliente con su zona horaria, la
    // fecha del HTML servido no coincide con la hidratada.
    updatedLabel: relativeLabel(s.updatedAt, now),
  }));
}

/** Marca de tiempo corta para la lista. Lo largo no cabe en una fila. */
function relativeLabel(date: Date, now: Date) {
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.round(hours / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

/**
 * Mensajes de una conversación, ya validada contra el usuario.
 *
 * Devuelve `null` —y no una lista vacía— si la conversación no es suya, no
 * existe o venció: el llamante necesita distinguir "conversación en blanco" de
 * "esta conversación no es tuya" para no dejar al usuario escribiendo dentro de
 * un contenedor que no le pertenece.
 */
export async function loadSession(userId: string, sessionId: string, now = new Date()) {
  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId, expiresAt: { gt: now } },
    select: {
      id: true,
      title: true,
      expiresAt: true,
      messages: {
        orderBy: { createdAt: "asc" },
        // La ventana que el modelo recibe son 8 turnos; se muestran más porque
        // leer hacia atrás es gratis y perder el hilo visual no lo es.
        take: 100,
        select: { role: true, content: true },
      },
    },
  });

  if (!session) return null;

  return {
    id: session.id,
    title: session.title,
    daysLeft: daysLeft(session.expiresAt, now),
    turns: session.messages.map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    })),
  };
}
