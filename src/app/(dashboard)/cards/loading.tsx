import { CardsSkeleton, HeaderSkeleton } from "@/components/ui/route-skeleton";
import { Skeleton } from "@/components/ui/surface";

export default function Loading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton action="pill" />
      <CardsSkeleton count={2} height="h-36" />
      <Skeleton className="rounded-card h-32" />
    </div>
  );
}
