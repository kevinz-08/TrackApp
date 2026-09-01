import Groq from "groq-sdk";

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });

/**
 * Los modelos de Groq se retiran sin aviso: los `llama-3.x` que fijaba el
 * documento técnico ya devolvían 404 al conectarlos. Por eso los identificadores
 * son sobreescribibles por entorno — una retirada se arregla cambiando una
 * variable, no desplegando código.
 *
 * REGLA DE ASIGNACIÓN: el modelo grande solo para conversación con el usuario;
 * el pequeño para tareas mecánicas (parsear un texto, sugerir una categoría).
 * Es lo que multiplica el margen dentro de la capa gratuita.
 *
 * Para listar los vigentes:
 *   curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"
 */
export const MODELS = {
  chat: process.env.GROQ_MODEL_CHAT ?? "openai/gpt-oss-120b",
  fast: process.env.GROQ_MODEL_FAST ?? "openai/gpt-oss-20b",
} as const;

/** La IA es opcional: todo camino que dependa del LLM comprueba esto primero. */
export const aiEnabled = () => Boolean(process.env.GROQ_API_KEY);
