"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChatTurn = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "¿En qué se me fue la plata este mes?",
  "¿Puedo permitirme un gasto de 800 mil?",
  "¿En qué categoría me disparé frente al mes pasado?",
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
 */
export function ChatView({ initial }: { initial: ChatTurn[] }) {
  const [turns, setTurns] = useState<ChatTurn[]>(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, busy]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;

    setError(null);
    setInput("");
    setBusy(true);

    const next: ChatTurn[] = [...turns, { role: "user", content: question }];
    setTurns([...next, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) {
        const message =
          res.status === 503
            ? "El asistente no está configurado todavía."
            : res.status === 429
              ? "Demasiadas consultas por ahora. Inténtalo en un rato."
              : "No se pudo responder. Inténtalo de nuevo.";
        setError(message);
        setTurns(next);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        // Se reemplaza siempre la última burbuja: es la del asistente en curso.
        setTurns([...next, { role: "assistant", content: answer }]);
      }

      if (!answer.trim()) {
        setError("El asistente no devolvió respuesta.");
        setTurns(next);
      }
    } catch {
      setError("Se perdió la conexión con el asistente.");
      setTurns(next);
    } finally {
      setBusy(false);
    }
  };

  const streaming = busy && turns.at(-1)?.role === "assistant" && !turns.at(-1)?.content;

  return (
    <div className="flex min-h-[calc(100dvh-13rem)] flex-col">
      <div className="flex-1 space-y-3">
        {turns.length === 0 && (
          <div className="space-y-3 py-6">
            <p className="text-ink-2 text-[13px] leading-[18px]">
              Pregúntale lo que quieras sobre tu propia plata. Ve tu resumen del mes y
              puede consultar movimientos concretos o registrar uno por ti.
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-btn border-hairline bg-surface text-ink active:bg-sunken duration-base ease-standard border px-4 py-3 text-left text-[13px] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) => (
          <div key={i} className={cn("flex", t.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] px-4 py-2.5 text-[14px] leading-[20px] whitespace-pre-wrap",
                t.role === "user"
                  ? "bg-ink text-ground rounded-[18px] rounded-br-[6px]"
                  : "bg-surface border-hairline text-ink rounded-[18px] rounded-bl-[6px] border",
              )}
            >
              {t.content || (streaming && i === turns.length - 1 ? <Thinking /> : null)}
            </div>
          </div>
        ))}

        {error && (
          <p role="alert" className="text-ink-2 py-2 text-center text-[12px]">
            {error}
          </p>
        )}

        <div ref={bottom} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="bg-ground sticky bottom-0 flex items-end gap-2 py-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter envía; Shift+Enter hace salto de línea.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Pregunta algo…"
          className="rounded-btn bg-sunken text-ink placeholder:text-ink-3 focus:border-ink max-h-32 min-h-11 flex-1 resize-none border border-transparent px-3.5 py-3 text-[15px] focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Enviar"
          className="bg-ink text-ground duration-base ease-standard grid size-11 shrink-0 place-items-center rounded-full transition-transform active:scale-[0.94] disabled:opacity-40"
        >
          <ArrowUp className="size-5" aria-hidden />
        </button>
      </form>
    </div>
  );
}

/** Tres puntos con desfase: la única animación decorativa que se permite. */
function Thinking() {
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
