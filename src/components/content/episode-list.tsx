'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Play, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';


// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Episode {
  id: string;
  title: string;
  season?: number;
  episode?: number;
  thumbnail?: string;
  overview?: string;
  released?: string;
}

interface WatchedStatus {
  position: number;
  duration: number;
  completed: boolean;
}

interface EpisodeListProps {
  episodes: Episode[];
  contentType: 'movie' | 'series' | 'anime';
  contentId: string;
  watchedEpisodes?: Map<string, WatchedStatus>;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function EpisodeList({ episodes, contentType, contentId, watchedEpisodes }: EpisodeListProps) {
  const router = useRouter();

  const [loadingEpisode, setLoadingEpisode] = useState<string | null>(null);

  const handlePlayEpisode = async (episode: Episode) => {
    if (!episode.season || !episode.episode) {
      toast.error('Invalid episode data');
      return;
    }

    setLoadingEpisode(episode.id);
    try {
      const { playButtonService } = await import('@/core/player/play.service');

      const result = await playButtonService.resolveAndPlay({
        type: contentType as 'movie' | 'series' | 'anime',
        id: contentId,
        season: episode.season,
        episode: episode.episode,
      });

      if (result.streamUrl) {
        router.push(result.watchUrl);
      } else {
        toast.error('No streams available for this episode');
      }
    } catch (error) {
      console.error('[EpisodeList] Play failed:', error);
      toast.error('Failed to load stream');
    } finally {
      setLoadingEpisode(null);
    }
  };

  // Get watched status for an episode
  const getWatchedStatus = (episode: Episode): WatchedStatus | undefined => {
    if (!watchedEpisodes || episode.season === undefined || episode.episode === undefined) {
      return undefined;
    }
    return watchedEpisodes.get(`${episode.season}:${episode.episode}`);
  };

  // Calculate progress percentage
  const getProgressPercent = (status: WatchedStatus): number => {
    if (!status.duration || status.duration <= 0) return 0;
    return Math.min(100, Math.round((status.position / status.duration) * 100));
  };

  // Format time remaining
  const formatTimeRemaining = (status: WatchedStatus): string => {
    const remaining = status.duration - status.position;
    const minutes = Math.floor(remaining / 60);
    if (minutes < 1) return 'Less than 1 min left';
    if (minutes < 60) return `${minutes} min left`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m left`;
  };

  if (episodes.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>No episodes available</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {episodes.map((episode) => {
          const watchedStatus = getWatchedStatus(episode);
          const progress = watchedStatus ? getProgressPercent(watchedStatus) : 0;
          const isCompleted = watchedStatus?.completed || progress >= 90;
          const isInProgress = watchedStatus && !isCompleted && progress >= 5;

          return (
            <div
              key={episode.id}
              className={cn(
                "group flex gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-accent relative",
                isCompleted && "opacity-70"
              )}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video w-40 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                {episode.thumbnail ? (
                  <Image
                    src={episode.thumbnail}
                    alt={episode.title || 'Episode thumbnail'}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Play className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}

                {/* Progress bar overlay (for in-progress episodes) */}
                {isInProgress && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}

                {/* Completed overlay */}
                {isCompleted && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                  </div>
                )}

                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    onClick={() => handlePlayEpisode(episode)}
                    disabled={loadingEpisode === episode.id}
                  >
                    {loadingEpisode === episode.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Play className="h-5 w-5 fill-current" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium flex items-center gap-2">
                      {episode.episode !== undefined && (
                        <span className="text-muted-foreground">
                          {episode.episode}.{' '}
                        </span>
                      )}
                      {episode.title}

                      {/* Watched badge */}
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-500">
                          <CheckCircle2 className="h-3 w-3" />
                          Watched
                        </span>
                      )}
                    </h3>

                    {/* Meta info */}
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      {episode.released && (
                        <span>{new Date(episode.released).toLocaleDateString()}</span>
                      )}

                      {/* Time remaining for in-progress */}
                      {isInProgress && watchedStatus && (
                        <>
                          {episode.released && <span>•</span>}
                          <span className="text-primary">
                            {formatTimeRemaining(watchedStatus)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => handlePlayEpisode(episode)}
                    disabled={loadingEpisode === episode.id}
                  >
                    {loadingEpisode === episode.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>
                </div>

                {episode.overview && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {episode.overview}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
