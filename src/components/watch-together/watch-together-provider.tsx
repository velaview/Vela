'use client';

// ─────────────────────────────────────────────────────────────
// Watch Together Provider
// React context wrapper for room state (Polling-based)
// ─────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useWatchRoomStore, useSyncCorrection, type RoomInfo, type MemberInfo, type PlaybackInfo, type ChatMessage } from '@/store/watch-room-store';
import { useAuthStore } from '@/store/auth-store';
import type { CreateRoomRequest } from '@/core/watch-together';

interface WatchTogetherContextValue {
    // State
    room: RoomInfo | null;
    members: MemberInfo[];
    playback: PlaybackInfo | null;
    chatMessages: ChatMessage[];
    isConnected: boolean;
    isHost: boolean;
    allReady: boolean;

    // Actions
    createRoom: (request: CreateRoomRequest) => Promise<{ roomId: string; inviteCode: string } | null>;
    joinRoom: (inviteCode: string) => Promise<boolean>;
    leaveRoom: () => Promise<void>;
    closeRoom: () => Promise<void>;
    play: (position?: number) => Promise<void>;
    pause: (position?: number) => Promise<void>;
    seek: (position: number) => Promise<void>;
    setContent: (content: {
        contentId: string;
        contentTitle: string;
        contentPoster?: string;
        season?: number;
        episode?: number;
    }) => Promise<boolean>;
    setReady: (isReady: boolean, bufferPercent: number) => Promise<void>;
    sendChatMessage: (message: string) => Promise<void>;
}

const WatchTogetherContext = createContext<WatchTogetherContextValue | null>(null);

interface WatchTogetherProviderProps {
    children: ReactNode;
}

export function WatchTogetherProvider({ children }: WatchTogetherProviderProps) {
    const store = useWatchRoomStore();
    const authUser = useAuthStore(s => s.user);

    // Set current user ID when auth changes
    useEffect(() => {
        if (authUser?.id) {
            useWatchRoomStore.setState({ currentUserId: authUser.id });
        }
    }, [authUser?.id]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            store.stopPolling();
        };
    }, []);

    const value: WatchTogetherContextValue = {
        room: store.room,
        members: store.members,
        playback: store.playback,
        chatMessages: store.chatMessages,
        isConnected: store.isConnected,
        isHost: store.isHost,
        allReady: store.allReady,
        createRoom: store.createRoom,
        joinRoom: store.joinRoom,
        leaveRoom: store.leaveRoom,
        closeRoom: store.closeRoom,
        play: store.play,
        pause: store.pause,
        seek: store.seek,
        setContent: store.setContent,
        setReady: store.setReady,
        sendChatMessage: store.sendChatMessage,
    };

    return (
        <WatchTogetherContext.Provider value={value}>
            {children}
        </WatchTogetherContext.Provider>
    );
}

export function useWatchTogether() {
    const context = useContext(WatchTogetherContext);
    if (!context) {
        throw new Error('useWatchTogether must be used within WatchTogetherProvider');
    }
    return context;
}

// Re-export the sync hook for video player integration
export { useSyncCorrection };
