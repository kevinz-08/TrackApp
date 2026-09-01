import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { sendPush, pushEnabled } from "@/services/notifications/push";
import { formatCOP } from "@/lib/money";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAYS_AHEAD = 3;

/** Días desde hoy hasta el próximo día `day` del mes. */
function daysUntil(day: number, now: Date) {
  const next = new Date(now.getFullYear(), now.getMonth(), day);
  if (next < now) next.setMonth(next.getMonth() + 1);
  return Math.ceil((next.getTime() - now.getTime()) / 86_400_000);
}

const plural = (n: number) => (n === 1 ? "día" : "días");

export async function GET(req: Request) {
  if (!isCronAuthorized(req.headers.get("authorization"))) {
    return new Response("No autorizado", { status: 401 });
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + DAYS_AHEAD * 86_400_000);

  const [rules, cards] = await Promise.all([
    prisma.recurringRule.findMany({
      where: { isActive: true, nextRunAt: { gte: now, lte: horizon } },
      select: { userId: true, name: true, amount: true, nextRunAt: true, isSubscription: true },
    }),
    prisma.creditCard.findMany({
      select: { userId: true, name: true, statementDay: true, paymentDay: true },
    }),
  ]);

  /*
   * Se agrupa por usuario y se manda UNA notificación con todo lo del día. Tres
   * avisos seguidos por tres cobros distintos es exactamente la forma de que el
   * usuario silencie la app entera.
   */
  const byUser = new Map<string, string[]>();
  const add = (userId: string, line: string) => {
    const list = byUser.get(userId) ?? [];
    list.push(line);
    byUser.set(userId, list);
  };

  for (const rule of rules) {
    const days = Math.max(0, Math.ceil((rule.nextRunAt.getTime() - now.getTime()) / 86_400_000));
    const what = rule.isSubscription ? "se renueva" : "se cobra";
    add(
      rule.userId,
      days === 0
        ? `${rule.name} ${what} hoy (${formatCOP(rule.amount)})`
        : `${rule.name} ${what} en ${days} ${plural(days)} (${formatCOP(rule.amount)})`,
    );
  }

  for (const card of cards) {
    const toStatement = daysUntil(card.statementDay, now);
    const toPayment = daysUntil(card.paymentDay, now);

    // El corte importa ANTES de comprar: lo que pase después cae al siguiente
    // extracto y se paga un mes más tarde. Por eso se avisa, no solo del pago.
    if (toStatement <= DAYS_AHEAD) {
      add(
        card.userId,
        `${card.name} corta en ${toStatement} ${plural(toStatement)}: lo que compres después se paga el mes siguiente`,
      );
    }
    if (toPayment <= DAYS_AHEAD) {
      add(card.userId, `${card.name} vence en ${toPayment} ${plural(toPayment)}`);
    }
  }

  let sent = 0;
  if (pushEnabled()) {
    for (const [userId, lines] of byUser) {
      const result = await sendPush(userId, {
        title: lines.length === 1 ? "TrackApp" : `${lines.length} cosas esta semana`,
        body: lines.slice(0, 4).join("\n"),
        url: "/",
        tag: "alertas",
      });
      sent += result.sent;
    }
  }

  return NextResponse.json({
    ok: true,
    users: byUser.size,
    alerts: [...byUser.values()].reduce((acc, l) => acc + l.length, 0),
    pushSent: sent,
    pushEnabled: pushEnabled(),
  });
}
