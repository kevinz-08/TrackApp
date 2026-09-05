/**
 * Evaluación del parser de lenguaje natural.
 *
 * Sin esto, cada ajuste al regex o al prompt de extracción es una apuesta:
 * arreglas un caso y rompes tres sin enterarte. Los casos son frases reales de
 * cómo se escribe el dinero en Colombia.
 *
 *   pnpm eval:parser          # solo la capa determinista, sin red ni base
 *
 * Solo se prueban `parseAmount` y `parseDescription`, que son puras. La
 * categorización necesita base de datos y el fallback necesita Groq: esos dos
 * tienen su propio camino y no deben hacer fallar una comprobación que quiere
 * ser instantánea.
 */
import { parseAmount, parseDescription } from "../src/services/ai/parse-transaction";

type Case = { text: string; amount: number | null; description?: string };

const CASES: Case[] = [
  { text: "gasté 25000 en almuerzo", amount: 25_000, description: "almuerzo" },
  { text: "25.000 de mercado", amount: 25_000, description: "mercado" },
  { text: "25k en uber", amount: 25_000, description: "uber" },
  { text: "25 mil de gasolina", amount: 25_000, description: "gasolina" },
  { text: "1.5 millones de arriendo", amount: 1_500_000, description: "arriendo" },
  { text: "un millon de matrícula", amount: 1_000_000 },
  { text: "un millón de arriendo", amount: 1_000_000 },
  { text: "medio millón de vacaciones", amount: 500_000 },
  { text: "una mil de dulces", amount: 1_000 },
  { text: "pagué 12500 de netflix", amount: 12_500, description: "netflix" },
  { text: "me pagaron 3.200.000 de nómina", amount: 3_200_000 },
  { text: "compré 8000 de café", amount: 8_000, description: "café" },
  { text: "recibí 500 mil del freelance", amount: 500_000 },
  { text: "2 millones de portátil", amount: 2_000_000 },
  { text: "gasté 4500 en bus", amount: 4_500, description: "bus" },
  { text: "150000 en droguería", amount: 150_000, description: "droguería" },
  { text: "almuerzo", amount: null },
];

let passed = 0;
const failures: string[] = [];

for (const c of CASES) {
  const amount = parseAmount(c.text);
  const description = parseDescription(c.text);

  const amountOk = amount === c.amount;
  const descOk = c.description === undefined || description === c.description;

  if (amountOk && descOk) {
    passed++;
    continue;
  }

  failures.push(
    [
      `  "${c.text}"`,
      !amountOk ? `    monto: esperado ${c.amount}, obtenido ${amount}` : null,
      !descOk ? `    concepto: esperado "${c.description}", obtenido "${description}"` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

console.log(`\nParser: ${passed}/${CASES.length} casos correctos\n`);
if (failures.length) {
  console.log("Fallos:\n" + failures.join("\n"));
  process.exit(1);
}
