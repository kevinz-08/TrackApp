"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { transactionSchema, recurringRuleSchema } from "@/lib/validation/schemas";
import { nextRun } from "@/services/finance/recurring";
import { suggestCategory } from "@/services/categorization";

export async function createTransaction(input: unknown) {
  const user = await requireUser();
  const data = transactionSchema.parse(input);

  const tx = await prisma.transaction.create({
    data: {
      ...data,
      userId: user.id,
      categoryId: data.categoryId ?? (await suggestCategory(data.description, user.id, data.type)),
      source: "MANUAL",
    },
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  return tx;
}

/** Toda transacción de quick-log debe ser editable: el parsing puede fallar. */
export async function updateTransaction(id: string, input: unknown) {
  const user = await requireUser();
  const data = transactionSchema.partial().parse(input);

  const tx = await prisma.transaction.update({
    where: { id, userId: user.id }, // el filtro por userId nunca es opcional
    data: { ...data, needsReview: false },
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  return tx;
}

export async function deleteTransaction(id: string) {
  const user = await requireUser();
  await prisma.transaction.delete({ where: { id, userId: user.id } });
  revalidatePath("/");
  revalidatePath("/transactions");
}

export async function createRecurringRule(input: unknown) {
  const user = await requireUser();
  const data = recurringRuleSchema.parse(input);

  const rule = await prisma.recurringRule.create({
    data: {
      ...data,
      userId: user.id,
      nextRunAt: nextRun(new Date(), data.frequency, data.dayOfMonth),
    },
  });

  revalidatePath("/transactions");
  return rule;
}

/** Refuerzo positivo: guardamos la fecha para poder mostrar el ahorro acumulado. */
export async function cancelSubscription(id: string) {
  const user = await requireUser();
  const rule = await prisma.recurringRule.update({
    where: { id, userId: user.id },
    data: { isActive: false, cancelledAt: new Date() },
  });
  revalidatePath("/transactions");
  return rule;
}
