import { requireUser } from "@/lib/auth/guards";
import { aiEnabled } from "@/services/ai/groq";
import { listSessions, loadSession } from "@/services/chat/history";
import { ChatView, type ChatTurn } from "@/components/chat/chat-view";
import { ChatSidebar, NEW_CHAT } from "@/components/chat/chat-sidebar";
import { randomGreeting, initialFrom, firstNameFrom } from "@/components/chat/greeting";
import { PageHeader } from "@/components/nav/page-header";

export const metadata = { title: "Asistente — TrackApp" };

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const [user, { c }] = await Promise.all([requireUser(), searchParams]);

  /*
   * Sin parámetro se reanuda la conversación más reciente: entrar por la barra
   * inferior devuelve al usuario donde estaba, que es lo que espera de una
   * pestaña. Para empezar en blanco hace falta pedirlo (`?c=nuevo`), y esa
   * conversación no existe en la base hasta que se envía el primer mensaje.
   *
   * Con `?c=` en la URL ya se sabe qué conversación abrir, así que el historial
   * y los mensajes salen a la base a la vez. Solo el caso «reanudar la última»
   * obliga a encadenarlas: hasta que no vuelve la lista no se sabe cuál es.
   */
  const [sessions, active] =
    c && c !== NEW_CHAT
      ? await Promise.all([listSessions(user.id), loadSession(user.id, c)])
      : await (async () => {
          const list = await listSessions(user.id);
          const wanted = c === NEW_CHAT ? null : (list[0]?.id ?? null);
          return [list, wanted ? await loadSession(user.id, wanted) : null] as const;
        })();

  const initial: ChatTurn[] = active?.turns ?? [];

  return (
    <div className="space-y-4">
      {/*
        La acción de esta ruta es el historial, no «nuevo»: empezar en blanco ya
        está dentro del menú, y desde aquí lo que falta siempre es volver a una
        conversación anterior. La nota de retención no sube a la cabecera —los
        días que le quedan a cada conversación se ven en su fila del historial,
        que es donde se decide si importa—.
      */}
      <PageHeader
        title="Asistente"
        hint={
          aiEnabled() ? undefined : (
            <>
              Falta configurar <code>GROQ_API_KEY</code>. El resto de la app funciona igual.
            </>
          )
        }
        action={<ChatSidebar sessions={sessions} activeId={active?.id ?? null} />}
      />

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
