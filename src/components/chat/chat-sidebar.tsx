"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Plus, Trash2, X } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { deleteChatSession } from "@/actions/chat";
import { cn } from "@/lib/utils";

/**
 * Valor de `?c=` que fuerza una conversación en blanco. Sin él, `/chat` reanuda
 * la última: entrar por la barra inferior tiene que devolver al usuario donde
 * estaba, así que empezar de cero se pide explícitamente.
 */
export const NEW_CHAT = "nuevo";

export type SessionRow = {
  id: string;
  title: string;
  messages: number;
  daysLeft: number;
  updatedLabel: string;
};

/**
 * Menú lateral con el historial de conversaciones.
 *
 * Se desliza desde la izquierda, que es el borde del que sale el gesto de
 * "atrás" en iOS y donde el usuario ya espera encontrar navegación. Panel y
 * velo están SIEMPRE montados: una transición necesita un estado del que salir,
 * y montar el panel en el mismo frame en que se le pide moverse lo hace
 * aparecer de golpe.
 *
 * Solo se animan `transform` (el panel) y `opacity` (el velo), que es la regla
 * del sistema: son las dos propiedades que el compositor resuelve sin pasar por
 * layout ni paint, y esta pantalla comparte hilo con la ruta del registro
 * rápido.
 */
