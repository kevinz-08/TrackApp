"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { creditCardSchema } from "@/lib/validation/schemas";
import {
  simulateInstallments as calcInstallments,
  simulateMinimumPayment as calcMinimum,
} from "@/services/finance/credit";

export async function upsertCreditCard(id: string | null, input: unknown) {
  const user = await requireUser();
  const data = creditCardSchema.parse(input);

  const card = id
    ? await prisma.creditCard.update({ where: { id, userId: user.id }, data })
    : await prisma.creditCard.create({ data: { ...data, userId: user.id } });

  revalidatePath("/cards");
  return card;
}

export async function deleteCreditCard(id: string) {
  const user = await requireUser();
  await prisma.creditCard.delete({ where: { id, userId: user.id } });
  revalidatePath("/cards");
}

/** Cálculo puro, no persiste nada. Vive como action para reusar la validación. */
export async function simulateInstallments(amount: number, installments: number, annualRate: number) {
  await requireUser();
  return calcInstallments(amount, installments, annualRate);
}

export async function simulateMinimumPayment(debt: number, annualRate: number, minimumPercent?: number) {
  await requireUser();
  return calcMinimum(debt, annualRate, minimumPercent);
}
