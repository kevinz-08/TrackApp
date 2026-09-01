import { requireUser } from "@/lib/auth/guards";
import { getCashFlowProjection } from "@/services/finance/balance";
import {
  expensesByCategory,
  monthlyTrend,
  topTransactions,
} from "@/services/finance/aggregations";
import { formatCOP } from "@/lib/money";
import { CategoryBreakdown } from "@/components/charts/category-breakdown";
import { MonthlyTrend } from "@/components/charts/monthly-trend";
import { FixedVsVariable } from "@/components/charts/fixed-vs-variable";
import { CategoryDot } from "@/components/charts/category-dot";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default async function HomePage() {
  const user = await requireUser();
  const [flow, byCategory, trend, top] = await Promise.all([
    getCashFlowProjection(user.id),
    expensesByCategory(user.id),
    monthlyTrend(user.id),
    topTransactions(user.id),
  ]);

  return (
    <div className="space-y-10">
      <section>
        <p className="text-xs opacity-60">{MESES[flow.periodStart.getMonth()]}</p>
        {/* Figura principal: el balance es el número con el que abre el panel. */}
        <p className="text-4xl font-semibold tabular-nums">{formatCOP(flow.balance)}</p>
        <p className="text-sm opacity-60">
          disponible tras {formatCOP(flow.expense)} en egresos
          {flow.pendingFixed > 0 && (
            <> · quedan {formatCOP(flow.pendingFixed)} de fijos por cargar</>
          )}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Ingresos" value={formatCOP(flow.income)} />
        <Stat label="Egresos" value={formatCOP(flow.expense)} />
        <Stat label="Proyectado al cierre" value={formatCOP(flow.projectedBalance)} />
      </section>

      <Panel
        title="Gasto por categoría"
        hint="En qué se te fue la plata este mes."
      >
        <CategoryBreakdown data={byCategory} />
      </Panel>

      <Panel
        title="Comprometido contra disponible"
        hint="Cuánto de tus egresos ya estaba decidido de antemano."
      >
        <FixedVsVariable fixed={flow.fixedExpense} variable={flow.variableExpense} />
      </Panel>

      <Panel title="Evolución" hint="Últimos seis meses.">
        <MonthlyTrend data={trend} />
      </Panel>

      <Panel title="Top movimientos" hint="Los cinco mayores del período.">
        {top.length === 0 ? (
          <p className="text-sm opacity-60">Sin movimientos destacados.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {top.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <CategoryDot color={t.category?.color ?? "#888780"} />
                  <span className="truncate">{t.description}</span>
                </span>
                <span className="shrink-0 tabular-nums">{formatCOP(t.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 p-4 dark:border-white/15">
      <p className="text-xs opacity-60">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">{title}</h2>
        {hint && <p className="text-xs opacity-60">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
