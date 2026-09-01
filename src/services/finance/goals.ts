/**
 * Cálculo puro de metas. Vive fuera de `actions/` porque un fichero
 * `"use server"` solo debería exportar funciones asíncronas: cualquier helper
 * síncrono ahí es una trampa esperando a que Next endurezca la regla.
 */

/** Cuánto hay que ahorrar al mes para llegar a la fecha objetivo. */
export function requiredMonthlyPace(goal: {
  targetAmount: number;
  currentAmount: number;
  targetDate: Date | null;
}) {
  if (!goal.targetDate) return null;
  const remaining = goal.targetAmount - goal.currentAmount;
  if (remaining <= 0) return 0;
  const monthsLeft = Math.max(
    1,
    Math.ceil((goal.targetDate.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)),
  );
  return Math.ceil(remaining / monthsLeft);
}

/** Porcentaje de avance, acotado a 100 para que la barra nunca desborde. */
export const goalProgress = (current: number, target: number) =>
  target <= 0 ? 0 : Math.min(100, Math.round((current / target) * 100));
