'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWatchHistory, WatchHistoryItem } from '@/store/watch-history';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────
// Continue Watching Row Component
// ─────────────────────────────────────────────────────────────

export function ContinueWatchingRow() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { getContinueWatching, removeItem } = useWatchHistory();
  const [mounted, setMounted] = useState(false);

  // Only render on client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const items = getContinueWatching();

  // Don't render on server or if no items
  if (!mounted || items.length === 0) {
    return null;
  }

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeItem(id);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  const getTimeRemaining = (item: WatchHistoryItem): string => {
    const remaining = item.duration - item.currentTime;
    return formatTime(remaining);
  };

  const getWatchUrl = (item: WatchHistoryItem): string => {
    // If no stream URL, go to content details page to pick a stream
    if (!item.streamUrl) {
      return `/${item.type}/${item.contentId}`;
    }

    const params = new URLSearchParams();

    // Add stream URL
    params.set('url', item.streamUrl);

    // Add season/episode for series
    if (item.type === 'series' && item.season !== undefined && item.episode !== undefined) {
      params.set('season', item.season.toString());
      params.set('episode', item.episode.toString());
    }

    return `/watch/${item.contentId}?type=${item.type}&${params.toString()}`;
  };

  return (
    <section className="relative py-4">
      <div className="mb-4 flex items-center justify-between px-4 md:px-8">
        <h2 className="text-xl font-semibold text-foreground md:text-2xl">
          Continue Watching
        </h2>
      </div>

      <div className="group relative">
        {/* Scroll Buttons */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 bg-background/80 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 bg-background/80 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto px-4 pb-4 scrollbar-hide md:px-8"
        >
          {items.map((item) => (
            <Link
              key={item.id}
              href={getWatchUrl(item)}
              className="group/card relative flex-shrink-0"
            >
              <div className="relative aspect-video w-64 overflow-hidden rounded-lg bg-muted md:w-80">
                {/* Poster/Thumbnail */}
                {item.poster ? (
                  <Image
                    src={item.poster}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover/card:scale-105"
                    sizes="(max-width: 768px) 256px, 320px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <Play className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover/card:opacity-100">
                  <div className="rounded-full bg-primary p-3">
                    <Play className="h-8 w-8 fill-current text-primary-foreground" />
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={(e) => handleRemove(e, item.id)}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 opacity-0 transition-opacity hover:bg-black/80 group-hover/card:opacity-100"
                >
                  <X className="h-4 w-4 text-white" />
                </button>

                {/* Content Info */}
                <div className="absolute bottom-2 left-3 right-3">
                  <h3 className="line-clamp-1 text-sm font-medium text-white">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    {item.type === 'series' && item.season !== undefined && item.episode !== undefined && (
                      <span>S{item.season} E{item.episode}</span>
                    )}
                    <span>•</span>
                    <span>{getTimeRemaining(item)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
