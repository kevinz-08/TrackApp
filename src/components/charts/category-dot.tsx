"use client";

import { useDarkMode } from "./use-dark-mode";
import { toDark } from "@/lib/chart-palette";

/**
 * La base guarda un solo hex por categoría (el claro). En modo oscuro se
 * traduce al escalón oscuro elegido para esa superficie, no se aclara a ojo.
 */
export function CategoryDot({ color }: { color: string }) {
  const isDark = useDarkMode();
  return (
    <span
      aria-hidden
      className="size-2 shrink-0 rounded-full"
      style={{ background: isDark ? toDark(color) : color }}
    />
  );
}
