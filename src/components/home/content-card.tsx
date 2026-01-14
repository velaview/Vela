'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Plus, ChevronDown, Check, Loader2, X, History as HistoryIcon, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useContentCache } from '@/store/content-cache';
import { TrailerPlayer } from '@/components/content/trailer-player';
import { useWatchHistory } from '@/store/watch-history';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ContentCardProps {
  id: string;
  title: string;
  type: 'movie' | 'series' | 'anime';
  poster?: string;
  backdrop?: string;
  year?: number;
  rating?: number;
  runtime?: string;
  genres?: string[];
  progress?: number;
  priority?: boolean;
  rank?: number;
  className?: string;
  initialInList?: boolean;
  trailer?: string;
}

interface Stream {
  url?: string;
  infoHash?: string;
  fileIdx?: number;
  name?: string;
  title?: string;
  description?: string;
}

// Stream filtering helpers
function parseStreamQuality(stream: Stream): number {
  const name = stream.name || stream.title || '';
  const description = stream.description || '';
  const fullText = `${name} ${description}`.toLowerCase();

  if (fullText.includes('2160p') || fullText.includes('4k')) return 2160;
  if (fullText.includes('1080p')) return 1080;
  if (fullText.includes('720p')) return 720;
  if (fullText.includes('480p')) return 480;
  return 0;
}

function isMP4Stream(stream: Stream): boolean {
  const name = stream.name || stream.title || '';
  const description = stream.description || '';
  const fullText = `${name} ${description}`.toLowerCase();
  return fullText.includes('.mp4') || fullText.includes('mp4');
}

function isCachedStream(stream: Stream): boolean {
  const name = stream.name || stream.title || '';
  const description = stream.description || '';
  const fullText = `${name} ${description}`.toLowerCase();
  return /cached|⚡|instant/i.test(fullText);
}

function isMKVStream(stream: Stream): boolean {
  const name = stream.name || stream.title || '';
  const description = stream.description || '';
  const fullText = `${name} ${description}`.toLowerCase();
  return fullText.includes('.mkv') || fullText.includes('mkv');
}

