"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUp, Maximize2, MessageCircle } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { MicroLabel } from "@/components/ui/surface";
import { routeFromPathname, type ChatRoute } from "@/lib/chat-routes";
import { cn } from "@/lib/utils";
import { Transcript } from "./bubble";
import { useAssistant } from "./use-assistant";

/**
 * Contexto por vista: cómo se llama y qué se le puede delegar desde ahí.
 *
 * Las tareas son literalmente lo que se envía al tocarlas, igual que en la
 * pantalla de bienvenida: el usuario lee de antemano la frase exacta que va a
 * mandar, sin sorpresa entre lo que toca y lo que aparece en su burbuja.
 *
 * Cada una está escrita para que dispare una herramienta concreta del registro,
 * no para lucir en la maqueta: "¿me conviene diferir…?" lleva a
 * `simularDiferido`, "¿qué puedo cancelar?" a `auditarSuscripciones`. Una
 * sugerencia que el agente no puede resolver con datos reales es una promesa
 * que la app incumple en el primer toque.
 */
const CONTEXT: Record<string, { label: string; hint: string; tasks: string[] }> = {
  "/cards": {
    label: "Tarjetas",
    hint: "Sabe tus cupos, tasas y fechas de corte",
    tasks: [
      "¿Me conviene diferir una compra de 2 millones a 12 cuotas?",
      "¿Cuándo corta mi tarjeta y hasta cuándo puedo comprar?",
      "Si pago solo el mínimo, ¿en cuánto termino de pagar?",
    ],
  },
  "/goals": {
    label: "Metas",
    hint: "Contrasta el plan con tu excedente real",
    tasks: [
      "¿Cuánto tengo que guardar al mes para lograr mis metas a tiempo?",
      "Quiero juntar 6 millones en 8 meses, ¿me alcanza?",
      "¿Cuál de mis metas va más atrasada?",
    ],
  },
  "/subscriptions": {
    label: "Suscripciones",
    hint: "Ve el costo anualizado y lo que llevas sin revisar",
    tasks: [
      "¿Cuánto pago al año en suscripciones?",
      "¿Qué suscripciones podría cancelar sin extrañarlas?",
      "¿Hay algún cobro repetido este mes?",
    ],
  },
  "/transactions": {
    label: "Movimientos",
    hint: "Registra sin abrir el formulario",
    tasks: [
      "Gasté 32 mil en almuerzo",
      "¿Cuánto llevo gastado esta semana?",
      "¿En qué categoría se me está yendo más?",
    ],
  },
};

/** Lo que se ofrece donde el agente no tiene foco especial: portada y ajustes. */
const GENERIC = {
  label: "Asistente",
  hint: "Pregúntale o dile qué registrar",
  tasks: [
    "¿En qué se me fue la plata este mes?",
    "Gasté 25 mil en gasolina",
    "¿Puedo permitirme un gasto de 800 mil?",
  ],
};

/**
 * Asistente flotante, disponible en toda la app.
 *
 * Se abre EN SITIO y no navegando a `/chat` a propósito: delegar una tarea
 * —"regístrame esto", "¿me conviene diferirlo?"— pierde su sentido si para
 * hacerlo hay que abandonar la vista sobre la que se está preguntando. Al
 * cerrar, la pantalla de debajo sigue donde estaba y ya refrescada con lo que
 * el agente haya hecho.
 *
 * La ruta actual viaja al endpoint, así que el foco del prompt y el catálogo de
 * herramientas se recortan solos a esta vista. Es el mismo mecanismo que usa la
 * pestaña del asistente, leído aquí de `usePathname()` en lugar de `?from=`.
 */
export function AssistantDock({ userInitial }: { userInitial: string }) {
  const pathname = usePathname();
  const router = useRouter();

  /*
   * El estado no es "abierta" sino "abierta DESDE qué ruta", y de ahí se deriva
   * lo demás. Cambiar de sección con la hoja abierta la cierra sola, sin un
   * efecto que sincronice nada: el asistente no puede seguir anunciando el
   * contexto de una vista que el usuario ya dejó.
   */
  const [openedFrom, setOpenedFrom] = useState<string | null>(null);
  const open = openedFrom === pathname;
  const close = () => setOpenedFrom(null);

  /*
   * En `/chat` no se pinta: el asistente YA es la pantalla. Un botón flotante
   * para abrir lo que estás mirando es ruido, y encima taparía el compositor.
   */
  if (pathname.startsWith("/chat")) return null;

  const route = routeFromPathname(pathname);

  const context = (route && CONTEXT[route]) || GENERIC;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenedFrom(pathname)}
        aria-label={`Abrir el asistente${route ? ` con el contexto de ${context.label}` : ""}`}
        className={cn(
          /*
           * Anclado sobre la barra, en la esquina del pulgar. El alto sale de
           * `--tabbar-h`, que la barra mide y publica: escribir aquí un número
           * lo dejaría descuadrado en cuanto cambie el Dynamic Type o la safe
           * area del dispositivo.
           */
          "fixed right-5 bottom-[calc(var(--tabbar-h)+0.75rem)] z-30",
          // 52px: por encima del mínimo de 44pt incluso con el icono centrado.
          "grid size-13 place-items-center rounded-full",
          // Tinta sobre página, el mismo par que el botón de enviar: es la
          // acción primaria de la pantalla y el sistema no tiene color acento
          // con el que distinguirla de otra forma.
          "bg-ink text-ground shadow-lift",
          "duration-base ease-standard active:duration-instant transition-transform active:scale-[0.92]",
        )}
      >
        <MessageCircle size={22} strokeWidth={1.75} absoluteStrokeWidth aria-hidden />
      </button>

      <Sheet open={open} onClose={close} title="Asistente">
        <DockPanel
          key={route ?? "generic"}
          route={route}
          context={context}
          userInitial={userInitial}
          onClose={close}
          onSettled={() => {
            /*
             * La vista de debajo se refresca al terminar cada respuesta. Es lo
             * que cierra el círculo de delegar: si el agente registra un gasto
             * desde aquí, la lista que hay detrás tiene que mostrarlo al cerrar
             * la hoja, no en la siguiente navegación.
             */
            router.refresh();
          }}
        />
      </Sheet>
    </>
  );
}

