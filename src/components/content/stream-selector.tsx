'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Play,
  Loader2,
  Zap,
  HardDrive,
  Film,
  Tv,
  Download,
  Link as LinkIcon,
  Server,
  FileVideo,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Stream {
  url?: string;
  infoHash?: string;
  fileIdx?: number;
  name?: string;
  title?: string;
  description?: string;
  behaviorHints?: {
    notWebReady?: boolean;
    bingeGroup?: string;
  };
}

interface StreamSelectorProps {
  type: string;
  id: string;
  title: string;
  season?: number;
  episode?: number;
  onClose: () => void;
}

interface ParsedStreamInfo {
  name: string;
  quality: string | null;
  size: string | null;
  isCached: boolean;
  source: string | null;
  codec: string | null;
  mediaType: string | null;
  isWebReady: boolean;
  seeders: number | null;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function parseStreamInfo(stream: Stream): ParsedStreamInfo {
  const name = stream.name || stream.title || 'Unknown';
  const description = stream.description || '';
  const fullText = `${name} ${description}`.toLowerCase();

  // Extract quality (resolution)
  const qualityMatch = fullText.match(/(\d{3,4}p|4k|2160p|uhd)/i);
  let quality = qualityMatch ? qualityMatch[1].toUpperCase() : null;
  if (quality === '2160P' || quality === 'UHD') quality = '4K';

  // Extract HDR info
  const hdrMatch = fullText.match(/(hdr10\+?|dolby\s*vision|dv|hdr)/i);
  if (hdrMatch && quality) {
    quality = `${quality} ${hdrMatch[1].toUpperCase()}`;
  }

  // Extract size
  const sizeMatch = fullText.match(/(\d+\.?\d*)\s*(gb|mb|tb)/i);
  const size = sizeMatch ? `${sizeMatch[1]} ${sizeMatch[2].toUpperCase()}` : null;

  // Check if cached
  const isCached = /cached|⚡|instant/i.test(fullText);

  // Extract source/provider
  const sourcePatterns = [
    /\[([^\]]+)\]/,  // [Source]
    /^([A-Za-z0-9]+):/,  // Source:
  ];
  let source: string | null = null;
  for (const pattern of sourcePatterns) {
    const match = name.match(pattern);
    if (match) {
      source = match[1];
      break;
    }
  }

  // Extract codec
  const codecMatch = fullText.match(/(x264|x265|hevc|h\.?264|h\.?265|av1|xvid|divx)/i);
  const codec = codecMatch ? codecMatch[1].toUpperCase().replace('X', 'x') : null;

  // Determine media type from file extension or description
  let mediaType: string | null = null;
  if (/\.mp4|mp4/i.test(fullText)) mediaType = 'MP4';
  else if (/\.mkv|mkv/i.test(fullText)) mediaType = 'MKV';
  else if (/\.avi|avi/i.test(fullText)) mediaType = 'AVI';
  else if (/\.webm|webm/i.test(fullText)) mediaType = 'WebM';
  else if (/\.m3u8|m3u8/i.test(fullText)) mediaType = 'HLS';
  else if (/torrent|magnet/i.test(fullText) || stream.infoHash) mediaType = 'Torrent';

  // Check if web-ready (can play directly in browser)
  const isWebReady = !stream.behaviorHints?.notWebReady &&
    (mediaType === 'MP4' || mediaType === 'WebM' || !!stream.url);

  // Extract seeders if available
  const seedersMatch = fullText.match(/(\d+)\s*(?:seeders?|seeds?|👤)/i);
  const seeders = seedersMatch ? parseInt(seedersMatch[1]) : null;

