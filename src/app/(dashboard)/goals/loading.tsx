import { CardsSkeleton, HeaderSkeleton } from "@/components/ui/route-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton action="pill" />
      <CardsSkeleton count={3} height="h-44" />
    </div>
  );
}
