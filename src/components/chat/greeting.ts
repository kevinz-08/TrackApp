/**
 * Saludos de la pantalla en blanco.
 *
 * Se eligen **en el servidor** y llegan al cliente como prop. Elegirlo en el
 * cliente con `Math.random()` durante el render es exactamente el caso que
 * React nombra en el error de hidratación: el HTML servido traería un saludo y
 * el árbol hidratado otro. Como `/chat` es dinámica —`requireUser()` la saca de
 * cualquier caché—, cada recarga vuelve a pasar por el servidor y el saludo
 * cambia de verdad, que era el objetivo.
 *
 * Todos son de bienvenida y ninguno es una pregunta cerrada: la pregunta la
 * hacen las sugerencias de abajo, y dos preguntas seguidas en la misma pantalla
 * se pisan.
 */
const GREETINGS = [
  "¡Bienvenido de nuevo!",
  "¿De qué quieres conversar hoy?",
  "Estamos aquí para ayudarte",
  "¿Qué quieres saber de tu plata?",
  "Cuéntame en qué andas",
  "Pregúntame lo que quieras",
  "¿Revisamos cómo vas este mes?",
];

export const randomGreeting = () => GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

/**
 * Nombre de pila para el titular de bienvenida. El apellido sobra: el saludo va
 * en mayúsculas y a 34px, y a ese tamaño un nombre completo se parte en dos
 * líneas y deja de funcionar como titular.
 *
 * Si no hay nombre se cae al usuario del correo, y si tampoco, el llamante
 * saluda sin nombre —nunca con un hueco vacío—.
 */
export function firstNameFrom(name?: string | null, email?: string | null) {
  const fromName = name?.trim().split(/\s+/)[0];
  if (fromName) return fromName;

  const localPart = email?.trim().split("@")[0] ?? "";
  // Los correos suelen traer punto, guión o dígitos: "kevin.g08" → "kevin".
  const word = localPart.split(/[._\-0-9]/)[0];
  return word || null;
}

/**
 * Inicial del avatar del usuario. Sale de la misma fuente que el saludo, para
 * que la letra del avatar y el nombre del titular no puedan contradecirse:
 * escribir la letra a mano funciona hasta el día que entra un segundo usuario.
 */
export function initialFrom(name?: string | null, email?: string | null) {
  return firstNameFrom(name, email)?.[0].toUpperCase() ?? "?";
}
