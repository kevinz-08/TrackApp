/**
 * Dinero siempre en enteros, en la unidad mínima de la moneda.
 * Para COP eso significa pesos enteros. Nunca Float. (Principio 5 del doc técnico)
 */

export const formatCOP = (amount: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);

export const formatCompactCOP = (amount: number) =>
  new Intl.NumberFormat("es-CO", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);

/** Suma segura de montos enteros. */
export const sum = (amounts: Array<number | null | undefined>) =>
  amounts.reduce<number>((acc, n) => acc + (n ?? 0), 0);

/** Porcentaje entero acotado a [0, 100], útil para barras de progreso. */
export const percent = (part: number, total: number) =>
  total <= 0 ? 0 : Math.min(100, Math.round((part / total) * 100));
