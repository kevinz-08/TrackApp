import { prisma } from "@/lib/prisma";
import type { ChatRoute, Tool, ToolContext } from "./define";
import { toGroqSchema } from "./define";
import { transactionTools } from "./transactions";
import { analyticsTools } from "./analytics";
import { creditTools } from "./credit";
import { goalTools } from "./goals";

const ALL: Tool[] = [...transactionTools, ...analyticsTools, ...creditTools, ...goalTools];

const BY_NAME = new Map(ALL.map((t) => [t.name, t]));

/**
 * Catálogo por vista.
 *
 * No es una restricción de seguridad —todas las herramientas son del propio
 * usuario— sino de precisión y de coste: el modelo elige peor cuantas más
 * opciones ve, y cada definición viaja en TODAS las peticiones de la
 * conversación. En /cards no tiene sentido ofrecer el planificador de metas.
 *
 * Una ruta ausente del mapa recibe el catálogo completo, que es lo correcto
 * para la portada y para el chat abierto desde cualquier otro sitio.
 */
const BY_ROUTE: Partial<Record<ChatRoute, string[]>> = {
  "/cards": ["consultarGastos", "simularDiferido", "simularPagoMinimo", "estadoTarjetas"],
  "/goals": ["consultarGastos", "resumenPeriodo", "planificarMeta", "estadoMetas"],
  "/subscriptions": ["consultarGastos", "auditarSuscripciones", "resumenPeriodo"],
  "/transactions": ["consultarGastos", "registrarTransaccion", "resumenPeriodo"],
};

export function toolsFor(route?: ChatRoute) {
  const allowed = route ? BY_ROUTE[route] : undefined;
  const subset = allowed ? ALL.filter((t) => allowed.includes(t.name)) : ALL;
  return subset.map(toGroqSchema);
}

export type ToolOutcome = { ok: true; data: unknown } | { ok: false; error: string };

/**
 * Cuántas transacciones puede crear el agente por hora y usuario.
 *
 * El límite de mensajes del chat no cubre esto: una sola conversación con un
 * bucle degenerado podría crear una transacción por ronda. El contador mira la
 * tabla real, no la conversación, así que también acota los reintentos.
 */
const MUTATION_LIMIT_PER_HOUR = 20;

async function mutationBudgetExhausted(userId: string) {
  const recent = await prisma.transaction.count({
    where: { userId, source: "AI_CHAT", createdAt: { gte: new Date(Date.now() - 3_600_000) } },
  });
  return recent >= MUTATION_LIMIT_PER_HOUR;
}

/**
 * Punto único de ejecución. Tres garantías que el `switch` anterior no daba:
 * los argumentos se validan con Zod antes de tocar la base, un fallo vuelve al
 * modelo como texto que puede leer y corregir en la siguiente ronda, y el
 * `userId` entra por el contexto —jamás por `args`—.
 */
export async function runTool(
  name: string,
  rawArgs: unknown,
  ctx: ToolContext,
): Promise<ToolOutcome> {
  const tool = BY_NAME.get(name);
  if (!tool) return { ok: false, error: `Herramienta desconocida: ${name}` };

  const parsed = tool.schema.safeParse(rawArgs);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Argumentos inválidos: ${parsed.error.issues
        .map((i) => `${i.path.join(".") || "(raíz)"} ${i.message}`)
        .join("; ")}`,
    };
  }

  if (tool.mutates && (await mutationBudgetExhausted(ctx.userId))) {
    return {
      ok: false,
      error:
        "Se alcanzó el límite de registros automáticos por hora. Pídele al usuario que registre este movimiento a mano.",
    };
  }

  try {
    return { ok: true, data: await tool.run(parsed.data, ctx) };
  } catch (err) {
    // Se registra en el servidor y se le devuelve al modelo un mensaje neutro:
    // el detalle del error de Prisma no debe llegar a la conversación.
    console.error(`[tool:${name}]`, err);
    return { ok: false, error: "La herramienta falló al ejecutarse" };
  }
}
