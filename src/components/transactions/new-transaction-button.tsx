"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionEditor, type CategoryOption } from "./transaction-editor";

/**
 * Alta manual. Es la vía secundaria a propósito: el camino principal del
 * producto es el atajo de iOS. Existe para lo que el atajo no cubre —corregir
 * un olvido, registrar con fecha pasada, o cuando no hay teléfono a mano.
 */
export function NewTransactionButton({ categories }: { categories: CategoryOption[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        Nuevo
      </Button>

      {open && (
        <TransactionEditor
          transaction={null}
          categories={categories}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
