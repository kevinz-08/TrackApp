"use client";

import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDarkMode } from "./use-dark-mode";
import { ChartTooltip } from "./chart-tooltip";
import { monoTokens } from "@/lib/chart-tokens";
import { TableView } from "./category-breakdown";
import { formatCompactCOP, formatCOP, percent } from "@/lib/money";
import { legendLabel } from "./legend-label";
import { EmptyState } from "@/components/ui/surface";

/**
 * Parte-respecto-al-todo con dos series: barra apilada horizontal. El separador
 * de 2px entre segmentos lo hace el color de la SUPERFICIE, no un borde: sin
 * ese respiro, dos escalones de gris adyacentes se funden en uno.
 *
 * Fijo toma el escalón más oscuro porque es el mayor compromiso, no porque sea
 * "malo": la rampa codifica magnitud, no juicio.
 */
export function FixedVsVariable({ fixed, variable }: { fixed: number; variable: number }) {
  const isDark = useDarkMode();
  const t = monoTokens(isDark);

  if (fixed + variable === 0) return <EmptyState message="Sin egresos este mes." />;

  const data = [{ name: "Egresos", fixed, variable }];

  return (
    <div>
      <ResponsiveContainer width="100%" height={88}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip content={<ChartTooltip />} cursor={false} />
          <Legend wrapperStyle={{ fontSize: 11 }} formatter={legendLabel(t.inkSecondary)} />
          <Bar
            dataKey="fixed"
            name="Fijo"
            stackId="a"
            fill={t.ramp[0]}
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
            fill={t.ramp[3]}
            barSize={24}
            radius={[0, 4, 4, 0]}
            stroke={t.surface}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>

      <p className="text-ink-2 text-[13px] leading-[18px]">
        {percent(fixed, fixed + variable)}% de tus egresos ya estaba comprometido antes de empezar
        el mes ({formatCompactCOP(fixed)} de {formatCompactCOP(fixed + variable)}).
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
