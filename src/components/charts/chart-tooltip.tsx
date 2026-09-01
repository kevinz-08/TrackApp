"use client";

import { formatCOP } from "@/lib/money";

type Item = { name?: string; value?: number; color?: string; payload?: Record<string, unknown> };

/**
 * Tooltip compartido. El texto usa tokens de texto, nunca el color de la serie:
 * en la rampa monocroma un escalón claro es ilegible como tinta sobre la
 * superficie. La identidad la lleva la marca de color que va al lado.
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
    <div className="rounded-chip border-hairline bg-surface text-ink shadow-lift border px-3 py-2 text-xs">
      {label !== undefined && <p className="mb-1 font-medium">{label}</p>}
      <ul className="space-y-0.5">
        {payload.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: item.color }}
            />
            <span className="text-ink-2">{item.name}</span>
            <span className="ml-auto font-medium tabular-nums">
              {formatCOP(Number(item.value ?? 0))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
