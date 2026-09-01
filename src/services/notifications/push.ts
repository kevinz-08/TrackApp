import webpush from "web-push";
import { prisma } from "@/lib/prisma";

/**
 * Envío de notificaciones Web Push.
 *
 * Sin llaves VAPID no se envía nada y no se rompe nada: las alertas son una
 * capa de valor añadido, igual que la IA.
 */
export const pushEnabled = () =>
  Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let configured = false;
function configure() {
  if (configured || !pushEnabled()) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:soporte@trackapp.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

/**
 * Manda una notificación a todos los dispositivos del usuario.
 *
 * Un 404 o 410 del servicio de push significa que esa suscripción murió (app
 * desinstalada, permiso revocado). Se borra en el momento: si no, la tabla se
 * llena de endpoints muertos y cada envío gasta tiempo en fallar.
 */
export async function sendPush(userId: string, payload: PushPayload) {
  if (!pushEnabled()) return { sent: 0, removed: 0 };
  configure();

  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  let sent = 0;
  const dead: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(s.id);
      }
    }),
  );

  if (dead.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: dead } } });
  }

  return { sent, removed: dead.length };
}
