import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { aiEnabled } from "@/services/ai/groq";
import { MicroLabel } from "@/components/ui/surface";
import { ChatView, type ChatTurn } from "@/components/chat/chat-view";

export const metadata = { title: "Asistente — TrackApp" };

export default async function ChatPage() {
  const user = await requireUser();

  // El historial se restaura de la base: al volver a la pestaña la conversación
  // sigue donde estaba en vez de empezar en blanco.
  const rows = await prisma.chatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { role: true, content: true },
  });

  const initial: ChatTurn[] = rows
    .reverse()
    .map((m) => ({ role: m.role === "USER" ? "user" : "assistant", content: m.content }));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <MicroLabel>Asistente</MicroLabel>
        {!aiEnabled() && (
          <p className="text-ink-2 text-[13px] leading-[18px]">
            Falta configurar <code>GROQ_API_KEY</code>. El resto de la app funciona igual.
          </p>
        )}
      </div>

      <ChatView initial={initial} />
    </div>
  );
}
