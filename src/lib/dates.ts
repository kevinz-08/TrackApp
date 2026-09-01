/**
 * El "mes financiero" del usuario puede no empezar el día 1 (User.monthStartDay).
 */

export function monthStart(reference = new Date(), monthStartDay = 1) {
  const d = new Date(reference);
  const start = new Date(d.getFullYear(), d.getMonth(), monthStartDay);
  if (d.getDate() < monthStartDay) start.setMonth(start.getMonth() - 1);
  return start;
}

export function monthEnd(reference = new Date(), monthStartDay = 1) {
  const start = monthStart(reference, monthStartDay);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return end;
}

/** Clave de período usada por Budget: "2026-09". */
export const periodKey = (d = new Date()) => d.toISOString().slice(0, 7);

export function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
