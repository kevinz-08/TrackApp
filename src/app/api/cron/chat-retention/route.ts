import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth/guards";
import { purgeExpiredChats, CHAT_TTL_DAYS } from "@/services/chat/history";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Barrido de retención del chat: borra las conversaciones que cumplieron
 * `CHAT_TTL_DAYS` días desde su creación.
 *
 * Corre a las 04:00 UTC, antes que los otros dos crons: es la tarea más barata
 * del día —un rango sobre un índice— y así el resto encuentra la tabla ya
 * limpia. Que no corra un día no rompe la promesa: las lecturas de
 * `services/chat/history` filtran por `expiresAt` de todas formas, así que lo
 * vencido deja de verse aunque siga físicamente en la base.
 */
export async function GET(req: Request) {
  if (!isCronAuthorized(req.headers.get("authorization"))) {
    return new Response("No autorizado", { status: 401 });
  }

  const result = await purgeExpiredChats();
  return NextResponse.json({ ok: true, ttlDays: CHAT_TTL_DAYS, ...result });
}
