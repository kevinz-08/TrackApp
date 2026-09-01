"use client";

/**
 * Recharts pinta el texto de la leyenda con el color de la serie. Eso viola la
 * regla de que el texto nunca lleva el color del dato: un hue claro (amarillo,
 * aqua) es ilegible como texto sobre la superficie. La identidad la aporta la
 * marca de color que va al lado, no la tinta de la palabra.
 */
export function legendLabel(color: string) {
  const LegendLabel = (value: string) => <span style={{ color }}>{value}</span>;
  LegendLabel.displayName = "LegendLabel";
  return LegendLabel;
}
