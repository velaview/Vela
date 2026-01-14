'use client';

import { useRef, useEffect, useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    Volume1,
    Maximize,
    Minimize,
    SkipBack,
    SkipForward,
    ArrowLeft,
    Loader2,
    Settings,
    List,
    Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePlayer } from './use-player';
import { SettingsMenu } from './components/SettingsMenu';
import { EpisodeSidebar } from './components/EpisodeSidebar';
import { SubtitleDisplay } from './components/SubtitleDisplay';
import { useWatchRoomStore, useSyncCorrection } from '@/store/watch-room-store';

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

interface SubtitleTrack {
    id: string;
    label: string;
    url?: string;
}

interface SubtitleCue {
    start: number;
    end: number;
    text: string;
}

interface StreamAlternative {
    id: string;
    quality: string;
    title: string;
    url?: string;
    hash?: string;
    magnet?: string;
}

interface VideoPlayerProps {
    src: string;
    title?: string;
    subtitle?: string;
    poster?: string;
    autoplay?: boolean;
    startTime?: number;
    // Content info for series
    type?: 'movie' | 'series' | 'anime';
    seasons?: Season[];
    currentSeason?: number;
    currentEpisode?: number;
    onEpisodeSelect?: (season: number, episode: number) => void;
    // Subtitles
    subtitles?: SubtitleTrack[];
    subtitleCues?: SubtitleCue[];
    // Stream alternatives for quality switching
    alternatives?: StreamAlternative[];
    onQualityChange?: (alt: StreamAlternative) => void;
    // Callbacks
    onProgress?: (time: number, duration: number) => void;
    onEnded?: () => void;
    onBack?: () => void;
    // Watch Together
    onWatchTogether?: () => void;
    isWatchTogether?: boolean;
    className?: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export function VideoPlayer({
    src,
    title,
    subtitle,
    poster,
    autoplay = true,
    startTime,
    type,
    seasons = [],
    currentSeason = 1,
    currentEpisode = 1,
    onEpisodeSelect,
    subtitles = [],
    subtitleCues = [],
    alternatives = [],
    onQualityChange,
    onProgress,
    onEnded,
    onBack,
    onWatchTogether,
    isWatchTogether = false,
    className,
}: VideoPlayerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // UI State
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showPlayPauseOverlay, setShowPlayPauseOverlay] = useState<'play' | 'pause' | null>(null);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [showEpisodeSidebar, setShowEpisodeSidebar] = useState(false);
    const [selectedSeason, setSelectedSeason] = useState(currentSeason);

    // Settings State
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [currentSubtitle, setCurrentSubtitle] = useState<string | null>(null);

    // Player hook
    const { state, actions, player } = usePlayer(videoRef, {
        src,
        autoplay,
        startTime,
        onProgress,
        onEnded,
    });

    // Watch Together Store Actions
    const {
        isConnected,
        play: roomPlay,
        pause: roomPause,
        seek: roomSeek
    } = useWatchRoomStore();

    // ─────────────────────────────────────────────────────────
    // Watch Together Sync
    // ─────────────────────────────────────────────────────────

    useSyncCorrection(videoRef);

    // ─────────────────────────────────────────────────────────
    // Controls Visibility
    // ─────────────────────────────────────────────────────────

    const showControlsTemporarily = useCallback(() => {
        setShowControls(true);
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
        hideTimeoutRef.current = setTimeout(() => {
            if (state.isPlaying && !showSettingsMenu && !showEpisodeSidebar) {
                setShowControls(false);
            }
        }, 3000);
    }, [state.isPlaying, showSettingsMenu, showEpisodeSidebar]);

    const handleMouseMove = useCallback(() => {
        showControlsTemporarily();
    }, [showControlsTemporarily]);

    const handleMouseLeave = useCallback(() => {
        if (state.isPlaying && !showSettingsMenu && !showEpisodeSidebar) {
            setShowControls(false);
        }
    }, [state.isPlaying, showSettingsMenu, showEpisodeSidebar]);

