import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { suggestCategory } from "@/services/categorization";
import { defineTool, modelAmount } from "./define";

const consultarGastos = defineTool({
  name: "consultarGastos",
  description:
    "Consulta transacciones individuales en un rango de fechas, opcionalmente filtradas por categoría. Úsala cuando pregunten por movimientos concretos ('¿en qué gasté el martes?'), no por totales: para totales usa resumenPeriodo.",
  schema: z.object({
    desde: z.string().describe("Fecha inicial ISO (YYYY-MM-DD)"),
    hasta: z.string().describe("Fecha final ISO (YYYY-MM-DD)"),
    categoria: z.string().optional().describe("Nombre de la categoría, parcial o completo"),
  }),
  async run({ desde, hasta, categoria }, { userId }) {
    const from = new Date(desde);
    const to = new Date(hasta);
    // Un modelo puede emitir una fecha imposible ("2026-02-31"): se rechaza
    // aquí y el mensaje vuelve al modelo, que reintenta con una válida.
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new Error("Fechas inválidas");
    }

    const rows = await prisma.transaction.findMany({
      where: {
        userId, // ← siempre de la sesión
        occurredAt: { gte: from, lte: to },
        ...(categoria && {
          category: { name: { contains: categoria, mode: "insensitive" } },
        }),
      },
      select: {
        amount: true,
        description: true,
        occurredAt: true,
        type: true,
        category: { select: { name: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 50,
    });

    return rows.map((t) => ({
      monto: t.amount,
      concepto: t.description,
      fecha: t.occurredAt.toISOString().slice(0, 10),
      tipo: t.type,
      categoria: t.category?.name ?? "Sin categoría",
    }));
  },
});

const registrarTransaccion = defineTool({
  name: "registrarTransaccion",
  description:
    "Registra un ingreso o egreso del usuario. El monto va en pesos colombianos. Úsala en cuanto el usuario mencione un gasto o ingreso concreto, sin pedirle que confirme datos que puedes inferir.",
  mutates: true,
  schema: z.object({
    tipo: z.enum(["INCOME", "EXPENSE"]),
    monto: modelAmount,
    descripcion: z.string().min(1).max(140),
    fecha: z.string().optional().describe("Fecha ISO (YYYY-MM-DD). Omítela si el gasto es de hoy."),
  }),
  async run({ tipo, monto, descripcion, fecha }, { userId }) {
    const occurredAt = fecha ? new Date(fecha) : undefined;
    if (occurredAt && Number.isNaN(occurredAt.getTime())) throw new Error("Fecha inválida");

    const tx = await prisma.transaction.create({
      data: {
        userId, // ← siempre de la sesión
        type: tipo,
        // El redondeo vive aquí y no en el esquema: el principio del dinero en
        // enteros se cumple igual, pero un decimal del modelo no tumba el registro.
        amount: Math.round(monto),
        description: descripcion,
        categoryId: await suggestCategory(descripcion, userId, tipo),
        source: "AI_CHAT",
        ...(occurredAt && { occurredAt }),
      },
      select: { id: true, amount: true, description: true, category: { select: { name: true } } },
    });

    return {
      id: tx.id,
      monto: tx.amount,
      concepto: tx.description,
      categoria: tx.category?.name ?? "Sin categoría",
    };
  },
});

export const transactionTools = [consultarGastos, registrarTransaccion];
