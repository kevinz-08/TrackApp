import { cn } from "@/lib/utils";

/**
 * Primitivas de superficie del sistema monocromo.
 *
 * En tema claro la página NUNCA es blanca: es Grey 100 y el blanco queda
 * reservado para lo que flota encima. Invertirlo —blanco de fondo, gris de
 * tarjeta— es lo que hace que las apps monocromas parezcan formularios.
 *
 * Máximo tres niveles de superficie visibles a la vez: hundido / página /
 * elevado. La sombra solo la llevan los elementos que el usuario puede mover o
 * descartar (sheets, toasts), no las tarjetas estáticas.
 */

export function Card({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-card border-hairline bg-surface border",
        // Acota el recálculo al subárbol: en una lista larga es la diferencia
        // entre un layout global y uno local.
        "[contain:layout_paint]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Etiqueta en versalitas: sustituye al color acento como señal de sección. */
export function MicroLabel({ className, children, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-ink-3 text-[11px] leading-[14px] font-semibold tracking-[0.14em] uppercase",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * Sección con título y pista. El aire alrededor es lo que crea la jerarquía.
 *
 * El título usa `text-title`, el mismo rótulo que el nombre de la ruta en
 * `PageHeader`: en la portada, «Gasto por categoría» y «Suscripciones» se leen
 * como secciones de pleno derecho y no como pies de foto de la tarjeta que
 * viene debajo, que es lo que pasaba con el rótulo en versalitas.
 *
 * Es `h2` y no `h1`: visualmente son iguales, pero el `h1` de la pantalla ya lo
 * pone `PageHeader`, y un documento con seis `h1` deja a un lector de pantalla
 * sin forma de saltar entre secciones.
 *
 * El hueco hasta el contenido sube a 16px: a 11px en versalitas bastaban 12,
 * pero un título de 32px necesita más aire debajo o la tarjeta se le pega.
 */
export function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-ink text-title">{title}</h2>
        {hint && <p className="text-ink-2 max-w-[58ch] text-[13px] leading-[18px]">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * Entrada escalonada de 40ms, máximo cinco elementos (§3.5): más allá de eso el
 * escalonado se convierte en espera percibida y todos deben entrar a la vez.
 *
 * El bloque crece desde su línea base en lugar de aparecer de la nada, que es
 * el mismo gesto con el que resuelve un gráfico al terminar de cargar.
 */
export function Reveal({ step = 0, children }: { step?: number; children: React.ReactNode }) {
  return (
    <div className="animate-rise" style={{ animationDelay: `${Math.min(step, 4) * 40}ms` }}>
      {children}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-card border-hairline text-ink-2 flex min-h-32 items-center justify-center border border-dashed px-6 py-8 text-center text-[13px]">
      {message}
    </div>
  );
}

/**
 * Skeleton con barrido lineal de 1.4s. El barrido se anima con `translateX`
 * sobre una capa hija, nunca con `background-position`: esa propiedad repinta
 * en cada frame y es el shimmer que hace caer los FPS en dispositivos viejos.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-chip bg-sunken relative overflow-hidden", className)}>
      <div
        aria-hidden
        className="animate-shimmer absolute inset-0 -translate-x-full bg-[linear-gradient(105deg,transparent_20%,var(--shimmer)_50%,transparent_80%)]"
      />
    </div>
  );
}
