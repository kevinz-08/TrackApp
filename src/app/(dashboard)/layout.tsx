import { redirect } from "next/navigation";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker";
import { getUser } from "@/lib/auth/guards";
import { aiEnabled } from "@/services/ai/groq";
import { AssistantDock } from "@/components/chat/assistant-dock";
import { initialFrom } from "@/components/chat/greeting";
import { TabBar } from "@/components/nav/tab-bar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Misma resolución memoizada que usa la página: la sesión se verifica una
  // vez por petición, no una por componente que la pida.
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <ServiceWorkerRegistrar />

      {/*
        No hay barra superior: el nombre de la sección lo pone cada página con
        `PageHeader`, a tamaño de título y subiendo con el scroll. Lo único que
        queda arriba es este velo del alto de la safe area, que existe para que
        el contenido no pase limpio por debajo de la hora y la batería cuando la
        PWA corre a pantalla completa. En navegador mide cero y no pinta nada.
      */}
      <div
        aria-hidden
        className="bg-ground/90 sticky top-0 z-20 h-[env(safe-area-inset-top)] backdrop-blur-xl"
      />

      {/* El hueco inferior sale del alto real de la barra, no de un número mágico. */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 pt-4 pb-[calc(var(--tabbar-h)+1.5rem)]">
        {children}
      </main>

      <TabBar />

      {/*
        El asistente flotante se monta aquí y no en cada página: así existe en
        toda la app sin que ninguna vista tenga que acordarse de ponerlo, y su
        estado sobrevive a la navegación entre rutas porque el layout no se
        vuelve a montar.

        Sin `GROQ_API_KEY` no se pinta. Un botón que abre una hoja para decir
        que el asistente no está configurado es peor que no tener el botón: la
        app registra transacciones igual, y ese es el principio de que la IA no
        sea crítica.
      */}
      {aiEnabled() && <AssistantDock userInitial={initialFrom(user.name, user.email)} />}
    </div>
  );
}
