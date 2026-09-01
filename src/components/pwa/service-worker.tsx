"use client";

import { useEffect } from "react";

/**
 * Registra el service worker y vacía la cola offline al recuperar la red.
 *
 * Va montado en el layout autenticado y no renderiza nada: es un efecto, no
 * interfaz. Se registra tras `load` para no competir por ancho de banda con la
 * primera pintura.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* En desarrollo puede fallar; no es motivo para romper la app. */
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);

    // Al volver la conexión se pide vaciar la cola. Background Sync ya lo hace
    // donde existe, pero Safari no lo implementa y ahí este evento es la única
    // vía — justo en el navegador que más importa para este producto.
    const flush = () => {
      navigator.serviceWorker.ready
        .then((reg) => reg.active?.postMessage({ type: "flush-queue" }))
        .catch(() => {});
    };
    window.addEventListener("online", flush);
    flush();

    return () => {
      window.removeEventListener("load", register);
      window.removeEventListener("online", flush);
    };
  }, []);

  return null;
}
