"use client";

import { formatCOP } from "@/lib/money";

type Item = { name?: string; value?: number; color?: string; payload?: Record<string, unknown> };

/**
 * Tooltip compartido. El texto usa tokens de texto, nunca el color de la serie:
 * un hue claro (amarillo, aqua) es ilegible como texto sobre la superficie. La
 * identidad la lleva el punto de color al lado.
 */
export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Item[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs shadow-sm dark:border-white/15 dark:bg-[#1a1a19]">
      {label !== undefined && <p className="mb-1 font-medium">{label}</p>}
      <ul className="space-y-0.5">
        {payload.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: item.color }}
            />
            <span className="opacity-70">{item.name}</span>
            <span className="ml-auto font-medium tabular-nums">
              {formatCOP(Number(item.value ?? 0))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
