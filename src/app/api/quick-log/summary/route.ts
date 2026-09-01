import { NextRequest, NextResponse } from "next/server";
import { resolveApiKey } from "@/lib/auth/api-key";
import { getMonthlyBalance } from "@/services/finance/balance";
import { formatCOP } from "@/lib/money";

/** Balance rápido para mostrar en una notificación del atajo. */
export const runtime = "nodejs";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export async function GET(req: NextRequest) {
  const key = await resolveApiKey(req.headers.get("authorization"));
  if (!key) {
    return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 401 });
  }

  const b = await getMonthlyBalance(key.userId);
  const mes = MESES[b.periodStart.getMonth()];

  // Toda la lógica de presentación vive en el backend: mejorar el mensaje no
  // obliga a reconfigurar el atajo en el teléfono.
  const message =
    b.income > 0
      ? `${mes}: gastaste ${formatCOP(b.expense)} de ${formatCOP(b.income)}. Te quedan ${formatCOP(b.balance)}.`
      : `${mes}: llevas ${formatCOP(b.expense)} en gastos.`;

  return NextResponse.json({ ok: true, message });
}
