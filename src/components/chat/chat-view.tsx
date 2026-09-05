"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Scale, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import type { ChatRoute } from "@/lib/chat-routes";
import { cn } from "@/lib/utils";
import { Transcript } from "./bubble";
import { useAssistant, type ChatTurn } from "./use-assistant";

export type { ChatTurn };

/**
 * Las tres tarjetas de la pantalla en blanco.
 *
 * `title` es la categoría y `prompt` es literalmente lo que se envía al tocar:
 * el usuario lee de antemano la pregunta exacta que va a hacer, sin sorpresa
 * entre lo que toca y lo que aparece luego en su burbuja.
 */
const SUGGESTIONS: { icon: LucideIcon; title: string; prompt: string }[] = [
  {
    icon: Wallet,
    title: "Gastos",
    prompt: "¿En qué se me fue la plata este mes?",
  },
  {
    icon: Scale,
    title: "Decisiones",
    prompt: "¿Puedo permitirme un gasto de 800 mil?",
  },
  {
    icon: TrendingUp,
    title: "Comparar",
    prompt: "¿En qué categoría me disparé frente al mes pasado?",
  },
];

/**
 * Conversación con el asistente.
 *
 * El texto llega en streaming como texto plano, no como SSE ni como JSON por
 * líneas: el endpoint escribe fragmentos directamente y aquí se van
 * concatenando. Es lo más simple que funciona y evita un protocolo propio.
 *
 * Mientras el modelo ejecuta una herramienta no llega ningún fragmento, así que
 * la burbuja vacía muestra un indicador hasta el primer carácter; sin él la
 * espera parece que la app se colgó.
 *
 * `sessionId` empieza en null cuando la conversación es nueva. No se crea nada
 * en la base hasta el primer mensaje —una conversación en blanco abandonada no
 * debe aparecer en el historial—, así que el id llega de vuelta en la cabecera
 * `X-Chat-Session` de la respuesta y la URL se corrige cuando termina.
 */
