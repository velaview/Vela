import { Skeleton } from '@/components/ui/skeleton';

export default function MainLoading() {
  return (
    <div className="min-h-screen pt-16">
      {/* Hero Skeleton */}
      <Skeleton className="h-[70vh] w-full" />

      {/* Content Rows Skeleton */}
      <div className="space-y-8 px-4 py-8 md:px-8 lg:px-12">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-7 w-48" />
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="aspect-[2/3] w-40 flex-shrink-0 rounded-md" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
