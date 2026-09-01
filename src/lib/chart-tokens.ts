/**
 * Tokens monocromos para gráficos.
 *
 * Recharts pinta los colores como atributos SVG, no como clases, así que la
 * media query de CSS no los alcanza: hay que resolver el tema en JS y pasar
 * hex. Estos valores son los mismos de `globals.css`; si cambia uno, cambian
 * los dos.
 *
 * REGLA DE ALCANCE frente a `lib/chart-palette.ts` (§2.4 de la guía visual):
 *
 *  - Hasta 6 series → esta rampa de luminancia + etiqueta directa obligatoria.
 *    El orden de la rampa ES la magnitud descendente: el dato mayor es el más
 *    oscuro, así la magnitud queda codificada dos veces (posición y luminancia).
 *
 *  - Más de 6 series, o series que el usuario filtra y reordena → `CATEGORICAL`
 *    de `lib/chart-palette.ts`, sin reordenar ni ampliar. Una rampa de
 *    luminancia con siete escalones no supera el umbral de discriminación en
 *    pantalla exterior; esa paleta está validada con ΔE ≥ 8 bajo protanopía y
 *    esa validación manda.
 *
 * En ambos casos el texto —ejes, leyendas, valores— usa tokens de tinta, nunca
 * el color de la serie. Sin excepción.
 */

export const MONO = {
  light: {
    ramp: ["#0a0a0b", "#3a3a3e", "#5c5c61", "#8a8a90", "#b4b4b9", "#dedee1"],
    ink: "#0a0a0b",
    inkSecondary: "#6e6e73",
    inkMuted: "#9a9aa0",
    surface: "#ffffff",
    ground: "#f2f2f3",
    grid: "#dedee1",
    /* Relleno del área: 16% → 0%. Da volumen sin ensuciar. */
    fillTop: "rgba(10, 10, 11, 0.16)",
    fillBottom: "rgba(10, 10, 11, 0)",
    cursor: "rgba(10, 10, 11, 0.05)",
  },
  dark: {
    /* Escalones elegidos contra #0a0a0b, no una inversión de los claros. */
    ramp: ["#f7f7f8", "#c9c9ce", "#9a9aa0", "#6e6e75", "#4d4d53", "#35353b"],
    ink: "#f7f7f8",
    inkSecondary: "#9a9aa0",
    inkMuted: "#6e6e75",
    surface: "#161618",
    ground: "#0a0a0b",
    grid: "#2a2a2e",
    fillTop: "rgba(247, 247, 248, 0.18)",
    fillBottom: "rgba(247, 247, 248, 0)",
    cursor: "rgba(255, 255, 255, 0.05)",
  },
} as const;

export type MonoTokens = (typeof MONO)[keyof typeof MONO];

export const monoTokens = (isDark: boolean): MonoTokens => (isDark ? MONO.dark : MONO.light);

/**
 * Escalón de la rampa por rango. A partir del sexto se agrega en «Otros»: no
 * se genera un séptimo tono, se satura el último.
 */
export const rampStep = (rank: number, isDark: boolean) => {
  const { ramp } = monoTokens(isDark);
  return ramp[Math.min(rank, ramp.length - 1)];
};
