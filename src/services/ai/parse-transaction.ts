import { prisma } from "@/lib/prisma";
import { suggestCategory } from "@/services/categorization";
import type { TransactionType } from "@prisma/client";

export type ParseResult = {
  amount: number | null;
  description: string;
  type: TransactionType;
  categoryId: string | null;
  confidence: number;
};

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  mil: 1_000,
  miles: 1_000,
  m: 1_000_000,
  millon: 1_000_000,
  millón: 1_000_000,
  millones: 1_000_000,
};

/** Formas reales de escribir montos en Colombia: 25000, 25.000, 25k, 25 mil, 1.5 millones. */
/**
 * El orden de la alternancia importa: `mill[oó]n(?:es)?` va ANTES que
 * `mil(?:es)?`, porque si no "millones" matchea como "mil" y "1.5 millones"
 * se lee como 1.500.
 */
const AMOUNT_RE = /(\d+(?:[.,]\d+)?)\s*(mill[oó]n(?:es)?|mil(?:es)?|k|m)?\b/;

/**
 * Cuantificadores que se escriben con palabra y no con dígito.
 *
 * "un millón de arriendo" no tiene ningún número que el regex pueda morder, y
 * es una de las formas más comunes de decir una cifra grande. Sin esta pasada
 * cae al fallback del LLM: funciona, pero gasta una llamada y ~600 ms en un
 * caso que se resuelve con una sustitución.
 */
const WORD_QUANTIFIERS: Array<[RegExp, string]> = [
  [/\bmedi[oa]\s+(mill[oó]n|mil)\b/g, "0.5 $1"],
  [/\bun[ao]?\s+(mill[oó]n|mil)\b/g, "1 $1"],
];

export function parseAmount(text: string): number | null {
  let normalized = text.toLowerCase().replace(/[.,](?=\d{3}\b)/g, "");
  for (const [pattern, replacement] of WORD_QUANTIFIERS) {
    normalized = normalized.replace(pattern, replacement);
  }
  const match = normalized.match(AMOUNT_RE);
  if (!match) return null;

  const base = parseFloat(match[1].replace(",", "."));
  if (!Number.isFinite(base)) return null;
  const mult = match[2] ? (MULTIPLIERS[match[2]] ?? 1) : 1;
  return Math.round(base * mult);
}

const INCOME_HINTS =
  /\b(ingres[oé]|me pagaron|recib[íi]|salario|sueldo|n[oó]mina|cobr[eé]|venta)\b/i;

/**
 * Quita el monto y los conectores para quedarse con el concepto.
 *
 * No se usa `\b` alrededor de las palabras vacías: el `\b` de JavaScript es
 * ASCII, así que "gasté" no cierra frontera después de la vocal acentuada y la
 * palabra sobreviviría al filtro. En su lugar se compara token a token sobre el
 * texto sin acentos.
 */
const STOP_WORDS = new Set([
  "gaste",
  "pague",
  "compre",
  "recibi",
  "me",
  "pagaron",
  "cobre",
  "en",
  "de",
  "del",
  "por",
  "un",
  "una",
  "el",
  "la",
  "los",
  "las",
  "pesos",
  "cop",
  "mil",
  "miles",
  "millon",
  "millones",
  "k",
]);

const stripAccents = (w: string) => w.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function parseDescription(text: string): string {
  const cleaned = text
    .toLowerCase()
    .replace(AMOUNT_RE, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(stripAccents(w)))
    .join(" ")
    .trim();
  return cleaned.length > 1 ? cleaned : text.trim();
}

/**
 * Nivel 1 del parser: determinista, ~0 ms, resuelve el 80–90% de los casos.
 * Si no logra un monto, `parseWithLLM` actúa como fallback.
 */
export async function parseFast(text: string, userId: string): Promise<ParseResult> {
  let amount = parseAmount(text);
  let confidence = amount ? 0.9 : 0;

  if (!amount) {
    const llm = await parseWithLLM(text);
    amount = llm.amount;
    confidence = llm.confidence;
  }

  const description = parseDescription(text);
  const type: TransactionType = INCOME_HINTS.test(text) ? "INCOME" : "EXPENSE";
  const categoryId = await suggestCategory(description, userId, type);

  if (!categoryId) confidence = Math.min(confidence, 0.6);

  return { amount, description, type, categoryId, confidence };
}

/**
 * Nivel 2: solo se invoca cuando el regex falla. Usa el modelo pequeño.
 * Degradación elegante: si Groq no responde, devolvemos monto nulo y el
 * endpoint pide al usuario reformular — la app nunca se cae por la IA.
 */
export async function parseWithLLM(
  text: string,
): Promise<{ amount: number | null; confidence: number }> {
  if (!process.env.GROQ_API_KEY) return { amount: null, confidence: 0 };

  try {
    const { groq, MODELS } = await import("@/services/ai/groq");
    const res = await groq.chat.completions.create({
      model: MODELS.fast,
      temperature: 0,
      max_tokens: 60,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Extrae el monto en pesos colombianos de la frase. Responde solo JSON: {"amount": number|null}. "25 mil" = 25000, "1.5 millones" = 1500000.',
        },
        { role: "user", content: text },
      ],
    });

    const raw = res.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { amount?: number | null };
    const amount = typeof parsed.amount === "number" ? Math.round(parsed.amount) : null;
    return { amount, confidence: amount ? 0.65 : 0 };
  } catch {
    return { amount: null, confidence: 0 };
  }
}

/** Categorías por defecto de un usuario, cacheadas por request. */
export async function userCategories(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    select: { id: true, name: true, kind: true },
  });
}
