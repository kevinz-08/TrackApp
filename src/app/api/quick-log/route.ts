import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { prisma } from "@/lib/prisma";
import { resolveApiKey } from "@/lib/auth/api-key";
import { quickLogSchema } from "@/lib/validation/schemas";
import { parseFast } from "@/services/ai/parse-transaction";
import { refineCategory } from "@/services/categorization";
import { formatCOP } from "@/lib/money";

/**
 * El endpoint que define la experiencia del producto.
 * Objetivo: respuesta en menos de 800 ms para que el flujo desde el botón de
 * acción del iPhone quede bajo los 5 segundos.
 */
export const runtime = "nodejs";
export const maxDuration = 10;

const RATE_LIMIT_PER_MINUTE = 20;

export async function POST(req: NextRequest) {
  const key = await resolveApiKey(req.headers.get("authorization"));
  if (!key) {
    return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 401 });
  }

  const parsed = quickLogSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Formato inválido" }, { status: 400 });
  }

  // Sin control de tasa, una API Key filtrada llena la base y agota Neon.
  const recent = await prisma.transaction.count({
    where: {
      userId: key.userId,
      source: "QUICK_LOG",
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
  });
  if (recent > RATE_LIMIT_PER_MINUTE) {
    return NextResponse.json({ ok: false, message: "Demasiadas peticiones" }, { status: 429 });
  }

  const { text, type } = parsed.data;

  // Nivel 1: parser determinista. Si falla, cae a Groq internamente.
  const result = await parseFast(text, key.userId);

  if (!result.amount) {
    return NextResponse.json(
      { ok: false, message: "No entendí el monto. Intenta: almuerzo 25000" },
      { status: 422 },
    );
  }

  const tx = await prisma.transaction.create({
    data: {
      userId: key.userId,
      type: type ?? result.type ?? "EXPENSE",
      amount: result.amount,
      description: result.description,
      categoryId: result.categoryId,
      rawInput: text,
      source: "QUICK_LOG",
      needsReview: result.confidence < 0.7,
      occurredAt: new Date(),
    },
    select: { id: true },
  });

  // Trabajo diferido: no bloquea la respuesta al atajo.
  waitUntil(
    Promise.all([
      prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }),
      result.confidence < 0.7
        ? refineCategory(tx.id, text, key.userId)
        : Promise.resolve(),
    ]).catch(() => {}),
  );

  return NextResponse.json({
    ok: true,
    message: `Registrado: ${result.description} — ${formatCOP(result.amount)}`,
    transactionId: tx.id,
  });
}
