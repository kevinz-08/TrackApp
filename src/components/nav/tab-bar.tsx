"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  CreditCard,
  House,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Navegación anclada abajo: todo lo accionable vive en el tercio inferior, que
 * es donde llega el pulgar. La cifra y el gráfico van arriba, donde solo se
 * leen.
 *
 * Sin color acento, el ítem activo se marca por TRES canales —icono a tinta
 * primaria, etiqueta en semibold y una pastilla de superficie hundida detrás
 * del icono—, porque un solo salto de luminancia es ambiguo a la luz del sol.
 *
 * El trazo del icono es 1.75 y no el 2 por defecto de Lucide: junto a texto de
 * 10px, un trazo de 2 pesa más que la etiqueta y desequilibra la columna.
 *
 * Categorías NO está aquí y Tarjetas sí, a propósito: las categorías se
 * configuran una vez y viven en Ajustes, mientras que las tarjetas se consultan
 * seguido —fechas de corte, cupo usado, simular antes de comprar—. Y ese
 * momento de "simular antes de comprar" solo ocurre si está a un toque.
 *
 * Alto total 72px + safe area (antes 60px): la columna icono/etiqueta iba justa
 * y en pantallas estrechas la barra se leía cortada. El suelo del padding
 * inferior sube a 10px para los dispositivos sin indicador de inicio, que no
 * aportan `safe-area-inset-bottom`.
 */
const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/transactions", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/cards", label: "Tarjetas", icon: CreditCard },
  { href: "/goals", label: "Metas", icon: Target },
  { href: "/chat", label: "Asistente", icon: Sparkles },
];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones"
      className="border-hairline bg-surface/92 fixed inset-x-0 bottom-0 z-30 border-t [padding-bottom:max(10px,env(safe-area-inset-bottom))] backdrop-blur-xl"
    >
      <ul className="mx-auto flex max-w-4xl">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[58px] flex-col items-center gap-1 px-0.5 pt-2 pb-1.5",
                  "duration-base ease-standard active:duration-instant transition-transform active:scale-[0.94]",
                  active ? "text-ink" : "text-ink-3",
                )}
              >
                <span
                  className={cn(
                    "grid h-7.5 w-11 max-w-full place-items-center rounded-full",
                    "duration-base ease-standard transition-colors",
                    active ? "bg-sunken" : "bg-transparent",
                  )}
                >
                  <Icon size={19} strokeWidth={1.75} absoluteStrokeWidth aria-hidden />
                </span>
                <span
                  className={cn(
                    // nowrap: «Movimientos» partido en dos líneas es lo que hace
                    // que la barra se lea cortada en pantallas estrechas.
                    "text-[10px] leading-[13px] tracking-[0.01em] whitespace-nowrap",
                    active ? "font-semibold" : "font-medium",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
