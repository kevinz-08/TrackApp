import { prisma } from "@/lib/prisma";
import type { Frequency } from "@prisma/client";

const STEP_MONTHS: Record<Frequency, number> = {
  WEEKLY: 0,
  MONTHLY: 1,
  BIMONTHLY: 2,
  QUARTERLY: 3,
  YEARLY: 12,
};

export function nextRun(from: Date, frequency: Frequency, dayOfMonth: number) {
  const next = new Date(from);
  if (frequency === "WEEKLY") {
    next.setDate(next.getDate() + 7);
    return next;
  }
  next.setMonth(next.getMonth() + STEP_MONTHS[frequency]);
  // Un día 31 en un mes de 30 cae al último día real del mes.
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(dayOfMonth, lastDay));
  return next;
}

/**
 * Materializa los recurrentes vencidos como Transaction reales. Así los
 * gráficos no necesitan lógica especial para los movimientos fijos.
 */
export async function materializeDueRecurring(now = new Date()) {
  const due = await prisma.recurringRule.findMany({
    where: { isActive: true, nextRunAt: { lte: now } },
  });

  let created = 0;
  for (const rule of due) {
    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId: rule.userId,
          categoryId: rule.categoryId,
          type: rule.type,
          amount: rule.amount,
          description: rule.name,
          occurredAt: rule.nextRunAt,
          source: "RECURRING",
          isFixed: true,
          recurringRuleId: rule.id,
        },
      }),
      prisma.recurringRule.update({
        where: { id: rule.id },
        data: {
          lastRunAt: rule.nextRunAt,
          nextRunAt: nextRun(rule.nextRunAt, rule.frequency, rule.dayOfMonth),
        },
      }),
    ]);
    created++;
  }

  return { created, evaluated: due.length };
}
