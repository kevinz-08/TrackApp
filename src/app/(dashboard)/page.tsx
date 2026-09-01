import { requireUser } from "@/lib/auth/guards";
import { getCashFlowProjection } from "@/services/finance/balance";
import { expensesByCategory, monthlyTrend, topTransactions } from "@/services/finance/aggregations";
import { getSubscriptions } from "@/services/finance/subscriptions";
import { formatCOP } from "@/lib/money";
import { Money, MoneyInline } from "@/components/ui/money";
import { Card, MicroLabel, Panel, Reveal } from "@/components/ui/surface";
import { CategoryBreakdown } from "@/components/charts/category-breakdown";
import { MonthlyTrend } from "@/components/charts/monthly-trend";
import { FixedVsVariable } from "@/components/charts/fixed-vs-variable";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default async function HomePage() {
  const user = await requireUser();
  const [flow, byCategory, trend, top, subs] = await Promise.all([
    getCashFlowProjection(user.id),
    expensesByCategory(user.id),
    monthlyTrend(user.id),
    topTransactions(user.id),
    getSubscriptions(user.id),
  ]);

  return (
    <div className="space-y-10">
      {/*
        Anatomía fija del bloque superior (§2.1): micro label → cifra → delta.
        La cifra es la única mancha negra grande de la pantalla y necesita 32px
        de vacío alrededor: el espacio es lo que la convierte en principal.
      */}
      <Reveal>
        <section className="pt-2 pb-2">
          <MicroLabel>Saldo · {MESES[flow.periodStart.getMonth()]}</MicroLabel>
          <Money amount={flow.balance} size="xl" className="mt-2.5" />
          <p className="text-ink-2 mt-3 text-[13px] leading-[18px]">
            disponible tras {formatCOP(flow.expense)} en egresos
            {flow.savings > 0 && <> y {formatCOP(flow.savings)} guardados en metas</>}
            {flow.pendingFixed > 0 && (
              <> · quedan {formatCOP(flow.pendingFixed)} de fijos por cargar</>
            )}
          </p>
        </section>
      </Reveal>

      {/*
        Una sola tarjeta con separadores, no tres tarjetas sueltas: en un
        sistema monocromo cada borde cuesta atención, y tres cajas contiguas se
        leen como widgets independientes cuando en realidad son tres lecturas
        del mismo periodo.
      */}
      <Reveal step={1}>
        <Card className="divide-hairline divide-y sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Stat label="Ingresos" value={flow.income} />
          <Stat label="Egresos" value={flow.expense} />
          {/*
            El ahorro solo aparece cuando existe: una tarjeta en cero enseña
            un dato que no es dato y roba sitio a la proyección.
          */}
          {flow.savings > 0 ? (
            <Stat label="Ahorrado" value={flow.savings} />
          ) : (
            <Stat label="Proyectado al cierre" value={flow.projectedBalance} />
          )}
        </Card>
      </Reveal>

      <Reveal step={2}>
        <Panel title="Gasto por categoría" hint="En qué se te fue la plata este mes.">
          <Card className="p-4">
            <CategoryBreakdown data={byCategory} />
          </Card>
        </Panel>
      </Reveal>

      <Reveal step={3}>
        <Panel
          title="Comprometido contra disponible"
          hint="Cuánto de tus egresos ya estaba decidido de antemano."
        >
          <Card className="p-4">
            <FixedVsVariable fixed={flow.fixedExpense} variable={flow.variableExpense} />
          </Card>
        </Panel>
      </Reveal>

      {/*
        La cifra ANUAL en el panel, no la mensual: $27.000 al mes no mueve a
        nadie y $324.000 al año sí. Ese salto de escala es el único motivo por
        el que este bloque existe en la pantalla principal.
      */}
      {subs.active.length > 0 && (
        <Reveal step={4}>
          <Panel title="Suscripciones" hint="Lo que se te va sin que lo decidas cada mes.">
            <Link href="/subscriptions" className="block">
              <Card className="active:bg-sunken duration-base ease-standard flex items-center gap-3 p-4 transition-colors">
                <span className="min-w-0 flex-1">
                  <span className="text-ink block text-[22px] font-bold tabular-nums">
                    {formatCOP(subs.annualTotal)}
                  </span>
                  <span className="text-ink-3 block text-[12px]">
                    al año en {subs.active.length}{" "}
                    {subs.active.length === 1 ? "suscripción" : "suscripciones"} ·{" "}
                    {formatCOP(subs.monthlyTotal)} al mes
                  </span>
                </span>
                <ChevronRight className="text-ink-3 size-4 shrink-0" aria-hidden />
              </Card>
            </Link>
          </Panel>
        </Reveal>
      )}

      <Reveal step={4}>
        <Panel title="Evolución" hint="Últimos seis meses.">
          <Card className="p-4">
            <MonthlyTrend data={trend} />
          </Card>
        </Panel>
      </Reveal>

      <Panel title="Top movimientos" hint="Los cinco mayores del período.">
        <Card className="px-4">
          {top.length === 0 ? (
            <p className="text-ink-2 py-6 text-center text-[13px]">Sin movimientos destacados.</p>
          ) : (
            <ul>
              {top.map((t) => (
                <li
                  key={t.id}
                  className="border-hairline flex items-center justify-between gap-3 border-b py-3 last:border-b-0"
                >
                  <span className="min-w-0">
                    <span className="text-ink block truncate text-sm">{t.description}</span>
                    <span className="text-ink-3 block truncate text-[11.5px]">
                      {t.category?.name ?? "Sin categoría"}
                    </span>
                  </span>
                  <MoneyInline amount={t.amount} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Panel>
    </div>
  );
}

/**
 * En móvil es una fila —etiqueta a la izquierda, cifra a la derecha— porque en
 * 390pt tres columnas dejan la cifra sin sitio. A partir de sm se apila y las
 * tres se leen en paralelo.
 */
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 p-4 sm:block">
      <MicroLabel>{label}</MicroLabel>
      <Money amount={value} size="md" className="sm:mt-2" />
    </div>
  );
}
