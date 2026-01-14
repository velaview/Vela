'use client';

import { createContext, useContext, useRef, type ReactNode, type RefObject } from 'react';
import { usePlayer, type UsePlayerState, type UsePlayerActions } from './use-player';
import type { HlsPlayer } from '../hls-player';

interface PlayerContextValue {
    state: UsePlayerState;
    actions: UsePlayerActions;
    videoRef: RefObject<HTMLVideoElement | null>;
    player: HlsPlayer | null;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

interface PlayerProviderProps {
    children: ReactNode;
    src: string;
    autoplay?: boolean;
    startTime?: number;
    onProgress?: (time: number, duration: number) => void;
    onEnded?: () => void;
    onError?: (error: Error) => void;
}

/**
 * Context provider for sharing player state across components.
 */
export function PlayerProvider({
    children,
    src,
    autoplay = true,
    startTime,
    onProgress,
    onEnded,
    onError,
}: PlayerProviderProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    const { state, actions, player } = usePlayer(videoRef, {
        src,
        autoplay,
        startTime,
        onProgress,
        onEnded,
        onError,
    });

    return (
        <PlayerContext.Provider value={{ state, actions, videoRef, player }}>
            {children}
        </PlayerContext.Provider>
    );
}

/**
 * Hook to access player context from any child component.
 */
export function usePlayerContext(): PlayerContextValue {
    const context = useContext(PlayerContext);
    if (!context) {
        throw new Error('usePlayerContext must be used within PlayerProvider');
    }
    return context;
}
