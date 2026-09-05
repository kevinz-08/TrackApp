import { z } from "zod";
import type { ChatRoute } from "@/lib/chat-routes";

export type { ChatRoute };

export type ToolContext = {
  /**
   * Siempre de la sesión autenticada. El modelo no puede influir en esto: no
   * viaja en `args`, viaja por un canal que el modelo no escribe.
   */
  userId: string;
  /** Desde qué vista se abrió el chat. Pista de intención, nunca una credencial. */
  route?: ChatRoute;
};

export type Tool<S extends z.ZodType = z.ZodType> = {
  name: string;
  description: string;
  schema: S;
  /** Herramientas que escriben en la base. Se marcan para poder acotarlas y auditarlas. */
  mutates?: boolean;
  run: (args: z.infer<S>, ctx: ToolContext) => Promise<unknown>;
};

export function defineTool<S extends z.ZodType>(tool: Tool<S>): Tool<S> {
  return tool as unknown as Tool<S>;
}

/**
 * Zod v4 emite JSON Schema nativamente, que es el formato que Groq espera en
 * `function.parameters`. Sin esto habría que mantener el esquema dos veces —uno
 * para validar, otro para el modelo— y desincronizarlos es cuestión de tiempo.
 *
 * `io: "input"` es deliberado: describe lo que el modelo debe ENVIAR, así que
 * un campo con `.default()` sale como opcional en vez de como requerido.
 * Se usa draft-7 porque es el dialecto que aceptan los endpoints compatibles
 * con OpenAI, y se quita `$schema` porque Groq rechaza claves que no espera.
 */
export function toGroqSchema(tool: Tool) {
  const parameters = z.toJSONSchema(tool.schema, { io: "input", target: "draft-7" }) as Record<
    string,
    unknown
  >;
  delete parameters.$schema;

  return {
    type: "function" as const,
    function: { name: tool.name, description: tool.description, parameters },
  };
}

/**
 * Monto tal como lo emite un LLM. No se usa `amountSchema` directamente porque
 * su `.int()` rechazaría "20000.0", que es una forma perfectamente razonable de
 * que un modelo escriba veinte mil. Se acepta el decimal y se redondea al
 * ejecutar: el entero se garantiza igual, sin perder la transacción.
 */
export const modelAmount = z.number().positive().max(999_999_999_999);
