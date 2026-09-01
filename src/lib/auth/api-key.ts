import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export const hashKey = (raw: string) => createHash("sha256").update(raw).digest("hex");

/** El token en claro se muestra UNA sola vez; en base solo vive el hash. */
export function generateApiKey() {
  const raw = `tk_${randomBytes(24).toString("base64url")}`;
  return { raw, hash: hashKey(raw) };
}

export async function resolveApiKey(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const record = await prisma.apiKey.findUnique({
    where: { keyHash: hashKey(authHeader.slice(7)) },
    select: { id: true, userId: true, revokedAt: true },
  });
  if (!record || record.revokedAt) return null;
  return record;
}
