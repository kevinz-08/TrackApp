import { prisma } from "@/lib/prisma";
import { monthStart, monthEnd } from "@/lib/dates";

/**
 * Balance del período: ingresos menos egresos, desglosado entre lo comprometido
 * (fijo) y lo disponible (variable).
 */
export async function getMonthlyBalance(userId: string, reference = new Date()) {
  const gte = monthStart(reference);
  const lt = monthEnd(reference);

  const rows = await prisma.transaction.groupBy({
    by: ["type", "isFixed"],
    where: { userId, occurredAt: { gte, lt } },
    _sum: { amount: true },
  });

  const pick = (type: "INCOME" | "EXPENSE", isFixed?: boolean) =>
    rows
      .filter((r) => r.type === type && (isFixed === undefined || r.isFixed === isFixed))
      .reduce((acc, r) => acc + (r._sum.amount ?? 0), 0);

  const income = pick("INCOME");
  const expense = pick("EXPENSE");

  return {
    periodStart: gte,
    periodEnd: lt,
    income,
    expense,
    balance: income - expense,
    fixedExpense: pick("EXPENSE", true),
    variableExpense: pick("EXPENSE", false),
  };
}

/** Proyección simple del saldo al cierre, contando los fijos aún no materializados. */
export async function getCashFlowProjection(userId: string, reference = new Date()) {
  const balance = await getMonthlyBalance(userId, reference);

  const pendingFixed = await prisma.recurringRule.aggregate({
    where: {
      userId,
      isActive: true,
      type: "EXPENSE",
      nextRunAt: { gte: reference, lt: balance.periodEnd },
    },
    _sum: { amount: true },
  });

  const pending = pendingFixed._sum.amount ?? 0;
  return { ...balance, pendingFixed: pending, projectedBalance: balance.balance - pending };
}
