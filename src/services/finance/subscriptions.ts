import { prisma } from "@/lib/prisma";
import type { Frequency } from "@prisma/client";

/**
 * Cuántas veces al año se cobra cada frecuencia. Se normaliza todo a un coste
 * anual y de ahí se baja al mensual: hacerlo al revés obliga a multiplicar por
 * 12 un mensual aproximado y el anual de una suscripción anual sale mal.
 */
const TIMES_PER_YEAR: Record<Frequency, number> = {
  WEEKLY: 52,
  MONTHLY: 12,
  BIMONTHLY: 6,
  QUARTERLY: 4,
  YEARLY: 1,
};

export const annualCost = (amount: number, frequency: Frequency) =>
  amount * TIMES_PER_YEAR[frequency];

/** Antigüedad a partir de la cual conviene preguntarse si todavía se usa. */
const STALE_DAYS = 180;

export async function getSubscriptions(userId: string) {
  const rules = await prisma.recurringRule.findMany({
    where: { userId, isSubscription: true },
    orderBy: [{ isActive: "desc" }, { amount: "desc" }],
    select: {
      id: true,
      name: true,
      amount: true,
      frequency: true,
      nextRunAt: true,
      isActive: true,
      cancelledAt: true,
      createdAt: true,
      categoryId: true,
      category: { select: { name: true } },
      _count: { select: { transactions: true } },
    },
  });

  const staleBefore = new Date(Date.now() - STALE_DAYS * 86_400_000);

  const active = rules
    .filter((r) => r.isActive)
    .map((r) => ({
      id: r.id,
      name: r.name,
      amount: r.amount,
      frequency: r.frequency,
      categoryId: r.categoryId,
      categoryName: r.category?.name ?? null,
      nextRunAt: r.nextRunAt.toISOString(),
      annual: annualCost(r.amount, r.frequency),
      charges: r._count.transactions,
      /*
       * "Olvidada" no puede detectarse de verdad sin saber si el usuario usa el
       * servicio; lo que sí se sabe es que lleva mucho cobrándose sin que nadie
       * la revise. Se marca como pregunta, no como acusación.
       */
      stale: r.createdAt < staleBefore && r._count.transactions >= 6,
    }));

  const cancelled = rules
    .filter((r) => !r.isActive)
    .map((r) => ({
      id: r.id,
      name: r.name,
      amount: r.amount,
      frequency: r.frequency,
      cancelledAt: r.cancelledAt?.toISOString() ?? null,
      annual: annualCost(r.amount, r.frequency),
    }));

  const annualTotal = active.reduce((acc, s) => acc + s.annual, 0);

  return {
    active,
    cancelled,
    annualTotal,
    monthlyTotal: Math.round(annualTotal / 12),
    /** Refuerzo positivo: lo que ya no se paga, en cifra anual. */
    savedPerYear: cancelled.reduce((acc, s) => acc + s.annual, 0),
  };
}

export type SubscriptionSummary = Awaited<ReturnType<typeof getSubscriptions>>;
