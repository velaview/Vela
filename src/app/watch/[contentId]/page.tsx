'use client';

import { useEffect, useState, use, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { WatchTogetherProvider } from '@/components/watch-together/watch-together-provider';
import { useWatchHistory } from '@/store/watch-history';
import { useWatchRoomStore } from '@/store/watch-room-store';

// Dynamic import for new video player (client-side only)
const VideoPlayer = dynamic(
  () => import('@/core/player/react').then((mod) => mod.VideoPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    ),
  }
);

interface PageProps {
  params: Promise<{
    contentId: string;
  }>;
}

export default function WatchPage({ params }: PageProps) {
  const { contentId } = use(params);
  const id = contentId;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addOrUpdateItem } = useWatchHistory();

  // Get params
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');
  const typeParam = searchParams.get('type');
  const urlParam = searchParams.get('url');

  // Default to movie unless specified
  const type = typeParam || (season || episode ? 'series' : 'movie');

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [poster, setPoster] = useState<string | undefined>();
  const [subtitleLang, setSubtitleLang] = useState<string>('en');
  const [seasons, setSeasons] = useState<{ season: number; episodes: { episode: number; title?: string; overview?: string; thumbnail?: string }[] }[]>([]);
  // Stream alternatives for quality switching
  const [alternatives, setAlternatives] = useState<{ id: string; quality: string; title: string; url?: string; hash?: string; magnet?: string }[]>([]);
  const [subtitles, setSubtitles] = useState<{ id: string; label: string; url?: string }[]>([]);

  // Resume playback state
  const [startTime, setStartTime] = useState<number | undefined>();

  // Refs for progress saving
  const lastSaveRef = useRef<number>(0);
  const progressDataRef = useRef<{ time: number; duration: number } | null>(null);

  // ─────────────────────────────────────────────────────────────
  // Progress Saving
  // ─────────────────────────────────────────────────────────────

  // Save progress to server
  const saveProgressToServer = useCallback(async (currentTime: number, duration: number) => {
    if (!title || duration <= 0) return;

    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: id,
          contentType: type,
          title,
          poster,
          season: season ? parseInt(season) : undefined,
          episode: episode ? parseInt(episode) : undefined,
          position: Math.floor(currentTime),
          duration: Math.floor(duration),
        }),
      });
      console.log('[Watch] Progress saved to server:', Math.floor(currentTime), '/', Math.floor(duration));
    } catch (err) {
      console.error('[Watch] Failed to save progress:', err);
    }
  }, [id, type, title, poster, season, episode]);

  // Handle progress updates from player (debounced saving)
  const handleProgress = useCallback((currentTime: number, duration: number) => {
    // Store latest progress data
    progressDataRef.current = { time: currentTime, duration };

    const now = Date.now();
    // Save every 30 seconds
    if (now - lastSaveRef.current > 30000) {
      lastSaveRef.current = now;

      // Update Zustand store (client-side)
      addOrUpdateItem({
        contentId: id,
        type: type as 'movie' | 'series' | 'anime',
        title,
        poster,
        season: season ? parseInt(season) : undefined,
        episode: episode ? parseInt(episode) : undefined,
        currentTime,
        duration,
        streamUrl: streamUrl || undefined,
      });

      // Save to server
      saveProgressToServer(currentTime, duration);
    }
  }, [id, type, title, poster, season, episode, streamUrl, addOrUpdateItem, saveProgressToServer]);

  // Save progress on unmount/navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (progressDataRef.current && title) {
        // Use sendBeacon for reliable delivery on page unload
        const data = JSON.stringify({
          contentId: id,
          contentType: type,
          title,
          poster,
          season: season ? parseInt(season) : undefined,
          episode: episode ? parseInt(episode) : undefined,
          position: Math.floor(progressDataRef.current.time),
          duration: Math.floor(progressDataRef.current.duration),
        });
        navigator.sendBeacon('/api/history', data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Final save on component unmount
      if (progressDataRef.current && title) {
        saveProgressToServer(progressDataRef.current.time, progressDataRef.current.duration);
      }
    };
  }, [id, type, title, poster, season, episode, saveProgressToServer]);

  // ─────────────────────────────────────────────────────────────
  // Watch Together Content Sync
  // Navigate if room content changes and we aren't at that content
  // ─────────────────────────────────────────────────────────────

  const room = useWatchRoomStore(s => s.room);
  useEffect(() => {
    if (!room || !room.contentId) return;

    const currentSeason = season ? parseInt(season) : undefined;
    const currentEpisode = episode ? parseInt(episode) : undefined;

    const isDifferentId = room.contentId !== id;
    const isDifferentSeason = room.season !== currentSeason;
    const isDifferentEpisode = room.episode !== currentEpisode;

    if (isDifferentId || isDifferentSeason || isDifferentEpisode) {
      console.log('[WatchTogether] Content change detected, navigating...', {
        from: { id, season: currentSeason, episode: currentEpisode },
        to: { id: room.contentId, season: room.season, episode: room.episode }
      });

      const newUrl = `/watch/${room.contentId}?type=${type}${room.season ? `&season=${room.season}` : ''}${room.episode ? `&episode=${room.episode}` : ''}`;
      router.push(newUrl);
    }
  }, [room?.contentId, room?.season, room?.episode, id, season, episode, type, router]);

  // ─────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      console.log('[Watch] Initializing stream resolution...', { id, type, season, episode });
      try {
        // Always resolve via /api/play to get alternatives and subtitles
        // Even if URL param is provided, we need quality options
        const response = await fetch('/api/play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId: id,
            type,
            season: season ? parseInt(season) : undefined,
            episode: episode ? parseInt(episode) : undefined,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to resolve stream');
        }

        const data = await response.json();
        console.log('[Watch] API Response:', {
          streamUrl: data.streamUrl ? 'present' : 'missing',
          alternatives: data.alternatives?.length || 0,
          subtitles: data.subtitles?.length || 0,
          stream: data.stream?.quality
        });

        if (data.streamUrl) {
          setStreamUrl(data.streamUrl);

          // Store alternatives for quality switching (include current stream too)
          const allAlternatives: { id: string; quality: string; title: string; url?: string; hash?: string; magnet?: string }[] = [];
          if (data.stream) {
            allAlternatives.push({
              id: data.stream.id || 'current',
              quality: data.stream.quality,
              title: data.stream.title,
              url: data.stream.hlsUrl || data.stream.url,
              hash: data.stream.hash,
              magnet: data.stream.magnet,
            });
          }
          if (data.alternatives && data.alternatives.length > 0) {
            for (const s of data.alternatives) {
              allAlternatives.push({
                id: s.id,
                quality: s.quality,
                title: s.title,
                url: s.hlsUrl || s.url,
                hash: s.hash,
                magnet: s.magnet,
              });
            }
          }
          if (allAlternatives.length > 0) {
            setAlternatives(allAlternatives);
            console.log('[Watch] Alternatives set:', allAlternatives.length, 'with', allAlternatives.filter(a => a.hash).length, 'hashes');
          }

          // Store subtitles
          if (data.subtitles && data.subtitles.length > 0) {
            setSubtitles(data.subtitles.map((s: { id: string; language: string; url: string }) => ({
              id: s.id,
              label: s.language || 'Unknown',
              url: s.url,
            })));
            console.log('[Watch] Subtitles set:', data.subtitles.length);
          }
        } else {
          setError('No stream available');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stream');
      } finally {
        setIsLoading(false);
      }
    }

    // Fetch metadata and episodes for series
    async function fetchMeta() {
      try {
        const response = await fetch(`/api/meta/${type}/${id}`);
        const data = await response.json();
        if (data.data?.name) {
          setTitle(data.data.name);
        }
        if (data.data?.poster) {
          setPoster(data.data.poster);
        }

        // For series, extract seasons and episodes from metadata
        if ((type === 'series' || type === 'anime') && data.data?.videos) {
          const episodeMap = new Map<number, { episode: number; title?: string; overview?: string; thumbnail?: string }[]>();

          for (const video of data.data.videos) {
            if (video.season && video.episode) {
              if (!episodeMap.has(video.season)) {
                episodeMap.set(video.season, []);
              }
              episodeMap.get(video.season)!.push({
                episode: video.episode,
                title: video.title || video.name,
                overview: video.overview,
                thumbnail: video.thumbnail,
              });
            }
          }

          // Convert to sorted array
          const seasonsArray = Array.from(episodeMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([seasonNum, episodes]) => ({
              season: seasonNum,
              episodes: episodes.sort((a, b) => a.episode - b.episode),
            }));

          setSeasons(seasonsArray);
        }
      } catch {
        // Ignore
      }
    }

    // Fetch resume position from watch history
    async function fetchResumePosition() {
      try {
        const response = await fetch('/api/history');
        if (response.ok) {
          const data = await response.json();
          const items = data.data || [];
          // Find matching history entry
          const historyItem = items.find((item: any) => {
            if (item.contentId !== id) return false;
            if (season && episode) {
              return item.season === parseInt(season) && item.episode === parseInt(episode);
            }
            return !item.season && !item.episode;
          });

          if (historyItem && historyItem.position > 0) {
            // Rewind 10 seconds for context, but not below 0
            const resumePosition = Math.max(0, historyItem.position - 10);
            setStartTime(resumePosition);
            console.log('[Watch] Resume position:', resumePosition, '(was', historyItem.position, ')');
          }
        }
      } catch {
        // Ignore
      }
    }

    // Fetch preferences
    async function fetchPreferences() {
      try {
        const response = await fetch('/api/user/preferences');
        if (response.ok) {
          const data = await response.json();
          if (data.preferences?.subtitleLang) {
            setSubtitleLang(data.preferences.subtitleLang);
          }
        }
      } catch {
        // Ignore
      }
    }

    init();
    fetchMeta();
    fetchResumePosition();
    fetchPreferences();
  }, [urlParam, type, id, season, episode]);

  // ─────────────────────────────────────────────────────────────
  // Render States
  // ─────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading stream...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-lg text-destructive">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 text-primary hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!streamUrl) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <p className="text-muted-foreground">No stream available</p>
      </div>
    );
  }

  const normalizedType = type === 'anime' ? 'series' : type as 'movie' | 'series';

  // Episode subtitle text
  const episodeSubtitle = season && episode ? `S${season} E${episode}` : undefined;

  // Handle back navigation
  const handleBack = () => {
    router.back();
  };

  // Handle episode selection from sidebar
  const handleEpisodeSelect = (newSeason: number, newEpisode: number) => {
    // Save current progress before navigating
    if (progressDataRef.current && title) {
      saveProgressToServer(progressDataRef.current.time, progressDataRef.current.duration);
    }
    // Navigate to the new episode URL - this will reload with new stream
    router.push(`/watch/${id}?type=${type}&season=${newSeason}&episode=${newEpisode}`);
  };

  return (
    <WatchTogetherProvider>
      <div className="h-screen w-screen bg-black">
        <VideoPlayer
          src={streamUrl}
          title={title}
          subtitle={episodeSubtitle}
          poster={poster}
          type={normalizedType}
          seasons={seasons}
          currentSeason={season ? parseInt(season) : 1}
          currentEpisode={episode ? parseInt(episode) : 1}
          onEpisodeSelect={handleEpisodeSelect}
          onBack={handleBack}
          onProgress={handleProgress}
          startTime={startTime}
          autoplay
          // Quality switching disabled for now - default 1080p
          alternatives={[]}
          onQualityChange={() => { }}
          // Subtitles from API
          subtitles={subtitles}
        />
      </div>
    </WatchTogetherProvider>
  );
}
