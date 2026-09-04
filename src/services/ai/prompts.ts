import type { Snapshot } from "@/services/ai/context";

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
