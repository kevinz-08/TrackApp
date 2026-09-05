import { prisma } from "@/lib/prisma";
import { monthStart } from "@/lib/dates";

/**
 * Snapshot financiero: resumen denso y de tamaño acotado (~400–600 tokens) que
 * se recalcula por consulta. Enviar el historial completo sería caro e inútil.
 */
export async function buildSnapshot(userId: string) {
  const start = monthStart();

  const [byCategory, totals, savingsRow, goals, subs, cards, categories] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId"],
      // Mismo criterio que el panel: ahorrar no es gastar (ver balance.ts).
      where: { userId, type: "EXPENSE", occurredAt: { gte: start }, savingGoalId: null },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 8,
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId, occurredAt: { gte: start }, savingGoalId: null },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, occurredAt: { gte: start }, savingGoalId: { not: null } },
      _sum: { amount: true },
    }),
    prisma.savingGoal.findMany({
      where: { userId, completedAt: null },
      select: { name: true, targetAmount: true, currentAmount: true, targetDate: true },
      take: 5,
    }),
    prisma.recurringRule.findMany({
      where: { userId, isSubscription: true, isActive: true },
      select: { name: true, amount: true, frequency: true, nextRunAt: true },
      take: 15,
    }),
    prisma.creditCard.findMany({
      where: { userId },
      select: {
        name: true,
        currentDebt: true,
        creditLimit: true,
        paymentDay: true,
        annualRate: true,
      },
    }),
    prisma.category.findMany({ where: { userId }, select: { id: true, name: true } }),
  ]);

  return {
    period: start,
    byCategory,
    totals,
    savings: savingsRow._sum.amount ?? 0,
    goals,
    subs,
    cards,
    categoryNames: new Map(categories.map((c) => [c.id, c.name])),
  };
}

export type Snapshot = Awaited<ReturnType<typeof buildSnapshot>>;
