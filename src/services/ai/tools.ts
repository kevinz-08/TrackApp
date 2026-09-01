import { prisma } from "@/lib/prisma";
import { suggestCategory } from "@/services/categorization";

export const tools = [
  {
    type: "function" as const,
    function: {
      name: "consultarGastos",
      description: "Consulta transacciones en un rango de fechas, opcionalmente filtradas por categoría.",
      parameters: {
        type: "object",
        properties: {
          desde: { type: "string", description: "Fecha inicial ISO (YYYY-MM-DD)" },
          hasta: { type: "string", description: "Fecha final ISO (YYYY-MM-DD)" },
          categoria: { type: "string", description: "Nombre de la categoría (opcional)" },
        },
        required: ["desde", "hasta"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "registrarTransaccion",
      description: "Registra un nuevo ingreso o egreso.",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["INCOME", "EXPENSE"] },
          monto: { type: "number" },
          descripcion: { type: "string" },
          categoria: { type: "string" },
        },
        required: ["tipo", "monto", "descripcion"],
      },
    },
  },
];

type ToolArgs = Record<string, unknown>;

/**
 * REGLA DE SEGURIDAD NO NEGOCIABLE: `userId` nunca sale de los argumentos que
 * genera el modelo. Se inyecta desde la sesión autenticada al ejecutar.
 */
export async function runTool(name: string, args: ToolArgs, userId: string) {
  switch (name) {
    case "consultarGastos": {
      const desde = new Date(String(args.desde));
      const hasta = new Date(String(args.hasta));
      const categoria = typeof args.categoria === "string" ? args.categoria : undefined;

      return prisma.transaction.findMany({
        where: {
          userId, // ← siempre de la sesión
          occurredAt: { gte: desde, lte: hasta },
          ...(categoria && {
            category: { name: { contains: categoria, mode: "insensitive" } },
          }),
        },
        select: { amount: true, description: true, occurredAt: true },
        orderBy: { occurredAt: "desc" },
        take: 50,
      });
    }

    case "registrarTransaccion": {
      const monto = Math.round(Number(args.monto));
      if (!Number.isFinite(monto) || monto <= 0) return { ok: false, error: "Monto inválido" };

      const tipo = args.tipo === "INCOME" ? "INCOME" : "EXPENSE";
      const descripcion = String(args.descripcion ?? "").slice(0, 140);

      const tx = await prisma.transaction.create({
        data: {
          userId, // ← siempre de la sesión
          type: tipo,
          amount: monto,
          description: descripcion,
          categoryId: await suggestCategory(descripcion, userId, tipo),
          source: "AI_CHAT",
        },
        select: { id: true, amount: true, description: true },
      });
      return { ok: true, ...tx };
    }

    default:
      return { ok: false, error: `Herramienta desconocida: ${name}` };
  }
}
