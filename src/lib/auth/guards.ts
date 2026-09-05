import { cache } from "react";
import { auth } from "@/auth";
import { resolveApiKey } from "@/lib/auth/api-key";

/**
 * Resolución de sesión memoizada por petición.
 *
 * `auth()` no deduplica: cada llamada vuelve a leer la cookie, verificar la
 * firma del JWT y correr los callbacks. En una navegación cualquiera se llama
 * al menos tres veces —el layout, la página y cada `listX()` que la página
 * invoca—, y en la portada seis. `cache()` de React comparte el resultado
 * dentro de la misma petición, así que se paga una sola vez.
 *
 * El alcance es la petición, nunca el proceso: dos usuarios concurrentes no
 * comparten nada.
 */
const session = cache(() => auth());

/** Para Server Actions y páginas: lanza si no hay sesión. */
export async function requireUser() {
  const s = await session();
  if (!s?.user?.id) throw new Error("No autorizado");
  return s.user as { id: string; email?: string | null; name?: string | null };
}

/** Como `requireUser`, pero sin lanzar: para el layout, que redirige. */
export async function getUser() {
  const s = await session();
  return s?.user?.id
    ? (s.user as { id: string; email?: string | null; name?: string | null })
    : null;
}

/** Para Route Handlers externos (Shortcuts). Devuelve null en vez de lanzar. */
export async function requireApiKey(authHeader: string | null) {
  return resolveApiKey(authHeader);
}

/** Protege los endpoints de cron de Vercel. */
export function isCronAuthorized(authHeader: string | null) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && authHeader === `Bearer ${secret}`;
}
