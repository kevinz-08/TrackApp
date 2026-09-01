"use client";

import { useState, useTransition } from "react";
import { createCategory, updateCategory, deleteCategory } from "@/actions/categories";
import { CATEGORICAL_LIGHT } from "@/lib/chart-palette";
import { Sheet } from "@/components/ui/sheet";
import { Field, Input, SegmentedField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card, MicroLabel } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

export type ManagedCategory = {
  id: string;
  name: string;
  kind: "INCOME" | "EXPENSE";
  color: string;
  icon: string | null;
  isDefault: boolean;
};

type Draft = { id: string | null; name: string; kind: "INCOME" | "EXPENSE"; color: string };

const emptyDraft = (kind: "INCOME" | "EXPENSE"): Draft => ({
  id: null,
  name: "",
  kind,
  color: CATEGORICAL_LIGHT[0],
});

export function CategoryManager({
  categories,
  usage,
}: {
  categories: ManagedCategory[];
  usage: Record<string, number>;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);

  const groups = [
    { kind: "EXPENSE" as const, label: "Egresos" },
    { kind: "INCOME" as const, label: "Ingresos" },
  ];

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.kind} className="space-y-2">
          <div className="flex items-center justify-between">
            <MicroLabel>{group.label}</MicroLabel>
            <Button size="sm" variant="quiet" onClick={() => setDraft(emptyDraft(group.kind))}>
              Añadir
            </Button>
          </div>

          <Card className="divide-hairline divide-y">
            {categories
              .filter((c) => c.kind === group.kind)
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setDraft({ id: c.id, name: c.name, kind: c.kind, color: c.color })}
                  className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-full"
                    style={{ background: c.color }}
                  />
                  <span className="text-ink flex-1 truncate text-sm">{c.name}</span>
                  <span className="text-ink-3 shrink-0 text-[11.5px] tabular-nums">
                    {usage[c.id] ?? 0}
                  </span>
                </button>
              ))}
          </Card>
        </section>
      ))}

      {draft && (
        <CategorySheet
          key={draft.id ?? `nueva-${draft.kind}`}
          draft={draft}
          usageCount={draft.id ? (usage[draft.id] ?? 0) : 0}
          isDefault={categories.find((c) => c.id === draft.id)?.isDefault ?? false}
          onClose={() => setDraft(null)}
        />
      )}
    </div>
  );
}

function CategorySheet({
  draft,
  usageCount,
  isDefault,
  onClose,
}: {
  draft: Draft;
  usageCount: number;
  isDefault: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(draft.name);
  const [kind, setKind] = useState(draft.kind);
  const [color, setColor] = useState(draft.color);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = () => {
    if (!name.trim()) {
      setError("Escribe un nombre.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const payload = { name: name.trim(), kind, color };
        if (draft.id) await updateCategory(draft.id, payload);
        else await createCategory(payload);
        onClose();
      } catch {
        setError("No se pudo guardar. ¿Ya existe una categoría con ese nombre?");
      }
    });
  };

  const remove = () => {
    if (!draft.id) return;
    startTransition(async () => {
      try {
        await deleteCategory(draft.id!);
        onClose();
      } catch {
        setError("No se pudo borrar.");
      }
    });
  };

  return (
    <Sheet open onClose={onClose} title={draft.id ? "Editar categoría" : "Nueva categoría"}>
      <div className="space-y-4 pb-2">
        <h2 className="text-ink text-[17px] font-semibold">
          {draft.id ? "Editar categoría" : "Nueva categoría"}
        </h2>

        <Field label="Nombre">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoComplete="off"
          />
        </Field>

        {/* El tipo solo se elige al crear: cambiarlo en una categoría con
            historial dejaría transacciones de egreso bajo una de ingreso. */}
        {!draft.id && (
          <Field label="Tipo">
            <SegmentedField
              name="kind"
              value={kind}
              onChange={(v) => setKind(v as "INCOME" | "EXPENSE")}
              options={[
                { value: "EXPENSE", label: "Egreso" },
                { value: "INCOME", label: "Ingreso" },
              ]}
            />
          </Field>
        )}

        {/*
          El color se elige de la paleta validada, no de un selector libre: un
          hex arbitrario rompe la separación bajo daltonismo que garantiza el
          orden de esos ocho slots. Hoy los gráficos son monocromos, pero el
          color sigue siendo la vía de escape para más de seis series.
        */}
        <Field label="Color" hint="Paleta validada para daltonismo.">
          <div className="flex flex-wrap gap-2 pt-1">
            {CATEGORICAL_LIGHT.map((hex) => (
              <button
                key={hex}
                type="button"
                aria-label={`Color ${hex}`}
                aria-pressed={hex === color}
                onClick={() => setColor(hex)}
                className={cn(
                  "size-9 rounded-chip transition-transform duration-base ease-standard",
                  "active:scale-[0.94]",
                  hex === color && "ring-ink ring-2 ring-offset-2 ring-offset-[var(--surface)]",
                )}
                style={{ background: hex }}
              />
            ))}
          </div>
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
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </div>

        {draft.id && !isDefault && (
          <div className="border-hairline space-y-2 border-t pt-4">
            {confirmingDelete ? (
              <>
                <p className="text-ink-2 text-[13px]">
                  {usageCount > 0
                    ? `${usageCount} movimiento${usageCount === 1 ? "" : "s"} quedará${usageCount === 1 ? "" : "n"} sin categoría. No se borra ningún movimiento.`
                    : "Esta categoría no tiene movimientos."}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    block
                    onClick={() => setConfirmingDelete(false)}
                    disabled={pending}
                  >
                    Conservar
                  </Button>
                  <Button block onClick={remove} disabled={pending}>
                    Borrar
                  </Button>
                </div>
              </>
            ) : (
              <Button variant="quiet" block onClick={() => setConfirmingDelete(true)}>
                Borrar categoría
              </Button>
            )}
          </div>
        )}

        {draft.id && isDefault && (
          <p className="text-ink-3 border-hairline border-t pt-4 text-[12px]">
            Las categorías base no se pueden borrar, pero sí renombrar y recolorear.
          </p>
        )}
      </div>
    </Sheet>
  );
}
