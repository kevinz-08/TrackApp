import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Singleton obligatorio en Next.js: el hot reload crea múltiples instancias y
 * agota las conexiones de Neon.
 *
 * Prisma 7 exige un driver adapter; usamos `pg` contra la cadena *pooled* de
 * Neon, que es la correcta para funciones serverless.
 *
 * La construcción es perezosa: importar un módulo que toque `prisma` no debe
 * exigir DATABASE_URL. Así el build, los tests y los helpers puros funcionan
 * sin conexión, y el error por variable ausente aparece en la primera query.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Falta DATABASE_URL");

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const client = createClient();
    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
    else return (globalForPrisma.prisma = client);
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get: (_target, prop) => Reflect.get(getClient(), prop),
});
