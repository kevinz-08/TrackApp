"use client";

import { useEffect, useState, useTransition } from "react";
import { savePushSubscription, removePushSubscription, sendTestPush } from "@/actions/push";
import { Button } from "@/components/ui/button";
import { Card, MicroLabel } from "@/components/ui/surface";

/** La clave pública VAPID viaja en base64url y el navegador la pide en bytes. */
function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type State = "cargando" | "no-soportado" | "requiere-instalar" | "bloqueado" | "off" | "on";

export function PushSettings({ vapidKey }: { vapidKey: string | null }) {
  const [state, setState] = useState<State>("cargando");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    /*
     * La detección va dentro de una promesa, no en el cuerpo del efecto:
     * llamar a setState de forma síncrona ahí encadena renders. Además todas
     * estas comprobaciones dependen de APIs del navegador, así que no pueden
     * resolverse en el render inicial sin romper la hidratación.
     */
    void (async () => {
      const settle = (next: State) => {
        if (!cancelled) setState(next);
      };

      if (!vapidKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        settle("no-soportado");
        return;
      }

      /*
       * iOS 16.4+ solo entrega push si la PWA está en la pantalla de inicio. En
       * Safari de pestaña, `Notification` ni siquiera existe. Se detecta y se
       * explica: sin esto el usuario pulsa un botón que no puede funcionar.
       */
      if (typeof Notification === "undefined") {
        settle("requiere-instalar");
        return;
      }

      if (Notification.permission === "denied") {
        settle("bloqueado");
        return;
      }

      /*
       * `serviceWorker.ready` no resuelve NUNCA si no hay registro (por ejemplo
       * si el registro falló). Sin este límite la tarjeta se queda en
       * "Comprobando…" para siempre, que es peor que decir que no se pudo.
       */
      try {
        const reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
        ]);
        const sub = await reg.pushManager.getSubscription();
        settle(sub ? "on" : "off");
      } catch {
        settle("off");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vapidKey]);

  const enable = async () => {
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "bloqueado" : "off");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey!),
      });

      const json = sub.toJSON();
      await savePushSubscription({
        endpoint: sub.endpoint,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
        userAgent: navigator.userAgent,
      });
      setState("on");
      setMessage("Listo. Te avisaremos de cortes, pagos y cobros próximos.");
    } catch {
      setMessage("No se pudo activar. Inténtalo de nuevo.");
    }
  };

  const disable = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      setMessage(null);
    } catch {
      setMessage("No se pudo desactivar.");
    }
  };

  return (
    <Card className="space-y-3 p-4">
      <MicroLabel>Notificaciones</MicroLabel>

      {state === "cargando" && <p className="text-ink-3 text-[13px]">Comprobando…</p>}

      {state === "no-soportado" && (
        <p className="text-ink-2 text-[13px] leading-[19px]">
          Este navegador no admite notificaciones, o faltan las llaves VAPID en el
          servidor.
        </p>
      )}

      {state === "requiere-instalar" && (
        <p className="text-ink-2 text-[13px] leading-[19px]">
          En iPhone las notificaciones solo funcionan con la app añadida a la pantalla de
          inicio. Ábrela en Safari, toca Compartir y elige “Añadir a pantalla de inicio”.
        </p>
      )}

      {state === "bloqueado" && (
        <p className="text-ink-2 text-[13px] leading-[19px]">
          Bloqueaste las notificaciones para este sitio. Hay que reactivarlas desde los
          ajustes del navegador; desde aquí no se puede volver a preguntar.
        </p>
      )}

      {state === "off" && (
        <>
          <p className="text-ink-2 text-[13px] leading-[19px]">
            Avisos de fechas de corte y pago de tarjetas, y de cobros recurrentes
            próximos. Nada más.
          </p>
          <Button block onClick={enable} disabled={pending}>
            Activar notificaciones
          </Button>
        </>
      )}

      {state === "on" && (
        <>
          <p className="text-ink-2 text-[13px] leading-[19px]">
            Activadas en este dispositivo.
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              block
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await sendTestPush();
                  setMessage(
                    r.sent > 0
                      ? "Enviada. Debería llegarte en un momento."
                      : "No se pudo enviar a ningún dispositivo.",
                  );
                })
              }
            >
              Probar
            </Button>
            <Button variant="quiet" block onClick={disable} disabled={pending}>
              Desactivar
            </Button>
          </div>
        </>
      )}

      {message && <p className="text-ink-3 text-[12px]">{message}</p>}
    </Card>
  );
}
