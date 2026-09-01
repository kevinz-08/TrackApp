"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  createSubscription,
  updateSubscription,
  cancelSubscription,
  reactivateSubscription,
  deleteSubscription,
} from "@/actions/subscriptions";
import type { SubscriptionSummary } from "@/services/finance/subscriptions";
import { Sheet } from "@/components/ui/sheet";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, MicroLabel } from "@/components/ui/surface";
import { Money } from "@/components/ui/money";
import { formatCOP } from "@/lib/money";
import type { CategoryOption } from "@/components/transactions/transaction-editor";

const FREQUENCIES = [
  { value: "MONTHLY", label: "Mensual" },
  { value: "YEARLY", label: "Anual" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "BIMONTHLY", label: "Cada 2 meses" },
  { value: "QUARTERLY", label: "Trimestral" },
] as const;

const FREQ_LABEL: Record<string, string> = Object.fromEntries(
  FREQUENCIES.map((f) => [f.value, f.label]),
);

type Active = SubscriptionSummary["active"][number];

export function SubscriptionManager({
  summary,
  categories,
}: {
  summary: SubscriptionSummary;
  categories: CategoryOption[];
}) {
  const [editing, setEditing] = useState<Active | null | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  const expenseCategories = categories.filter((c) => c.kind === "EXPENSE");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <MicroLabel>Suscripciones</MicroLabel>
        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
          <Plus className="size-4" aria-hidden />
          Nueva
        </Button>
      </div>

      {/*
        La cifra ANUAL es la figura principal, no la mensual. $27.000 al mes no
        mueve a nadie; $324.000 al año sí. Ese salto de escala es todo el valor
        del módulo, así que se le da el tamaño grande y la mensual queda como
        pie de línea.
      */}
      <section className="pt-1">
        <MicroLabel>Te cuestan al año</MicroLabel>
        <Money amount={summary.annualTotal} size="xl" className="mt-2.5" />
        <p className="text-ink-2 mt-2 text-[13px]">
          {formatCOP(summary.monthlyTotal)} al mes · {summary.active.length}{" "}
          {summary.active.length === 1 ? "activa" : "activas"}
        </p>
      </section>

      {summary.active.length === 0 ? (
        <EmptyState message="Sin suscripciones registradas. Añade las que pagas y verás cuánto suman al año." />
      ) : (
        <Card className="divide-hairline divide-y">
          {summary.active.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setEditing(s)}
              className="active:bg-sunken duration-base ease-standard flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors"
            >
              <span className="min-w-0 flex-1">
                <span className="text-ink block truncate text-sm">
                  {s.name}
                  {s.stale && (
                    <span className="text-ink-3 ml-2 text-[10.5px] font-semibold tracking-[0.14em] uppercase">
                      revisar
                    </span>
                  )}
                </span>
                <span className="text-ink-3 block truncate text-[11.5px]">
                  {FREQ_LABEL[s.frequency] ?? s.frequency} · {formatCOP(s.annual)} al año
                </span>
              </span>
              <span className="text-ink shrink-0 text-sm tabular-nums">
                {formatCOP(s.amount)}
              </span>
            </button>
          ))}
        </Card>
      )}

      {summary.active.some((s) => s.stale) && (
        <p className="text-ink-2 text-[13px] leading-[19px]">
          Las marcadas como “revisar” llevan más de seis meses cobrándose sin que las
          hayas tocado. No significa que sobren: solo que vale la pena confirmarlo.
        </p>
      )}

      {summary.cancelled.length > 0 && (
        <section className="space-y-2">
          <MicroLabel>Canceladas</MicroLabel>
          <p className="text-ink-2 text-[13px] leading-[19px]">
            Dejaste de pagar {formatCOP(summary.savedPerYear)} al año.
          </p>
          <Card className="divide-hairline divide-y">
            {summary.cancelled.map((s) => (
              <div key={s.id} className="flex min-h-12 items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="text-ink-2 block truncate text-sm line-through">
                    {s.name}
                  </span>
                  <span className="text-ink-3 block text-[11.5px]">
                    {formatCOP(s.annual)} al año que ya no pagas
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="quiet"
                  disabled={pending}
                  onClick={() => startTransition(() => reactivateSubscription(s.id))}
                >
                  Reactivar
                </Button>
              </div>
            ))}
          </Card>
        </section>
      )}

      {editing !== undefined && (
        <SubscriptionSheet
          key={editing?.id ?? "nueva"}
          subscription={editing}
          categories={expenseCategories}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}

function SubscriptionSheet({
  subscription,
  categories,
  onClose,
}: {
  subscription: Active | null;
  categories: CategoryOption[];
  onClose: () => void;
}) {
  const isNew = subscription === null;
  const [name, setName] = useState(subscription?.name ?? "");
  const [amount, setAmount] = useState(subscription ? String(subscription.amount) : "");
  const [frequency, setFrequency] = useState<string>(subscription?.frequency ?? "MONTHLY");
  const [categoryId, setCategoryId] = useState(subscription?.categoryId ?? "");
  const [dayOfMonth, setDayOfMonth] = useState(
    subscription ? String(new Date(subscription.nextRunAt).getDate()) : "1",
  );
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const value = Number(amount) || 0;
  const perYear = value * { WEEKLY: 52, MONTHLY: 12, BIMONTHLY: 6, QUARTERLY: 4, YEARLY: 1 }[
    frequency as "MONTHLY"
  ];

  const save = () => {
    if (!name.trim()) {
      setError("Escribe el nombre del servicio.");
      return;
    }
    if (value <= 0) {
      setError("El monto debe ser mayor que cero.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const payload = {
          name: name.trim(),
          type: "EXPENSE" as const,
          amount: Math.round(value),
          frequency,
          dayOfMonth: Math.min(31, Math.max(1, Number(dayOfMonth) || 1)),
          categoryId: categoryId || null,
        };
        if (isNew) await createSubscription(payload);
        else await updateSubscription(subscription.id, payload);
        onClose();
      } catch {
        setError("No se pudo guardar.");
      }
    });
  };

  const title = isNew ? "Nueva suscripción" : subscription.name;

  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="space-y-4 pb-2">
        <h2 className="text-ink text-[17px] font-semibold">{title}</h2>

        <Field label="Servicio">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Netflix"
            autoFocus={isNew}
          />
        </Field>

        <Field label="Monto por cobro">
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            placeholder="26900"
          />
        </Field>

        <Field label="Frecuencia">
          <Select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Día del cobro">
          <Input
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
          />
        </Field>

        <Field label="Categoría">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        {/* El anual se muestra mientras se escribe: es el dato que decide. */}
        {value > 0 && (
          <p className="text-ink-2 text-[13px] leading-[19px]">
            Son {formatCOP(perYear)} al año.
          </p>
        )}

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
            {pending ? "Guardando…" : isNew ? "Añadir" : "Guardar"}
          </Button>
        </div>

        {!isNew && (
          <div className="border-hairline space-y-2 border-t pt-4">
            {confirming ? (
              <>
                <p className="text-ink-2 text-[13px] leading-[19px]">
                  Se queda en el historial como cancelada, sumando al ahorro anual. Para
                  borrarla del todo, usa “Borrar”.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    block
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await deleteSubscription(subscription.id);
                        onClose();
                      })
                    }
                  >
                    Borrar
                  </Button>
                  <Button
                    block
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await cancelSubscription(subscription.id);
                        onClose();
                      })
                    }
                  >
                    Cancelarla
                  </Button>
                </div>
              </>
            ) : (
              <Button variant="quiet" block onClick={() => setConfirming(true)}>
                Ya no la pago
              </Button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
