// ─────────────────────────────────────────────────────────────
// Watch Room Store (Polling-based)
// Zustand store for Watch Together state management
// ─────────────────────────────────────────────────────────────

import React, { useEffect } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CreateRoomRequest } from '@/core/watch-together';
import { SYNC_THRESHOLD_SEC } from '@/core/watch-together';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface RoomInfo {
    id: string;
    hostUserId: string;
    inviteCode: string;
    contentId?: string;
    contentTitle?: string;
    contentPoster?: string;
    season?: number;
    episode?: number;
    status: string;
    expiresAt: string;
}

export interface MemberInfo {
    id: string;
    userId: string;
    displayName: string;
    avatar?: string;
    role: 'host' | 'guest';
    isReady: boolean;
    bufferPercent: number;
}

export interface PlaybackInfo {
    position: number;
    isPlaying: boolean;
    lastAction?: string;
    lastActionBy?: string;
    lastActionAt?: number;
    updatedAt: number;
}

export interface ChatMessage {
    id: string;
    userId: string;
    displayName: string;
    avatar?: string;
    message: string;
    createdAt: number;
}

interface WatchRoomStore {
    // Room state
    room: RoomInfo | null;
    members: MemberInfo[];
    playback: PlaybackInfo | null;
    chatMessages: ChatMessage[];
    allReady: boolean;

    // Connection state
    isConnected: boolean;
    isPolling: boolean;
    currentUserId: string | null;
    isHost: boolean;
    lastChatTimestamp: number;

    // Polling
    _pollInterval: NodeJS.Timeout | null;
    _activeRoomId: string | null;

    // Actions - Room lifecycle
    createRoom: (request: CreateRoomRequest) => Promise<{ roomId: string; inviteCode: string } | null>;
    joinRoom: (inviteCode: string) => Promise<boolean>;
    leaveRoom: () => Promise<void>;
    closeRoom: () => Promise<void>;

    // Actions - Polling
    startPolling: (roomId: string) => void;
    stopPolling: () => void;
    poll: () => Promise<void>;

    // Actions - Playback control
    play: (position?: number) => Promise<void>;
    pause: (position?: number) => Promise<void>;
    seek: (position: number) => Promise<void>;

    // Actions - Content (host only)
    setContent: (content: {
        contentId: string;
        contentTitle: string;
        contentPoster?: string;
        season?: number;
        episode?: number;
    }) => Promise<boolean>;

    // Actions - Readiness
    setReady: (isReady: boolean, bufferPercent: number) => Promise<void>;

    // Actions - Chat
    sendChatMessage: (message: string) => Promise<void>;

    // Actions - State updates
    setPlayback: (playback: Partial<PlaybackInfo>) => void;
    setRoom: (room: RoomInfo | null) => void;
    reset: () => void;
}

const POLL_INTERVAL_MS = 1000; // 1 second polling

const initialState = {
    room: null,
    members: [],
    playback: null,
    chatMessages: [],
    allReady: false,
    isConnected: false,
    isPolling: false,
    currentUserId: null,
    isHost: false,
    lastChatTimestamp: 0,
    _pollInterval: null,
    _activeRoomId: null as string | null,
};

