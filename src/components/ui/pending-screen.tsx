import { MicroLabel, Skeleton } from "@/components/ui/surface";

/**
 * Pantalla todavía no construida. El skeleton replica la geometría de lo que
 * vendrá —mismo alto, mismo radio— en vez de un rectángulo genérico: eso es lo
 * que evita el salto visual cuando el contenido real llega.
 */
export function PendingScreen({ title, note }: { title: string; note: string }) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <MicroLabel>{title}</MicroLabel>
        <p className="text-ink-2 text-[13px] leading-[18px]">{note}</p>
      </div>

      <div className="space-y-3" aria-hidden>
        <Skeleton className="h-[11px] w-24" />
        <Skeleton className="h-[34px] w-48" />
        <Skeleton className="rounded-card h-32" />
      </div>
    </div>
  );
}
