import type { InsightKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatCOP } from "@/lib/money";
import { monthStart, addMonths } from "@/lib/dates";
import { requiredMonthlyPace } from "@/services/finance/goals";
import { getSubscriptions } from "@/services/finance/subscriptions";

/**
 * Detección determinista. Cero tokens, cero alucinaciones.
 *
 * Lo que NO está aquí, a propósito: las fechas de corte y de pago de las
 * tarjetas y los cobros recurrentes próximos. Eso ya lo avisa
 * `/api/cron/alerts`, y dos sistemas notificando el mismo hecho es la forma más
 * rápida de que el usuario apague las dos.
 */

export type Detected = {
  kind: InsightKind;
  /** Identidad del HECHO, no del aviso. Un hecho recurrente es una sola fila. */
  fingerprint: string;
  /** Cifras crudas para que el modelo redacte sin recalcular nada. */
  facts: Record<string, unknown>;
  /** Texto de respaldo. Si Groq falla, esto es literalmente lo que ve el usuario. */
  fallbackTitle: string;
  fallbackBody: string;
  severity: number;
};

/** Dos o más cargos idénticos (mismo concepto y monto) en menos de 72 horas. */
async function duplicateCharges(userId: string): Promise<Detected[]> {
  const rows = await prisma.$queryRaw<Array<{ description: string; amount: number; n: bigint }>>`
    SELECT "description", "amount", COUNT(*) AS n
    FROM "Transaction"
    WHERE "userId" = ${userId}
      AND "type" = 'EXPENSE'
      AND "savingGoalId" IS NULL
      AND "occurredAt" > NOW() - INTERVAL '3 days'
    GROUP BY "description", "amount"
    HAVING COUNT(*) > 1
  `;

  return rows.map((r) => {
    const veces = Number(r.n);
    return {
      kind: "DUPLICATE_CHARGE" as const,
      fingerprint: `dup:${r.description.toLowerCase()}:${r.amount}`,
      facts: { concepto: r.description, monto: r.amount, veces },
      fallbackTitle: "Posible cobro repetido",
      // "Posible" y no "detecté un cobro doble": pueden ser dos cafés iguales
      // el mismo día. La app señala la coincidencia; quien decide es el usuario.
      fallbackBody: `Aparecen ${veces} cargos de ${formatCOP(r.amount)} por "${r.description}" en los últimos días. Si no fueron dos compras distintas, conviene revisarlo.`,
      severity: 2,
    };
  });
}

/** Cuánto por encima de su propio promedio tiene que ir una categoría para avisar. */
const SPIKE_FACTOR = 1.6;
/** Por debajo de esto el porcentaje es ruido: duplicar un gasto de mil pesos no es noticia. */
const SPIKE_FLOOR = 80_000;