export function ChatSidebar({
  sessions,
  activeId,
}: {
  sessions: SessionRow[];
  activeId: string | null;
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const close = () => setSidebarOpen(false);

  useEffect(() => {
    if (!isSidebarOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);

    // Sin esto, el scroll del dedo sobre el velo mueve la conversación de
    // detrás en vez del panel: el menú se siente pegado a una página que huye.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [isSidebarOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Abrir conversaciones"
        aria-expanded={isSidebarOpen}
        className={cn(
          "border-hairline bg-surface text-ink grid size-11 shrink-0 place-items-center rounded-full border",
          "duration-base ease-standard active:duration-instant active:bg-sunken transition-[background-color,transform] active:scale-[0.94]",
        )}
      >
        <Menu size={19} strokeWidth={1.75} absoluteStrokeWidth aria-hidden />
      </button>

      <div
        className={cn("fixed inset-0 z-40", !isSidebarOpen && "pointer-events-none")}
        /* `inert` saca del foco y del lector de pantalla todo lo de dentro
           mientras está cerrado, sin desmontarlo. Ocultarlo solo con opacidad
           dejaría el historial tabulable detrás de la conversación. */
        inert={!isSidebarOpen}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label="Cerrar conversaciones"
          onClick={close}
          className={cn(
            "duration-base ease-standard absolute inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity",
            isSidebarOpen ? "opacity-100" : "opacity-0",
          )}
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Conversaciones"
          className={cn(
            "border-hairline bg-surface absolute inset-y-0 left-0 flex w-[86%] max-w-xs flex-col border-r",
            "[padding-top:max(1rem,env(safe-area-inset-top))] [padding-bottom:max(1rem,env(safe-area-inset-bottom))]",
            "duration-base ease-standard transition-transform",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between gap-2 px-4 pb-3">
            <p className="text-ink-3 text-[11px] leading-[14px] font-semibold tracking-[0.14em] uppercase">
              Conversaciones
            </p>
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="text-ink-3 active:text-ink duration-base ease-standard active:duration-instant grid size-11 shrink-0 place-items-center transition-[color,transform] active:scale-[0.94]"
            >
              <X size={18} strokeWidth={1.75} absoluteStrokeWidth aria-hidden />
            </button>
          </div>

          <div className="px-4 pb-4">
            {/* Enlace, no botón: `Button` no envuelve hijos (no hay `asChild`), y
                una conversación nueva es navegación. `buttonClass` da la misma
                anatomía de press sin duplicar la escala ni las curvas. */}
            <Link
              href={`/chat?c=${NEW_CHAT}`}
              onClick={close}
              className={buttonClass({ variant: "primary", block: true })}
            >
              <Plus size={18} strokeWidth={2} absoluteStrokeWidth aria-hidden />
              Nueva conversación
            </Link>
          </div>

          <HistoryList sessions={sessions} activeId={activeId} onNavigate={close} />
        </aside>
      </div>
    </>
  );
}

function HistoryList({
  sessions,
  activeId,
  onNavigate,
}: {
  sessions: SessionRow[];
  activeId: string | null;
  onNavigate: () => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = (id: string) =>
    startTransition(async () => {
      await deleteChatSession(id);
      setConfirming(null);
      // Si se borró la que estaba abierta, la vista se queda apuntando a una
      // conversación que ya no existe: hay que sacarla de ahí, no solo refrescar.
      if (id === activeId) router.replace(`/chat?c=${NEW_CHAT}`);
    });

  if (sessions.length === 0) {
    return (
      <p className="text-ink-3 px-4 text-[13px] leading-[18px]">
        Todavía no has hablado con el asistente.
      </p>
    );
  }

  return (
    <nav aria-label="Historial" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2">
      <ul className="flex flex-col gap-0.5 pb-2">
        {sessions.map((s) => {
          const active = s.id === activeId;

          /*
           * Confirmar ocupa la fila entera y no un par de botones al lado del
           * título: el panel mide 320px como mucho, y meter "Conservar" y
           * "Borrar" junto al nombre deja los tres elementos por debajo del
           * objetivo táctil de 44pt. Borrar una conversación no se deshace, así
           * que el paso de confirmación se queda; lo que cambia es que ocupa el
           * sitio de la fila en vez de apretujarse dentro.
           */
          if (confirming === s.id) {
            return (
              <li key={s.id} className="flex items-center gap-1 py-0.5">
                <p className="text-ink-2 min-w-0 flex-1 truncate px-2 text-[13px]">
                  ¿Borrar «{s.title}»?
                </p>
                <Button size="sm" disabled={pending} onClick={() => remove(s.id)}>
                  Borrar
                </Button>
                <button
                  type="button"
                  aria-label="Conservar"
                  onClick={() => setConfirming(null)}
                  className="text-ink-3 active:text-ink duration-base ease-standard active:duration-instant grid size-11 shrink-0 place-items-center transition-[color,transform] active:scale-[0.9]"
                >
                  <X size={17} strokeWidth={1.75} absoluteStrokeWidth aria-hidden />
                </button>
              </li>
            );
          }

          return (
            <li key={s.id} className="flex items-center gap-1">
              <Link
                href={`/chat?c=${s.id}`}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-chip min-h-11 min-w-0 flex-1 px-2 py-2.5",
                  "duration-base ease-standard active:duration-instant transition-[background-color,transform] active:scale-[0.99]",
                  // La conversación abierta se marca por dos canales, no por
                  // uno: pastilla hundida y peso semibold. Un solo salto de
                  // luminancia entre dos grises es ambiguo a plena luz.
                  active ? "bg-sunken" : "active:bg-sunken",
                )}
              >
                <p
                  className={cn(
                    "text-ink truncate text-sm leading-tight",
                    active ? "font-semibold" : "font-normal",
                  )}
                >
                  {s.title}
                </p>
                <p className="text-ink-3 mt-1 truncate text-[11px] leading-[14px] tabular-nums">
                  {s.updatedLabel} · {s.daysLeft === 0 ? "se borra hoy" : `${s.daysLeft} d`}
                </p>
              </Link>

              <button
                type="button"
                aria-label={`Borrar «${s.title}»`}
                onClick={() => setConfirming(s.id)}
                className="text-ink-3 active:text-ink duration-base ease-standard active:duration-instant grid size-11 shrink-0 place-items-center transition-[color,transform] active:scale-[0.9]"
              >
                <Trash2 size={17} strokeWidth={1.75} absoluteStrokeWidth aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
