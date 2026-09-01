"use client";

import { useEffect, useState } from "react";

/**
 * El modo oscuro de los gráficos se resuelve en JS porque Recharts pinta los
 * colores como atributos SVG, no como clases: una media query de CSS no los
 * alcanzaría.
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setIsDark(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isDark;
}
