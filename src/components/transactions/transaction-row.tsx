"use client";

import { useRef, useState, useTransition } from "react";
import { deleteTransaction } from "@/actions/transactions";
import { MoneyInline } from "@/components/ui/money";

const REVEAL = -96; // ancho de la acción revelada
const SNAP = REVEAL * 0.4; // pasado este punto, la fila se queda abierta

/**
 * Fila con swipe-to-action (§4.2).
 *
 * En un sistema monocromo la severidad se codifica con luminancia y con
 * POSICIÓN —la destructiva siempre al extremo, la más lejos del pulgar en
 * reposo— y siempre con etiqueta de texto: sin rojo, un icono solo es ambiguo.
 *
 * DESVIACIÓN DELIBERADA de la guía: no se implementa el «ejecuta por
 * sobre-arrastre». El borrado no tiene deshacer, así que la acción destructiva
 * exige un toque explícito sobre el botón revelado. Si más adelante hay undo,
 * el sobre-arrastre puede volver tal como está especificado.
 *
 * Todo el gesto se resuelve con `transform`, y `will-change` se pide en
 * `pointerdown` y se devuelve al soltar: declararlo estático en una lista de
 * 100 filas crea 100 capas de GPU.
 */
/** Por debajo de este desplazamiento el gesto fue un toque, no un arrastre. */
const TAP_SLOP = 4;

export function TransactionRow({
  id,
  description,
  meta,
  amount,
  income,
  needsReview,
  onOpen,
}: {
  id: string;
  description: string;
  meta: string;
  amount: number;
  income: boolean;
  needsReview: boolean;
  /** Toque sobre la fila: abre el editor. */
  onOpen?: () => void;
}) {
  const front = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const startX = useRef(0);
  const dragging = useRef(false);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const paint = (x: number, animated: boolean) => {
    const el = front.current;
    if (!el) return;
    el.style.transition = animated ? "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)" : "none";
    el.style.transform = `translateX(${x}px)`;
  };

  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.buttons !== 1) return;
    dragging.current = true;
    startX.current = e.clientX;
    front.current?.setPointerCapture(e.pointerId);
    // will-change es un préstamo: se pide al empezar y se devuelve al acabar.
    if (front.current) front.current.style.willChange = "transform";
  };

  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    let d = offset.current + (e.clientX - startX.current);
    // Resistencia elástica fuera del rango útil.
    if (d > 0) d *= 0.25;
    if (d < REVEAL) d = REVEAL + (d - REVEAL) * 0.35;
    paint(d, false);
  };

  const onUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    const travelled = e.clientX - startX.current;
    const d = offset.current + travelled;

    // Un toque sobre la fila cerrada abre el editor. Se distingue del arrastre
    // por la distancia recorrida, no por el tipo de evento: en táctil todo
    // llega como pointer y un `click` dispararía también al final de un swipe.
    if (Math.abs(travelled) < TAP_SLOP && offset.current === 0) {
      if (front.current) front.current.style.willChange = "auto";
      onOpen?.();
      return;
    }

    offset.current = d < SNAP ? REVEAL : 0;
    setOpen(offset.current !== 0);
    paint(offset.current, true);
    if (front.current) front.current.style.willChange = "auto";
  };

  const remove = () =>
    startTransition(async () => {
      await deleteTransaction(id);
    });

  return (
    <div className="rounded-btn relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex text-[12px] font-semibold tracking-[0.03em]">
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          tabIndex={open ? 0 : -1}
          className="bg-ink text-ground px-5 disabled:opacity-50"
        >
          Borrar
        </button>
      </div>

      <div
        ref={front}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="rounded-btn border-hairline bg-surface relative flex touch-pan-y items-center justify-between gap-3 border px-4 py-3.5 select-none"
        style={{ transition: "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <span className="min-w-0">
          <span className="text-ink block truncate text-sm">
            {description}
            {needsReview && (
              <span className="text-ink-3 ml-2 text-[10.5px] font-semibold tracking-[0.14em] uppercase">
                revisar
              </span>
            )}
          </span>
          <span className="text-ink-3 block truncate text-[11.5px]">{meta}</span>
        </span>
        <MoneyInline amount={amount} income={income} />
      </div>
    </div>
  );
}
