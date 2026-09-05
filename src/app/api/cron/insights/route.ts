import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { sendPush, pushEnabled } from "@/services/notifications/push";
import { detectAll } from "@/services/ai/insights/detectors";
import { narrate } from "@/services/ai/insights/narrate";

export const runtime = "nodejs";
// Más que los 30 del chat: aquí hay una pasada de detección y una llamada al
// modelo por usuario, en serie. Con 30 s el primer usuario que crezca lo agota.
export const maxDuration = 60;

/**
 * Análisis proactivo diario.
 *
 * Convierte la app de registro histórico pasivo en algo que mira los datos por
 * su cuenta. El orden importa: primero detectar (determinista), después
 * redactar (LLM), y solo entonces persistir y notificar.
 *
 * Se ejecuta a las 12:00 UTC, que son las 7:00 en Colombia: antes de la ventana
 * de gasto del día, que es cuando un aviso todavía puede cambiar algo.
 */
export async function GET(req: Request) {
  if (!isCronAuthorized(req.headers.get("authorization"))) {
    return new Response("No autorizado", { status: 401 });
  }

  const users = await prisma.user.findMany({ select: { id: true } });

  let created = 0;
  let refreshed = 0;
  let pushSent = 0;

  for (const { id: userId } of users) {
    const detected = await detectAll(userId);
    if (detected.length === 0) continue;

    const items = await narrate(detected);

    /*
     * `upsert` sobre (userId, fingerprint), no `create`.
     *
     * El cron corre a diario y volverá a detectar el mismo cobro duplicado cada
     * mañana hasta que salga de la ventana de 3 días. Con `create` serían tres
     * notificaciones del mismo hecho y la app silenciada al cuarto día. Aquí el
     * segundo día solo refresca la redacción y el `updatedAt`.
     */
    const fresh: typeof items = [];

    for (const item of items) {
      const before = await prisma.insight.findUnique({
        where: { userId_fingerprint: { userId, fingerprint: item.fingerprint } },
        select: { id: true },
      });

      await prisma.insight.upsert({
        where: { userId_fingerprint: { userId, fingerprint: item.fingerprint } },
        create: {
          userId,
          kind: item.kind,
          fingerprint: item.fingerprint,
          title: item.title,
          body: item.body,
          severity: item.severity,
        },
        update: { title: item.title, body: item.body, severity: item.severity },
      });

      if (before) refreshed++;
      else {
        created++;
        fresh.push(item);
      }
    }

    /*
     * Solo se notifica lo NUEVO, y en una sola notificación con el hallazgo más
     * grave. Tres avisos seguidos por tres hallazgos distintos es exactamente
     * la forma de que el usuario silencie la app entera —el mismo criterio que
     * ya sigue `/api/cron/alerts`—.
     */
    if (fresh.length > 0 && pushEnabled()) {
      const top = [...fresh].sort((a, b) => b.severity - a.severity)[0];
      const result = await sendPush(userId, {
        title: top.title,
        body:
          fresh.length === 1
            ? top.body
            : `${top.body}\n\nY ${fresh.length - 1} cosa${fresh.length > 2 ? "s" : ""} más por revisar.`,
        url: "/",
        tag: "insights",
      });
      pushSent += result.sent;
    }
  }

  return NextResponse.json({
    ok: true,
    users: users.length,
    created,
    refreshed,
    pushSent,
    pushEnabled: pushEnabled(),
  });
}
