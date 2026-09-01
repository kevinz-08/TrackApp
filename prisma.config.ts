import { config as loadEnv } from "dotenv";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Next.js lee .env.local; Prisma no carga nada por su cuenta.
loadEnv({ path: [".env.local", ".env"], quiet: true });

// Prisma 7 ya no lee la clave "prisma" de package.json, no carga .env por su
// cuenta y no acepta `url` dentro del bloque datasource: las cadenas de
// conexión viven aquí y el runtime usa un driver adapter (lib/prisma.ts).
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  // Neon expone dos cadenas. La CLI (migrate, studio) necesita la *directa*,
  // porque requiere una sesión persistente y falla contra el pooler. La app en
  // runtime usa la *pooled* vía DATABASE_URL en el adapter.
  datasource: {
    url: env("DIRECT_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
