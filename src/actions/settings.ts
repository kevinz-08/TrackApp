"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { generateApiKey as makeKey } from "@/lib/auth/api-key";

/**
 * Devuelve el token en claro UNA sola vez. Después solo queda el hash, así que
 * si la base se compromete el token no es recuperable.
 */
export async function generateApiKey(name: string) {
  const user = await requireUser();
  const { raw, hash } = makeKey();

  await prisma.apiKey.create({
    data: { userId: user.id, name: name.slice(0, 60) || "Atajo de iOS", keyHash: hash },
  });

  revalidatePath("/settings/api-keys");
  return { token: raw };
}

export async function revokeApiKey(id: string) {
  const user = await requireUser();
  await prisma.apiKey.update({
    where: { id, userId: user.id },
    data: { revokedAt: new Date() },
  });
  revalidatePath("/settings/api-keys");
}

export async function listApiKeys() {
  const user = await requireUser();
  return prisma.apiKey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, lastUsedAt: true, revokedAt: true, createdAt: true },
  });
}
