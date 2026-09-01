import { config as loadEnv } from "dotenv";
import { PrismaClient, type CategoryKind } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// Categorías base del documento de visión (§4.3).
// Los colores son los ocho slots del orden fijo validado en lib/chart-palette.ts:
// no reasignar a ojo, el orden es lo que garantiza la separación bajo daltonismo.
const CATEGORIES: Array<{ name: string; kind: CategoryKind; color: string; icon: string }> = [
  { name: "Alimentación", kind: "EXPENSE", color: "#2a78d6", icon: "utensils" },
  { name: "Transporte", kind: "EXPENSE", color: "#eb6834", icon: "bus" },
  { name: "Hogar", kind: "EXPENSE", color: "#1baf7a", icon: "house" },
  { name: "Suscripciones", kind: "EXPENSE", color: "#eda100", icon: "repeat" },
  { name: "Salidas y Ocio", kind: "EXPENSE", color: "#e87ba4", icon: "party-popper" },
  { name: "Salud", kind: "EXPENSE", color: "#008300", icon: "heart-pulse" },
  { name: "Educación", kind: "EXPENSE", color: "#4a3aa7", icon: "graduation-cap" },
  { name: "Otros", kind: "EXPENSE", color: "#e34948", icon: "circle-dashed" },
  // Los ingresos nunca comparten gráfico con los egresos: reusan los tres
  // primeros slots, que son los que validan en modo "todos los pares".
  { name: "Salario", kind: "INCOME", color: "#2a78d6", icon: "banknote" },
  { name: "Freelance", kind: "INCOME", color: "#eb6834", icon: "laptop" },
  { name: "Otros ingresos", kind: "INCOME", color: "#1baf7a", icon: "plus-circle" },
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
    const existing = await prisma.category.findUnique({
      where: { userId_name: { userId: user.id, name: c.name } },
      select: { id: true, isDefault: true },
    });

    if (!existing) {
      await prisma.category.create({ data: { ...c, isDefault: true, userId: user.id } });
      continue;
    }

    // Solo se resincronizan las categorías por defecto: si el usuario
    // personalizó color o ícono, el seed no lo pisa.
    if (existing.isDefault) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { color: c.color, icon: c.icon, kind: c.kind },
      });
    }
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