export const useWatchRoomStore = create<WatchRoomStore>()(
    persist(
        (set, get) => ({
            ...initialState,

            // Create a new room
            createRoom: async (request) => {
                try {
                    const response = await fetch('/api/watch-together/rooms', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(request),
                    });

                    if (!response.ok) {
                        console.error('[WatchRoom] Failed to create room');
                        return null;
                    }

                    const data = await response.json();

                    // Start polling for this room
                    get().startPolling(data.roomId);

                    return {
                        roomId: data.roomId,
                        inviteCode: data.inviteCode,
                    };
                } catch (error) {
                    console.error('[WatchRoom] Error creating room:', error);
                    return null;
                }
            },

            // Join a room by invite code
            joinRoom: async (inviteCode) => {
                try {
                    const response = await fetch('/api/watch-together/join', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ inviteCode }),
                    });

                    if (!response.ok) {
                        console.error('[WatchRoom] Failed to join room');
                        return false;
                    }

                    const data = await response.json();

                    // Start polling for this room
                    get().startPolling(data.roomId);

                    return true;
                } catch (error) {
                    console.error('[WatchRoom] Error joining room:', error);
                    return false;
                }
            },

            // Leave the current room
            leaveRoom: async () => {
                const { room, stopPolling } = get();
                if (!room) return;

                try {
                    await fetch(`/api/watch-together/rooms/${room.id}/leave`, {
                        method: 'POST',
                    });
                } catch (error) {
                    console.error('[WatchRoom] Error leaving room:', error);
                }

                stopPolling();
                get().reset();
            },

            // Close the room (host only)
            closeRoom: async () => {
                const { room, isHost, stopPolling } = get();
                if (!room || !isHost) return;

                try {
                    await fetch(`/api/watch-together/rooms/${room.id}`, {
                        method: 'DELETE',
                    });
                } catch (error) {
                    console.error('[WatchRoom] Error closing room:', error);
                }

                stopPolling();
                get().reset();
            },

            // Start polling for room state
            startPolling: (roomId: string) => {
                console.log('[WatchRoom] startPolling:', roomId);
                const { _pollInterval } = get();
                if (_pollInterval) {
                    clearInterval(_pollInterval);
                }

                // Store the roomId so poll can use it before first response
                set({ isPolling: true, isConnected: true, _activeRoomId: roomId });

                // Initial poll
                get().poll();

                // Set up interval
                const interval = setInterval(() => {
                    get().poll();
                }, POLL_INTERVAL_MS);

                set({ _pollInterval: interval });
            },

            // Stop polling
            stopPolling: () => {
                const { _pollInterval } = get();
                if (_pollInterval) {
                    clearInterval(_pollInterval);
                }
                set({ _pollInterval: null, isPolling: false, isConnected: false });
            },

            // Poll for room state
            poll: async () => {
                const { room, lastChatTimestamp, _activeRoomId } = get();
                const roomId = room?.id || _activeRoomId;

                // Need a roomId to poll
                if (!roomId) {
                    console.warn('[WatchRoom] No roomId available for polling');
                    return;
                }

                try {
                    const url = new URL('/api/watch-together/sync', window.location.origin);
                    url.searchParams.set('roomId', roomId);
                    // Always send chatAfter to get messages, use 0 if we have none
                    url.searchParams.set('chatAfter', lastChatTimestamp.toString());

                    console.log('[WatchRoom] polling...', { roomId, lastChatTimestamp });
                    const response = await fetch(url.toString());
                    if (!response.ok) {
                        console.error('[WatchRoom] poll failed:', response.status);
                        if (response.status === 404) {
                            // Room ended or not found
                            get().stopPolling();
                            get().reset();
                        }
                        return;
                    }

                    const data = await response.json();
                    console.log('[WatchRoom] poll data:', data);

                    // Update state
                    set({
                        room: data.room,
                        members: data.members,
                        playback: data.playback,
                        allReady: data.allReady,
                        isHost: data.room?.hostUserId === get().currentUserId,
                    });

                    // Append new chat messages
                    if (data.chatMessages?.length > 0) {
                        console.log('[WatchRoom] received messages:', data.chatMessages.length);
                        set(state => ({
                            chatMessages: [...state.chatMessages, ...data.chatMessages],
                            lastChatTimestamp: data.chatMessages[data.chatMessages.length - 1].createdAt,
                        }));
                    }
                } catch (error) {
                    console.error('[WatchRoom] Poll error:', error);
                }
            },

            // Playback controls
            play: async (position?: number) => {
                const { room } = get();
                if (!room) return;

                try {
                    await fetch('/api/watch-together/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            roomId: room.id,
                            action: 'play',
                            position,
                        }),
                    });
                } catch (error) {
                    console.error('[WatchRoom] Play error:', error);
                }
            },

            pause: async (position?: number) => {
                const { room } = get();
                if (!room) return;

                try {
                    await fetch('/api/watch-together/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            roomId: room.id,
                            action: 'pause',
                            position,
                        }),
                    });
                } catch (error) {
                    console.error('[WatchRoom] Pause error:', error);
                }
            },

            seek: async (position: number) => {
                const { room } = get();
                if (!room) return;

                try {
                    await fetch('/api/watch-together/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            roomId: room.id,
                            action: 'seek',
                            position,
                        }),
                    });
                } catch (error) {
                    console.error('[WatchRoom] Seek error:', error);
                }
            },

            // Set content (host only)
            setContent: async (content) => {
                const { room, isHost } = get();
                if (!room || !isHost) return false;

                try {
                    const response = await fetch('/api/watch-together/content', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            roomId: room.id,
                            ...content,
                        }),
                    });

                    return response.ok;
                } catch (error) {
                    console.error('[WatchRoom] SetContent error:', error);
                    return false;
                }
            },

            // Set readiness
            setReady: async (isReady: boolean, bufferPercent: number) => {
                const { room, _activeRoomId } = get();
                const roomId = room?.id || _activeRoomId;
                if (!roomId) return;

                try {
                    await fetch('/api/watch-together/readiness', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            roomId,
                            isReady,
                            bufferPercent,
                        }),
                    });
                } catch (error) {
                    console.error('[WatchRoom] SetReady error:', error);
                }
            },

            // Send chat message
            sendChatMessage: async (message: string) => {
                const { room, _activeRoomId } = get();
                const roomId = room?.id || _activeRoomId;
                console.log('[WatchRoom] sendChatMessage:', { roomId, message });
                if (!roomId || !message.trim()) return;

                try {
                    const res = await fetch('/api/watch-together/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            roomId,
                            message,
                        }),
                    });
                    console.log('[WatchRoom] chat response:', res.status);
                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        console.error('[WatchRoom] chat error:', err);
                    }
                } catch (error) {
                    console.error('[WatchRoom] SendChat error:', error);
                }
            },

            // State setters
            setPlayback: (updates) => {
                set(state => ({
                    playback: state.playback ? { ...state.playback, ...updates } : null,
                }));
            },

            setRoom: (room) => set({ room }),

            reset: () => set(initialState),
        }),
        {
            name: 'watch-room-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                // Only persist connection info, not the full state
                // We re-sync on hydration/connect
                _activeRoomId: state._activeRoomId,
            }),
            onRehydrateStorage: () => (state) => {
                // If we have an active room ID, start polling immediately
                if (state?._activeRoomId) {
                    state.startPolling(state._activeRoomId);
                }
            },
        }
    )
);

