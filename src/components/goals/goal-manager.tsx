"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  createGoal,
  updateGoal,
  deleteGoal,
  contributeToGoal,
  withdrawFromGoal,
} from "@/actions/goals";
import { Sheet } from "@/components/ui/sheet";
import { Field, Input, SegmentedField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { EmptyState, MicroLabel } from "@/components/ui/surface";
import { ImageField, type UploadedImage } from "./image-field";
import { GoalCard, type GoalView } from "./goal-card";
import { formatCOP } from "@/lib/money";

export function GoalManager({ goals }: { goals: GoalView[] }) {
  // `undefined` = ninguna hoja abierta; `null` = creando una meta nueva.
  const [editing, setEditing] = useState<GoalView | null | undefined>(undefined);
  const [moving, setMoving] = useState<GoalView | null>(null);

  const active = goals.filter((g) => !g.completedAt);
  const done = goals.filter((g) => g.completedAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <MicroLabel>Metas</MicroLabel>
        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
          <Plus className="size-4" aria-hidden />
          Nueva
        </Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState message="Sin metas todavía. Crea una y ponle una foto de lo que estás ahorrando." />
      ) : (
        <div className="space-y-3">
          {active.map((g) => (
            <GoalCard key={g.id} goal={g} onOpen={() => setMoving(g)} />
          ))}

          {done.length > 0 && (
            <div className="space-y-3 pt-3">
              <MicroLabel>Cumplidas</MicroLabel>
              {done.map((g) => (
                <GoalCard key={g.id} goal={g} onOpen={() => setMoving(g)} />
              ))}
            </div>
          )}
        </div>
      )}

      {editing !== undefined && (
        <GoalSheet
          key={editing?.id ?? "nueva"}
          goal={editing}
          onClose={() => setEditing(undefined)}
        />
      )}

      {moving && (
        <ContributeSheet
          key={moving.id}
          goal={moving}
          onEdit={() => {
            setEditing(moving);
            setMoving(null);
          }}
          onClose={() => setMoving(null)}
        />
      )}
    </div>
  );
}

/** Alta y edición de la meta. `goal === null` significa crear. */
function GoalSheet({ goal, onClose }: { goal: GoalView | null; onClose: () => void }) {
  const isNew = goal === null;
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(goal ? String(goal.targetAmount) : "");
  const [date, setDate] = useState(goal?.targetDate?.slice(0, 10) ?? "");
  const [image, setImage] = useState<UploadedImage | null>(
    goal?.imageUrl ? { url: goal.imageUrl, publicId: goal.imagePublicId ?? "" } : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = () => {
    const amount = Number(target);
    if (!name.trim()) {
      setError("Ponle un nombre a la meta.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("El objetivo debe ser mayor que cero.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const payload = {
          name: name.trim(),
          targetAmount: Math.round(amount),
          targetDate: date ? new Date(date + "T12:00:00") : undefined,
          imageUrl: image?.url,
          imagePublicId: image?.publicId || undefined,
        };
        if (isNew) await createGoal(payload);
        else await updateGoal(goal.id, payload);
        onClose();
      } catch {
        setError("No se pudo guardar.");
      }
    });
  };

  const title = isNew ? "Nueva meta" : "Editar meta";

  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="space-y-4 pb-2">
        <h2 className="text-ink text-[17px] font-semibold">{title}</h2>

        <Field label="Nombre">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Viaje a Japón"
            autoFocus={isNew}
          />
        </Field>

        <Field label="Objetivo" hint="En pesos, sin puntos ni decimales.">
          <Input
            value={target}
            onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            placeholder="8000000"
          />
        </Field>

        <Field label="Fecha límite" hint="Opcional. Con ella se calcula el ritmo mensual.">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <ImageField value={image?.url ?? null} onChange={setImage} />

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
              <>
                <p className="text-ink-2 text-[13px]">
                  Los aportes ya registrados se conservan como movimientos; solo se pierde la
                  agrupación de la meta.
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" block onClick={() => setConfirmingDelete(false)}>
                    Conservar
                  </Button>
                  <Button
                    block
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await deleteGoal(goal.id);
                        onClose();
                      })
                    }
                  >
                    Borrar
                  </Button>
                </div>
              </>
            ) : (
              <Button variant="quiet" block onClick={() => setConfirmingDelete(true)}>
                Borrar meta
              </Button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}

/** Aportar o retirar. Es la acción frecuente, por eso abre al tocar la tarjeta. */
function ContributeSheet({
  goal,
  onEdit,
  onClose,
}: {
  goal: GoalView;
  onEdit: () => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"IN" | "OUT">("IN");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  const submit = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Escribe un monto mayor que cero.");
      return;
    }
    if (mode === "OUT" && value > goal.currentAmount) {
      setError("Solo hay " + formatCOP(goal.currentAmount) + " en esta meta.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        if (mode === "IN") await contributeToGoal(goal.id, Math.round(value));
        else await withdrawFromGoal(goal.id, Math.round(value));
        onClose();
      } catch {
        setError("No se pudo registrar el movimiento.");
      }
    });
  };

  return (
    <Sheet open onClose={onClose} title={goal.name}>
      <div className="space-y-4 pb-2">
        <div className="space-y-1">
          <h2 className="text-ink text-[17px] font-semibold">{goal.name}</h2>
          <p className="text-ink-3 text-[12px]">
            {formatCOP(goal.currentAmount)} de {formatCOP(goal.targetAmount)}
            {remaining > 0 && " · faltan " + formatCOP(remaining)}
          </p>
        </div>

        <SegmentedField
          name="mode"
          value={mode}
          onChange={(v) => setMode(v as "IN" | "OUT")}
          options={[
            { value: "IN", label: "Aportar" },
            { value: "OUT", label: "Retirar" },
          ]}
        />

        <Field
          label="Monto"
          hint={
            mode === "IN"
              ? "Se registra como movimiento, pero no cuenta como gasto."
              : "Vuelve a tu disponible como ingreso."
          }
        >
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            placeholder="200000"
            autoFocus
          />
        </Field>

        {error && (
          <p role="alert" className="text-ink text-[13px]">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" block onClick={onEdit} disabled={pending}>
            Editar meta
          </Button>
          <Button block onClick={submit} disabled={pending}>
            {pending ? "Guardando…" : mode === "IN" ? "Aportar" : "Retirar"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
