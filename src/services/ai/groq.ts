import Groq from "groq-sdk";

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });

export const MODELS = {
  chat: "llama-3.3-70b-versatile", // Razonamiento y function calling
  fast: "llama-3.1-8b-instant", // Parsing y clasificación
} as const;

/** La IA es opcional: todo camino que dependa del LLM comprueba esto primero. */
export const aiEnabled = () => Boolean(process.env.GROQ_API_KEY);
