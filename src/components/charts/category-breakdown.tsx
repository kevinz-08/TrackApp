"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDarkMode } from "./use-dark-mode";
import { ChartTooltip } from "./chart-tooltip";
import { monoTokens, rampStep } from "@/lib/chart-tokens";
import { formatCompactCOP, formatCOP } from "@/lib/money";
import { EmptyState } from "@/components/ui/surface";

export type CategoryDatum = { name: string; total: number; color: string };

/**
 * El trabajo de este dato es COMPARAR MAGNITUDES, no distinguir identidades: la
 * categoría ya está escrita en el eje. Por eso son barras horizontales y no una
 * dona —los nombres largos no caben alrededor de un anillo en 390pt.
 *
 * Bajo el sistema monocromo la barra toma su escalón de la rampa por RANGO, y
 * las filas ya vienen ordenadas por monto descendente: el gasto mayor es el más
 * oscuro, así la magnitud queda codificada dos veces (longitud y luminancia).
 * A partir del sexto se satura el último escalón; no se genera un séptimo tono.
 */
export function CategoryBreakdown({ data }: { data: CategoryDatum[] }) {
  const isDark = useDarkMode();
  const t = monoTokens(isDark);

  if (data.length === 0) {
    return <EmptyState message="Sin gastos registrados este mes." />;
  }

  const height = Math.max(140, data.length * 34);

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 64, bottom: 4, left: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={104}
            tickLine={false}
            axisLine={false}
            tick={{ fill: t.inkSecondary, fontSize: 12 }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: t.cursor }} />
          <Bar
            dataKey="total"
            name="Gasto"
            radius={[0, 4, 4, 0]}
            barSize={16}
            isAnimationActive={false}
            label={{
              position: "right",
              formatter: (v: unknown) => formatCompactCOP(Number(v)),
              fill: t.inkSecondary,
              fontSize: 11,
            }}
          >
            {data.map((d, i) => (
              <Cell key={d.name} fill={rampStep(i, isDark)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <TableView
        caption="Gasto por categoría"
        head={["Categoría", "Gasto"]}
        rows={data.map((d) => [d.name, formatCOP(d.total)])}
      />
    </div>
  );
}

/**
 * Vista de tabla: es lo que hace accesible el gráfico cuando la luminancia no
 * basta —bajo el sol, dos escalones adyacentes se confunden— y lo que permite
 * leer el valor exacto sin depender del tooltip.
 */
export function TableView({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: string[][];
}) {
  return (
    <details className="mt-3">
      <summary className="text-ink-3 duration-fast ease-standard hover:text-ink cursor-pointer text-[11px] leading-[14px] font-semibold tracking-[0.14em] uppercase transition-colors">
        Ver como tabla
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="text-ink-3 text-left">
              {head.map((h) => (
                <th key={h} className="py-1 pr-4 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-hairline border-t">
                {r.map((cell, j) => (
                  <td
                    key={j}
                    className={`py-1.5 pr-4 ${j > 0 ? "text-ink tabular-nums" : "text-ink-2"}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
