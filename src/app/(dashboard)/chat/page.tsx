import { requireUser } from "@/lib/auth/guards";
import { aiEnabled } from "@/services/ai/groq";
import { listSessions, loadSession } from "@/services/chat/history";
import { ChatView, type ChatTurn } from "@/components/chat/chat-view";
import { ChatSidebar, NEW_CHAT } from "@/components/chat/chat-sidebar";
import { randomGreeting, initialFrom, firstNameFrom } from "@/components/chat/greeting";

export const metadata = { title: "Asistente — TrackApp" };

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const [user, { c }] = await Promise.all([requireUser(), searchParams]);

  const sessions = await listSessions(user.id);

  /*
   * Sin parámetro se reanuda la conversación más reciente: entrar por la barra
   * inferior devuelve al usuario donde estaba, que es lo que espera de una
   * pestaña. Para empezar en blanco hace falta pedirlo (`?c=nuevo`), y esa
   * conversación no existe en la base hasta que se envía el primer mensaje.
   */
  const wanted = c === NEW_CHAT ? null : (c ?? sessions[0]?.id ?? null);
  const active = wanted ? await loadSession(user.id, wanted) : null;

  const initial: ChatTurn[] = active?.turns ?? [];

  return (
    <div className="space-y-4">
      {/*
        La cabecera es solo el disparador del menú. Ni rótulo de sección ni nota
        de retención: en una pantalla cuyo trabajo es invitar a escribir, un
        encabezado que repite el nombre de la pestaña y una advertencia de
        borrado gastan el primer tercio de la pantalla sin ayudar a empezar. Los
        días que le quedan a cada conversación siguen visibles donde importan,
        en su fila del historial.
      */}
      <div className="flex items-center gap-3">
        <ChatSidebar sessions={sessions} activeId={active?.id ?? null} />

        {!aiEnabled() && (
          <p className="text-ink-2 text-[13px] leading-[18px]">
            Falta configurar <code>GROQ_API_KEY</code>. El resto de la app funciona igual.
          </p>
        )}
      </div>

      {/*
        La `key` remonta la vista al cambiar de conversación. Sin ella, React
        reusa el componente y su estado —los turnos son estado local, no props—,
        así que abrir otra conversación mostraría los mensajes de la anterior.
      */}
      <ChatView
        key={active?.id ?? NEW_CHAT}
        sessionId={active?.id ?? null}
        initial={initial}
        greeting={randomGreeting()}
        name={firstNameFrom(user.name, user.email)}
        userInitial={initialFrom(user.name, user.email)}
      />
    </div>
  );
}
