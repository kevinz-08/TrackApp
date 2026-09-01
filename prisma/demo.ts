/**
 * Datos de demostración para ver el panel con forma antes de tener historial
 * propio. No forma parte del seed: el seed crea lo imprescindible (usuario y
 * categorías), esto solo rellena movimientos de ejemplo.
 *
 *   pnpm db:demo          carga seis meses de movimientos de ejemplo
 *   pnpm db:demo:clear    borra TODAS las transacciones del usuario
 */
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

/** [categoría, monto, concepto, esFijo] */
const CURRENT_MONTH: Array<[string, number, string, boolean]> = [
  ["Hogar", 1_450_000, "Arriendo", true],
  ["Hogar", 210_000, "Servicios", true],
  ["Suscripciones", 26_900, "Netflix", true],
  ["Suscripciones", 16_900, "Spotify", true],
  ["Alimentación", 320_000, "Mercado", false],
  ["Alimentación", 25_000, "Almuerzo", false],
  ["Alimentación", 48_000, "Rappi", false],
  ["Transporte", 120_000, "Gasolina", false],
  ["Transporte", 34_000, "Uber", false],
  ["Salidas y Ocio", 180_000, "Concierto", false],
  ["Salidas y Ocio", 62_000, "Cine", false],
  ["Salud", 95_000, "Odontología", false],
  ["Educación", 240_000, "Curso de inglés", false],
  ["Otros", 45_000, "Regalo", false],
];

async function main() {
  const clear = process.argv.includes("--clear");
  const user = await prisma.user.findFirstOrThrow();

  const removed = await prisma.transaction.deleteMany({ where: { userId: user.id } });
  if (clear) {
    console.log(`Borradas ${removed.count} transacciones.`);
    return;
  }

  const categories = await prisma.category.findMany({ where: { userId: user.id } });
  const categoryId = (name: string) => categories.find((c) => c.name === name)?.id ?? null;

  const now = new Date();
  const data = CURRENT_MONTH.map(([category, amount, description, isFixed]) => ({
    userId: user.id,
    categoryId: categoryId(category),
    type: "EXPENSE" as const,
    amount,
    description,
    isFixed,
    source: isFixed ? ("RECURRING" as const) : ("MANUAL" as const),
    occurredAt: new Date(now.getFullYear(), now.getMonth(), Math.min(1 + (amount % 26), 28)),
  }));

  // Cinco meses hacia atrás para que la línea de evolución tenga forma.
  for (let back = 0; back <= 5; back++) {
    const drift = 1 + (back % 3) * 0.08;
    const at = (day: number) => new Date(now.getFullYear(), now.getMonth() - back, day);

    data.push({
      userId: user.id, categoryId: categoryId("Salario"), type: "INCOME" as never,
      amount: 4_200_000, description: "Salario", isFixed: true,
      source: "RECURRING" as const, occurredAt: at(1),
    });

    if (back === 0) continue; // El mes actual ya tiene su detalle arriba.

    data.push({
      userId: user.id, categoryId: categoryId("Hogar"), type: "EXPENSE" as const,
      amount: Math.round(1_450_000 * drift), description: "Arriendo", isFixed: true,
      source: "RECURRING" as const, occurredAt: at(3),
    });
    data.push({
      userId: user.id, categoryId: categoryId("Alimentación"), type: "EXPENSE" as const,
      amount: Math.round(780_000 * drift), description: "Mercado y comidas", isFixed: false,
      source: "MANUAL" as const, occurredAt: at(12),
    });
    data.push({
      userId: user.id, categoryId: categoryId("Transporte"), type: "EXPENSE" as const,
      amount: Math.round(260_000 * drift), description: "Transporte", isFixed: false,
      source: "MANUAL" as const, occurredAt: at(18),
    });
  }

  await prisma.transaction.createMany({ data });
  console.log(`Cargadas ${data.length} transacciones de demostración.`);
  console.log("Para borrarlas: pnpm db:demo:clear");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
