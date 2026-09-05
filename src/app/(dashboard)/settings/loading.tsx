import { HeaderSkeleton } from "@/components/ui/route-skeleton";
import { Skeleton } from "@/components/ui/surface";

export default function Loading() {
  return (
    <div className="space-y-5">
      <HeaderSkeleton />
      <Skeleton className="rounded-card h-24" />
      <Skeleton className="rounded-card h-[168px]" />
    </div>
  );
}
