'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Plus, Share2, Star, Clock, Calendar, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEpisodePrefetch } from '@/hooks/use-episode-prefetch';
import { useStreamPreload } from '@/hooks/use-stream-preload';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

import { EpisodeList } from './episode-list';
import { ContentRow } from '@/components/home/content-row';
import { nanoid } from 'nanoid';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Meta {
  id: string;
  type: string;
  name: string;
  poster?: string;
  background?: string;
  logo?: string;
  description?: string;
  releaseInfo?: string;
  imdbRating?: string;
  runtime?: string;
  genres?: string[];
  director?: string[];
  cast?: string[];
  videos?: Video[];
}

interface Video {
  id: string;
  title: string;
  season?: number;
  episode?: number;
  thumbnail?: string;
  overview?: string;
  released?: string;
}


interface ContentDetailsProps {
  type: 'movie' | 'series' | 'anime';
  id: string;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function ContentDetails({ type, id }: ContentDetailsProps) {
  const router = useRouter();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInList, setIsInList] = useState(false);
  const [isAddingToList, setIsAddingToList] = useState(false);
  const [isLoadingStreams, setIsLoadingStreams] = useState(false);
  const [watchHistory, setWatchHistory] = useState<{ season?: number; episode?: number; position?: number } | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Map<string, { position: number; duration: number; completed: boolean }>>(new Map());
  const { prefetchEpisodes } = useEpisodePrefetch();

  // Pre-resolve streams for instant playback (runs in background)
  useStreamPreload(type, id, watchHistory?.season || 1);