function filterAndSortStreams(streams: Stream[]): Stream[] {
  const filtered = streams.filter(stream => {
    if (stream.url === '#' || (!stream.url && !stream.infoHash)) return false;
    const resolution = parseStreamQuality(stream);
    return resolution === 0 || resolution <= 1080;
  });

  return filtered.sort((a, b) => {
    const aCached = isCachedStream(a) ? 1 : 0;
    const bCached = isCachedStream(b) ? 1 : 0;
    if (aCached !== bCached) return bCached - aCached;

    const aFormat = isMP4Stream(a) ? 2 : isMKVStream(a) ? 1 : 0;
    const bFormat = isMP4Stream(b) ? 2 : isMKVStream(b) ? 1 : 0;
    if (aFormat !== bFormat) return bFormat - aFormat;

    return parseStreamQuality(b) - parseStreamQuality(a);
  });
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function ContentCard({
  id,
  title,
  type,
  poster,
  backdrop,
  year,
  rating,
  runtime,
  genres,
  progress,
  priority = false,
  rank,
  className,
  initialInList = false,
  trailer,
}: ContentCardProps) {
  const router = useRouter();
  const cache = useContentCache();
  const { getItem } = useWatchHistory();
  const [isHovered, setIsHovered] = useState(false);
  const [isInList, setIsInList] = useState(initialInList);
  const [isAddingToList, setIsAddingToList] = useState(false);
  const [hasCheckedList, setHasCheckedList] = useState(false);
  const [isLoadingPlay, setIsLoadingPlay] = useState(false);
  const [imageError, setImageError] = useState(false);

  const [showTrailer, setShowTrailer] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [meta, setMeta] = useState<any>(null);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const detailsTimeout = useRef<NodeJS.Timeout | null>(null);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // Kept for now to avoid breaking other logic if any, but will remove usage

  // Handle hover for trailer and details
  useEffect(() => {
    if (isHovered) {
      hoverTimeout.current = setTimeout(() => {
        if (trailer) setShowTrailer(true);
      }, 1000);

      detailsTimeout.current = setTimeout(() => {
        setShowDetails(true);
        if (!meta) {
          fetch(`/api/meta/${type}/${id}`)
            .then(res => res.json())
            .then(data => setMeta(data.data))
            .catch(() => { });
        }
      }, 400); // Faster hover response
    } else {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
      if (detailsTimeout.current) clearTimeout(detailsTimeout.current);
      setShowTrailer(false);
      setShowDetails(false);
    }
    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
      if (detailsTimeout.current) clearTimeout(detailsTimeout.current);
    };
  }, [isHovered, trailer, id, type, meta]);

  const handleMouseMove = (e: React.MouseEvent) => {
    // No longer tracking mouse position for details overlay
  };

  // Check if item is in library on hover
  useEffect(() => {
    if (isHovered && !hasCheckedList) {
      async function checkLibrary() {
        try {
          const response = await fetch(`/api/library/${id}`);
          if (response.ok) {
            const data = await response.json();
            setIsInList(data.data?.inLibrary || false);
          }
        } catch (error) { }
        setHasCheckedList(true);
      }
      checkLibrary();
    }
  }, [isHovered, hasCheckedList, id]);

  const handleAddToList = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAddingToList) return;
    setIsAddingToList(true);
    try {
      if (isInList) {
        const response = await fetch(`/api/library/${id}`, { method: 'DELETE' });
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
          body: JSON.stringify({ contentId: id, contentType: type, title, poster }),
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

  const handleShowDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/${type}/${id}`);
  };

  const handlePlay = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoadingPlay(true);

    try {
      const { playButtonService } = await import('@/core/player/play.service');

      // For series, check watch history for resume point
      let season, episode;
      if (type === 'series' || type === 'anime') {
        const historyItem = getItem(id);
        season = historyItem?.season || 1;
        episode = historyItem?.episode || 1;
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
        toast.error('No suitable streams found. Opening details...');
        router.push(`/${type}/${id}`);
      }
    } catch (error) {
      console.error('[ContentCard] Play failed:', error);
      toast.error('Failed to load streams');
      router.push(`/${type}/${id}`);
    } finally {
      setIsLoadingPlay(false);
    }
  };

  return (
    <div
      className={cn(
        'group relative flex-shrink-0',
        rank ? 'w-28 md:w-32' : 'w-32 md:w-40',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
    >
      {rank && (
        <div className="absolute -left-4 bottom-0 z-10 text-7xl font-bold text-foreground/20 md:-left-6 md:text-8xl">
          {rank}
        </div>
      )}

      <Link href={`/${type}/${id}`} className="block">
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'relative overflow-hidden rounded-md bg-muted transition-shadow',
            rank ? 'ml-6 aspect-[2/3]' : 'aspect-[2/3]',
            isHovered && 'shadow-xl shadow-black/50'
          )}
        >
          {poster && !imageError ? (
            <Image
              src={poster}
              alt={title}
              fill
              priority={priority}
              className="object-cover"
              sizes="(max-width: 768px) 128px, 160px"
              onError={() => setImageError(true)}
              unoptimized={poster.includes('hanime-cdn.com')}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20">
              <span className="text-center text-xs text-muted-foreground px-2">{title}</span>
            </div>
          )}

          {showTrailer && trailer && (
            <div className="absolute inset-0 z-0 bg-black">
              <TrailerPlayer
                url={trailer}
                isPlaying={showTrailer}
                muted={true}
                className="pointer-events-none opacity-100 transition-opacity duration-500"
              />
            </div>
          )}

          {progress !== undefined && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted-foreground/30">
              <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-3"
          >
            <h3 className="text-sm font-bold text-white line-clamp-1">{title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold text-green-400">{rating ? `${(rating * 10).toFixed(0)}% Match` : 'New'}</span>
              <span className="text-[10px] text-gray-300 border border-gray-500 px-1 rounded">{type === 'movie' ? 'Movie' : 'TV'}</span>
              {year && <span className="text-[10px] text-gray-300">{year}</span>}
            </div>
          </motion.div>
        </motion.div>
      </Link>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-[110%] w-72 bg-[#0f0f0f]/95 backdrop-blur-2xl rounded-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden pointer-events-auto z-[100]"
          >
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-lg text-white tracking-tight line-clamp-1">{title}</h4>
                  {rating && (
                    <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                      <span className="text-xs font-bold text-yellow-500">{rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <span className="text-primary">{type}</span>
                  <span>•</span>
                  <span>{year || meta?.releaseInfo?.split('-')[0]}</span>
                  {meta?.runtime && (
                    <>
                      <span>•</span>
                      <span>{meta.runtime}</span>
                    </>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed font-medium">
                {meta?.description || 'Loading description...'}
              </p>

              <div className="flex flex-wrap gap-1.5">
                {(meta?.genres || genres || []).slice(0, 3).map((g: string) => (
                  <span key={g} className="text-[9px] px-2.5 py-1 rounded-lg bg-white/5 text-gray-300 font-bold border border-white/5">
                    {g}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  className="flex-1 h-10 rounded-xl bg-white text-black hover:bg-white/90 font-bold gap-2 shadow-lg shadow-white/10"
                  onClick={handlePlay}
                  disabled={isLoadingPlay}
                >
                  {isLoadingPlay ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                  Play Now
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 transition-all"
                  onClick={handleAddToList}
                  disabled={isAddingToList}
                >
                  {isAddingToList ? <Loader2 className="h-4 w-4 animate-spin" /> : isInList ? <Check className="h-4 w-4 text-green-400" /> : <Plus className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 transition-all"
                  onClick={handleShowDetails}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