  return {
    name,
    quality,
    size,
    isCached,
    source,
    codec,
    mediaType,
    isWebReady,
    seeders
  };
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function StreamSelector({
  type,
  id,
  title,
  season,
  episode,
  onClose,
}: StreamSelectorProps) {
  const router = useRouter();
  const [primaryStream, setPrimaryStream] = useState<any | null>(null);
  const [alternatives, setAlternatives] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStreams() {
      try {
        let streamId = id;
        if (season !== undefined && episode !== undefined) {
          streamId = `${id}:${season}:${episode}`;
        }

        const response = await fetch(`/api/streams/${type}/${streamId}`);
        const json = await response.json();

        if (json.data && !Array.isArray(json.data)) {
          // New format: { primary, alternatives }
          setPrimaryStream(json.data.primary);
          setAlternatives(json.data.alternatives || []);
        } else {
          // Fallback for old format or empty
          setAlternatives(json.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch streams:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStreams();
  }, [type, id, season, episode]);

  const handleSelectStream = (stream: Stream | any, isPrimary = false) => {
    // Navigate to watch page with stream info
    const params = new URLSearchParams();

    if (isPrimary && stream.url) {
      // Primary is already resolved
      params.set('url', stream.url);
    } else {
      if (stream.url && stream.url.startsWith('http')) {
        params.set('url', stream.url);
      } else if (stream.infoHash) {
        params.set('hash', stream.infoHash);
        if (stream.fileIdx !== undefined) {
          params.set('fileIdx', stream.fileIdx.toString());
        }
      }
    }

    const query = new URLSearchParams();
    query.set('type', type);
    if (season !== undefined) query.set('season', season.toString());
    if (episode !== undefined) query.set('episode', episode.toString());

    // Add stream params
    params.forEach((value, key) => query.set(key, value));

    router.push(`/watch/${id}?${query.toString()}`);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-2xl rounded-lg bg-card shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-4 flex-shrink-0">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold">Select Stream</h2>
              <p className="text-sm text-muted-foreground truncate">{title}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0 ml-2">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content - Scrollable */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="mt-4 text-sm text-muted-foreground">Fetching streams...</p>
                </div>
              ) : (!primaryStream && alternatives.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="font-medium">No streams available</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try installing more addons or check your TorBox subscription
                  </p>
                  <Button variant="outline" className="mt-4" asChild>
                    <a href="/addons">Manage Addons</a>
                  </Button>
                </div>
              ) : (
                <>
                  {/* Best Match Section */}
                  {primaryStream && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        Best Match
                      </h3>
                      <button
                        onClick={() => handleSelectStream(primaryStream, true)}
                        className="flex w-full items-start gap-4 rounded-xl border border-primary/50 bg-primary/5 p-4 text-left transition-all hover:bg-primary/10 relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                          <Play className="h-6 w-6 ml-1" />
                        </div>

                        <div className="flex-1 min-w-0 z-10">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-primary hover:bg-primary">Recommended</Badge>
                            {primaryStream.quality && (
                              <Badge variant="outline" className="border-primary/30 text-primary">
                                {primaryStream.quality}
                              </Badge>
                            )}
                          </div>
                          <p className="font-semibold text-lg leading-tight line-clamp-1">
                            {primaryStream.filename}
                          </p>
                          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3 text-yellow-500" />
                              Instant Play
                            </span>
                            {primaryStream.source && (
                              <span className="flex items-center gap-1">
                                <LinkIcon className="h-3 w-3" />
                                {primaryStream.source}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Alternatives Section */}
                  {alternatives.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Alternative Sources ({alternatives.length})
                      </h3>
                      <div className="space-y-2">
                        {alternatives.map((stream, index) => {
                          const info = parseStreamInfo(stream);

                          return (
                            <button
                              key={index}
                              onClick={() => handleSelectStream(stream)}
                              className={cn(
                                "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all hover:bg-accent",
                                info.isCached
                                  ? "border-green-500/30 bg-green-500/5"
                                  : "border-border"
                              )}
                            >
                              <div className={cn(
                                "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                                info.isCached ? "bg-green-500/20" : "bg-muted"
                              )}>
                                {info.isCached ? (
                                  <Zap className="h-5 w-5 text-green-500" />
                                ) : (
                                  <Download className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0 overflow-hidden">
                                <p className="font-medium text-sm leading-tight line-clamp-2">
                                  {info.name}
                                </p>

                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  {info.quality && (
                                    <Badge
                                      variant="secondary"
                                      className={cn(
                                        "text-xs",
                                        info.quality.includes('4K') && "bg-purple-500/20 text-purple-400",
                                        info.quality.includes('1080') && "bg-blue-500/20 text-blue-400",
                                        info.quality.includes('HDR') && "bg-amber-500/20 text-amber-400"
                                      )}
                                    >
                                      {info.quality}
                                    </Badge>
                                  )}
                                  {info.isCached && (
                                    <Badge variant="default" className="gap-1 text-xs bg-green-600 hover:bg-green-700">
                                      <Zap className="h-3 w-3" />
                                      Cached
                                    </Badge>
                                  )}
                                  {info.codec && (
                                    <span className="text-xs text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                                      {info.codec}
                                    </span>
                                  )}
                                  {info.seeders !== null && info.seeders > 0 && (
                                    <span className="flex items-center gap-1 text-xs text-green-500 ml-auto">
                                      👤 {info.seeders}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-border px-4 py-3 bg-muted/30 flex-shrink-0">
            <p className="text-xs text-muted-foreground text-center">
              💡 Cached streams play instantly. Non-cached torrents require download.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
