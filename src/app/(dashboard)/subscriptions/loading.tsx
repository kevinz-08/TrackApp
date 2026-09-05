import { HeaderSkeleton, RowsSkeleton } from "@/components/ui/route-skeleton";
import { Skeleton } from "@/components/ui/surface";

export default function Loading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton action="pill" />
      <Skeleton className="rounded-card h-24" />
      <RowsSkeleton rows={4} />
    </div>
  );
}
