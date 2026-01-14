'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ContentCard } from '@/components/home/content-card';
import { ContentRowSkeleton } from './content-row-skeleton';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ContentItem {
  id: string;
  name: string;
  type: string;
  poster?: string;
  background?: string;
  releaseInfo?: string;
  imdbRating?: string;
  genres?: string[];
}

interface ContentRowProps {
  title?: string;
  type?: string;
  seeAllHref?: string;
  catalogEndpoint?: string;
  genre?: string;
  /** Pre-loaded items from server - if provided, no client-side fetching */
  initialItems?: ContentItem[];
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function ContentRow({ title, type, seeAllHref, catalogEndpoint, genre, initialItems }: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // If initialItems provided, use them directly - no fetching needed
  const [items, setItems] = useState<ContentItem[]>(initialItems || []);
  const [isLoading, setIsLoading] = useState(!initialItems);

  // Only fetch if NO initialItems were provided
  useEffect(() => {
    // If we have initialItems, we're done
    if (initialItems && initialItems.length > 0) {
      setItems(initialItems);
      setIsLoading(false);
      return;
    }

    // No initialItems - need to fetch
    if (!catalogEndpoint && !type) {
      setIsLoading(false);
      return;
    }

    async function fetchContent() {
      try {
        const endpoint = catalogEndpoint || `/api/catalog/${type}/top`;
        const params = new URLSearchParams();
        if (genre) params.set('genre', genre);
        const url = params.toString() ? `${endpoint}?${params}` : endpoint;

        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) {
          setItems([]);
          return;
        }

        const data = await response.json();
        setItems(data.data || []);
      } catch (error) {
        console.error(`Failed to fetch content:`, error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchContent();
  }, [catalogEndpoint, type, genre, initialItems]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.8;
    const newScrollLeft = direction === 'left'
      ? scrollRef.current.scrollLeft - scrollAmount
      : scrollRef.current.scrollLeft + scrollAmount;
    scrollRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  if (isLoading) {
    return <ContentRowSkeleton />;
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="group/row relative">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-lg font-semibold text-foreground md:text-xl">
          {title}
        </h2>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            See All
          </Link>
        )}
      </div>

      {/* Scroll Container */}
      <div className="relative -mx-4 md:-mx-8 lg:-mx-12">
        {/* Left Arrow */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'absolute left-0 top-1/2 z-10 h-full w-12 -translate-y-1/2 rounded-none bg-gradient-to-r from-background to-transparent opacity-0 transition-opacity group-hover/row:opacity-100',
            !showLeftArrow && 'pointer-events-none'
          )}
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>

        {/* Content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-2 overflow-x-auto overflow-y-visible px-4 py-4 scrollbar-hide md:gap-3 md:px-8 lg:px-12"
        >
          {items.map((item, index) => (
            <ContentCard
              key={`${item.id}-${index}`}
              id={item.id}
              title={item.name}
              type={(item.type || type || 'movie') as 'movie' | 'series' | 'anime'}
              poster={item.poster}
              year={item.releaseInfo ? parseInt(item.releaseInfo) : undefined}
              rating={item.imdbRating ? parseFloat(item.imdbRating) : undefined}
              priority={index < 5}
            />
          ))}
        </div>

        {/* Right Arrow */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'absolute right-0 top-1/2 z-10 h-full w-12 -translate-y-1/2 rounded-none bg-gradient-to-l from-background to-transparent opacity-0 transition-opacity group-hover/row:opacity-100',
            !showRightArrow && 'pointer-events-none'
          )}
          onClick={() => scroll('right')}
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      </div>
    </section>
  );
}
