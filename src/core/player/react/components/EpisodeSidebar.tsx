'use client';

import { memo, useRef, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, ChevronRight, Loader2 } from 'lucide-react';
import NextImage from 'next/image';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Episode {
    episode: number;
    title?: string;
    overview?: string;
    thumbnail?: string;
}

interface Season {
    season: number;
    episodes: Episode[];
}

interface EpisodeSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    seasons: Season[];
    currentSeason: number;
    currentEpisode: number;
    selectedSeason: number;
    onSeasonChange: (season: number) => void;
    onEpisodeSelect: (season: number, episode: number) => void;
    isLoading?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export const EpisodeSidebar = memo(function EpisodeSidebar({
    isOpen,
    onClose,
    title,
    seasons,
    currentSeason,
    currentEpisode,
    selectedSeason,
    onSeasonChange,
    onEpisodeSelect,
    isLoading = false,
}: EpisodeSidebarProps) {
    const activeEpisodeRef = useRef<HTMLButtonElement>(null);

    // Scroll to active episode when sidebar opens
    useEffect(() => {
        if (isOpen && activeEpisodeRef.current) {
            setTimeout(() => {
                activeEpisodeRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 150);
        }
    }, [isOpen, selectedSeason]);

    const currentSeasonData = seasons.find(s => s.season === selectedSeason);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 z-40"
                        onClick={onClose}
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="absolute right-0 top-0 bottom-0 w-96 max-w-[90vw] bg-zinc-900/95 backdrop-blur-md border-l border-zinc-800 z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                            <div className="min-w-0">
                                <h2 className="text-lg font-semibold text-white truncate">
                                    Episodes
                                </h2>
                                {title && (
                                    <p className="text-sm text-zinc-400 truncate">{title}</p>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-zinc-400 hover:text-white hover:bg-white/10"
                                onClick={onClose}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Season Tabs */}
                        {seasons.length > 1 && (
                            <div className="px-4 py-3 border-b border-zinc-800">
                                <ScrollArea className="w-full">
                                    <Tabs
                                        value={String(selectedSeason)}
                                        onValueChange={(v) => onSeasonChange(Number(v))}
                                    >
                                        <TabsList className="bg-zinc-800/50 h-9">
                                            {seasons.map((s) => (
                                                <TabsTrigger
                                                    key={s.season}
                                                    value={String(s.season)}
                                                    className={cn(
                                                        "text-xs px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                                                        s.season === currentSeason && "ring-1 ring-primary/50"
                                                    )}
                                                >
                                                    S{s.season}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>
                                    </Tabs>
                                </ScrollArea>
                            </div>
                        )}

                        {/* Episode List */}
                        <ScrollArea className="flex-1">
                            <div className="p-4 space-y-2">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center h-40 gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        <span className="text-sm text-zinc-500">Loading episodes...</span>
                                    </div>
                                ) : currentSeasonData?.episodes.length ? (
                                    currentSeasonData.episodes.map((ep) => {
                                        const isCurrent = selectedSeason === currentSeason && ep.episode === currentEpisode;

                                        return (
                                            <EpisodeCard
                                                key={ep.episode}
                                                ref={isCurrent ? activeEpisodeRef : null}
                                                episode={ep}
                                                isCurrent={isCurrent}
                                                onClick={() => onEpisodeSelect(selectedSeason, ep.episode)}
                                            />
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-10 text-zinc-500">
                                        No episodes found.
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});

// ─────────────────────────────────────────────────────────────
// Episode Card
// ─────────────────────────────────────────────────────────────

interface EpisodeCardProps {
    episode: Episode;
    isCurrent: boolean;
    onClick: () => void;
}

const EpisodeCard = memo(forwardRef<HTMLButtonElement, EpisodeCardProps>(
    function EpisodeCard({ episode, isCurrent, onClick }, ref) {
        return (
            <button
                ref={ref}
                className={cn(
                    "group relative flex items-center gap-4 p-3 rounded-xl transition-all text-left w-full",
                    isCurrent
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-white/5 border border-transparent"
                )}
                onClick={onClick}
            >
                {/* Thumbnail */}
                <div className="relative h-14 w-24 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800">
                    {episode.thumbnail ? (
                        <NextImage
                            src={episode.thumbnail}
                            alt=""
                            fill
                            sizes="96px"
                            className="object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                            <Play className="h-5 w-5 text-zinc-600" />
                        </div>
                    )}
                    {isCurrent && (
                        <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                            <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
                                <Play className="h-3.5 w-3.5 fill-current text-white" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-sm font-bold truncate",
                            isCurrent ? "text-primary" : "text-white"
                        )}>
                            {episode.episode}. {episode.title || `Episode ${episode.episode}`}
                        </span>
                        {isCurrent && (
                            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
                        )}
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-2 mt-1">
                        {episode.overview || 'No description available.'}
                    </p>
                </div>

                <ChevronRight className={cn(
                    "h-4 w-4 flex-shrink-0 transition-transform",
                    isCurrent ? "text-primary" : "text-zinc-600 group-hover:translate-x-1"
                )} />
            </button>
        );
    }
));
