import { groq, MODELS, aiEnabled } from "@/services/ai/groq";
import type { Detected } from "./detectors";

export type Narrated = Detected & { title: string; body: string };

/** Sin IA, el respaldo determinista ES el insight. La app no depende de Groq. */
const withFallback = (items: Detected[]): Narrated[] =>
  items.map((d) => ({ ...d, title: d.fallbackTitle, body: d.fallbackBody }));

const SYSTEM = `Redactas alertas financieras para TrackApp, en español colombiano.

Recibes hallazgos YA DETECTADOS con sus cifras exactas. Tu único trabajo es redactarlos mejor.

REGLAS:
- Usa EXCLUSIVAMENTE las cifras que recibes. No calcules, no estimes, no completes.
- Un título de máximo 6 palabras y un cuerpo de una o dos frases.
- Nada de regaños ni de moralina. Informas y, si aplica, sugieres UNA acción concreta.
- Montos en pesos colombianos con separador de miles y sin decimales.
- Nada de Markdown, encabezados ni listas: es el texto de una notificación.

Responde SOLO JSON: {"items":[{"id":"<el id que recibes>","title":"...","body":"..."}]}`;

/**
 * Una sola llamada al modelo PEQUEÑO con todos los hallazgos del usuario.
 *
 * Una llamada por hallazgo multiplicaría el coste sin mejorar nada: los
 * hallazgos son independientes y el modelo no necesita contexto entre ellos.
 * Y el hallazgo que el modelo no devuelva —o si devuelve basura, o si Groq está
 * caído— conserva su redacción de respaldo, así que ningún camino pierde
 * información.
 */
export async function narrate(items: Detected[]): Promise<Narrated[]> {
  if (items.length === 0) return [];
  if (!aiEnabled()) return withFallback(items);

  try {
    const payload = items.map((d, i) => ({ id: String(i), tipo: d.kind, datos: d.facts }));

    const res = await groq.chat.completions.create({
      model: MODELS.fast,
      temperature: 0.3,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: JSON.stringify(payload) },
      ],
    });

    const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}") as {
      items?: Array<{ id?: string; title?: string; body?: string }>;
    };
    const byId = new Map((parsed.items ?? []).map((x) => [x.id, x]));

    return items.map((d, i) => {
      const written = byId.get(String(i));
      const title = written?.title?.trim();
      const body = written?.body?.trim();
      return {
        ...d,
        // Se valida longitud además de existencia: un título de 200 caracteres
        // rompe la notificación igual que uno vacío.
        title: title && title.length <= 60 ? title : d.fallbackTitle,
        body: body && body.length <= 300 ? body : d.fallbackBody,
      };
    });
  } catch (err) {
    console.error("[insights:narrate]", err);
    return withFallback(items);
  }
}
