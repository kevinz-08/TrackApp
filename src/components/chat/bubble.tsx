"use client";

import { LogoMark } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { RichText } from "./rich-text";
import type { ChatTurn } from "./use-assistant";

/**
 * Una burbuja con su avatar.
 *
 * Vive aparte de `ChatView` porque la comparten dos superficies: la vista
 * completa de `/chat` y el dock flotante. Que una respuesta se lea distinta
 * según por dónde se abrió el asistente sería un fallo, no una variación.
 *
 * El avatar se alinea arriba y no abajo: con respuestas largas del asistente,
 * anclarlo al pie deja la marca a varios párrafos de la primera línea y ya no
 * se lee como el autor del mensaje.
 *
 * Por eso mismo la esquina que se endereza es la SUPERIOR del lado del emisor
 * —la que toca el avatar—: es la que convierte el rectángulo en un globo que
 * apunta a quien habla. Enderezar la de abajo, con el avatar arriba, deja el
 * pico apuntando al vacío.
 *
 * Los dos avatares se distinguen por dos canales, no por uno: forma (tesela
 * redondeada frente a círculo) y relleno (tinta frente a superficie). Un solo
 * salto de luminancia entre dos grises es ambiguo a la luz del sol, que es
 * donde se usa esta app.
 */
export function Bubble({
  turn,
  userInitial,
  showAvatar,
  thinking,
}: {
  turn: ChatTurn;
  userInitial: string;
  showAvatar: boolean;
  thinking: boolean;
}) {
  const mine = turn.role === "user";

  return (
    <div className={cn("flex items-start gap-2 py-1", mine ? "flex-row-reverse" : "flex-row")}>
      {/* El hueco se reserva siempre, lleve avatar o no: si no, las burbujas
          seguidas del mismo autor se desalinean media tesela. */}
      <div className="w-7 shrink-0 pt-0.5">
        {showAvatar &&
          (mine ? (
            <span
              aria-hidden
              className="border-hairline bg-surface text-ink grid size-7 place-items-center rounded-full border text-[11px] font-semibold"
            >
              {userInitial}
            </span>
          ) : (
            <LogoMark />
          ))}
      </div>

      <div
        className={cn(
          // break-words es lo que impide que una cifra o una URL sin espacios
          // desborde la burbuja y choque contra el borde.
          "max-w-[85%] px-4 py-2.5 text-sm leading-relaxed break-words sm:max-w-[75%]",
          mine
            ? "bg-bubble text-bubble-ink rounded-2xl rounded-tr-xs"
            : "bg-surface border-hairline text-ink rounded-2xl rounded-tl-xs border",
        )}
      >
        {turn.content ? (
          mine ? (
            <p className="whitespace-pre-line">{turn.content}</p>
          ) : (
            <RichText content={turn.content} />
          )
        ) : thinking ? (
          <Thinking />
        ) : null}
      </div>
    </div>
  );
}

/** Tres puntos con desfase: la única animación decorativa que se permite. */
export function Thinking() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label="Pensando">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="bg-ink-3 size-1.5 animate-bounce rounded-full"
          style={{ animationDelay: `${i * 140}ms` }}
        />
      ))}
    </span>
  );
}

/**
 * La lista de burbujas de una conversación.
 *
 * El avatar solo aparece en la primera de una tanda: repetirlo en cada burbuja
 * convierte una respuesta larga en una columna de teselas que compite con el
 * texto.
 */
export function Transcript({
  turns,
  userInitial,
  streaming,
}: {
  turns: ChatTurn[];
  userInitial: string;
  streaming: boolean;
}) {
  return (
    <div className="space-y-1">
      {turns.map((t, i) => (
        <Bubble
          key={i}
          turn={t}
          userInitial={userInitial}
          showAvatar={turns[i - 1]?.role !== t.role}
          thinking={streaming && i === turns.length - 1}
        />
      ))}
    </div>
  );
}
