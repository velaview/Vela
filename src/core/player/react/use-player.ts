'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { HlsPlayer, type PlayerEvents } from '../hls-player';
import type { PlayerConfig } from '../player-factory';

export interface UsePlayerState {
    isReady: boolean;
    isPlaying: boolean;
    isBuffering: boolean;
    currentTime: number;
    duration: number;
    buffered: number;
    volume: number;
    isMuted: boolean;
    currentQuality: number;
    qualities: string[];
    audioTracks: { id: string; label: string }[];
    currentAudioTrack: number;
    error: Error | null;
}

export interface UsePlayerActions {
    play: () => Promise<void>;
    pause: () => void;
    togglePlay: () => void;
    seek: (time: number) => void;
    seekRelative: (delta: number) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    setQuality: (quality: string) => void;
    setAudioTrack: (id: string) => void;
    setPlaybackRate: (rate: number) => void;
}

export interface UsePlayerOptions {
    src: string;
    autoplay?: boolean;
    startTime?: number;
    onProgress?: (time: number, duration: number) => void;
    onEnded?: () => void;
    onError?: (error: Error) => void;
}

/**
 * React hook for controlling the HLS player.
 * Provides clean state management and actions without bloat.
 */
export function usePlayer(
    videoRef: React.RefObject<HTMLVideoElement | null>,
    options: UsePlayerOptions
): { state: UsePlayerState; actions: UsePlayerActions; player: HlsPlayer | null } {
    const playerRef = useRef<HlsPlayer | null>(null);
    const initializedRef = useRef(false);

    const [state, setState] = useState<UsePlayerState>({
        isReady: false,
        isPlaying: false,
        isBuffering: false,
        currentTime: 0,
        duration: 0,
        buffered: 0,
        volume: 1,
        isMuted: false,
        currentQuality: -1,
        qualities: [],
        audioTracks: [],
        currentAudioTrack: -1,
        error: null,
    });

    // Initialize player when video element is ready
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !options.src) return;

        // Prevent double initialization
        if (initializedRef.current && playerRef.current) {
            // Just reload the source if it changed
            playerRef.current.load(options.src);
            return;
        }

        initializedRef.current = true;

        const config: PlayerConfig = {
            src: options.src,
            autoplay: options.autoplay,
            startTime: options.startTime,
        };

        const player = new HlsPlayer(video, config);
        playerRef.current = player;

        // Setup event listeners
        player.on('ready', () => {
            setState(s => ({
                ...s,
                isReady: true,
                qualities: player.getQualities(),
                audioTracks: player.getAudioTracks(),
            }));

            // Seek to start time if provided
            if (options.startTime && options.startTime > 0) {
                player.seek(options.startTime);
            }

            // Autoplay if enabled
            if (options.autoplay) {
                player.play();
            }
        });

        player.on('play', () => setState(s => ({ ...s, isPlaying: true })));
        player.on('pause', () => setState(s => ({ ...s, isPlaying: false })));
        player.on('waiting', () => setState(s => ({ ...s, isBuffering: true })));
        player.on('playing', () => setState(s => ({ ...s, isBuffering: false })));

        player.on('timeupdate', (time) => {
            setState(s => ({ ...s, currentTime: time }));
            options.onProgress?.(time, player.getDuration());
        });

        player.on('durationchange', (duration) => {
            setState(s => ({ ...s, duration }));
        });

        player.on('progress', (buffered) => {
            setState(s => ({ ...s, buffered }));
        });

        player.on('ended', () => {
            setState(s => ({ ...s, isPlaying: false }));
            options.onEnded?.();
        });

        player.on('error', (error) => {
            setState(s => ({ ...s, error }));
            options.onError?.(error);
        });

        player.on('qualitychange', (level) => {
            setState(s => ({ ...s, currentQuality: level }));
        });

        player.on('audiotrackchange', (track) => {
            setState(s => ({ ...s, currentAudioTrack: track }));
        });

        // Load the source
        player.load(options.src);

        // Cleanup on unmount - ALWAYS destroy to stop stream
        return () => {
            console.log('[usePlayer] Cleanup - destroying player');
            playerRef.current?.destroy();
            playerRef.current = null;
            initializedRef.current = false;
        };
    }, [options.src]); // Only re-run when src changes

    // Actions
    const actions: UsePlayerActions = {
        play: useCallback(async () => {
            await playerRef.current?.play();
        }, []),

        pause: useCallback(() => {
            playerRef.current?.pause();
        }, []),

        togglePlay: useCallback(() => {
            const player = playerRef.current;
            if (player?.isPaused()) {
                player.play();
            } else {
                player?.pause();
            }
        }, []),

        seek: useCallback((time: number) => {
            playerRef.current?.seek(time);
        }, []),

        seekRelative: useCallback((delta: number) => {
            const player = playerRef.current;
            if (player) {
                player.seek(player.getCurrentTime() + delta);
            }
        }, []),

        setVolume: useCallback((volume: number) => {
            const player = playerRef.current;
            if (player) {
                player.setVolume(volume);
                setState(s => ({ ...s, volume, isMuted: volume === 0 }));
            }
        }, []),

        toggleMute: useCallback(() => {
            const player = playerRef.current;
            if (player) {
                const newMuted = !player.isMuted();
                player.setMuted(newMuted);
                setState(s => ({ ...s, isMuted: newMuted }));
            }
        }, []),

        setQuality: useCallback((quality: string) => {
            playerRef.current?.setQuality(quality);
        }, []),

        setAudioTrack: useCallback((id: string) => {
            playerRef.current?.setAudioTrack(id);
        }, []),

        setPlaybackRate: useCallback((rate: number) => {
            playerRef.current?.setPlaybackRate(rate);
        }, []),
    };

    return { state, actions, player: playerRef.current };
}
