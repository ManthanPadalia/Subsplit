import { Skeleton } from "@/components/ui/skeleton";

interface PlanCardSkeletonProps {
  count?: number;
}

export function PlanCardSkeleton({ count = 6 }: PlanCardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-card border border-border rounded-lg p-5"
        >
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-40" />
            <div className="flex gap-1.5">
              {Array.from({ length: 4 }).map((__, slotIndex) => (
                <Skeleton key={slotIndex} className="w-2.5 h-2.5 rounded-sm" />
              ))}
            </div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