    // Keep controls visible when menus are open
    useEffect(() => {
        if (showSettingsMenu || showEpisodeSidebar) {
            setShowControls(true);
        }
    }, [showSettingsMenu, showEpisodeSidebar]);

    // ─────────────────────────────────────────────────────────
    // Fullscreen
    // ─────────────────────────────────────────────────────────

    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // ─────────────────────────────────────────────────────────
    // Keyboard Controls
    // ─────────────────────────────────────────────────────────

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;

            switch (e.key) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    handlePlayPauseClick();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    const leftSeekPos = Math.max(0, state.currentTime - 10);
                    if (isConnected) {
                        roomSeek(leftSeekPos);
                    } else {
                        actions.seekRelative(-10);
                    }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    const rightSeekPos = Math.min(state.duration, state.currentTime + 10);
                    if (isConnected) {
                        roomSeek(rightSeekPos);
                    } else {
                        actions.seekRelative(10);
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    actions.setVolume(Math.min(1, state.volume + 0.1));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    actions.setVolume(Math.max(0, state.volume - 0.1));
                    break;
                case 'm':
                    actions.toggleMute();
                    break;
                case 'f':
                    toggleFullscreen();
                    break;
                case 'Escape':
                    setShowSettingsMenu(false);
                    setShowEpisodeSidebar(false);
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [actions, state.volume, toggleFullscreen]);

    // ─────────────────────────────────────────────────────────
    // Playback Speed
    // ─────────────────────────────────────────────────────────

    const handleSpeedChange = useCallback((speed: number) => {
        setPlaybackSpeed(speed);
        actions.setPlaybackRate(speed);
    }, [actions]);

    // ─────────────────────────────────────────────────────────
    // Play/Pause with Overlay
    // ─────────────────────────────────────────────────────────

    const handlePlayPauseClick = useCallback(() => {
        if (isConnected) {
            if (state.isPlaying) {
                roomPause(state.currentTime);
            } else {
                roomPlay(state.currentTime);
            }
        } else {
            actions.togglePlay();
        }
        setShowPlayPauseOverlay(state.isPlaying ? 'pause' : 'play');
        setTimeout(() => setShowPlayPauseOverlay(null), 600);
    }, [actions, isConnected, state.isPlaying, state.currentTime, roomPlay, roomPause]);

    // ─────────────────────────────────────────────────────────
    // Progress Bar Click
    // ─────────────────────────────────────────────────────────

    const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const targetTime = percent * state.duration;

