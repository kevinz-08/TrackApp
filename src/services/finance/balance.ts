import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { monthStart, monthEnd } from "@/lib/dates";

/**
 * Balance del período.
 *
 * DECISIÓN DE CONTABILIDAD: un aporte a una meta se guarda como `EXPENSE` con
 * `savingGoalId`, porque el dinero sí sale del disponible. Pero **ahorrar no es
 * gastar**: si se sumara al gasto, el panel diría que gastaste de más justo el
 * mes en que fuiste más disciplinado, y aparecería en "en qué se te fue la
 * plata" como si fuera un consumo.
 *
 * Por eso se separa en su propia magnitud `savings`, y `expense` cuenta solo
 * gasto real. El balance resta las dos, así que el disponible sigue siendo
 * correcto y las cifras del panel cuadran entre sí.
 *
 * A largo plazo lo correcto es un tipo `TRANSFER` en el modelo; esto evita la
 * migración sin mentir en ninguna cifra.
 */
export async function getMonthlyBalance(userId: string, reference = new Date()) {
  const gte = monthStart(reference);
  const lt = monthEnd(reference);

  // En paralelo, no en cadena: son consultas independientes y cada ida y vuelta
  // a Neon cuesta ~80ms desde fuera de su región. Encadenarlas multiplica esa
  // latencia por el número de consultas sin ganar nada.
  const [rows, savingsRow] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type", "isFixed"],
      where: { userId, occurredAt: { gte, lt }, savingGoalId: null },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, occurredAt: { gte, lt }, savingGoalId: { not: null } },
      _sum: { amount: true },
    }),
  ]);

  const pick = (type: "INCOME" | "EXPENSE", isFixed?: boolean) =>
    rows
      .filter((r) => r.type === type && (isFixed === undefined || r.isFixed === isFixed))
      .reduce((acc, r) => acc + (r._sum.amount ?? 0), 0);

  const income = pick("INCOME");
  const expense = pick("EXPENSE");
  const savings = savingsRow._sum.amount ?? 0;

  return {
    periodStart: gte,
    periodEnd: lt,
    income,
    expense,
    savings,
    balance: income - expense - savings,
    fixedExpense: pick("EXPENSE", true),
    variableExpense: pick("EXPENSE", false),
  };
}

/**
 * Proyección simple del saldo al cierre, contando los fijos aún no
 * materializados.
 *
 * Memoizada por petición: la portada la necesita en dos sitios —la cifra
 * grande y el reparto fijo/variable—, que ahora son dos ramas de Suspense
 * distintas. Sin `cache()` cada rama repetiría las tres consultas.
 */
export const getCashFlowProjection = cache(async function getCashFlowProjection(
  userId: string,
  reference = new Date(),
) {
  // El fin de período no depende del balance —sale del calendario—, así que la
  // consulta de los fijos pendientes puede salir a la vez que las otras dos en
  // vez de esperar a que vuelvan.
  const periodEnd = monthEnd(reference);

  const [balance, pendingFixed] = await Promise.all([
    getMonthlyBalance(userId, reference),
    prisma.recurringRule.aggregate({
      where: {
        userId,
        isActive: true,
        type: "EXPENSE",
        nextRunAt: { gte: reference, lt: periodEnd },
      },
      _sum: { amount: true },
    }),
  ]);

  const pending = pendingFixed._sum.amount ?? 0;
  return { ...balance, pendingFixed: pending, projectedBalance: balance.balance - pending };
});
