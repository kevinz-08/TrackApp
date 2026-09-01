"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDarkMode } from "./use-dark-mode";
import { ChartTooltip } from "./chart-tooltip";
import { CHART_TOKENS, seriesColor } from "@/lib/chart-palette";
import { formatCompactCOP, formatCOP } from "@/lib/money";

export type CategoryDatum = { name: string; total: number; color: string };

/**
 * El trabajo de este dato es COMPARAR MAGNITUDES, no distinguir identidades: la
 * categoría ya está escrita en el eje. Por eso son barras de un solo hue y no
 * una dona de ocho colores — con ocho porciones ordenadas por monto la
 * adyacencia depende de los datos, y ninguna paleta de ocho supera el umbral de
 * daltonismo en modo "todos los pares".
 */
export function CategoryBreakdown({ data }: { data: CategoryDatum[] }) {
  const isDark = useDarkMode();
  const t = isDark ? CHART_TOKENS.dark : CHART_TOKENS.light;
  const fill = seriesColor(0, isDark);

  if (data.length === 0) {
    return <EmptyChart message="Sin gastos registrados este mes." />;
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
            tick={{ fill: t.textSecondary, fontSize: 12 }}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: isDark ? "#ffffff0d" : "#0000000a" }}
          />
          <Bar
            dataKey="total"
            name="Gasto"
            radius={[0, 4, 4, 0]}
            barSize={16}
            isAnimationActive={false}
            label={{
              position: "right",
              formatter: (v: unknown) => formatCompactCOP(Number(v)),
              fill: t.textSecondary,
              fontSize: 11,
            }}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={fill} />
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

export function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-black/10 text-sm opacity-60 dark:border-white/15">
      {message}
    </div>
  );
}

/**
 * Vista de tabla: es lo que hace accesible el gráfico cuando el color no basta
 * (tres de los hues claros quedan por debajo de 3:1 contra la superficie).
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
    <details className="mt-2">
      <summary className="cursor-pointer text-xs opacity-60 hover:opacity-100">
        Ver como tabla
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="text-left opacity-60">
              {head.map((h) => (
                <th key={h} className="py-1 pr-4 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-black/5 dark:border-white/10">
                {r.map((cell, j) => (
                  <td key={j} className={`py-1 pr-4 ${j > 0 ? "tabular-nums" : ""}`}>
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
