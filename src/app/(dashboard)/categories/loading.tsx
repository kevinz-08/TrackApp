import { HeaderSkeleton, RowsSkeleton } from "@/components/ui/route-skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <HeaderSkeleton hint />
      <RowsSkeleton rows={7} />
    </div>
  );
}
