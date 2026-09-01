import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAYS_AHEAD = 3;

export async function GET(req: Request) {
  if (!isCronAuthorized(req.headers.get("authorization"))) {
    return new Response("No autorizado", { status: 401 });
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);

  const upcoming = await prisma.recurringRule.findMany({
    where: { isActive: true, nextRunAt: { gte: now, lte: horizon } },
    select: { id: true, userId: true, name: true, amount: true, nextRunAt: true },
  });

  const cards = await prisma.creditCard.findMany({
    select: { id: true, userId: true, name: true, statementDay: true, paymentDay: true },
  });

  const dueCards = cards.filter((c) => {
    const day = now.getDate();
    return (
      c.paymentDay - day <= DAYS_AHEAD && c.paymentDay - day >= 0
    ) || (c.statementDay - day <= DAYS_AHEAD && c.statementDay - day >= 0);
  });

  // TODO(fase 2): entregar estas alertas por Web Push (VAPID) además del
  // centro de notificaciones in-app.
  return NextResponse.json({ ok: true, subscriptions: upcoming.length, cards: dueCards.length });
}
