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

/**
 * Descompone un monto para el tratamiento tipográfico de la guía visual (§2.1):
 * el símbolo baja a 0.5em y a tinta terciaria, y el último grupo de miles se
 * atenúa. En COP los tres últimos dígitos son ruido —nadie decide nada con
 * ellos— y quitarlos de la mancha negra deja los enteros significativos como
 * lo único que se lee de un vistazo.
 *
 * El signo sale aparte: la polaridad se marca con el glifo, nunca con color ni
 * con peso.
 */
export function splitCOP(amount: number) {
  const negative = amount < 0;
  const groups = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 })
    .format(Math.abs(amount))
    .split(".");

  return {
    sign: negative ? "−" : "",
    currency: "$",
    /** Dígitos significativos: la mancha negra. */
    lead: groups.length > 1 ? groups.slice(0, -1).join(".") : groups[0],
    /** Último grupo de miles, atenuado. Vacío si el monto es < 1000. */
    tail: groups.length > 1 ? `.${groups[groups.length - 1]}` : "",
  };
}
