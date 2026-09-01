"use client";

import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDarkMode } from "./use-dark-mode";
import { ChartTooltip } from "./chart-tooltip";
import { CHART_TOKENS, seriesColor } from "@/lib/chart-palette";
import { EmptyChart, TableView } from "./category-breakdown";
import { formatCompactCOP, formatCOP, percent } from "@/lib/money";
import { legendLabel } from "./legend-label";

/**
 * Parte-respecto-al-todo con dos series: barra apilada horizontal. El separador
 * de 2px entre segmentos lo hace el color de la superficie, no un borde.
 */
export function FixedVsVariable({ fixed, variable }: { fixed: number; variable: number }) {
  const isDark = useDarkMode();
  const t = isDark ? CHART_TOKENS.dark : CHART_TOKENS.light;

  if (fixed + variable === 0) return <EmptyChart message="Sin egresos este mes." />;

  const data = [{ name: "Egresos", fixed, variable }];

  return (
    <div>
      <ResponsiveContainer width="100%" height={92}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip content={<ChartTooltip />} cursor={false} />
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendLabel(t.textSecondary)} />
          <Bar
            dataKey="fixed"
            name="Fijo"
            stackId="a"
            fill={seriesColor(0, isDark)}
            barSize={24}
            radius={[4, 0, 0, 4]}
            stroke={t.surface}
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Bar
            dataKey="variable"
            name="Variable"
            stackId="a"
            fill={seriesColor(1, isDark)}
            barSize={24}
            radius={[0, 4, 4, 0]}
            stroke={t.surface}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>

      <p className="text-xs opacity-60">
        {percent(fixed, fixed + variable)}% de tus egresos ya estaba comprometido antes de
        empezar el mes ({formatCompactCOP(fixed)} de {formatCompactCOP(fixed + variable)}).
      </p>

      <TableView
        caption="Fijo contra variable"
        head={["Tipo", "Monto"]}
        rows={[
          ["Fijo", formatCOP(fixed)],
          ["Variable", formatCOP(variable)],
        ]}
      />
    </div>
  );
}
