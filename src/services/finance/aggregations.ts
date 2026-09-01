import { prisma } from "@/lib/prisma";
import { monthStart, monthEnd, addMonths } from "@/lib/dates";

/** Distribución del gasto por categoría (gráfico de dona). */
export async function expensesByCategory(userId: string, reference = new Date()) {
  const gte = monthStart(reference);
  const lt = monthEnd(reference);

  const [rows, categories] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "EXPENSE", occurredAt: { gte, lt } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
    prisma.category.findMany({ where: { userId }, select: { id: true, name: true, color: true } }),
  ]);

  const byId = new Map(categories.map((c) => [c.id, c]));
  return rows.map((r) => ({
    categoryId: r.categoryId,
    name: byId.get(r.categoryId ?? "")?.name ?? "Sin categoría",
    color: byId.get(r.categoryId ?? "")?.color ?? "#888780",
    total: r._sum.amount ?? 0,
  }));
}

/** Evolución mensual de ingresos y egresos para los últimos N meses. */
export async function monthlyTrend(userId: string, months = 6, reference = new Date()) {
  const from = monthStart(addMonths(reference, -(months - 1)));

  const rows = await prisma.transaction.findMany({
    where: { userId, occurredAt: { gte: from } },
    select: { type: true, amount: true, occurredAt: true },
  });

  const buckets = new Map<string, { period: string; income: number; expense: number }>();
  for (let i = 0; i < months; i++) {
    const d = addMonths(from, i);
    const key = d.toISOString().slice(0, 7);
    buckets.set(key, { period: key, income: 0, expense: 0 });
  }

  for (const tx of rows) {
    const key = tx.occurredAt.toISOString().slice(0, 7);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (tx.type === "INCOME") bucket.income += tx.amount;
    else bucket.expense += tx.amount;
  }

  return [...buckets.values()];
}

/** Las cinco transacciones de mayor monto del período. */
export async function topTransactions(userId: string, take = 5, reference = new Date()) {
  return prisma.transaction.findMany({
    where: {
      userId,
      type: "EXPENSE",
      occurredAt: { gte: monthStart(reference), lt: monthEnd(reference) },
    },
    orderBy: { amount: "desc" },
    take,
    select: {
      id: true,
      amount: true,
      description: true,
      occurredAt: true,
      category: { select: { name: true, color: true } },
    },
  });
}
