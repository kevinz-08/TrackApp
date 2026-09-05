"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
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
 *
 * La hoja se monta SIEMPRE en `document.body` a través de un portal, nunca en
 * el sitio del árbol donde se invoca. `position: fixed` no se resuelve contra
 * la ventana si algún ancestro tiene `transform`, `filter` o `contain`: pasa a
 * resolverse contra ese ancestro. Y este sistema está lleno de los tres —
 * `Reveal` anima con `scaleY` y deja el transform puesto (`fill-mode: both`),
 * y `Card` lleva `contain: layout paint`—, así que sin el portal la hoja
 * aparece recortada dentro de la tarjeta desde la que se abrió en lugar de
 * cubrir la pantalla.
 */

/**
 * Detección de hidratación sin `setState` en un efecto: la fuente externa no
 * cambia nunca, así que la suscripción es vacía y lo único que importa es que
 * el servidor lea `false` y el cliente `true`. Un efecto que llama a
 * `setMounted` haría lo mismo con un render en cascada de más.
 */
const noSubscribe = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );

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

  // El portal solo existe en el cliente: en el render del servidor no hay
  // `document`, así que la hoja no pinta nada hasta que hidrata.
  const mounted = useHydrated();

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
    if (!open || !mounted) return;
    const el = panel.current;
    if (!el) return;
    paint(el.offsetHeight || 480, false);
    const id = requestAnimationFrame(() => paint(0, true));
    return () => cancelAnimationFrame(id);
  }, [open, mounted, paint]);

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

  if (!open || !mounted) return null;

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

  return createPortal(
    /*
     * `pb` con el alto del teclado: la hoja se apoya en el borde inferior del
     * viewport de maquetación, que en iOS no encoge al abrirse el teclado. Sin
     * este hueco los campos del final quedan debajo y Safari desplaza la página
     * para enseñarlos, que es lo que se ve como "el teclado empuja todo".
     */
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-[var(--keyboard-h)] sm:items-center">
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
          "bg-surface border-hairline sm:rounded-card relative w-full max-w-md border-t sm:border",
          "rounded-t-[20px] pb-[max(1.25rem,env(safe-area-inset-bottom))]",
          "max-h-[calc(88dvh-var(--keyboard-h))] overflow-y-auto overscroll-contain",
        )}
      >
        {/* El tirador es la zona de arrastre: da al gesto un blanco visible. */}
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="flex cursor-grab touch-none justify-center py-3 select-none active:cursor-grabbing"
        >
          <span aria-hidden className="bg-hairline h-1 w-9 rounded-full" />
        </div>

        <div className="px-5 pb-1">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
