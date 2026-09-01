import { requireUser } from "@/lib/auth/guards";
import { getCashFlowProjection } from "@/services/finance/balance";
import { expensesByCategory, topTransactions } from "@/services/finance/aggregations";
import { formatCOP } from "@/lib/money";

export default async function HomePage() {
  const user = await requireUser();
  const [flow, byCategory, top] = await Promise.all([
    getCashFlowProjection(user.id),
    expensesByCategory(user.id),
    topTransactions(user.id),
  ]);

  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Ingresos" value={formatCOP(flow.income)} />
        <Stat label="Egresos" value={formatCOP(flow.expense)} />
        <Stat label="Balance" value={formatCOP(flow.balance)} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium opacity-60">Gasto por categoría</h2>
        {byCategory.length === 0 ? (
          <p className="text-sm opacity-60">Todavía no hay movimientos este mes.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {byCategory.map((c) => (
              <li key={c.categoryId ?? "none"} className="flex justify-between">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: c.color }} />
                  {c.name}
                </span>
                <span>{formatCOP(c.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium opacity-60">Top movimientos</h2>
        {top.length === 0 ? (
          <p className="text-sm opacity-60">Sin movimientos destacados.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {top.map((t) => (
              <li key={t.id} className="flex justify-between">
                <span>{t.description}</span>
                <span>{formatCOP(t.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 p-4 dark:border-white/15">
      <p className="text-xs opacity-60">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
