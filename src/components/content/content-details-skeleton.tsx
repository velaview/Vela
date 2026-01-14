import { Skeleton } from '@/components/ui/skeleton';

export function ContentDetailsSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="relative h-[70vh] w-full">
        <Skeleton className="absolute inset-0" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 lg:p-16">
          <div className="flex gap-8">
            <Skeleton className="hidden aspect-[2/3] w-48 rounded-lg md:block lg:w-56" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-12 w-96" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-20 w-full max-w-2xl" />
              <div className="flex gap-3">
                <Skeleton className="h-12 w-32" />
                <Skeleton className="h-12 w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
