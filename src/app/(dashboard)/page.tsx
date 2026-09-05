import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, Settings } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getCashFlowProjection } from "@/services/finance/balance";
import { expensesByCategory, monthlyTrend, topTransactions } from "@/services/finance/aggregations";
import { getSubscriptions } from "@/services/finance/subscriptions";
import { listCategories } from "@/actions/categories";
import { formatCOP } from "@/lib/money";
import { Money, MoneyInline } from "@/components/ui/money";
import { Card, MicroLabel, Panel, Reveal, Skeleton } from "@/components/ui/surface";
import { PanelSkeleton } from "@/components/ui/route-skeleton";
import { BalanceHero } from "@/components/home/balance-hero";
import { PageHeader, IconAction } from "@/components/nav/page-header";
import { CategoryBreakdown } from "@/components/charts/category-breakdown";
import { MonthlyTrend } from "@/components/charts/monthly-trend";
import { FixedVsVariable } from "@/components/charts/fixed-vs-variable";

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

/**
 * La portada se sirve en dos tramos, no en uno.
 *
 * Las analíticas necesitan cinco consultas y la cifra grande tres. Sin frontera
 * de suspense la pantalla entera espera a la más lenta, así que el usuario mira
 * un hueco durante medio segundo para leer un número que ya estaba listo. Con
 * la frontera, el balance sale en cuanto vuelve su consulta y los gráficos
 * entran después, en su sitio y sin mover nada de lo que ya se leía —por eso
 * los esqueletos tienen la geometría exacta de lo que sustituyen—.
 *
 * Los dos tramos arrancan a la vez: son hermanos, no una cadena.
 */
export default function HomePage() {
  return (
    <div className="space-y-8">
      {/*
        Ajustes vive aquí y solo aquí: es la única pestaña sin acción propia, y
        una tuerca repetida en las cinco cabeceras compite con la acción real de
        cada pantalla.
      */}
      <PageHeader
        title="Inicio"
        action={<IconAction icon={Settings} label="Ajustes" href="/settings" />}
      />

      <Suspense fallback={<OverviewFallback />}>
        <Overview />
      </Suspense>

      <Suspense fallback={<InsightsFallback />}>
        <Insights />
      </Suspense>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Tramo 1: la cifra
   ───────────────────────────────────────────────────────── */

async function Overview() {
  const user = await requireUser();
  const [flow, categories] = await Promise.all([getCashFlowProjection(user.id), listCategories()]);

  return (
    <div className="space-y-8">
      {/*
        Anatomía fija del bloque superior (§2.1): micro label → cifra → delta.
        La cifra es la única mancha negra grande de la pantalla y necesita 32px
        de vacío alrededor: el espacio es lo que la convierte en principal.
      */}
      <Reveal>
        <BalanceHero
          balance={flow.balance}
          monthLabel={MESES[flow.periodStart.getMonth()]}
          categories={categories}
          detail={
            <>
              disponible tras {formatCOP(flow.expense)} en egresos
              {flow.savings > 0 && <> y {formatCOP(flow.savings)} guardados en metas</>}
              {flow.pendingFixed > 0 && (
                <> · quedan {formatCOP(flow.pendingFixed)} de fijos por cargar</>
              )}
            </>
          }
        />
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
    </div>
  );
}

/*
 * El esqueleto mide lo que mide el contenido real: si el hueco fuera más corto,
 * la llegada de la cifra empujaría los gráficos hacia abajo y el usuario
 * perdería la línea que estaba leyendo.
 */
function OverviewFallback() {
  return (
    <div className="space-y-8" aria-hidden>
      <Skeleton className="h-[248px] rounded-[22px]" />
      <Skeleton className="rounded-card h-[168px] sm:h-[88px]" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Tramo 2: las analíticas
   ───────────────────────────────────────────────────────── */

async function Insights() {
  const user = await requireUser();
  // Cinco consultas independientes, una sola espera: en cadena serían cinco
  // idas y vueltas a Neon apiladas. `flow` ya viene memoizado del tramo de
  // arriba, así que pedirlo aquí no cuesta una consulta más.
  const [flow, byCategory, trend, top, subs] = await Promise.all([
    getCashFlowProjection(user.id),
    expensesByCategory(user.id),
    monthlyTrend(user.id),
    topTransactions(user.id),
    getSubscriptions(user.id),
  ]);

  return (
    <div className="space-y-8">
      {/* Destino del acceso «Analíticas» de la portada. */}
      <Reveal step={2}>
        <div id="analiticas" className="scroll-mt-20">
          <Panel title="Gasto por categoría" hint="En qué se te fue la plata este mes.">
            <Card className="p-4">
              <CategoryBreakdown data={byCategory} />
            </Card>
          </Panel>
        </div>
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

/* Misma pieza que usa `loading.tsx`: dos esqueletos distintos para la misma
   sección acaban divergiendo, y el que se quede corto produce el salto. */
function InsightsFallback() {
  return (
    <div className="space-y-8" aria-hidden>
      <PanelSkeleton />
      <PanelSkeleton height="h-32" />
      <PanelSkeleton />
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
