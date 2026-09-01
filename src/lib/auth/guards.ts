import { auth } from "@/auth";
import { resolveApiKey } from "@/lib/auth/api-key";

/** Para Server Actions y páginas: lanza si no hay sesión. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autorizado");
  return session.user as { id: string; email?: string | null; name?: string | null };
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