        if (isConnected) {
            roomSeek(targetTime);
        } else {
            actions.seek(targetTime);
        }
    }, [actions, isConnected, state.duration, roomSeek]);

    // ─────────────────────────────────────────────────────────
    // Episode Select
    // ─────────────────────────────────────────────────────────

    const handleEpisodeSelect = useCallback((season: number, episode: number) => {
        setShowEpisodeSidebar(false);
        onEpisodeSelect?.(season, episode);
    }, [onEpisodeSelect]);

    const isSeries = type === 'series' || type === 'anime';

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative w-full h-full bg-black overflow-hidden group",
                className
            )}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-contain"
                poster={poster}
                playsInline
            />

            {/* Subtitles */}
            {subtitleCues.length > 0 && currentSubtitle && (
                <SubtitleDisplay
                    currentTime={state.currentTime}
                    cues={subtitleCues}
                    isFullscreen={isFullscreen}
                />
            )}

            {/* Loading Spinner */}
            <AnimatePresence>
                {state.isBuffering && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center z-20"
                    >
                        <Loader2 className="h-16 w-16 text-primary animate-spin" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Play/Pause Center Overlay */}
            <AnimatePresence>
                {showPlayPauseOverlay && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
                    >
                        <div className="rounded-full bg-black/50 p-6">
                            {showPlayPauseOverlay === 'play' ? (
                                <Play className="h-12 w-12 text-white fill-current" />
                            ) : (
                                <Pause className="h-12 w-12 text-white fill-current" />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Large Center Play Button (when paused) */}
            {!state.isPlaying && state.isReady && !state.isBuffering && (
                <button
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/90 p-6 transition-transform hover:scale-110 z-10"
                    onClick={handlePlayPauseClick}
                >
                    <Play className="h-12 w-12 fill-current text-primary-foreground" />
                </button>
            )}

            {/* Click to play/pause (not on sidebar area) */}
            <div
                className="absolute inset-0 z-5"
                onClick={(e) => {
                    // Don't trigger if clicking on sidebar area
                    const rect = e.currentTarget.getBoundingClientRect();
                    if (e.clientX < rect.right - 400 || !showEpisodeSidebar) {
                        handlePlayPauseClick();
                    }
                }}
            />

            {/* Controls Overlay */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 z-40 pointer-events-none"
                    >
                        {/* Gradient overlays */}
                        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 to-transparent" />

                        {/* Top Bar */}
                        <div className="absolute inset-x-0 top-0 flex items-center gap-4 p-4 pointer-events-auto">
                            {onBack && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-white hover:bg-white/20"
                                    onClick={onBack}
                                >
                                    <ArrowLeft className="h-6 w-6" />
                                </Button>
                            )}
                            <div className="flex-1 min-w-0">
                                {title && (
                                    <h1 className="text-lg font-semibold text-white truncate">
                                        {title}
                                    </h1>
                                )}
                                {subtitle && (
                                    <p className="text-sm text-white/70 truncate">{subtitle}</p>
                                )}
                            </div>

                            {/* Right side top buttons */}
                            <div className="flex items-center gap-2">
                                {/* Episode List (for series) */}
                                {isSeries && seasons.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "text-white hover:bg-white/20",
                                            showEpisodeSidebar && "bg-white/20"
                                        )}
                                        onClick={() => setShowEpisodeSidebar(!showEpisodeSidebar)}
                                    >
                                        <List className="h-6 w-6" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Bottom Controls */}
                        <div className="absolute inset-x-0 bottom-0 p-4 space-y-2 pointer-events-auto">
                            {/* Progress Bar */}
                            <ProgressBar
                                currentTime={state.currentTime}
                                duration={state.duration}
                                buffered={state.buffered}
                                onClick={handleProgressClick}
                            />

                            {/* Control Buttons */}
                            <div className="flex items-center gap-2">
                                {/* Play/Pause */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-white hover:bg-white/20"
                                    onClick={handlePlayPauseClick}
                                >
                                    {state.isPlaying ? (
                                        <Pause className="h-6 w-6" />
                                    ) : (
                                        <Play className="h-6 w-6" />
                                    )}
                                </Button>

                                {/* Skip Back */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-white hover:bg-white/20"
                                    onClick={() => actions.seekRelative(-10)}
                                >
                                    <SkipBack className="h-5 w-5" />
                                </Button>

                                {/* Skip Forward */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-white hover:bg-white/20"
                                    onClick={() => actions.seekRelative(10)}
                                >
                                    <SkipForward className="h-5 w-5" />
                                </Button>

                                {/* Volume */}
                                <VolumeControl
                                    volume={state.volume}
                                    isMuted={state.isMuted}
                                    onVolumeChange={actions.setVolume}
                                    onToggleMute={actions.toggleMute}
                                />

                                {/* Time Display */}
                                <span className="text-sm text-white font-mono ml-2">
                                    {formatTime(state.currentTime)} / {formatTime(state.duration)}
                                </span>

                                {/* Spacer */}
                                <div className="flex-1" />

                                {/* Watch Together */}
                                {onWatchTogether && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "text-white hover:bg-white/20",
                                            isWatchTogether && "text-primary"
                                        )}
                                        onClick={onWatchTogether}
                                    >
                                        <Users className="h-5 w-5" />
                                    </Button>
                                )}

                                {/* Settings */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "text-white hover:bg-white/20",
                                        showSettingsMenu && "bg-white/20"
                                    )}
                                    onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                                >
                                    <Settings className="h-5 w-5" />
                                </Button>

                                {/* Fullscreen */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-white hover:bg-white/20"
                                    onClick={toggleFullscreen}
                                >
                                    {isFullscreen ? (
                                        <Minimize className="h-6 w-6" />
                                    ) : (
                                        <Maximize className="h-6 w-6" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Settings Menu */}
            <SettingsMenu
                isOpen={showSettingsMenu}
                onClose={() => setShowSettingsMenu(false)}
                // Use alternatives as quality sources if available, otherwise HLS levels
                qualities={alternatives.length > 0
                    ? [...new Set(alternatives.map(a => a.quality))]  // Unique qualities from alternatives
                    : state.qualities
                }
                currentQuality={state.currentQuality}
                onQualityChange={(quality) => {
                    // If we have alternatives, find the first one matching this quality and switch
                    if (alternatives.length > 0) {
                        const alt = alternatives.find(a => a.quality === quality);
                        if (alt && onQualityChange) {
                            onQualityChange(alt);
                        }
                    } else {
                        // Otherwise use HLS quality switching
                        actions.setQuality(quality);
                    }
                }}
                audioTracks={state.audioTracks}
                currentAudioTrack={state.currentAudioTrack}
                onAudioChange={actions.setAudioTrack}
                playbackSpeed={playbackSpeed}
                onSpeedChange={handleSpeedChange}
                subtitles={subtitles.map(s => ({ id: s.id, label: s.label }))}
                currentSubtitle={currentSubtitle}
                onSubtitleChange={setCurrentSubtitle}
            />

            {/* Episode Sidebar */}
            <EpisodeSidebar
                isOpen={showEpisodeSidebar}
                onClose={() => setShowEpisodeSidebar(false)}
                title={title}
                seasons={seasons}
                currentSeason={currentSeason}
                currentEpisode={currentEpisode}
                selectedSeason={selectedSeason}
                onSeasonChange={setSelectedSeason}
                onEpisodeSelect={handleEpisodeSelect}
            />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

const ProgressBar = memo(function ProgressBar({
    currentTime,
    duration,
    buffered,
    onClick,
}: {
    currentTime: number;
    duration: number;
    buffered: number;
    onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const bufferedProgress = duration > 0 ? (buffered / duration) * 100 : 0;

    return (
        <div
            className="group/progress relative h-6 flex items-center cursor-pointer"
            onClick={onClick}
        >
            <div className="absolute inset-x-0 h-1 bg-white/30 rounded-full group-hover/progress:h-1.5 transition-all">
                {/* Buffered */}
                <div
                    className="absolute inset-y-0 left-0 bg-white/50 rounded-full"
                    style={{ width: `${bufferedProgress}%` }}
                />
                {/* Progress */}
                <div
                    className="absolute inset-y-0 left-0 bg-primary rounded-full"
                    style={{ width: `${progress}%` }}
                />
            </div>
            {/* Handle */}
            <div
                className="absolute h-3 w-3 bg-primary rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-lg"
                style={{ left: `calc(${progress}% - 6px)` }}
            />
        </div>
    );
});

const VolumeControl = memo(function VolumeControl({
    volume,
    isMuted,
    onVolumeChange,
    onToggleMute,
}: {
    volume: number;
    isMuted: boolean;
    onVolumeChange: (volume: number) => void;
    onToggleMute: () => void;
}) {
    const displayVolume = isMuted ? 0 : volume;
    const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

    return (
        <div className="flex items-center gap-1 group/volume">
            <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={onToggleMute}
            >
                <VolumeIcon className="h-5 w-5" />
            </Button>
            <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-200">
                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={displayVolume}
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-1 accent-primary cursor-pointer"
                />
            </div>
        </div>
    );
});
