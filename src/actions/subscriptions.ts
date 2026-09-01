"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { recurringRuleSchema } from "@/lib/validation/schemas";
import { nextRun } from "@/services/finance/recurring";
import { getSubscriptions } from "@/services/finance/subscriptions";

export async function listSubscriptions() {
  const user = await requireUser();
  return getSubscriptions(user.id);
}

export async function createSubscription(input: unknown) {
  const user = await requireUser();
  const data = recurringRuleSchema.parse({ ...(input as object), isSubscription: true });

  const rule = await prisma.recurringRule.create({
    data: {
      ...data,
      isSubscription: true,
      userId: user.id,
      nextRunAt: nextRun(new Date(), data.frequency, data.dayOfMonth),
    },
  });

  revalidatePath("/subscriptions");
  revalidatePath("/");
  return rule;
}

export async function updateSubscription(id: string, input: unknown) {
  const user = await requireUser();
  const data = recurringRuleSchema.partial().parse(input);
  const rule = await prisma.recurringRule.update({ where: { id, userId: user.id }, data });
  revalidatePath("/subscriptions");
  revalidatePath("/");
  return rule;
}

/**
 * Cancelar no borra: se conserva para poder mostrar el ahorro acumulado. Ese
 * refuerzo positivo es la mitad del valor del módulo.
 */
export async function cancelSubscription(id: string) {
  const user = await requireUser();
  await prisma.recurringRule.update({
    where: { id, userId: user.id },
    data: { isActive: false, cancelledAt: new Date() },
  });
  revalidatePath("/subscriptions");
  revalidatePath("/");
}

export async function reactivateSubscription(id: string) {
  const user = await requireUser();
  const rule = await prisma.recurringRule.findFirst({
    where: { id, userId: user.id },
    select: { frequency: true, dayOfMonth: true },
  });
  if (!rule) throw new Error("Suscripción no encontrada");

  await prisma.recurringRule.update({
    where: { id },
    data: {
      isActive: true,
      cancelledAt: null,
      // Se reprograma desde hoy: el `nextRunAt` viejo quedó en el pasado y el
      // cron materializaría de golpe todos los cobros no ocurridos.
      nextRunAt: nextRun(new Date(), rule.frequency, rule.dayOfMonth),
    },
  });
  revalidatePath("/subscriptions");
  revalidatePath("/");
}

/** Borrado definitivo: pierde el historial de ahorro de esa suscripción. */
export async function deleteSubscription(id: string) {
  const user = await requireUser();
  await prisma.recurringRule.delete({ where: { id, userId: user.id } });
  revalidatePath("/subscriptions");
  revalidatePath("/");
}
