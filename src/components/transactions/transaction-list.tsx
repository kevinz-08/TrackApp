"use client";

import { useState } from "react";
import { TransactionRow } from "./transaction-row";
import {
  TransactionEditor,
  type CategoryOption,
  type EditableTransaction,
} from "./transaction-editor";

export type ListedTransaction = EditableTransaction & {
  categoryName: string | null;
  needsReview: boolean;
  occurredLabel: string;
};

/**
 * Envoltorio de cliente: sostiene qué fila está en edición.
 *
 * El estado vive aquí y no en cada fila para que solo haya un editor montado a
 * la vez; con la hoja dentro de la fila habría tantos diálogos como
 * transacciones en la lista.
 */
export function TransactionList({
  transactions,
  categories,
}: {
  transactions: ListedTransaction[];
  categories: CategoryOption[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = transactions.find((t) => t.id === editingId) ?? null;

  return (
    <>
      <ul className="flex flex-col gap-1.5 [&>li]:[contain-intrinsic-size:auto_64px] [&>li]:[content-visibility:auto]">
        {transactions.map((t) => (
          <li key={t.id}>
            <TransactionRow
              id={t.id}
              description={t.description}
              meta={`${t.categoryName ?? "Sin categoría"} · ${t.occurredLabel}`}
              amount={t.amount}
              income={t.type === "INCOME"}
              needsReview={t.needsReview}
              onOpen={() => setEditingId(t.id)}
            />
          </li>
        ))}
      </ul>

      {/* La clave remonta el editor al cambiar de fila: así los campos parten
          siempre de la transacción elegida y no de la anterior. */}
      {editing && (
        <TransactionEditor
          key={editing.id}
          transaction={editing}
          categories={categories}
          onClose={() => setEditingId(null)}
        />
      )}
    </>
  );
}
