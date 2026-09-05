"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatRoute } from "@/lib/chat-routes";

export type ChatTurn = { role: "user" | "assistant"; content: string };

/**
 * El transporte del asistente, sin nada de presentación.
 *
 * Existe porque hay dos superficies que hablan con `/api/chat` —la vista
 * completa de `/chat` y el dock flotante que se abre sobre cualquier ruta— y
 * duplicar el streaming en las dos significa que el día que cambie el protocolo
 * solo se arregla una. Es la misma separación que en el servidor entre
 * `runAgent` y quien consume sus eventos.
 *
 * El texto llega como texto plano, no como SSE ni como JSON por líneas: el
 * endpoint escribe fragmentos y aquí se concatenan. Es lo más simple que
 * funciona y evita un protocolo propio.
 *
 * `onSettled` se dispara al terminar con el id de la conversación. El hook no
 * navega ni refresca por su cuenta: la vista completa corrige la URL y el dock
 * refresca la página de debajo, y eso es decisión de cada una.
 */
export function useAssistant({
  sessionId: initialSessionId,
  initial = [],
  route,
  onSettled,
}: {
  sessionId?: string | null;
  initial?: ChatTurn[];
  route?: ChatRoute;
  onSettled?: (sessionId: string, isNew: boolean) => void;
}) {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null);
  const [turns, setTurns] = useState<ChatTurn[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * El callback se lee de una ref y no de la clausura: quien lo pasa suele
   * definirlo en línea, así que cambia en cada render. Sin la ref, `send`
   * tendría que recrearse con él y cualquier memoización de arriba dejaría de
   * servir para nada.
   */
  const settled = useRef(onSettled);
  useEffect(() => {
    settled.current = onSettled;
  });

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;

    setError(null);
    setBusy(true);

    const next: ChatTurn[] = [...turns, { role: "user", content: question }];
    setTurns([...next, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Se manda la cola, no la conversación entera: en pantalla caben 100
        // turnos y el esquema del endpoint acepta 40. El servidor recorta a 8
        // para el modelo de todas formas, así que lo que va de más aquí es
        // margen para esa ventana, no contexto que se aproveche.
        body: JSON.stringify({
          messages: next.slice(-20),
          sessionId: sessionId ?? undefined,
          route,
        }),
      });

      if (!res.ok || !res.body) {
        setError(
          res.status === 503
            ? "El asistente no está configurado todavía."
            : res.status === 429
              ? "Demasiadas consultas por ahora. Inténtalo en un rato."
              : res.status === 404
                ? "Esta conversación ya no existe. Empieza una nueva."
                : "No se pudo responder. Inténtalo de nuevo.",
        );
        setTurns(next);
        return;
      }

      // El servidor decide con qué conversación se habló: si era nueva, este es
      // el id que acaba de crear.
      const assigned = res.headers.get("X-Chat-Session");

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

      if (assigned) {
        const isNew = assigned !== sessionId;
        setSessionId(assigned);
        // Al FINAL, nunca al recibir la cabecera: quien escuche esto va a
        // renderizar en el servidor, y hacerlo con el stream abierto mete un
        // repintado en mitad de la escritura.
        settled.current?.(assigned, isNew);
      }
    } catch {
      setError("Se perdió la conexión con el asistente.");
      setTurns(next);
    } finally {
      setBusy(false);
    }
  };

  return {
    sessionId,
    turns,
    busy,
    error,
    /** Hay una burbuja del asistente abierta y todavía vacía: está pensando. */
    streaming: busy && turns.at(-1)?.role === "assistant" && !turns.at(-1)?.content,
    send,
  };
}
