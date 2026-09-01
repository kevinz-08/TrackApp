import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth/guards";
import { materializeDueRecurring } from "@/services/finance/recurring";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isCronAuthorized(req.headers.get("authorization"))) {
    return new Response("No autorizado", { status: 401 });
  }

  // Una query trivial mantiene despierta la base de Neon en horario activo:
  // el primer quick-log del día no debe pagar el cold start.
  await prisma.user.count();

  const result = await materializeDueRecurring();
  return NextResponse.json({ ok: true, ...result });
}