export function ChatView({
  sessionId: initialSessionId,
  initial,
  greeting,
  name,
  userInitial,
  route,
}: {
  sessionId: string | null;
  initial: ChatTurn[];
  greeting: string;
  name: string | null;
  userInitial: string;
  /** Vista desde la que se abrió el asistente; cambia su foco y sus herramientas. */
  route?: ChatRoute;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  const { turns, busy, error, streaming, send } = useAssistant({
    sessionId: initialSessionId,
    initial,
    route,
    onSettled: (assigned, isNew) => {
      /*
       * La URL se corrige AL FINAL, no al recibir la cabecera: `replace` vuelve
       * a renderizar la página en el servidor, y hacerlo con el stream abierto
       * mete un repintado en mitad de la escritura. Al terminar, además, el
       * refresco trae el historial ya con esta conversación dentro.
       *
       * El origen se conserva: sin él, el `replace` de la primera respuesta
       * dejaría al asistente sin contexto de vista para el resto de la
       * conversación.
       */
      if (isNew) {
        router.replace(`/chat?c=${assigned}${route ? `&from=${encodeURIComponent(route)}` : ""}`, {
          scroll: false,
        });
      } else {
        router.refresh();
      }
    },
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
     * El ancho máximo es de lectura, no de pantalla: una línea de chat a lo
     * ancho de 4xl obliga a barrer la cabeza de un lado a otro. El padding
     * lateral lo pone el `main` del layout (px-5); añadir otro px-4 aquí
     * dejaría 36px de margen en una pantalla de 390.
     */
    <div className="mx-auto flex w-full max-w-3xl flex-col">
      <div className="min-h-[calc(100dvh-var(--tabbar-h)-13rem)] flex-1">
        {turns.length === 0 ? (
          <Welcome greeting={greeting} name={name} onPick={submit} />
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

      {/*
        El compositor se ancla POR ENCIMA de la tab bar. Con `bottom-0` se
        pegaba al borde del viewport, que es justo donde vive la barra fija: el
        input quedaba medio tapado en móvil.
      */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="bg-ground sticky bottom-[var(--tabbar-h)] flex items-end gap-2 py-3"
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
          placeholder="Pregunta algo…"
          aria-label="Pregunta para el asistente"
          className="bg-sunken text-ink placeholder:text-ink-3 focus:border-ink duration-fast ease-standard text-control max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-transparent px-4 py-3 leading-relaxed transition-colors focus:outline-none"
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

/**
 * Pantalla en blanco.
 *
 * Sigue la composición de la referencia —resplandor arriba, titular en
 * mayúsculas, subtítulo y tres tarjetas con icono— con una diferencia de
 * fondo: donde la referencia usa un verde de acento, aquí la jerarquía la dan
 * tamaño, luminancia y aire. El aura es `--glow`, que es luz blanca y no un
 * color; el botón de enviar ya era tinta sobre página, que es el equivalente
 * monocromo del botón verde de la referencia.
 *
 * Todo se alinea a la izquierda y no al centro. Centrado, el titular y las
 * tarjetas no comparten eje —las tarjetas son bloques a todo el ancho— y la
 * pantalla se lee como dos composiciones sueltas en vez de una columna.
 *
 * El saludo llega ya elegido desde el servidor: sortearlo aquí durante el
 * render daría un texto en el HTML servido y otro en el hidratado, que es
 * literalmente el error de hidratación de React.
 */
function Welcome({
  greeting,
  name,
  onPick,
}: {
  greeting: string;
  name: string | null;
  onPick: (text: string) => void;
}) {
  return (
    <div className="relative pt-6 pb-2">
      {/*
        El aura sangra hasta el borde de la pantalla: `-inset-x-5` cancela
        exactamente el `px-5` del `main`, así que no añade scroll horizontal.
        No se anima ni reacciona al puntero; es fondo.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-5 -top-32 h-80 bg-[radial-gradient(115%_65%_at_78%_0%,var(--glow),transparent_68%)]"
      />

      <div className="relative">
        {/*
          Centrado en móvil y alineado a la izquierda a partir de `sm`. No es
          capricho: en una columna estrecha el titular centrado y las tarjetas
          —que ocupan el ancho completo— comparten el eje de la pantalla, así
          que la composición se lee entera. En cuanto la columna se ensancha, ese
          eje común desaparece y el texto centrado empieza a flotar sobre unas
          tarjetas cuyo contenido sí arranca a la izquierda.
        */}
        <h2 className="text-ink text-center text-[30px] leading-[34px] font-bold tracking-[-0.03em] uppercase sm:text-left sm:text-[34px] sm:leading-[36px]">
          {name ? `¡Hola ${name}!` : "¡Hola!"}
        </h2>
        <p className="text-ink-2 mx-auto mt-3 max-w-xs text-center text-[15px] leading-[21px] text-balance sm:mx-0 sm:max-w-none sm:text-left">
          {greeting}
        </p>

        {/*
          El aire entre la bienvenida y las tarjetas es lo que las convierte en
          una sección aparte en vez de en la continuación del subtítulo. Es el
          salto de espacio más grande de la pantalla, y tiene que serlo: es la
          única separación de la que dispone una pantalla sin reglas ni rótulos.
        */}
        <div className="mt-12 flex flex-col gap-3 sm:mt-14">
          {SUGGESTIONS.map(({ icon: Icon, title, prompt }) => (
            <button
              key={title}
              type="button"
              onClick={() => onPick(prompt)}
              className={cn(
                "border-hairline bg-surface flex w-full items-center gap-4 rounded-2xl border p-4 text-left",
                "duration-base ease-standard active:duration-instant active:bg-sunken transition-[background-color,transform] active:scale-[0.99]",
              )}
            >
              <span
                aria-hidden
                className="bg-sunken text-ink grid size-11 shrink-0 place-items-center rounded-xl"
              >
                {/* 1.75 y no el 2 por defecto de Lucide: junto a texto de 13px,
                    un trazo de 2 pesa más que la propia descripción. */}
                <Icon size={20} strokeWidth={1.75} absoluteStrokeWidth />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-ink text-[15px] leading-[20px] font-semibold">{title}</span>
                <span className="text-ink-2 text-[13px] leading-[18px]">{prompt}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
