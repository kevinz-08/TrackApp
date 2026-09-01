"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { goalSchema, amountSchema } from "@/lib/validation/schemas";

export async function createGoal(input: unknown) {
  const user = await requireUser();
  const data = goalSchema.parse(input);
  const goal = await prisma.savingGoal.create({ data: { ...data, userId: user.id } });
  revalidatePath("/goals");
  return goal;
}

/** Un aporte es a la vez movimiento y avance de la meta: se hacen en una tx. */
export async function contributeToGoal(goalId: string, rawAmount: unknown) {
  const user = await requireUser();
  const amount = amountSchema.parse(rawAmount);

  const goal = await prisma.savingGoal.findFirst({
    where: { id: goalId, userId: user.id },
    select: { id: true, name: true, targetAmount: true, currentAmount: true },
  });
  if (!goal) throw new Error("Meta no encontrada");

  const newAmount = goal.currentAmount + amount;

  const [, updated] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId: user.id,
        type: "EXPENSE",
        amount,
        description: `Aporte a meta: ${goal.name}`,
        savingGoalId: goal.id,
        source: "MANUAL",
      },
    }),
    prisma.savingGoal.update({
      where: { id: goal.id },
      data: {
        currentAmount: newAmount,
        completedAt: newAmount >= goal.targetAmount ? new Date() : null,
      },
    }),
  ]);

  revalidatePath("/goals");
  return updated;
}

/** Cuánto hay que ahorrar al mes para llegar a la fecha objetivo. */
export function requiredMonthlyPace(goal: {
  targetAmount: number;
  currentAmount: number;
  targetDate: Date | null;
}) {
  if (!goal.targetDate) return null;
  const monthsLeft = Math.max(
    1,
    Math.ceil((goal.targetDate.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)),
  );
  return Math.ceil((goal.targetAmount - goal.currentAmount) / monthsLeft);
}
