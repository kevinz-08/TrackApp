import type { Snapshot } from "@/services/ai/context";
import type { ChatRoute } from "@/services/ai/tools/define";

const total = (totals: Snapshot["totals"], type: "INCOME" | "EXPENSE") =>
  totals.find((t) => t.type === type)?._sum.amount ?? 0;

/**
 * El snapshot se serializa como texto compacto, no como JSON crudo: el JSON
 * gasta tokens en llaves, comillas y nombres de campo repetidos.
 */
export function renderSnapshot(s: Snapshot) {
  const income = total(s.totals, "INCOME");
  const expense = total(s.totals, "EXPENSE");

  return [
    `PERIODO: ${s.period.toISOString().slice(0, 7)}`,
    `INGRESOS: ${income}`,
    `EGRESOS: ${expense}`,
    `AHORRADO EN METAS: ${s.savings}`,
    `BALANCE: ${income - expense - s.savings}`,
    ``,
    `GASTO POR CATEGORIA:`,
    ...s.byCategory.map(
      (c) =>
        `- ${s.categoryNames.get(c.categoryId ?? "") ?? "Sin categoría"}: ${c._sum.amount ?? 0}`,
    ),
    ``,
    `METAS: ${s.goals.map((g) => `${g.name} ${g.currentAmount}/${g.targetAmount}`).join(" | ") || "ninguna"}`,
    `SUSCRIPCIONES: ${s.subs.map((x) => `${x.name} ${x.amount}/${x.frequency}`).join(" | ") || "ninguna"}`,
    `TARJETAS: ${s.cards.map((c) => `${c.name} deuda ${c.currentDebt} de cupo ${c.creditLimit}`).join(" | ") || "ninguna"}`,
  ].join("\n");
}

export const SYSTEM_PROMPT = `Eres el asistente financiero de TrackApp. Hablas español colombiano, directo y sin tecnicismos innecesarios.

REGLAS:
- Todos los montos están en pesos colombianos (COP), sin decimales.
- Responde SIEMPRE basándote en los datos del resumen. Nunca inventes cifras.
- Si te falta información para responder, usa las herramientas disponibles.
- No juzgues ni regañes al usuario por sus gastos. Informa y sugiere.
- Sé breve: dos o tres frases salvo que pidan un análisis detallado.
- Formato: prosa por defecto. La interfaz renderiza viñetas con guion, listas
  numeradas, **negrita** y \`código\`, así que úsalos SOLO cuando enumeres tres o
  más cosas comparables. Nada de encabezados, tablas ni enlaces: eso no se pinta.
- Los aportes a metas NO son gasto: son ahorro y van en su propia cifra.
- Si detectas un riesgo financiero real (deuda creciendo, gasto muy por encima del ingreso), menciónalo con calma y una acción concreta.

DATOS FINANCIEROS ACTUALES:
{{SNAPSHOT}}`;

/**
 * Asistencia contextual: el PROPÓSITO cambia con la vista, las reglas no.
 *
 * Esto se añade al final del prompt base, nunca lo sustituye. Las reglas duras
 * —no inventar cifras, no juzgar, los aportes a metas no son gasto— tienen que
 * seguir vigentes en las cinco vistas; lo único que cambia es qué debe
 * perseguir el agente mientras el usuario está ahí.
 */
const ROUTE_FOCUS: Partial<Record<ChatRoute, string>> = {
  "/cards":
    "El usuario está viendo sus tarjetas de crédito. Tu prioridad es protegerlo de pagar intereses: avísale de las fechas de corte y de pago, y cuando mencione una compra grande calcula el costo real del diferido con simularDiferido ANTES de opinar. Nunca estimes intereses de cabeza y nunca recomiendes pagar solo el mínimo.",
  "/goals":
    "El usuario está viendo sus metas de ahorro. Tu prioridad es que el plan sea realista contra su flujo de caja: usa planificarMeta para contrastar el ritmo necesario con su excedente real, propón una cifra semanal o mensual concreta y di de dónde saldría. Si la meta no cabe en sus ingresos, dilo con una alternativa —más plazo o menos monto—, nunca con un reproche.",
  "/subscriptions":
    "El usuario está viendo sus suscripciones. Tu prioridad es detectar cobros duplicados, servicios que lleva mucho sin revisar y el costo anualizado, que casi siempre sorprende más que el mensual. Sugerir cancelar es válido; insistir, no.",
  "/transactions":
    "El usuario está revisando sus movimientos. Tu prioridad es registrar y corregir rápido: si menciona un gasto, regístralo de una vez con registrarTransaccion sin pedirle que confirme datos que puedes inferir. Confirma después, con la cifra ya guardada.",
};

/** Prompt final: reglas base + snapshot + foco de la vista actual. */
export function buildSystemPrompt(snapshot: Snapshot, route?: ChatRoute) {
  const base = SYSTEM_PROMPT.replace("{{SNAPSHOT}}", renderSnapshot(snapshot));
  const focus = route ? ROUTE_FOCUS[route] : undefined;
  return focus ? `${base}\n\nCONTEXTO DE LA VISTA ACTUAL:\n${focus}` : base;
}