  useEffect(() => {
    async function fetchMeta() {
      try {
        const response = await fetch(`/api/meta/${type}/${id}`);
        const data = await response.json();
        setMeta(data.data);
      } catch (error) {
        console.error('Failed to fetch meta:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMeta();
  }, [type, id]);

  const isSeries = type === 'series' || type === 'anime';



  // Prefetch 16 episodes of the selected season when it changes
  useEffect(() => {
    if (!id || !isSeries || !meta?.videos || selectedSeason === null) return;

    const episodesToPrefetch = meta.videos
      .filter(v => v.season === selectedSeason && typeof v.episode === 'number')
      .slice(0, 16) // Prefetch first 16 episodes of selected season
      .map(v => ({ season: v.season!, episode: v.episode! }));

    if (episodesToPrefetch.length > 0) {
      console.log(`[ContentDetails] Prefetching ${episodesToPrefetch.length} episodes for season ${selectedSeason}`);
      prefetchEpisodes(type, id, episodesToPrefetch);
    }
  }, [id, type, isSeries, meta?.videos, selectedSeason, prefetchEpisodes]);

  // Fetch watch history for continue watching AND watched episodes
  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch('/api/history');
        if (response.ok) {
          const data = await response.json();
          const items = data.data || [];

          // Find all watched episodes for this content
          const contentItems = items.filter((item: any) => item.contentId === id);
          const episodeMap = new Map<string, { position: number; duration: number; completed: boolean }>();

          let mostRecent: { season?: number; episode?: number; position?: number; watchedAt?: Date } | null = null;

          for (const item of contentItems) {
            if (item.season !== undefined && item.episode !== undefined) {
              const key = `${item.season}:${item.episode}`;
              episodeMap.set(key, {
                position: item.position,
                duration: item.duration,
                completed: item.completed || false,
              });
            }
            // Track most recent watch
            if (!mostRecent || new Date(item.watchedAt) > new Date(mostRecent.watchedAt || 0)) {
              mostRecent = {
                season: item.season,
                episode: item.episode,
                position: item.position,
                watchedAt: item.watchedAt,
              };
            }
          }

          setWatchedEpisodes(episodeMap);
          if (mostRecent) {
            setWatchHistory({
              season: mostRecent.season,
              episode: mostRecent.episode,
              position: mostRecent.position,
            });
          }
        }
      } catch (error) {
        // Silently fail
      }
    }
    fetchHistory();
  }, [id]);

  // Check if item is in library
  useEffect(() => {
    async function checkLibrary() {
      try {
        const response = await fetch(`/api/library/${id}`);
        if (response.ok) {
          const data = await response.json();
          setIsInList(data.data?.inLibrary || false);
        }
      } catch (error) {
        // Silently fail - user might not be logged in
      }
    }
    checkLibrary();
  }, [id]);

  // Set initial selected season when meta loads - prefer last watched season
  useEffect(() => {
    if (!meta?.videos || !isSeries) return;
    const availableSeasons = [...new Set(meta.videos.map(v => v.season).filter(Boolean))] as number[];
    if (availableSeasons.length > 0 && selectedSeason === null) {
      // Use last watched season if available, otherwise first season
      const lastWatchedSeason = watchHistory?.season;
      if (lastWatchedSeason && availableSeasons.includes(lastWatchedSeason)) {
        setSelectedSeason(lastWatchedSeason);
      } else {
        setSelectedSeason(availableSeasons[0]);
      }
    }
  }, [meta?.videos, isSeries, selectedSeason, watchHistory?.season]);

  const handleAddToList = async () => {
    if (!meta || isAddingToList) return;

    setIsAddingToList(true);
    try {
      if (isInList) {
        // Remove from list
        const response = await fetch(`/api/library/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setIsInList(false);
          toast.success('Removed from My List');
        } else {
          toast.error('Failed to remove from list');
        }
      } else {
        const response = await fetch('/api/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId: id,
            contentType: type,
            title: meta.name,
            poster: meta.poster,
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
      }
    } catch (error) {
      toast.error('Failed to update list');
    } finally {
      setIsAddingToList(false);
    }
  };

  if (isLoading) {
    return <ContentDetailsSkeleton />;
  }

  if (!meta) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Content not found</p>
      </div>
    );
  }

  const seasons = isSeries && meta.videos
    ? [...new Set(meta.videos.map((v) => v.season).filter((s): s is number => s !== undefined && s !== null))]
    : [];

  return (
    <div className="relative min-h-screen">
      {/* Hero Section */}
      <div className="relative h-[70vh] w-full">
        {/* Background */}
        {meta.background ? (
          <Image
            src={meta.background}
            alt={meta.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : meta.poster ? (
          <Image
            src={meta.poster}
            alt={meta.name}
            fill
            priority
            sizes="100vw"
            className="object-cover blur-2xl opacity-50"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        )}

        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 lg:p-16">
          <div className="flex gap-8">
            {/* Poster */}
            {meta.poster && (
              <div className="hidden md:block">
                <div className="relative aspect-[2/3] w-48 overflow-hidden rounded-lg shadow-2xl lg:w-56">
                  <Image
                    src={meta.poster}
                    alt={meta.name}
                    fill
                    sizes="(max-width: 768px) 0vw, (max-width: 1200px) 192px, 224px"
                    className="object-cover"
                  />
                </div>
              </div>
            )}

            {/* Info */}
            <div className="flex-1 space-y-4">
              {/* Title */}
              {meta.logo ? (
                <Image
                  src={meta.logo}
                  alt={meta.name}
                  width={400}
                  height={150}
                  className="max-h-24 w-auto object-contain"
                />
              ) : (
                <h1 className="text-4xl font-bold text-foreground md:text-5xl">
                  {meta.name}
                </h1>
              )}

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {meta.imdbRating && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    {meta.imdbRating}
                  </Badge>
                )}
                {meta.releaseInfo && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {meta.releaseInfo}
                  </span>
                )}
                {meta.runtime && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {meta.runtime}
                  </span>
                )}
              </div>

              {/* Genres */}
              {meta.genres && meta.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {meta.genres.map((genre) => (
                    <Badge key={genre} variant="outline">
                      {genre}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Description */}
              {meta.description && (
                <p className="line-clamp-3 max-w-2xl text-muted-foreground">
                  {meta.description}
                </p>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  size="lg"
                  className="gap-2"
                  onClick={async () => {
                    setIsLoadingStreams(true);
                    try {
                      const { playButtonService } = await import('@/core/player/play.service');

                      // For series, get watch history to determine season/episode
                      let season, episode;
                      if (isSeries) {
                        season = watchHistory?.season || 1;
                        episode = watchHistory?.episode || 1;
                      }

                      const result = await playButtonService.resolveAndPlay({
                        type: type as 'movie' | 'series' | 'anime',
                        id,
                        season,
                        episode,
                      });



                      if (result.streamUrl) {
                        router.push(result.watchUrl);
                      } else {
                        toast.error('No streams available for this content');
                      }
                    } catch (error) {
                      console.error('❌ [ContentDetails] Play failed:', error);
                      toast.error('Failed to load stream');
                    } finally {
                      setIsLoadingStreams(false);
                    }
                  }}
                  disabled={isLoadingStreams}
                >
                  {isLoadingStreams ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Play className="h-5 w-5 fill-current" />
                  )}
                  {isLoadingStreams ? 'Loading...' : 'Play'}
                </Button>
                <Button
                  size="lg"
                  variant={isInList ? 'secondary' : 'outline'}
                  className="gap-2"
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
                  {isInList ? 'In My List' : 'Add to List'}
                </Button>
                <Button size="icon" variant="outline" className="rounded-full">
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-8 py-8 md:px-12 lg:px-16">
        {isSeries && seasons.length > 0 ? (
          <div className="space-y-6">
            {/* Season Dropdown Selector */}
            <div className="flex items-center gap-4">
              <Select
                value={selectedSeason?.toString() || ''}
                onValueChange={(value) => setSelectedSeason(parseInt(value))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Season" />
                </SelectTrigger>
                <SelectContent>
                  {seasons.map((season) => (
                    <SelectItem key={season} value={season.toString()}>
                      Season {season}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Episode count indicator */}
              {selectedSeason && (
                <span className="text-sm text-muted-foreground">
                  {meta.videos?.filter((v) => v.season === selectedSeason).length || 0} episodes
                </span>
              )}
            </div>

            {/* Episode List */}
            {selectedSeason && (
              <EpisodeList
                episodes={meta.videos?.filter((v) => v.season === selectedSeason) || []}
                contentType={type}
                contentId={id}
                watchedEpisodes={watchedEpisodes}
              />
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Cast */}
            {meta.cast && meta.cast.length > 0 && (
              <section>
                <h2 className="mb-4 text-xl font-semibold">Cast</h2>
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex gap-4">
                    {meta.cast.slice(0, 12).map((actor, index) => (
                      <div key={`${actor}-${index}`} className="flex flex-col items-center gap-2 min-w-[100px]">
                        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-2 ring-border text-2xl font-bold text-primary">
                          {actor.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm text-foreground text-center max-w-[100px] line-clamp-2">
                          {actor}
                        </span>
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </section>
            )}

            {/* Director */}
            {meta.director && meta.director.length > 0 && (
              <section>
                <h2 className="mb-2 text-lg font-semibold">Director</h2>
                <p className="text-muted-foreground">{meta.director.join(', ')}</p>
              </section>
            )}
          </div>
        )}

        {/* Similar Content */}
        <div className="mt-12">
          <ContentRow
            title="More Like This"
            type={type as any}
            catalogEndpoint={`/api/content/${type}/${id}/similar`}
          />
        </div>
      </div>


    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────

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
