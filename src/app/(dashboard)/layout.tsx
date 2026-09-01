import Link from "next/link";
import { redirect } from "next/navigation";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker";
import { auth } from "@/auth";
import { TabBar } from "@/components/nav/tab-bar";
import { Logo } from "@/components/ui/logo";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <ServiceWorkerRegistrar />
      {/* Cabecera mínima: la navegación real vive abajo, en la zona del pulgar. */}
      <header className="border-hairline bg-ground/90 sticky top-0 z-20 border-b [padding-top:env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3">
          <Link
            href="/"
            aria-label="TrackApp — inicio"
            className="ease-standard duration-base active:duration-instant transition-transform active:scale-[0.96]"
          >
            <Logo />
          </Link>
          <Link
            href="/settings"
            className="text-ink-3 duration-fast ease-standard hover:text-ink text-[11px] leading-[14px] font-semibold tracking-[0.14em] uppercase transition-colors"
          >
            Ajustes
          </Link>
        </div>
      </header>

      {/* pb-28 reserva el alto de la tab bar; el safe-area lo añade la barra. */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 pt-6 pb-28">{children}</main>

      <TabBar />
    </div>
  );
}
