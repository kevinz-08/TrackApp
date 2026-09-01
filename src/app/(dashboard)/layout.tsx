import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/transactions", label: "Movimientos" },
  { href: "/categories", label: "Categorías" },
  { href: "/goals", label: "Metas" },
  { href: "/cards", label: "Tarjetas" },
  { href: "/chat", label: "Asistente" },
  { href: "/settings/api-keys", label: "Ajustes" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-black/10 px-4 py-3 dark:border-white/15">
        <nav className="mx-auto flex max-w-4xl gap-4 overflow-x-auto text-sm">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap opacity-70 hover:opacity-100">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 p-4">{children}</main>
    </div>
  );
}
