"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { upsertCreditCard, deleteCreditCard } from "@/actions/cards";
import {
  simulateInstallments,
  simulateMinimumPayment,
  utilization,
} from "@/services/finance/credit";
import { Sheet } from "@/components/ui/sheet";
import { Field, Input, SegmentedField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, MicroLabel } from "@/components/ui/surface";
import { formatCOP } from "@/lib/money";
import { cn } from "@/lib/utils";

export type CardView = {
  id: string;
  name: string;
  description: string | null;
  creditLimit: number;
  currentDebt: number;
  statementDay: number;
  paymentDay: number;
  annualRate: number;
};

/** Días que faltan para el próximo día `day` del mes. */
function daysUntil(day: number) {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), day);
  if (next < now) next.setMonth(next.getMonth() + 1);
  return Math.ceil((next.getTime() - now.getTime()) / 86_400_000);
}

export function CardManager({ cards }: { cards: CardView[] }) {
  const [editing, setEditing] = useState<CardView | null | undefined>(undefined);
  const [opened, setOpened] = useState<CardView | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <MicroLabel>Tarjetas</MicroLabel>
        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
          <Plus className="size-4" aria-hidden />
          Nueva
        </Button>
      </div>

      {cards.length === 0 ? (
        <EmptyState message="Sin tarjetas. Añade una para simular compras a cuotas y entender qué te cuesta el crédito." />
      ) : (
        <div className="space-y-3">
          {cards.map((c) => (
            <CardRow key={c.id} card={c} onOpen={() => setOpened(c)} />
          ))}
        </div>
      )}

      <Card className="space-y-2 p-4">
        <MicroLabel>Sobre el crédito</MicroLabel>
        <p className="text-ink-2 text-[13px] leading-[19px]">
          Aquí no se conecta ningún banco ni se guarda ningún número de tarjeta. Los datos
          los pones tú, y sirven para una sola cosa: ver cuánto cuesta de verdad una compra
          antes de hacerla.
        </p>
      </Card>

      {editing !== undefined && (
        <CardSheet
          key={editing?.id ?? "nueva"}
          card={editing}
          onClose={() => setEditing(undefined)}
        />
      )}

      {opened && (
        <SimulatorSheet
          key={opened.id}
          card={opened}
          onEdit={() => {
            setEditing(opened);
            setOpened(null);
          }}
          onClose={() => setOpened(null)}
        />
      )}
    </div>
  );
}

function CardRow({ card, onOpen }: { card: CardView; onOpen: () => void }) {
  const used = utilization(card.currentDebt, card.creditLimit);
  const toPayment = daysUntil(card.paymentDay);
  const toStatement = daysUntil(card.statementDay);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-card border-hairline bg-surface duration-base ease-standard w-full space-y-3 border p-4 text-left transition-transform active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-ink truncate text-[15px] font-semibold">{card.name}</p>
          {card.description && (
            <p className="text-ink-3 truncate text-[11.5px]">{card.description}</p>
          )}
        </div>
        <span className="text-ink-3 shrink-0 text-[11px] font-semibold tracking-[0.14em] uppercase">
          {used}% usado
        </span>
      </div>

      <div>
        <p className="text-ink text-[22px] font-bold tabular-nums">
          {formatCOP(card.currentDebt)}
        </p>
        <p className="text-ink-3 text-[12px]">de {formatCOP(card.creditLimit)} de cupo</p>
      </div>

      <div className="bg-sunken h-1.5 w-full overflow-hidden rounded-full">
        <div
          className="bg-ink duration-base ease-standard h-full w-full origin-left rounded-full transition-transform"
          style={{ transform: `scaleX(${used / 100})` }}
        />
      </div>

      {/*
        La utilización alta no se marca en rojo: el sistema es monocromo y, más
        importante, el tono del producto no regaña. Se explica por qué importa.
      */}
      <p className="text-ink-2 text-[12px] leading-[17px]">
        {used > 30
          ? "Por encima del 30% del cupo el historial crediticio se resiente, aunque pagues a tiempo."
          : "Mantener el uso por debajo del 30% del cupo ayuda a tu historial."}
      </p>

      <p className="text-ink-3 text-[12px]">
        Corte en {toStatement} {toStatement === 1 ? "día" : "días"} · pago en {toPayment}{" "}
        {toPayment === 1 ? "día" : "días"}
      </p>
    </button>
  );
}

