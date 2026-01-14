import { Skeleton } from '@/components/ui/skeleton';

export function ContentRowSkeleton() {
  return (
    <section className="space-y-2">
      {/* Title Skeleton */}
      <Skeleton className="h-7 w-48" />

      {/* Cards Skeleton */}
      <div className="flex gap-2 overflow-hidden md:gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="aspect-[2/3] w-32 flex-shrink-0 rounded-md md:w-40"
          />
        ))}
      </div>
    </section>
  );
}
