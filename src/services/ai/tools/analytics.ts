import { z } from "zod";
import { defineTool } from "./define";
import { expensesByCategory, monthlyTrend, topTransactions } from "@/services/finance/aggregations";
import { getSubscriptions } from "@/services/finance/subscriptions";

const resumenPeriodo = defineTool({
  name: "resumenPeriodo",
  description:
    "Compara ingresos, egresos y gasto por categoría del mes actual contra los meses anteriores, e incluye los gastos más grandes del mes. Úsala cuando pregunten cómo van, en qué se les fue la plata, o si mejoraron respecto al mes pasado.",
  schema: z.object({
    meses: z
      .number()
      .int()
      .min(2)
      .max(12)
      .default(4)
      .describe("Cuántos meses de historia comparar, incluido el actual"),
  }),
  async run({ meses }, { userId }) {
    const [trend, categories, top] = await Promise.all([
      monthlyTrend(userId, meses),
      expensesByCategory(userId),
      topTransactions(userId, 5),
    ]);

    /*
     * La variación se calcula aquí y no se le pide al modelo: un LLM restando
     * y dividiendo cifras de seis dígitos se equivoca, y una cifra inventada
     * en una app de finanzas es peor que no responder.
     */
    const [previous, current] = trend.slice(-2);
    const delta = (now: number, before: number) =>
      before === 0 ? null : Math.round(((now - before) / before) * 100);

    return {
      evolucion: trend.map((m) => ({ periodo: m.period, ingresos: m.income, egresos: m.expense })),
      variacion: current &&
        previous && {
          ingresosPct: delta(current.income, previous.income),
          egresosPct: delta(current.expense, previous.expense),
        },
      porCategoria: categories.map((c) => ({ categoria: c.name, total: c.total })),
      mayoresGastos: top.map((t) => ({
        concepto: t.description,
        monto: t.amount,
        categoria: t.category?.name ?? "Sin categoría",
      })),
    };
  },
});

const auditarSuscripciones = defineTool({
  name: "auditarSuscripciones",
  description:
    "Lista las suscripciones activas con su costo anualizado, cuáles llevan mucho tiempo cobrándose sin revisión, y cuánto se ahorró al cancelar otras. Úsala cuando pregunten por pagos recurrentes o por dónde recortar.",
  schema: z.object({}),
  async run(_args, { userId }) {
    const s = await getSubscriptions(userId);
    return {
      activas: s.active.map((x) => ({
        nombre: x.name,
        monto: x.amount,
        frecuencia: x.frequency,
        costoAnual: x.annual,
        proximoCobro: x.nextRunAt.slice(0, 10),
        // `stale` es una pregunta, no una acusación: la app no sabe si el
        // usuario usa el servicio, solo que lleva mucho sin revisarse.
        llevaTiempoSinRevisar: x.stale,
      })),
      totalMensual: s.monthlyTotal,
      totalAnual: s.annualTotal,
      ahorradoAlCancelar: s.savedPerYear,
    };
  },
});

export const analyticsTools = [resumenPeriodo, auditarSuscripciones];
