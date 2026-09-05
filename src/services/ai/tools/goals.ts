import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { defineTool, modelAmount } from "./define";
import { requiredMonthlyPace, goalProgress } from "@/services/finance/goals";
import { monthlyTrend } from "@/services/finance/aggregations";

/**
 * Excedente mensual promedio de los últimos meses cerrados.
 *
 * El mes en curso se descarta a propósito: a día 3 su egreso está a un décimo
 * de lo que acabará siendo, y contarlo haría creer que sobra dinero que no
 * sobra. Un plan de ahorro construido sobre esa cifra falla el primer mes.
 */
async function averageSurplus(userId: string, months = 4) {
  const trend = await monthlyTrend(userId, months + 1);
  const closed = trend.slice(0, -1);
  if (closed.length === 0) return null;

  const total = closed.reduce((acc, m) => acc + (m.income - m.expense), 0);
  return { promedioMensual: Math.round(total / closed.length), mesesConsiderados: closed.length };
}

const estadoMetas = defineTool({
  name: "estadoMetas",
  description:
    "Lista las metas de ahorro del usuario con lo ahorrado, lo que falta, el porcentaje de avance y el ritmo mensual necesario para llegar a la fecha objetivo.",
  schema: z.object({}),
  async run(_args, { userId }) {
    const goals = await prisma.savingGoal.findMany({
      where: { userId, completedAt: null },
      select: { name: true, targetAmount: true, currentAmount: true, targetDate: true },
    });

    return goals.map((g) => ({
      nombre: g.name,
      objetivo: g.targetAmount,
      ahorrado: g.currentAmount,
      falta: Math.max(0, g.targetAmount - g.currentAmount),
      avancePct: goalProgress(g.currentAmount, g.targetAmount),
      fechaObjetivo: g.targetDate?.toISOString().slice(0, 10) ?? null,
      ritmoMensualNecesario: requiredMonthlyPace(g),
    }));
  },
});

const planificarMeta = defineTool({
  name: "planificarMeta",
  description:
    "Simula si una meta de ahorro es alcanzable: calcula cuánto habría que guardar por mes y por semana, y lo compara con el excedente real del usuario. Úsala cuando quieran ahorrar para algo o pregunten en cuánto tiempo lo lograrían.",
  schema: z.object({
    objetivo: modelAmount.describe("Monto total que se quiere reunir"),
    meses: z.number().int().min(1).max(120).describe("En cuántos meses se quiere lograr"),
    yaAhorrado: modelAmount.optional().describe("Cuánto lleva reunido, si aplica"),
  }),
  async run({ objetivo, meses, yaAhorrado }, { userId }) {
    const falta = Math.max(0, Math.round(objetivo) - Math.round(yaAhorrado ?? 0));
    const porMes = Math.ceil(falta / meses);
    const surplus = await averageSurplus(userId);

    /*
     * Devolver solo "necesitas 200.000 al mes" es aritmética que el usuario
     * podía hacer solo. El valor está en la segunda cifra: cuánto le sobra de
     * verdad. Con las dos, el modelo puede decir si el plan cabe sin inventarse
     * el número que falta.
     */
    return {
      falta,
      meses,
      ahorroMensualNecesario: porMes,
      ahorroSemanalNecesario: Math.ceil(porMes / 4.33),
      excedenteMensualPromedio: surplus?.promedioMensual ?? null,
      mesesConsiderados: surplus?.mesesConsiderados ?? 0,
      cabeEnElExcedente: surplus ? surplus.promedioMensual >= porMes : null,
      /** Si no cabe, en cuántos meses sí cabría al ritmo actual. */
      mesesAlRitmoActual:
        surplus && surplus.promedioMensual > 0 ? Math.ceil(falta / surplus.promedioMensual) : null,
    };
  },
});

export const goalTools = [estadoMetas, planificarMeta];
