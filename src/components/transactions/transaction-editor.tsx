"use client";

import { useState, useTransition } from "react";
import { createTransaction, updateTransaction } from "@/actions/transactions";
import { Sheet } from "@/components/ui/sheet";
import { Field, Input, Select, SegmentedField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export type EditableTransaction = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  categoryId: string | null;
  occurredAt: string; // ISO, ya normalizada en el servidor
  rawInput: string | null;
};

export type CategoryOption = { id: string; name: string; kind: "INCOME" | "EXPENSE" };

/** Fecha local en formato `YYYY-MM-DD`, sin pasar por UTC. */
const todayLocal = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Alta y edición de una transacción. Un solo formulario para los dos modos:
 * `transaction === null` significa crear.
 *
 * En modo edición es la pieza que cierra el bucle de aprendizaje:
 * `updateTransaction` limpia `needsReview`, y la corrección queda como
 * precedente para que `suggestCategory` acierte la próxima vez con un concepto
 * parecido. Sin esta pantalla, la memoria de correcciones nunca se alimenta.
 */
export function TransactionEditor({
  transaction,
  categories,
  onClose,
  initialType = "EXPENSE",
}: {
  transaction: EditableTransaction | null;
  categories: CategoryOption[];
  onClose: () => void;
  /**
   * Tipo con el que abre el formulario al crear. Existe para los accesos
   * directos de la portada: si «Ingreso» abriera en egreso, el usuario tendría
   * que corregir el segmentado en el primer gesto, y ese gesto es justo el que
   * el atajo venía a ahorrar. En edición manda el tipo guardado.
   */
  initialType?: "INCOME" | "EXPENSE";
}) {
  const isNew = transaction === null;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<"INCOME" | "EXPENSE">(transaction?.type ?? initialType);
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? "");
  const [occurredAt, setOccurredAt] = useState(
    transaction ? transaction.occurredAt.slice(0, 10) : todayLocal(),
  );

  // Las categorías de ingreso no tienen sentido en un egreso y viceversa.
  const options = categories.filter((c) => c.kind === type);

  const save = () => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("El monto debe ser mayor que cero.");
      return;
    }
    if (!description.trim()) {
      setError("Escribe un concepto.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const payload = {
          type,
          // El dinero se guarda en enteros: se redondea aquí, nunca se confía
          // en que el input traiga un entero.
          amount: Math.round(parsed),
          description: description.trim(),
          // Al crear sin categoría se deja que `createTransaction` la sugiera
          // con las reglas locales; forzar null desactivaría esa ayuda.
          categoryId: categoryId || (isNew ? undefined : null),
          occurredAt: new Date(`${occurredAt}T12:00:00`),
        };
        if (isNew) await createTransaction(payload);
        else await updateTransaction(transaction.id, payload);
        onClose();
      } catch {
        setError("No se pudo guardar. Revisa los datos e inténtalo de nuevo.");
      }
    });
  };

  const title = isNew ? "Nuevo movimiento" : "Editar movimiento";

  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="space-y-4 pb-2">
        <div className="space-y-1">
          <h2 className="text-ink text-[17px] font-semibold">{title}</h2>
          {transaction?.rawInput && (
            <p className="text-ink-3 text-[12px]">Registrado como: “{transaction.rawInput}”</p>
          )}
          {isNew && (
            <p className="text-ink-3 text-[12px]">
              Si dejas la categoría vacía, se sugiere sola por el concepto.
            </p>
          )}
        </div>

        <SegmentedField
          name="type"
          value={type}
          onChange={(v) => {
            setType(v as "INCOME" | "EXPENSE");
            setCategoryId(""); // la categoría anterior ya no aplica
          }}
          options={[
            { value: "EXPENSE", label: "Egreso" },
            { value: "INCOME", label: "Ingreso" },
          ]}
        />

        <Field label="Concepto">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={140}
            autoComplete="off"
            autoFocus={isNew}
            placeholder={isNew ? "Almuerzo" : undefined}
          />
        </Field>

        <Field label="Monto" hint="En pesos, sin puntos ni decimales.">
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            autoComplete="off"
            placeholder={isNew ? "25000" : undefined}
          />
        </Field>

        <Field label="Categoría">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">{isNew ? "Sugerir automáticamente" : "Sin categoría"}</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Fecha">
          <Input type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
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
            {pending ? "Guardando…" : isNew ? "Registrar" : "Guardar"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
