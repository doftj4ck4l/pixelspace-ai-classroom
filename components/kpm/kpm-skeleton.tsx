import { Skeleton } from "@/components/ui/skeleton";

export const KpmSkeleton = () => (
  <div className="mt-6 flex flex-col gap-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-[104px] rounded-2xl" />
      ))}
    </div>
    <Skeleton className="h-[316px] rounded-2xl" />
    <div className="grid gap-4 lg:grid-cols-2">
      <Skeleton className="h-[316px] rounded-2xl" />
      <Skeleton className="h-[316px] rounded-2xl" />
    </div>
    <Skeleton className="h-64 rounded-2xl" />
  </div>
);
