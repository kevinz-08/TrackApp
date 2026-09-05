"use client";

import { useLayoutEffect, useRef } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, CreditCard, House, Sparkles, Target, type LucideIcon } from "lucide-react";
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
 * El alto no se escribe en ningun sitio: la barra lo mide y lo publica en
 * `--tabbar-h` (ver `useTabBarHeight`), que es de donde sale la separacion
 * entre el contenido y la barra. El suelo del padding inferior son 10px para
 * los dispositivos sin indicador de inicio, que no aportan
 * `safe-area-inset-bottom`.
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

/**
 * Publica el alto real de la barra en `--tabbar-h`, que es de donde sale el
 * hueco inferior del contenido (`main`) y el anclaje del compositor del chat.
 *
 * Se mide en vez de escribirse: `offsetHeight` ya incluye el borde y el
 * padding inferior con la safe area, y el observer recoge cualquier cambio
 * posterior —rotacion, Dynamic Type, una etiqueta que envuelve—. La constante
 * de `globals.css` solo cubre el primer pintado.
 */
function useTabBarHeight() {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const nav = ref.current;
    if (!nav) return;

    const root = document.documentElement;
    const publish = () => root.style.setProperty("--tabbar-h", `${nav.offsetHeight}px`);

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(nav);

    return () => {
      observer.disconnect();
      // Al desmontar vuelve a mandar la constante del tema: dejar un pixelaje
      // fijo de una barra que ya no existe descuadra las pantallas sin barra.
      root.style.removeProperty("--tabbar-h");
    };
  }, []);

  return ref;
}

/**
 * Contenido de una pestaña. Vive dentro del `Link` y no fuera porque
 * `useLinkStatus` solo lee el estado de la navegación desde dentro del enlace
 * que la disparó.
 *
 * Marca el destino en cuanto se toca, sin esperar a que el servidor conteste:
 * si la respuesta tarda —una ruta que consulta la base desde fuera de la región
 * de Neon, o un túnel de por medio—, sin esto la barra sigue señalando la
 * pestaña vieja y el toque parece perdido.
 *
 * La señal es la misma pastilla del estado activo, adelantada. No se añade
 * ningún indicador nuevo: un spinner en la barra convierte cada navegación en
 * un evento, y navegar no es un evento.
 */
function TabContent({
  label,
  icon: Icon,
  active,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  const { pending } = useLinkStatus();
  const marked = active || pending;

  return (
    <span className={cn("contents", pending && "text-ink")}>
      <span
        className={cn(
          "grid h-7.5 w-11 max-w-full place-items-center rounded-full",
          "duration-base ease-standard transition-colors",
          marked ? "bg-sunken" : "bg-transparent",
        )}
      >
        <Icon size={19} strokeWidth={1.75} absoluteStrokeWidth aria-hidden />
      </span>
      <span
        className={cn(
          // nowrap: «Movimientos» partido en dos líneas es lo que hace
          // que la barra se lea cortada en pantallas estrechas.
          "text-[10px] leading-[13px] tracking-[0.01em] whitespace-nowrap",
          marked ? "font-semibold" : "font-medium",
        )}
      >
        {label}
      </span>
    </span>
  );
}

export function TabBar() {
  const pathname = usePathname();
  const ref = useTabBarHeight();

  return (
    <nav
      ref={ref}
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
                <TabContent label={label} icon={Icon} active={active} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
