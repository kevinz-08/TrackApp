import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Encabezado de ruta: el nombre de la sección a tamaño de título y, a su
 * derecha, la única acción que esa sección admite.
 *
 * Sustituye al rótulo en versalitas que llevaban antes las pantallas. Aquel
 * rótulo pesaba menos que el primer dato de la página, así que el nombre de la
 * sección se leía como un pie de foto de lo que venía debajo; a este tamaño el
 * usuario sabe dónde está antes de empezar a leer nada.
 *
 * No es pegajoso: sube con el contenido, como el título grande de iOS. Un
 * título de 32px anclado arriba se come un quinto de la pantalla durante todo
 * el scroll, y aquí lo que tiene que estar siempre a mano es la barra de abajo,
 * no el nombre de la pantalla.
 *
 * La acción es una sola y siempre la misma por ruta. Dos acciones en la
 * cabecera obligan a elegir antes de saber qué hay en la pantalla, y la segunda
 * casi siempre pertenece a una fila concreta de la lista, no a la sección.
 */
export function PageHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-ink text-[32px] leading-[36px] font-bold tracking-[-0.03em]">
          {title}
        </h1>
        {hint && <p className="text-ink-2 max-w-[58ch] text-[13px] leading-[18px]">{hint}</p>}
      </div>

      {/* El desplazamiento centra el círculo contra la mayúscula del título, no
          contra la caja de línea, que cuelga por debajo de la altura de X. */}
      {action && <div className="mt-0.5 shrink-0">{action}</div>}
    </header>
  );
}

const ICON_ACTION = cn(
  "border-hairline bg-surface text-ink grid size-11 shrink-0 place-items-center rounded-full border",
  "duration-base ease-standard active:duration-instant active:bg-sunken",
  "transition-[background-color,transform] active:scale-[0.94]",
);

/**
 * Acción de cabecera cuando cabe en un icono: mismo círculo de 44pt que el
 * disparador del historial del chat y que los accesos de la portada, para que
 * «lo redondo se toca» sea una sola regla en toda la app.
 *
 * `label` no es opcional: sin texto visible, el nombre accesible es lo único
 * que tiene un lector de pantalla para distinguir una tuerca de una lupa.
 */
export function IconAction({
  icon: Icon,
  label,
  href,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = <Icon size={19} strokeWidth={1.75} absoluteStrokeWidth aria-hidden />;

  return href ? (
    <Link href={href} aria-label={label} title={label} className={ICON_ACTION}>
      {content}
    </Link>
  ) : (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={ICON_ACTION}
    >
      {content}
    </button>
  );
}
