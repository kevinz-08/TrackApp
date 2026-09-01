"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDarkMode } from "./use-dark-mode";
import { ChartTooltip } from "./chart-tooltip";
import { CHART_TOKENS, seriesColor } from "@/lib/chart-palette";
import { EmptyChart, TableView } from "./category-breakdown";
import { formatCompactCOP, formatCOP } from "@/lib/money";
import { legendLabel } from "./legend-label";

export type TrendDatum = { period: string; income: number; expense: number };

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const shortLabel = (period: string) => MESES[Number(period.slice(5, 7)) - 1] ?? period;

/** Dos series con identidad propia: aquí el color categórico sí es el trabajo. */
export function MonthlyTrend({ data }: { data: TrendDatum[] }) {
  const isDark = useDarkMode();
  const t = isDark ? CHART_TOKENS.dark : CHART_TOKENS.light;

  const hasData = data.some((d) => d.income > 0 || d.expense > 0);
  if (!hasData) return <EmptyChart message="Aún no hay historial suficiente." />;

  const rows = data.map((d) => ({ ...d, label: shortLabel(d.period) }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={t.grid} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: t.grid }}
            tick={{ fill: t.textSecondary, fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fill: t.textSecondary, fontSize: 11 }}
            tickFormatter={(v: number) => formatCompactCOP(v)}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: t.grid, strokeWidth: 1 }} />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 12 }}
            formatter={legendLabel(t.textSecondary)}
          />
          <Line
            type="monotone"
            dataKey="income"
            name="Ingresos"
            stroke={seriesColor(0, isDark)}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            // El punto va RELLENO del color de la serie con un anillo de 2px en
            // el color de la superficie. Sin el relleno explícito, Recharts lo
            // pinta hueco y la línea aparece cortada en cada dato.
            dot={{ r: 4, fill: seriesColor(0, isDark), stroke: t.surface, strokeWidth: 2 }}
            activeDot={{ r: 5, fill: seriesColor(0, isDark), stroke: t.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="expense"
            name="Egresos"
            stroke={seriesColor(1, isDark)}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            // El punto va RELLENO del color de la serie con un anillo de 2px en
            // el color de la superficie. Sin el relleno explícito, Recharts lo
            // pinta hueco y la línea aparece cortada en cada dato.
            dot={{ r: 4, fill: seriesColor(1, isDark), stroke: t.surface, strokeWidth: 2 }}
            activeDot={{ r: 5, fill: seriesColor(1, isDark), stroke: t.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <TableView
        caption="Evolución mensual"
        head={["Mes", "Ingresos", "Egresos"]}
        rows={rows.map((d) => [d.label, formatCOP(d.income), formatCOP(d.expense)])}
      />
    </div>
  );
}
