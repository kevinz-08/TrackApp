"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { sendPush } from "@/services/notifications/push";

type SubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
};

export async function savePushSubscription(input: SubscriptionInput) {
  const user = await requireUser();
  if (!input?.endpoint || !input.keys?.p256dh || !input.keys?.auth) {
    throw new Error("Suscripción inválida");
  }

  // El endpoint es único: reinstalar la PWA genera otro, y volver a suscribirse
  // con el mismo debe actualizar, no duplicar.
  await prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    update: { userId: user.id, p256dh: input.keys.p256dh, auth: input.keys.auth },
    create: {
      userId: user.id,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent?.slice(0, 200),
    },
  });
}

export async function removePushSubscription(endpoint: string) {
  const user = await requireUser();
  await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpoint } });
}

export async function countPushSubscriptions() {
  const user = await requireUser();
  return prisma.pushSubscription.count({ where: { userId: user.id } });
}

/** Envío de prueba: es la única forma de saber que la cadena entera funciona. */
export async function sendTestPush() {
  const user = await requireUser();
  return sendPush(user.id, {
    title: "TrackApp",
    body: "Las notificaciones están funcionando.",
    url: "/",
    tag: "prueba",
  });
}