/** Alta y edición. `card === null` significa crear. */
function CardSheet({ card, onClose }: { card: CardView | null; onClose: () => void }) {
  const isNew = card === null;
  const [name, setName] = useState(card?.name ?? "");
  const [description, setDescription] = useState(card?.description ?? "");
  const [limit, setLimit] = useState(card ? String(card.creditLimit) : "");
  const [debt, setDebt] = useState(card ? String(card.currentDebt) : "0");
  const [statementDay, setStatementDay] = useState(String(card?.statementDay ?? 1));
  const [paymentDay, setPaymentDay] = useState(String(card?.paymentDay ?? 15));
  // La tasa se pide como porcentaje anual y se guarda como fracción.
  const [rate, setRate] = useState(card ? String(Math.round(card.annualRate * 1000) / 10) : "");
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = () => {
    const rateValue = Number(rate);
    if (!name.trim()) {
      setError("Ponle un nombre a la tarjeta.");
      return;
    }
    if (!Number.isFinite(rateValue) || rateValue < 0 || rateValue > 300) {
      setError("La tasa efectiva anual debe ir entre 0 y 300.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await upsertCreditCard(card?.id ?? null, {
          name: name.trim(),
          description: description.trim() || undefined,
          creditLimit: Math.round(Number(limit) || 0),
          currentDebt: Math.round(Number(debt) || 0),
          statementDay: Math.min(31, Math.max(1, Number(statementDay) || 1)),
          paymentDay: Math.min(31, Math.max(1, Number(paymentDay) || 15)),
          annualRate: rateValue / 100,
        });
        onClose();
      } catch {
        setError("No se pudo guardar.");
      }
    });
  };

  const title = isNew ? "Nueva tarjeta" : "Editar tarjeta";

  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="space-y-4 pb-2">
        <div className="space-y-1">
          <h2 className="text-ink text-[17px] font-semibold">{title}</h2>
          <p className="text-ink-3 text-[12px]">
            No pidas ni guardes el número de la tarjeta. Solo hacen falta estos datos.
          </p>
        </div>

        <Field label="Nombre">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Visa Bancolombia"
            autoFocus={isNew}
          />
        </Field>

        <Field label="Descripción" hint="Opcional.">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={140}
            placeholder="La del mercado"
          />
        </Field>

        <Field label="Cupo total">
          <Input
            value={limit}
            onChange={(e) => setLimit(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            placeholder="5000000"
          />
        </Field>

        <Field label="Deuda actual">
          <Input
            value={debt}
            onChange={(e) => setDebt(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Día de corte">
            <Input
              value={statementDay}
              onChange={(e) => setStatementDay(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
            />
          </Field>
          <Field label="Día de pago">
            <Input
              value={paymentDay}
              onChange={(e) => setPaymentDay(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
            />
          </Field>
        </div>

        <Field label="Tasa efectiva anual (%)" hint="La que aparece en tu extracto. Ej: 28.5">
          <Input
            value={rate}
            onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            placeholder="28.5"
          />
        </Field>

        {error && (
          <p role="alert" className="text-ink text-[13px]">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" block onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button block onClick={save} disabled={pending}>
            {pending ? "Guardando…" : isNew ? "Crear" : "Guardar"}
          </Button>
        </div>

        {!isNew && (
          <div className="border-hairline space-y-2 border-t pt-4">
            {confirmingDelete ? (
              <div className="flex gap-2">
                <Button variant="ghost" block onClick={() => setConfirmingDelete(false)}>
                  Conservar
                </Button>
                <Button
                  block
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteCreditCard(card.id);
                      onClose();
                    })
                  }
                >
                  Borrar
                </Button>
              </div>
            ) : (
              <Button variant="quiet" block onClick={() => setConfirmingDelete(true)}>
                Borrar tarjeta
              </Button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}

const INSTALLMENT_OPTIONS = [3, 6, 12, 24, 36];

/**
 * Los dos simuladores. Se calculan EN EL CLIENTE con las mismas funciones puras
 * del servidor: son aritmética, no datos, y así el resultado cambia mientras se
 * escribe en vez de tras un viaje de red. Es lo que convierte el simulador en
 * algo con lo que se juega, que es donde ocurre el aprendizaje.
 */
function SimulatorSheet({
  card,
  onEdit,
  onClose,
}: {
  card: CardView;
  onEdit: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"CUOTAS" | "MINIMO">("CUOTAS");
  const [amount, setAmount] = useState("1000000");
  const [installments, setInstallments] = useState(12);

  const plan = useMemo(
    () => simulateInstallments(Number(amount) || 0, installments, card.annualRate),
    [amount, installments, card.annualRate],
  );

  const minimum = useMemo(
    () => simulateMinimumPayment(card.currentDebt, card.annualRate),
    [card.currentDebt, card.annualRate],
  );

  return (
    <Sheet open onClose={onClose} title={card.name}>
      <div className="space-y-4 pb-2">
        <div className="space-y-1">
          <h2 className="text-ink text-[17px] font-semibold">{card.name}</h2>
          <p className="text-ink-3 text-[12px]">
            Tasa efectiva anual {Math.round(card.annualRate * 1000) / 10}%
          </p>
        </div>

        <SegmentedField
          name="sim"
          value={tab}
          onChange={(v) => setTab(v as "CUOTAS" | "MINIMO")}
          options={[
            { value: "CUOTAS", label: "A cuotas" },
            { value: "MINIMO", label: "Pago mínimo" },
          ]}
        />

        {tab === "CUOTAS" ? (
          <div className="space-y-4">
            <Field label="Monto de la compra">
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
              />
            </Field>

            <div className="space-y-1.5">
              <span className="text-ink-2 block text-[13px] font-medium">Cuotas</span>
              <div className="flex flex-wrap gap-2">
                {INSTALLMENT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setInstallments(n)}
                    aria-pressed={n === installments}
                    className={cn(
                      "rounded-chip duration-base ease-standard min-h-9 min-w-12 px-3 text-[13px] font-semibold transition-colors",
                      n === installments
                        ? "bg-ink text-ground"
                        : "bg-sunken text-ink-2 active:text-ink",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <Card className="divide-hairline divide-y">
              <Row label="Cuota mensual" value={formatCOP(plan.monthlyPayment)} />
              <Row label="Total que pagarías" value={formatCOP(plan.totalPaid)} />
              <Row label="Solo en intereses" value={formatCOP(plan.totalInterest)} strong />
            </Card>

            <p className="text-ink-2 text-[13px] leading-[19px]">
              {plan.totalInterest > 0 ? (
                <>
                  Diferir esta compra a {installments} cuotas te cuesta{" "}
                  {formatCOP(plan.totalInterest)} de más: un {plan.overpayPercent}% sobre el
                  precio. Es lo mismo que si el producto costara{" "}
                  {formatCOP(plan.totalPaid)} en vez de {formatCOP(Number(amount) || 0)}.
                </>
              ) : (
                <>Sin tasa configurada no hay intereses que calcular.</>
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {card.currentDebt === 0 ? (
              <p className="text-ink-2 text-[13px] leading-[19px]">
                No tienes deuda registrada en esta tarjeta. Anota tu saldo actual al editarla
                para ver esta proyección.
              </p>
            ) : (
              <>
                <Card className="divide-hairline divide-y">
                  <Row label="Deuda actual" value={formatCOP(card.currentDebt)} />
                  <Row
                    label="Tiempo en liquidarla"
                    value={
                      minimum.neverEnds ? "Nunca" : `${minimum.months} meses`
                    }
                    strong
                  />
                  <Row
                    label="Intereses pagados"
                    value={minimum.neverEnds ? "Sin fin" : formatCOP(minimum.totalInterest)}
                  />
                </Card>

                <p className="text-ink-2 text-[13px] leading-[19px]">
                  {minimum.neverEnds ? (
                    <>
                      Pagando solo el mínimo, la cuota no alcanza a cubrir ni los intereses
                      del mes: la deuda crece aunque pagues puntual, todos los meses, para
                      siempre. Esto es lo que hace el pago mínimo cuando la tasa es alta.
                    </>
                  ) : (
                    <>
                      Pagando solo el mínimo tardarías {minimum.months} meses y habrías
                      entregado {formatCOP(minimum.totalInterest)} solo en intereses, sobre
                      una deuda de {formatCOP(card.currentDebt)}. El mínimo está diseñado
                      para que la deuda dure, no para que se acabe.
                    </>
                  )}
                </p>
              </>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" block onClick={onEdit}>
            Editar tarjeta
          </Button>
          <Button block onClick={onClose}>
            Listo
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-3">
      <span className="text-ink-2 text-[13px]">{label}</span>
      <span
        className={cn(
          "text-ink shrink-0 tabular-nums",
          strong ? "text-[17px] font-bold" : "text-sm",
        )}
      >
        {value}
      </span>
    </div>
  );
}
