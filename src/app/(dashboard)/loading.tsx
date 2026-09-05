import { HeaderSkeleton, PanelSkeleton } from "@/components/ui/route-skeleton";
import { Skeleton } from "@/components/ui/surface";

/**
 * Esqueleto de la portada, y respaldo de cualquier ruta del panel que no traiga
 * el suyo.
 *
 * Es lo que Next precarga cuando el dedo se acerca al enlace, así que aparece
 * en el mismo frame del toque: la barra de abajo marca la pestaña nueva al
 * instante y sigue respondiendo mientras el servidor trabaja.
 */
export default function Loading() {
  return (
    <div className="space-y-8">
      <HeaderSkeleton action="icon" />

      <div className="space-y-8" aria-hidden>
        <Skeleton className="h-[248px] rounded-[22px]" />
        <Skeleton className="rounded-card h-[168px] sm:h-[88px]" />
      </div>

      <PanelSkeleton />
      <PanelSkeleton height="h-32" />
      <PanelSkeleton />
    </div>
  );
}