/** Una categoría que este mes va muy por encima de su promedio de los 3 anteriores. */
async function spendingSpike(userId: string): Promise<Detected[]> {
  const currentStart = monthStart();
  const historyStart = monthStart(addMonths(currentStart, -3));

  const [current, history, categories] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        type: "EXPENSE",
        savingGoalId: null,
        occurredAt: { gte: currentStart },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        type: "EXPENSE",
        savingGoalId: null,
        occurredAt: { gte: historyStart, lt: currentStart },
      },
      _sum: { amount: true },
    }),
    prisma.category.findMany({ where: { userId }, select: { id: true, name: true } }),
  ]);

  const names = new Map(categories.map((c) => [c.id, c.name]));
  const average = new Map(history.map((h) => [h.categoryId, Math.round((h._sum.amount ?? 0) / 3)]));

  /*
   * El aviso sale al final del mes, no al principio: el día 4 cualquier
   * categoría "va disparada" contra un promedio mensual completo. Se compara
   * contra la fracción de mes ya transcurrida.
   */
  const now = new Date();
  const elapsed = Math.max(
    0.35,
    (now.getTime() - currentStart.getTime()) /
      (monthStart(addMonths(now, 1)).getTime() - currentStart.getTime()),
  );

  const out: Detected[] = [];
  for (const row of current) {
    const total = row._sum.amount ?? 0;
    const avg = average.get(row.categoryId) ?? 0;
    if (avg === 0 || total < SPIKE_FLOOR) continue;

    const expected = avg * elapsed;
    if (total < expected * SPIKE_FACTOR) continue;

    const name = names.get(row.categoryId ?? "") ?? "Sin categoría";
    const pct = Math.round(((total - expected) / expected) * 100);

    out.push({
      kind: "SPENDING_SPIKE",
      // El período entra en la huella: el mismo pico el mes que viene es un
      // hecho nuevo y merece su propio aviso.
      fingerprint: `spike:${row.categoryId}:${currentStart.toISOString().slice(0, 7)}`,
      facts: { categoria: name, gastadoEsteMes: total, promedioMensual: avg, sobrepasoPct: pct },
      fallbackTitle: `${name} va por encima de lo habitual`,
      fallbackBody: `Llevas ${formatCOP(total)} en ${name} este mes, un ${pct}% más de lo que sueles llevar a estas alturas.`,
      severity: 2,
    });
  }
  return out;
}

/** Suscripciones que llevan mucho cobrándose sin que nadie las revise. */
async function staleSubscriptions(userId: string): Promise<Detected[]> {
  const { active } = await getSubscriptions(userId);

  return active
    .filter((s) => s.stale)
    .map((s) => ({
      kind: "SUBSCRIPTION_STALE" as const,
      fingerprint: `stale:${s.id}`,
      facts: { nombre: s.name, monto: s.amount, costoAnual: s.annual, cobros: s.charges },
      fallbackTitle: `${s.name} lleva tiempo sin revisarse`,
      fallbackBody: `${s.name} te ha cobrado ${s.charges} veces y suma ${formatCOP(s.annual)} al año. ¿Sigue valiendo la pena?`,
      severity: 1,
    }));
}

/** Metas con fecha objetivo cuyo ritmo actual no alcanza. */
async function goalsOffPace(userId: string): Promise<Detected[]> {
  const goals = await prisma.savingGoal.findMany({
    where: { userId, completedAt: null, targetDate: { not: null } },
    select: { id: true, name: true, targetAmount: true, currentAmount: true, targetDate: true },
  });

  const since = monthStart(addMonths(new Date(), -3));
  const out: Detected[] = [];

  for (const goal of goals) {
    const needed = requiredMonthlyPace(goal);
    if (!needed) continue;

    const contributed = await prisma.transaction.aggregate({
      where: { userId, savingGoalId: goal.id, occurredAt: { gte: since } },
      _sum: { amount: true },
    });
    const pace = Math.round((contributed._sum.amount ?? 0) / 3);
    if (pace >= needed) continue;

    out.push({
      kind: "GOAL_OFF_PACE",
      fingerprint: `pace:${goal.id}:${monthStart().toISOString().slice(0, 7)}`,
      facts: {
        meta: goal.name,
        ritmoActual: pace,
        ritmoNecesario: needed,
        falta: goal.targetAmount - goal.currentAmount,
        fechaObjetivo: goal.targetDate?.toISOString().slice(0, 10),
      },
      fallbackTitle: `${goal.name} va por debajo del ritmo`,
      fallbackBody: `Para llegar a tiempo necesitarías ${formatCOP(needed)} al mes y vas por ${formatCOP(pace)}.`,
      severity: 1,
    });
  }
  return out;
}

/** Todos los detectores de un usuario, en paralelo. */
export async function detectAll(userId: string): Promise<Detected[]> {
  const groups = await Promise.all([
    duplicateCharges(userId),
    spendingSpike(userId),
    staleSubscriptions(userId),
    goalsOffPace(userId),
  ]);
  return groups.flat();
}