/**
 * El contenido de la hoja.
 *
 * Va aparte del dock para que su estado —la conversación— nazca y muera con la
 * apertura: `Sheet` no monta nada mientras está cerrada, así que cada sesión
 * empieza limpia. La conversación sí queda guardada en el servidor y se puede
 * retomar entera desde `/chat`.
 */
function DockPanel({
  route,
  context,
  userInitial,
  onClose,
  onSettled,
}: {
  route?: ChatRoute;
  context: { label: string; hint: string; tasks: string[] };
  userInitial: string;
  onClose: () => void;
  onSettled: () => void;
}) {
  const [input, setInput] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const { sessionId, turns, busy, error, streaming, send } = useAssistant({
    route,
    onSettled,
  });

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, busy]);

  const submit = (text: string) => {
    setInput("");
    void send(text);
  };

  return (
    /*
     * Alto fijo y no automático: con `auto`, la hoja crece con cada respuesta y
     * el compositor persigue al texto hacia abajo hasta chocar con el tope de
     * la hoja. Con un alto estable, lo que se mueve es el transcript y el
     * campo de escribir se queda donde el pulgar lo dejó.
     */
    <div className="flex h-[62dvh] flex-col">
      <header className="flex items-baseline justify-between gap-3 pb-3">
        <div className="min-w-0">
          <p className="text-ink text-[15px] leading-[20px] font-semibold">Asistente</p>
          <MicroLabel className="mt-0.5 truncate">
            {route ? `${context.label} · ${context.hint}` : context.hint}
          </MicroLabel>
        </div>

        {/* Solo aparece cuando hay algo que abrir: la conversación existe en el
            servidor desde el primer mensaje, no antes. */}
        {sessionId && (
          <Link
            href={`/chat?c=${sessionId}${route ? `&from=${encodeURIComponent(route)}` : ""}`}
            onClick={onClose}
            aria-label="Abrir la conversación completa"
            className="text-ink-2 hover:text-ink duration-fast ease-standard grid size-11 shrink-0 place-items-center rounded-full transition-colors"
          >
            <Maximize2 size={17} strokeWidth={1.75} absoluteStrokeWidth aria-hidden />
          </Link>
        )}
      </header>

      <div className="-mx-1 flex-1 overflow-y-auto overscroll-contain px-1">
        {turns.length === 0 ? (
          <div className="flex flex-col gap-2 pt-1">
            {context.tasks.map((task) => (
              <button
                key={task}
                type="button"
                onClick={() => submit(task)}
                className={cn(
                  "border-hairline bg-surface w-full rounded-2xl border px-4 py-3 text-left",
                  "text-ink text-[14px] leading-[19px]",
                  "duration-base ease-standard active:duration-instant active:bg-sunken transition-[background-color,transform] active:scale-[0.99]",
                )}
              >
                {task}
              </button>
            ))}
          </div>
        ) : (
          <Transcript turns={turns} userInitial={userInitial} streaming={streaming} />
        )}

        {error && (
          <p role="alert" className="text-ink-2 py-2 text-center text-xs">
            {error}
          </p>
        )}

        <div ref={bottom} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="flex items-end gap-2 pt-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter envía; Shift+Enter hace salto de línea.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
          rows={1}
          placeholder={
            route ? `Pregunta o delega sobre ${context.label.toLowerCase()}…` : "Pregunta algo…"
          }
          aria-label="Pregunta para el asistente"
          className="bg-sunken text-ink placeholder:text-ink-3 focus:border-ink duration-fast ease-standard text-control max-h-24 min-h-11 flex-1 resize-none rounded-2xl border border-transparent px-4 py-3 leading-relaxed transition-colors focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Enviar"
          className="bg-ink text-ground duration-base ease-standard active:duration-instant grid size-11 shrink-0 place-items-center rounded-full transition-transform active:scale-[0.94] disabled:opacity-40"
        >
          <ArrowUp className="size-5" aria-hidden />
        </button>
      </form>
    </div>
  );
}
