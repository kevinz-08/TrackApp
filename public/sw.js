/**
 * Service worker de TrackApp.
 *
 * Hace tres cosas, y ninguna de ellas puede hacerse desde la página:
 *   1. Cachear para que la app abra sin red.
 *   2. Recibir notificaciones push (en iOS, solo si está en pantalla de inicio).
 *   3. Sostener la cola offline: un registro hecho sin señal se guarda en
 *      IndexedDB y se envía cuando vuelve la red.
 *
 * Está escrito a mano en vez de generado: son ~200 líneas y a cambio se ve
 * exactamente qué se cachea, algo que importa cuando la promesa del producto
 * son cinco segundos.
 */

// Subir la versión invalida lo cacheado. Aquí es obligatorio: las cachés de v2
// pueden contener cargas útiles de navegación (`?_rsc=`) que nunca debieron
// entrar, y servirlas es mostrar cifras de otro día.
const VERSION = "v3";
const STATIC_CACHE = `trackapp-static-${VERSION}`;
const DATA_CACHE = `trackapp-data-${VERSION}`;

const PRECACHE = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      // `addAll` falla entera si un recurso falla; se toleran los fallos
      // individuales para que una instalación no se caiga por un icono.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("trackapp-") && !k.endsWith(VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/* ─────────────────────────────────────────────────────────
   Cola offline en IndexedDB
   ───────────────────────────────────────────────────────── */

const DB_NAME = "trackapp";
const STORE = "outbox";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(result?.result ?? result);
    t.onerror = () => reject(t.error);
  });
}

async function enqueue(entry) {
  const db = await openDb();
  await tx(db, "readwrite", (store) => store.add(entry));
}

async function flushQueue() {
  const db = await openDb();
  const pending = await tx(db, "readonly", (store) => store.getAll());
  if (!pending.length) return;

  for (const item of pending) {
    try {
      const res = await fetch(item.url, {
        method: "POST",
        headers: item.headers,
        body: item.body,
      });
      // 4xx distinto de 429 significa que la petición era inválida: reintentarla
      // eternamente llenaría la cola de basura.
      if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429)) {
        await tx(db, "readwrite", (store) => store.delete(item.id));
      }
    } catch {
      return; // sigue sin red: se reintenta en el próximo evento
    }
  }

  const clients = await self.clients.matchAll();
  clients.forEach((c) => c.postMessage({ type: "queue-flushed" }));
}

self.addEventListener("sync", (event) => {
  if (event.tag === "trackapp-outbox") event.waitUntil(flushQueue());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "flush-queue") event.waitUntil(flushQueue());
});

/* ─────────────────────────────────────────────────────────
   Estrategias de red
   ───────────────────────────────────────────────────────── */

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // El registro rápido es lo único que se encola: es la promesa del producto y
  // el único POST que tiene sentido diferir.
  if (request.method === "POST" && url.pathname === "/api/quick-log") {
    event.respondWith(
      (async () => {
        const clone = request.clone();
        try {
          return await fetch(request);
        } catch {
          await enqueue({
            url: request.url,
            headers: Object.fromEntries(clone.headers.entries()),
            body: await clone.text(),
          });
          if ("sync" in self.registration) {
            try {
              await self.registration.sync.register("trackapp-outbox");
            } catch {
              /* Safari no lo soporta: se vacía al volver a abrir la app. */
            }
          }
          return new Response(
            JSON.stringify({
              ok: true,
              queued: true,
              message: "Sin señal. Se registrará al volver la conexión.",
            }),
            { status: 202, headers: { "Content-Type": "application/json" } },
          );
        }
      })(),
    );
    return;
  }

  if (request.method !== "GET") return;

  // El build de Next: red primero, y la caché solo como red de seguridad.
  //
  // NO va con los estáticos, aunque lo parezca. `next dev` sirve sus chunks en
  // esta misma ruta y reutiliza el nombre del archivo entre ediciones, así que
  // con caché primero la primera versión de un chunk se queda servida para
  // siempre: el HTML llega recién renderizado del servidor y el JS sale de la
  // caché, que es exactamente la discordancia de hidratación que React reporta.
  // En producción no se pierde nada: los nombres llevan hash y `fetch` resuelve
  // contra la caché HTTP —son `immutable`— sin salir a la red.
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        // Sin red se tira de lo cacheado; si tampoco está, falla como fallaría
        // sin service worker.
        .catch(() => caches.match(request).then((hit) => hit ?? Response.error())),
    );
    return;
  }

  // Datos de la API: red primero, caché como red de seguridad.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(DATA_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Navegación: red primero para no servir un panel con cifras viejas, con la
  // portada cacheada como último recurso si no hay señal.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }

  /*
   * Navegación desde dentro de la app: el router de Next no recarga la página,
   * pide la carga útil del servidor con `?_rsc=…` y la cabecera `RSC`.
   *
   * Estas peticiones NO llevan `mode: "navigate"` —las hace `fetch`, no el
   * navegador— así que caían en la regla de abajo, que es caché primero. Ahí el
   * daño es doble: el panel devuelve las cifras de la primera vez que se
   * visitó, y la precarga que hace Next al acercarse a un enlace se resuelve
   * contra la caché, con lo que la ruta parece instantánea y muestra datos
   * viejos. Van con la navegación: red primero, caché solo sin señal.
   */
  if (url.searchParams.has("_rsc") || request.headers.get("RSC") === "1") {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // Lo demás —iconos, manifest, imágenes—: caché primero, que es donde gana
  // tiempo el arranque. Aquí sí vale, porque son archivos que solo cambian
  // cuando se cambian a mano, no en cada edición.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
          }
          return res;
        }),
    ),
  );
});

/* ─────────────────────────────────────────────────────────
   Notificaciones push
   ───────────────────────────────────────────────────────── */

self.addEventListener("push", (event) => {
  let payload = { title: "TrackApp", body: "Tienes algo por revisar.", url: "/" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    /* Carga no-JSON: se muestra el aviso por defecto. */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      // Agrupa por tipo: tres recordatorios de la misma tarjeta no deben
      // apilarse como tres notificaciones distintas.
      tag: payload.tag ?? "trackapp",
      data: { url: payload.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Si la app ya está abierta se reutiliza esa ventana en vez de abrir otra.
      const open = clients.find((c) => c.url.includes(self.location.origin));
      if (open) return open.focus().then(() => open.navigate(target));
      return self.clients.openWindow(target);
    }),
  );
});
