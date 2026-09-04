"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";

/**
 * El consumidor es la propia UI, así que va como Server Action. Crear la
 * conversación NO está aquí: eso lo hace `/api/chat` en el mismo viaje que el
 * primer mensaje, porque una conversación creada por adelantado desde un botón
 * "nuevo chat" deja el historial lleno de filas vacías en cuanto el usuario se
 * arrepiente.
 */
export async function deleteChatSession(id: string) {
  const user = await requireUser();
  // El userId va en el where, no en un chequeo previo: así el borrado de una
  // conversación ajena no borra nada en vez de borrarla.
  await prisma.chatSession.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/chat");
}

export async function clearChatHistory() {
  const user = await requireUser();
  const { count } = await prisma.chatSession.deleteMany({ where: { userId: user.id } });
  revalidatePath("/chat");
  return { deleted: count };
}
