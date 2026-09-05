import { Card, Skeleton } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

/**
 * Piezas de los `loading.tsx` de cada ruta.
 *
 * Existen por una razón de navegación, no de estética: un `loading.tsx` es lo
 * que permite a Next preparar la ruta por adelantado y pintar algo en el mismo
 * frame del toque, en vez de dejar la pantalla anterior congelada hasta que el
 * servidor termine. Sin él, una ruta que consulta la base no se puede
 * precargar y el usuario no recibe ninguna señal de que su toque llegó.
 *
 * La regla al escribirlas: **misma geometría que lo que sustituyen**. Un
 * esqueleto más corto que el contenido real produce un salto al llegar los
 * datos, y ese salto se percibe peor que la espera que estaba evitando.
 */

/**
 * Cabecera de ruta: bloque del título a 32px y, si la hay, la pista.
 *
 * `action` distingue las dos formas que existen en la app —el círculo de 44pt y
 * el botón fantasma— porque son anchos muy distintos y el hueco equivocado
 * desplaza el título al llegar el contenido.
 */
export function HeaderSkeleton({
  hint = false,
  action,
}: {
  hint?: boolean;
  action?: "icon" | "pill";
}) {
  return (
    <header className="flex items-start justify-between gap-4" aria-hidden>
      <div className="min-w-0 space-y-1.5">
        <Skeleton className="h-[36px] w-40" />
        {hint && <Skeleton className="h-[13px] w-64" />}
      </div>
      {action === "icon" && <Skeleton className="mt-0.5 size-11 shrink-0 rounded-full" />}
      {action === "pill" && <Skeleton className="rounded-chip mt-0.5 h-9 w-24 shrink-0" />}
    </header>
  );
}

/** Lista de filas dentro de una sola tarjeta con separadores. */
export function RowsSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <Card className={cn("divide-hairline divide-y", className)} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0 flex-1 space-y-1.5">
            {/*
              Los anchos alternan en vez de ser todos iguales: una columna de
              barras idénticas se lee como una tabla vacía, no como una lista
              cargando.
            */}
            <Skeleton
              className={cn("h-[14px]", i % 3 === 0 ? "w-40" : i % 3 === 1 ? "w-52" : "w-32")}
            />
            <Skeleton className="h-[11px] w-24" />
          </div>
          <Skeleton className="h-[15px] w-20 shrink-0" />
        </div>
      ))}
    </Card>
  );
}

/** Sección con rótulo, pista y una tarjeta grande: el patrón de `Panel`. */
export function PanelSkeleton({ height = "h-56" }: { height?: string }) {
  return (
    <div className="space-y-3" aria-hidden>
      <Skeleton className="h-[11px] w-32" />
      <Skeleton className="h-[13px] w-56" />
      <Skeleton className={cn("rounded-card", height)} />
    </div>
  );
}

/** Rejilla de tarjetas: metas, tarjetas de crédito. */
export function CardsSkeleton({ count = 3, height = "h-40" }: { count?: number; height?: string }) {
  return (
    <div className="space-y-4" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={cn("rounded-card", height)} />
      ))}
    </div>
  );
}
