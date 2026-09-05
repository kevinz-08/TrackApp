import { HeaderSkeleton } from "@/components/ui/route-skeleton";
import { Skeleton } from "@/components/ui/surface";

/*
 * El compositor va anclado abajo, sobre la barra: el esqueleto reserva ese
 * mismo sitio para que la caja de escribir no salte al llegar la conversación.
 */
export default function Loading() {
  return (
    <div className="space-y-4">
      <HeaderSkeleton action="icon" />

      <div className="space-y-4" aria-hidden>
        <Skeleton className="rounded-card ml-auto h-14 w-3/5" />
        <Skeleton className="rounded-card h-24 w-11/12" />
        <Skeleton className="rounded-card ml-auto h-10 w-2/5" />
      </div>
    </div>
  );
}
