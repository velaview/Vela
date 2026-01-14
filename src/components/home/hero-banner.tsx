'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Info, Plus, Check, ChevronLeft, ChevronRight, Loader2, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAutoPrefetch } from '@/hooks/use-stream-prefetch';
import { useContentCache } from '@/store/content-cache';
import { useWatchHistory } from '@/store/watch-history';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface FeaturedContent {
  id: string;
  type: 'movie' | 'series';
  name: string;
  description?: string;
  background?: string;
  poster?: string;
  logo?: string;
  imdbRating?: string;
  releaseInfo?: string;
  runtime?: string;
  genres?: string[];
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function HeroBanner() {
  const router = useRouter();
  const cache = useContentCache();
  const { getItem: getWatchHistoryItem } = useWatchHistory();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [featuredContent, setFeaturedContent] = useState<FeaturedContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInList, setIsInList] = useState(false);
  const [isAddingToList, setIsAddingToList] = useState(false);
  const [isLoadingPlay, setIsLoadingPlay] = useState(false);

  // Note: Disabled auto-prefetch to reduce localStorage usage
  // Streams will be fetched on-demand when user clicks Play
  // useAutoPrefetch(featuredContent.map(item => ({ id: item.id, type: item.type })));

  // Fetch trending content for hero
  useEffect(() => {
    async function fetchFeatured() {
      try {
        // Fetch from multiple catalogs for variety
        const [moviesRes, seriesRes] = await Promise.all([
          fetch('/api/catalog/movie/top'),
          fetch('/api/catalog/series/top'),
        ]);

        const moviesData = await moviesRes.json();
        const seriesData = await seriesRes.json();

        const movies = (moviesData.data || []).slice(0, 5).map((m: FeaturedContent) => ({ ...m, type: 'movie' as const }));
        const series = (seriesData.data || []).slice(0, 5).map((s: FeaturedContent) => ({ ...s, type: 'series' as const }));

        // Interleave movies and series
        const combined: FeaturedContent[] = [];
        for (let i = 0; i < Math.max(movies.length, series.length); i++) {
          if (movies[i]) combined.push(movies[i]);
          if (series[i]) combined.push(series[i]);
        }

        setFeaturedContent(combined.slice(0, 8));
      } catch (error) {
        console.error('Failed to fetch featured content:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFeatured();
  }, []);

  const content = featuredContent[currentIndex];

  // Auto-rotate featured content
  useEffect(() => {
    if (featuredContent.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredContent.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [featuredContent.length]);

  const goToPrevious = useCallback(() => {
    if (featuredContent.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + featuredContent.length) % featuredContent.length);
  }, [featuredContent.length]);

  const goToNext = useCallback(() => {
    if (featuredContent.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % featuredContent.length);
  }, [featuredContent.length]);

  const handleAddToList = async () => {
    if (!content || isAddingToList) return;

    setIsAddingToList(true);
    try {
      const response = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: content.id,
          contentType: content.type,
          title: content.name,
          poster: content.poster,
        }),
      });

      if (response.ok) {
        setIsInList(true);
        toast.success('Added to My List');
      } else if (response.status === 409) {
        setIsInList(true);
        toast.info('Already in My List');
      } else {
        toast.error('Failed to add to list');
      }
    } catch (error) {
      toast.error('Failed to add to list');
    } finally {
      setIsAddingToList(false);
    }
  };

  // Handle direct play using centralized service
  const handlePlay = async () => {
    if (!content || isLoadingPlay) return;

    setIsLoadingPlay(true);
    try {
      const { playButtonService } = await import('@/core/player/play.service');

      const result = await playButtonService.resolveAndPlay({
        type: content.type as 'movie' | 'series' | 'anime',
        id: content.id,
      });

      if (result.streamUrl) {
        router.push(result.watchUrl);
      } else {
        toast.error('No streams available. Opening details...');
        router.push(`/${content.type}/${content.id}`);
      }
    } catch (error) {
      console.error('[HeroBanner] Play failed:', error);
      toast.error('Failed to load stream');
      router.push(`/${content.type}/${content.id}`);
    } finally {
      setIsLoadingPlay(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="relative h-[85vh] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // No content state
  if (!content) {
    return (
      <div className="relative h-[85vh] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="absolute bottom-0 left-0 right-0 p-8 pb-40 md:p-12 md:pb-44 lg:p-16 lg:pb-48">
          <div className="max-w-2xl space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Welcome to Vela
            </h1>
            <p className="text-lg text-muted-foreground">
              Your next-generation streaming platform. Browse movies, TV series, and anime - all in one place.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button size="lg" className="gap-2" asChild>
                <Link href="/browse">
                  <Play className="h-5 w-5 fill-current" />
                  Start Browsing
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[85vh] w-full overflow-hidden">
      {/* Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={content.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          {content.background || content.poster ? (
            <Image
              src={content.background || content.poster!}
              alt={content.name}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background to-background" />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Gradients - stronger at bottom for content rows */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent" />

      {/* Content - with extra bottom padding to avoid overlap with content rows */}
      <div className="absolute bottom-0 left-0 right-0 p-8 pb-40 md:p-12 md:pb-44 lg:p-16 lg:pb-48">
        <div className="max-w-2xl space-y-4">
          {/* Type Badge */}
          <Badge variant="secondary" className="uppercase">
            {content.type}
          </Badge>

          {/* Logo or Title */}
          <AnimatePresence mode="wait">
            <motion.div
              key={content.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {content.logo ? (
                <Image
                  src={content.logo}
                  alt={content.name}
                  width={400}
                  height={150}
                  className="max-h-32 w-auto object-contain"
                />
              ) : (
                <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl drop-shadow-lg">
                  {content.name}
                </h1>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {content.imdbRating && (
              <span className="flex items-center gap-1 text-yellow-500">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-semibold">{content.imdbRating}</span>
              </span>
            )}
            {content.releaseInfo && (
              <span className="text-muted-foreground">{content.releaseInfo}</span>
            )}
            {content.runtime && (
              <span className="text-muted-foreground">{content.runtime}</span>
            )}
            {content.genres && content.genres.length > 0 && (
              <span className="hidden text-muted-foreground md:inline">
                {content.genres.slice(0, 3).join(' • ')}
              </span>
            )}
          </div>

          {/* Description */}
          {content.description && (
            <AnimatePresence mode="wait">
              <motion.p
                key={content.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="line-clamp-3 text-sm text-muted-foreground md:text-base max-w-xl"
              >
                {content.description}
              </motion.p>
            </AnimatePresence>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              size="lg"
              className="gap-2 shadow-lg"
              onClick={handlePlay}
              disabled={isLoadingPlay}
            >
              {isLoadingPlay ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Play className="h-5 w-5 fill-current" />
              )}
              {isLoadingPlay ? 'Loading...' : 'Play'}
            </Button>
            <Button size="lg" variant="secondary" className="gap-2 shadow-lg" asChild>
              <Link href={`/${content.type}/${content.id}`}>
                <Info className="h-5 w-5" />
                More Info
              </Link>
            </Button>
            <Button
              size="icon"
              variant={isInList ? 'default' : 'outline'}
              className="rounded-full shadow-lg"
              onClick={handleAddToList}
              disabled={isAddingToList}
            >
              {isAddingToList ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isInList ? (
                <Check className="h-5 w-5" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {featuredContent.length > 1 && (
        <>
          <Button
            size="icon"
            variant="ghost"
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm"
            onClick={goToNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Carousel Indicators */}
      {featuredContent.length > 1 && (
        <div className="absolute bottom-32 left-1/2 flex -translate-x-1/2 gap-2">
          {featuredContent.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                index === currentIndex
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-white/50 hover:bg-white/70'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
