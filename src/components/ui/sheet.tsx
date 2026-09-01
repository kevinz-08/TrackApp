"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Hoja inferior con arrastre para descartar.
 *
 * Sigue los principios de manipulación directa: la hoja está pegada al dedo 1:1
 * durante todo el gesto, y al soltar NO se decide por la posición sino por la
 * posición PROYECTADA a partir de la velocidad. Así un flick corto y rápido
 * cierra, y un arrastre largo y lento que se detiene a medio camino vuelve.
 *
 * El gesto es interrumpible: al agarrar de nuevo se lee la posición real en
 * pantalla (`getBoundingClientRect`, no el valor lógico) y el arrastre continúa
 * desde ahí, sin salto.
 *
 * `will-change` se pide en `pointerdown` y se devuelve al soltar: dejarlo fijo
 * mantiene una capa de GPU viva durante toda la vida de la hoja.
 */

/** Proyección de inercia con desaceleración, la misma idea que el scroll. */
const project = (velocity: number, decelerationRate = 0.998) =>
  (velocity / 1000) * (decelerationRate / (1 - decelerationRate));

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const baseY = useRef(0);
  /** Historial corto de posiciones para estimar la velocidad al soltar. */
  const history = useRef<Array<{ y: number; t: number }>>([]);

  const paint = useCallback((y: number, animated: boolean) => {
    const el = panel.current;
    if (!el) return;
    el.style.transition = animated
      ? "transform 320ms var(--ease-standard), opacity 200ms linear"
      : "none";
    el.style.transform = `translate3d(0, ${y}px, 0)`;
  }, []);

  // Al abrir, entra desde abajo. Se pinta en el primer frame para que la
  // transición tenga un estado inicial del que partir.
  useEffect(() => {
    if (!open) return;
    const el = panel.current;
    if (!el) return;
    paint(el.offsetHeight || 480, false);
    const id = requestAnimationFrame(() => paint(0, true));
    return () => cancelAnimationFrame(id);
  }, [open, paint]);

  // Escape cierra, y mientras la hoja está abierta el fondo no scrollea.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const onDown = (e: React.PointerEvent) => {
    // Interrumpir: se parte de la posición REAL en pantalla, no de la lógica.
    const rect = panel.current?.getBoundingClientRect();
    const parentTop = panel.current?.offsetParent?.getBoundingClientRect().bottom ?? 0;
    baseY.current = rect ? Math.max(0, rect.top - (parentTop - rect.height)) : 0;

    dragging.current = true;
    startY.current = e.clientY;
    history.current = [{ y: e.clientY, t: performance.now() }];
    panel.current?.setPointerCapture(e.pointerId);
    if (panel.current) panel.current.style.willChange = "transform";
  };

  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    let d = baseY.current + (e.clientY - startY.current);
    if (d < 0) d *= 0.25; // resistencia elástica hacia arriba
    paint(d, false);

    history.current.push({ y: e.clientY, t: performance.now() });
    if (history.current.length > 5) history.current.shift();
  };

  const onUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (panel.current) panel.current.style.willChange = "auto";

    const d = baseY.current + (e.clientY - startY.current);
    const first = history.current[0];
    const last = history.current[history.current.length - 1];
    const dt = last && first ? last.t - first.t : 0;
    const velocity = dt > 0 ? ((last.y - first.y) / dt) * 1000 : 0;

    const height = panel.current?.offsetHeight ?? 480;
    // Decide por dónde va a parar el gesto, no por dónde se soltó.
    if (d + project(velocity) > height * 0.4) {
      paint(height, true);
      window.setTimeout(onClose, 200);
    } else {
      paint(0, true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "bg-surface border-hairline relative w-full max-w-md border-t sm:rounded-card sm:border",
          "rounded-t-[20px] pb-[max(1.25rem,env(safe-area-inset-bottom))]",
          "max-h-[88dvh] overflow-y-auto overscroll-contain",
        )}
      >
        {/* El tirador es la zona de arrastre: da al gesto un blanco visible. */}
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="flex touch-none cursor-grab justify-center py-3 select-none active:cursor-grabbing"
        >
          <span aria-hidden className="bg-hairline h-1 w-9 rounded-full" />
        </div>

        <div className="px-5 pb-1">{children}</div>
      </div>
    </div>
  );
}
