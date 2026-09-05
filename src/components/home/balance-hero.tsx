"use client";

import { useState } from "react";
import Link from "next/link";
import { ChartNoAxesColumn, Minus, Plus, Sparkles, type LucideIcon } from "lucide-react";
import { Money } from "@/components/ui/money";
import {
  TransactionEditor,
  type CategoryOption,
} from "@/components/transactions/transaction-editor";
import { cn } from "@/lib/utils";

/**
 * Portada del panel: una sola tarjeta con el balance del mes y, debajo, los
 * cuatro accesos que resuelven el 90% de las aperturas de la app.
 *
 * La tarjeta es la única superficie del sistema con malla (`hero-mesh`). Se la
 * puede permitir porque es la primera y única cosa de la pantalla: en cuanto
 * hubiera dos, la malla dejaría de señalar «esto es lo importante» y pasaría a
 * ser decoración de fondo.
 *
 * Los accesos van FUERA de la tarjeta y en fila, no dentro: la tarjeta se lee,
 * los círculos se tocan, y mezclar las dos cosas en la misma caja obliga al ojo
 * a decidir qué es cifra y qué es botón antes de poder hacer ninguna de las
 * dos.
 */
export function BalanceHero({
  balance,
  monthLabel,
  detail,
  categories,
}: {
  balance: number;
  /** Mes en curso, ya resuelto en el servidor para no partir la hidratación. */
  monthLabel: string;
  detail: React.ReactNode;
  categories: CategoryOption[];
}) {
  const [creating, setCreating] = useState<"INCOME" | "EXPENSE" | null>(null);

  return (
    <section className="space-y-5">
      <div
        className={cn(
          "hero-mesh border-hairline rounded-[22px] border p-5",
          "shadow-lift [contain:layout_paint]",
        )}
      >
        {/*
          La pastilla ocupa el sitio de los distintivos de la tarjeta física
          —moneda, red, últimos dígitos—: es la etiqueta que dice de qué es la
          cifra que viene debajo, y por eso va arriba y no pegada al número.
        */}
        <p
          className={cn(
            "border-hairline bg-surface/70 text-ink inline-flex items-center rounded-full border",
            "px-3.5 py-1.5 text-[12px] leading-[15px] font-semibold tracking-[0.01em]",
          )}
        >
          Balance del mes de {monthLabel}
        </p>

        <Money amount={balance} size="xl" className="mt-11" />
        <p className="text-ink-2 mt-1.5 text-[13px] leading-[18px]">Balance</p>
      </div>

      <p className="text-ink-2 text-[13px] leading-[18px]">{detail}</p>

      <ul className="grid grid-cols-4 gap-1">
        <li>
          <Action icon={Plus} label="Ingreso" onClick={() => setCreating("INCOME")} />
        </li>
        <li>
          <Action icon={Minus} label="Egreso" onClick={() => setCreating("EXPENSE")} />
        </li>
        <li>
          <Action icon={ChartNoAxesColumn} label="Analíticas" href="#analiticas" />
        </li>
        <li>
          <Action icon={Sparkles} label="Asistente" href="/chat" />
        </li>
      </ul>

      {creating && (
        <TransactionEditor
          transaction={null}
          categories={categories}
          initialType={creating}
          onClose={() => setCreating(null)}
        />
      )}
    </section>
  );
}

/**
 * Círculo de 56pt más etiqueta. El área táctil la marca el propio elemento, que
 * llega a los 44pt de sobra contando la etiqueta; el círculo es solo la parte
 * pintada.
 *
 * Ingreso y egreso se distinguen por `+` y `−`, no por dos flechas distintas:
 * es el mismo criterio con el que la lista marca la polaridad, y una flecha
 * pide interpretación donde el signo no.
 */
function Action({
  icon: Icon,
  label,
  href,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="border-hairline bg-surface grid size-14 place-items-center rounded-full border">
        <Icon size={20} strokeWidth={1.75} absoluteStrokeWidth aria-hidden />
      </span>
      <span className="text-ink-2 text-[11.5px] leading-[14px] font-medium">{label}</span>
    </>
  );

  const className = cn(
    "text-ink flex w-full flex-col items-center gap-2 py-1",
    "duration-base ease-standard active:duration-instant transition-transform active:scale-[0.94]",
  );

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
