/**
 * Paleta de visualización.
 *
 * Los ocho slots están en un ORDEN FIJO que es el mecanismo de seguridad para
 * daltonismo, no una decisión estética: validado con el validador de paletas en
 * modo claro y oscuro (peor par adyacente ΔE 9.1 claro / 8.4 oscuro con
 * protanopía, sobre un objetivo de 8; visión normal 19.6 / 19.3 sobre un piso
 * de 15). No reordenar ni añadir un noveno color: un hue generado es
 * indistinguible de alguno existente bajo daltonismo.
 *
 * Los pasos oscuros son escalones ELEGIDOS para la superficie oscura, no una
 * inversión automática de los claros.
 */
export const CATEGORICAL = [
  { light: "#2a78d6", dark: "#3987e5" }, // 1 azul
  { light: "#eb6834", dark: "#d95926" }, // 2 naranja
  { light: "#1baf7a", dark: "#199e70" }, // 3 aqua
  { light: "#eda100", dark: "#c98500" }, // 4 amarillo
  { light: "#e87ba4", dark: "#d55181" }, // 5 magenta
  { light: "#008300", dark: "#008300" }, // 6 verde
  { light: "#4a3aa7", dark: "#9085e9" }, // 7 violeta
  { light: "#e34948", dark: "#e66767" }, // 8 rojo
] as const;

/** Colores que persiste el seed (los claros). El índice es el slot. */
export const CATEGORICAL_LIGHT = CATEGORICAL.map((c) => c.light);

const LIGHT_TO_DARK = new Map<string, string>(CATEGORICAL.map((c) => [c.light, c.dark]));

/**
 * La base guarda un solo hex por categoría (el claro). Esto lo traduce al
 * escalón oscuro correspondiente en vez de aclarar u oscurecer a ojo.
 */
export const toDark = (lightHex: string) =>
  LIGHT_TO_DARK.get(lightHex.toLowerCase()) ?? lightHex;

export const seriesColor = (slot: number, isDark: boolean) => {
  const entry = CATEGORICAL[slot % CATEGORICAL.length];
  return isDark ? entry.dark : entry.light;
};

/** Tokens de superficie y texto. El texto NUNCA lleva el color de la serie. */
export const CHART_TOKENS = {
  light: { surface: "#fcfcfb", textSecondary: "#52514e", grid: "#e6e5e1" },
  dark: { surface: "#1a1a19", textSecondary: "#c3c2b7", grid: "#33332f" },
} as const;
