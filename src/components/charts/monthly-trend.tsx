"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDarkMode } from "./use-dark-mode";
import { ChartTooltip } from "./chart-tooltip";
import { monoTokens } from "@/lib/chart-tokens";
import { TableView } from "./category-breakdown";
import { formatCOP } from "@/lib/money";
import { legendLabel } from "./legend-label";
import { EmptyState } from "@/components/ui/surface";

export type TrendDatum = { period: string; income: number; expense: number };

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const shortLabel = (period: string) => MESES[Number(period.slice(5, 7)) - 1] ?? period;

/**
 * Área monocroma de dos series (§2.2).
 *
 * Sin eje Y: en 390pt cuesta 40pt de ancho y no se lee. Su trabajo lo hacen la
 * cifra de la cabecera del panel y el tooltip. Quedan dos líneas de grid
 * horizontales al 50% de opacidad como única referencia; grid vertical, nunca.
 *
 * Las dos series se distinguen por TEXTURA y peso, no por matiz: ingresos con
 * trazo continuo y relleno degradado, egresos punteados y sin relleno. La
 * leyenda va siempre, así la identidad nunca depende solo de la luminancia.
 */
export function MonthlyTrend({ data }: { data: TrendDatum[] }) {
  const isDark = useDarkMode();
  const t = monoTokens(isDark);

  const hasData = data.some((d) => d.income > 0 || d.expense > 0);
  if (!hasData) return <EmptyState message="Aún no hay historial suficiente." />;

  const rows = data.map((d) => ({ ...d, label: shortLabel(d.period) }));
  const last = rows.length - 1;

  return (
    <div>
      <ResponsiveContainer width="100%" height={176}>
        <AreaChart data={rows} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
          <defs>
            {/* Relleno 16% → 0%: volumen sin ensuciar. Solo la serie primaria. */}
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.fillTop} />
              <stop offset="100%" stopColor={t.fillBottom} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke={t.grid} strokeWidth={1} vertical={false} opacity={0.5} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: t.grid }}
            tick={{ fill: t.inkMuted, fontSize: 10 }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          {/* Oculto pero presente: sostiene la escala y las líneas de grid. */}
          <YAxis hide />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: t.inkSecondary, strokeWidth: 1 }} />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 11 }}
            formatter={legendLabel(t.inkSecondary)}
          />

          <Area
            type="monotone"
            dataKey="expense"
            name="Egresos"
            stroke={t.ramp[2]}
            strokeWidth={2}
            strokeDasharray="4 3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            dot={false}
            activeDot={{ r: 4.5, fill: t.ramp[2], stroke: t.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="income"
            name="Ingresos"
            stroke={t.ramp[0]}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="url(#trend-fill)"
            dot={false}
            activeDot={{ r: 4.5, fill: t.ramp[0], stroke: t.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />

          {/* Solo el último dato lleva punto: es el que importa. Anillo de 2px
              del color de la superficie para separarlo de la línea. */}
          <ReferenceDot
            x={rows[last].label}
            y={rows[last].income}
            r={4}
            fill={t.ramp[0]}
            stroke={t.surface}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>

      <TableView
        caption="Evolución mensual"
        head={["Mes", "Ingresos", "Egresos"]}
        rows={rows.map((d) => [d.label, formatCOP(d.income), formatCOP(d.expense)])}
      />
    </div>
  );
}
