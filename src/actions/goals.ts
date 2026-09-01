"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { goalSchema, amountSchema } from "@/lib/validation/schemas";
import { requiredMonthlyPace } from "@/services/finance/goals";

export async function listGoals() {
  const user = await requireUser();
  const goals = await prisma.savingGoal.findMany({
    where: { userId: user.id },
    // Las cumplidas al final: la meta viva es la que importa mirar.
    orderBy: [{ completedAt: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      targetAmount: true,
      currentAmount: true,
      imageUrl: true,
      imagePublicId: true,
      targetDate: true,
      completedAt: true,
    },
  });
  return goals.map((g) => ({
    ...g,
    targetDate: g.targetDate?.toISOString() ?? null,
    completedAt: g.completedAt?.toISOString() ?? null,
    monthlyPace: requiredMonthlyPace(g),
  }));
}

export async function createGoal(input: unknown) {
  const user = await requireUser();
  const data = goalSchema.parse(input);
  const goal = await prisma.savingGoal.create({ data: { ...data, userId: user.id } });
  revalidatePath("/goals");
  return goal;
}

export async function updateGoal(id: string, input: unknown) {
  const user = await requireUser();
  const data = goalSchema.partial().parse(input);
  const goal = await prisma.savingGoal.update({ where: { id, userId: user.id }, data });
  revalidatePath("/goals");
  return goal;
}

/**
 * Borrar la meta no borra los aportes: quedan como movimientos con
 * `savingGoalId` en null (SetNull), así que el historial de gasto sigue
 * cuadrando. Lo que se pierde es la agrupación, no el dinero.
 */
export async function deleteGoal(id: string) {
  const user = await requireUser();
  await prisma.savingGoal.delete({ where: { id, userId: user.id } });
  revalidatePath("/goals");
  revalidatePath("/");
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
        // Se guarda como EXPENSE porque el dinero sale del disponible, pero
        // `savingGoalId` lo saca del gasto real en todas las agregaciones.
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
  revalidatePath("/");
  return updated;
}

/** Retira un aporte: revierte el avance y registra la salida como ingreso. */
export async function withdrawFromGoal(goalId: string, rawAmount: unknown) {
  const user = await requireUser();
  const amount = amountSchema.parse(rawAmount);

  const goal = await prisma.savingGoal.findFirst({
    where: { id: goalId, userId: user.id },
    select: { id: true, name: true, currentAmount: true, targetAmount: true },
  });
  if (!goal) throw new Error("Meta no encontrada");
  if (amount > goal.currentAmount) throw new Error("No hay tanto ahorrado en esta meta");

  const newAmount = goal.currentAmount - amount;

  const [, updated] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId: user.id,
        type: "INCOME",
        amount,
        description: `Retiro de meta: ${goal.name}`,
        savingGoalId: goal.id,
        source: "MANUAL",
      },
    }),
    prisma.savingGoal.update({
      where: { id: goal.id },
      data: { currentAmount: newAmount, completedAt: null },
    }),
  ]);

  revalidatePath("/goals");
  revalidatePath("/");
  return updated;
}
