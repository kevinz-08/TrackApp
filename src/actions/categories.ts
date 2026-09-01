"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { categorySchema } from "@/lib/validation/schemas";

export async function createCategory(input: unknown) {
  const user = await requireUser();
  const data = categorySchema.parse(input);
  const category = await prisma.category.create({ data: { ...data, userId: user.id } });
  revalidatePath("/categories");
  return category;
}

export async function updateCategory(id: string, input: unknown) {
  const user = await requireUser();
  const data = categorySchema.partial().parse(input);
  const category = await prisma.category.update({ where: { id, userId: user.id }, data });
  revalidatePath("/categories");
  return category;
}

export async function deleteCategory(id: string) {
  const user = await requireUser();
  // Las transacciones no se borran: quedan con categoryId en null (SetNull).
  await prisma.category.delete({ where: { id, userId: user.id, isDefault: false } });
  revalidatePath("/categories");
}
