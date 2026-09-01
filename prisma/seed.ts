import { config as loadEnv } from "dotenv";
import { PrismaClient, type CategoryKind } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// Categorías base del documento de visión (§4.3)
const CATEGORIES: Array<{ name: string; kind: CategoryKind; color: string; icon: string }> = [
  { name: "Hogar", kind: "EXPENSE", color: "#8b7355", icon: "house" },
  { name: "Alimentación", kind: "EXPENSE", color: "#e0803a", icon: "utensils" },
  { name: "Transporte", kind: "EXPENSE", color: "#3a86e0", icon: "bus" },
  { name: "Suscripciones", kind: "EXPENSE", color: "#9b5de5", icon: "repeat" },
  { name: "Salidas y Ocio", kind: "EXPENSE", color: "#e05a8b", icon: "party-popper" },
  { name: "Salud", kind: "EXPENSE", color: "#2fb37a", icon: "heart-pulse" },
  { name: "Educación", kind: "EXPENSE", color: "#4d67d6", icon: "graduation-cap" },
  { name: "Otros", kind: "EXPENSE", color: "#888780", icon: "circle-dashed" },
  { name: "Salario", kind: "INCOME", color: "#1d9e75", icon: "banknote" },
  { name: "Freelance", kind: "INCOME", color: "#16a394", icon: "laptop" },
  { name: "Otros ingresos", kind: "INCOME", color: "#7a9e1d", icon: "plus-circle" },
];

async function main() {
  const email = process.env.SEED_USER_EMAIL ?? "kevingadev@gmail.com";
  const password = process.env.SEED_USER_PASSWORD ?? "cambiame123";

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: process.env.SEED_USER_NAME ?? "Santiago",
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { userId_name: { userId: user.id, name: c.name } },
      update: {},
      create: { ...c, isDefault: true, userId: user.id },
    });
  }

  await prisma.account.upsert({
    where: { id: `${user.id}-efectivo` },
    update: {},
    create: { id: `${user.id}-efectivo`, userId: user.id, name: "Efectivo", type: "CASH" },
  });

  console.log(`Seed listo. Usuario: ${email}`);
  if (!process.env.SEED_USER_PASSWORD) {
    console.log("Password por defecto: cambiame123 (cámbialo antes de desplegar)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
