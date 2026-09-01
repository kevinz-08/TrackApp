import { prisma } from "@/lib/prisma";
import type { TransactionType } from "@prisma/client";

/**
 * Categorización en dos capas:
 *  1. Reglas locales sobre comercios y palabras frecuentes en Colombia (~0 ms).
 *  2. Memoria de correcciones: si el usuario ya corrigió un concepto parecido,
 *     esa decisión gana sobre las reglas.
 * El refinamiento con IA ocurre después de responder (waitUntil), nunca en el
 * camino crítico del quick-log.
 */

const RULES: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /rappi|didi food|ifood|almuerzo|desayuno|cena|comida|mercado|d1|ara|exito|olimpica|restaurante|cafe|café|tienda/i, category: "Alimentación" },
  { pattern: /uber|didi|cabify|taxi|bus|transmilenio|metro|gasolina|parqueadero|peaje|sitp/i, category: "Transporte" },
  { pattern: /netflix|spotify|hbo|max|disney|prime|youtube|icloud|chatgpt|claude|dropbox|suscripci/i, category: "Suscripciones" },
  { pattern: /arriendo|administracion|administración|luz|agua|gas|internet|energia|energía|servicios|hogar|aseo/i, category: "Hogar" },
  { pattern: /cine|bar|cerveza|trago|fiesta|concierto|viaje|salida|discoteca|juego/i, category: "Salidas y Ocio" },
  { pattern: /eps|droguer|farmacia|medic|gimnasio|gym|odontolog|consulta/i, category: "Salud" },
  { pattern: /curso|universidad|libro|udemy|platzi|semestre|matricula|matrícula/i, category: "Educación" },
  { pattern: /salario|sueldo|nomina|nómina|quincena/i, category: "Salario" },
  { pattern: /freelance|proyecto|cliente|factura/i, category: "Freelance" },
];

export function ruleCategoryName(description: string): string | null {
  return RULES.find((r) => r.pattern.test(description))?.category ?? null;
}

/**
 * Aprendizaje por historial: busca una transacción anterior del usuario con un
 * concepto parecido que ya tenga categoría asignada.
 */
async function learnedCategoryId(description: string, userId: string) {
  const token = description.split(/\s+/).find((w) => w.length >= 4);
  if (!token) return null;

  const previous = await prisma.transaction.findFirst({
    where: {
      userId,
      categoryId: { not: null },
      needsReview: false,
      description: { contains: token, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
    select: { categoryId: true },
  });
  return previous?.categoryId ?? null;
}

export async function suggestCategory(
  description: string,
  userId: string,
  type: TransactionType = "EXPENSE",
): Promise<string | null> {
  const learned = await learnedCategoryId(description, userId);
  if (learned) return learned;

  const name = ruleCategoryName(description);
  if (name) {
    const match = await prisma.category.findUnique({
      where: { userId_name: { userId, name } },
      select: { id: true },
    });
    if (match) return match.id;
  }

  const fallbackName = type === "INCOME" ? "Otros ingresos" : "Otros";
  const fallback = await prisma.category.findUnique({
    where: { userId_name: { userId, name: fallbackName } },
    select: { id: true },
  });
  return fallback?.id ?? null;
}

/**
 * Refinamiento diferido con el modelo pequeño. Se ejecuta vía waitUntil tras
 * responder al atajo, así que su latencia no la percibe el usuario.
 */
export async function refineCategory(transactionId: string, rawText: string, userId: string) {
  if (!process.env.GROQ_API_KEY) return;

  try {
    const categories = await prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true },
    });
    if (categories.length === 0) return;

    const { groq, MODELS } = await import("@/services/ai/groq");
    const res = await groq.chat.completions.create({
      model: MODELS.fast,
      temperature: 0,
      max_tokens: 30,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Clasifica el gasto en UNA de estas categorías: ${categories
            .map((c) => c.name)
            .join(", ")}. Responde solo JSON: {"categoria": "<nombre exacto>"}.`,
        },
        { role: "user", content: rawText },
      ],
    });

    const { categoria } = JSON.parse(res.choices[0]?.message?.content ?? "{}") as {
      categoria?: string;
    };
    const match = categories.find((c) => c.name.toLowerCase() === categoria?.toLowerCase());
    if (!match) return;

    await prisma.transaction.update({
      where: { id: transactionId },
      data: { categoryId: match.id, needsReview: true },
    });
  } catch {
    // La IA es una capa de valor añadido: si falla, la transacción ya está guardada.
  }
}
