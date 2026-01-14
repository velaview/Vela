import { Skeleton } from '@/components/ui/skeleton';

export function ContentGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: 18 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[2/3] rounded-md" />
      ))}
    </div>
  );
}
