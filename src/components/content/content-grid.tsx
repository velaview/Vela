'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ContentCard } from '@/components/home/content-card';
import { ContentGridSkeleton } from './content-grid-skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCachedCatalog } from '@/hooks/use-cached-content';
import { useAutoPrefetch } from '@/hooks/use-stream-prefetch';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ContentGridProps {
  type: 'movie' | 'series' | 'anime';
  catalogId: string;
  /** Initial genre filter from URL */
  initialGenre?: string;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function ContentGrid({ type, catalogId, initialGenre }: ContentGridProps) {
  const searchParams = useSearchParams();
  const [selectedGenre, setSelectedGenre] = useState<string>(
    initialGenre || searchParams.get('genre') || ''
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Use cached catalog hook - blazing fast!
  const { items, genres, hasMore, isLoading, loadMore: loadMoreItems } = useCachedCatalog({
    type,
    catalogId,
    genre: type === 'anime' ? undefined : selectedGenre || undefined,
  });

  // Note: Disabled auto-prefetch to reduce localStorage usage
  // Streams will be fetched on-demand when user clicks Play
  // useAutoPrefetch(items?.map(item => ({ id: item.id, type: item.type })));

  // Handle genre change
  const handleGenreChange = (value: string) => {
    setSelectedGenre(value === 'all' ? '' : value);
  };

  // Load more handler
  const handleLoadMore = async () => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      await loadMoreItems();
      setIsLoadingMore(false);
    }
  };

  if (isLoading) {
    return <ContentGridSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      {genres.length > 0 && type !== 'anime' && (
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Genre:</span>
            <Select value={selectedGenre || 'all'} onValueChange={handleGenreChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Genres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {genres.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Content Grid */}
      {items.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <p>No content available</p>
          {selectedGenre && (
            <Button 
              variant="link" 
              onClick={() => setSelectedGenre('')}
              className="mt-2"
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item) => (
              <ContentCard
                key={item.id}
                id={item.id}
                title={item.name}
                type={type}
                poster={item.poster}
                year={item.releaseInfo ? parseInt(item.releaseInfo) : undefined}
                rating={item.imdbRating ? parseFloat(item.imdbRating) : undefined}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center pt-8">
              <Button
                variant="outline"
                size="lg"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