// ─────────────────────────────────────────────────────────────
// Sync Helper Hook
// Use in video player to apply sync corrections
// ─────────────────────────────────────────────────────────────

export function useSyncCorrection(videoRef: React.RefObject<HTMLVideoElement | null>) {
    const playback = useWatchRoomStore(s => s.playback);
    const isConnected = useWatchRoomStore(s => s.isConnected);
    const setReady = useWatchRoomStore(s => s.setReady);
    const isHost = useWatchRoomStore(s => s.isHost);
    const currentUserId = useWatchRoomStore(s => s.currentUserId);

    // Apply sync corrections when playback state changes
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !isConnected || !playback) return;

        // Skip correction if WE are the one who just moved the needle (prevent snapping back)
        const isInitiator = playback.lastActionBy === currentUserId;
        const timeSinceAction = Date.now() - (playback.lastActionAt || 0);

        if (isInitiator && timeSinceAction < 3000) {
            console.log('[SyncCorrection] Skipping correction - we initiated this action recently');
            return;
        }

        console.log('[SyncCorrection] Checking sync...', {
            videoTime: video.currentTime,
            serverTime: playback.position,
            isPlaying: playback.isPlaying,
            isPaused: video.paused,
            lastActionBy: playback.lastActionBy,
            currentUserId
        });

        const drift = Math.abs(video.currentTime - playback.position);

        // If drift is significant, seek to correct position
        if (drift > SYNC_THRESHOLD_SEC) {
            console.log('[SyncCorrection] Correction applied: drifting by', drift);
            video.currentTime = playback.position;
        }

        // Sync play/pause state
        if (playback.isPlaying && video.paused) {
            console.log('[SyncCorrection] Play command applied');
            video.play().catch(() => { });
        } else if (!playback.isPlaying && !video.paused) {
            console.log('[SyncCorrection] Pause command applied');
            video.pause();
        }
    }, [playback, isConnected]);

    // Report buffer/readiness status periodially
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !isConnected) return;

        const interval = setInterval(() => {
            const buffered = video.buffered;
            let percent = 0;
            if (buffered.length > 0) {
                const duration = video.duration;
                if (duration > 0) {
                    percent = Math.floor((buffered.end(buffered.length - 1) / duration) * 100);
                }
            }

            const isReady = percent >= 95 || video.readyState >= 3;
            setReady(isReady, percent);
        }, 3000);

        return () => clearInterval(interval);
    }, [isConnected]);

    return null;
}
