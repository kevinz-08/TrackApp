/**
 * Vistas desde las que se puede abrir el asistente.
 *
 * Vive en `lib/` y no junto a las herramientas porque lo consumen los dos
 * lados: la barra de navegación (cliente) y el registro de herramientas
 * (servidor). Un módulo sin dependencias evita arrastrar zod y el resto de la
 * capa de IA al bundle del navegador solo para leer cinco cadenas.
 *
 * El chat es una pestaña propia, así que `usePathname()` dentro de /chat
 * siempre diría "/chat". El origen viaja en `?from=`, lo pone quien navega y
 * el servidor lo valida contra esta lista.
 */
export const CHAT_ROUTES = ["/", "/cards", "/goals", "/subscriptions", "/transactions"] as const;

export type ChatRoute = (typeof CHAT_ROUTES)[number];

/** Rutas con foco propio. "/" queda fuera: la portada no especializa nada. */
export const CONTEXTUAL_ROUTES = CHAT_ROUTES.filter((r) => r !== "/");

export const isChatRoute = (value: string | undefined): value is ChatRoute =>
  Boolean(value) && (CHAT_ROUTES as readonly string[]).includes(value!);

/**
 * La ruta de chat que corresponde a una URL actual.
 *
 * Devuelve `undefined` para las vistas sin foco propio —ajustes, categorías— y
 * también para "/" : la portada no especializa nada, así que pedir un foco allí
 * solo gastaría tokens en un párrafo que no cambia ninguna respuesta.
 */
export const routeFromPathname = (pathname: string): ChatRoute | undefined =>
  (CONTEXTUAL_ROUTES as readonly string[]).includes(pathname) ? (pathname as ChatRoute) : undefined;

/** Enlace al asistente conservando desde dónde se abrió. */
export const chatHrefFrom = (pathname: string) =>
  (CONTEXTUAL_ROUTES as readonly string[]).includes(pathname)
    ? `/chat?from=${encodeURIComponent(pathname)}`
    : "/chat";
