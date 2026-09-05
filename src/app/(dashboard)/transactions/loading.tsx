import { HeaderSkeleton, RowsSkeleton } from "@/components/ui/route-skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <HeaderSkeleton hint action="pill" />
      <RowsSkeleton rows={8} />
    </div>
  );
}
