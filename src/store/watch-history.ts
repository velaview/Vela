'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface WatchHistoryItem {
  // Content identification
  id: string; // Unique ID for this watch item
  contentId: string; // IMDB ID or similar
  type: 'movie' | 'series' | 'anime';

  // Content metadata
  title: string;
  poster?: string;
  year?: number;

  // For series
  season?: number;
  episode?: number;
  episodeTitle?: string;
  totalSeasons?: number;
  totalEpisodes?: number;

  // Playback state
  currentTime: number; // Current position in seconds
  duration: number; // Total duration in seconds
  progress: number; // 0-100 percentage

  // Stream info (for resume)
  streamUrl?: string;
  streamTitle?: string;

  // Timestamps
  lastWatched: number; // Unix timestamp
  createdAt: number; // Unix timestamp
}

export interface WatchHistoryState {
  // History items keyed by unique ID
  items: Record<string, WatchHistoryItem>;

  // Actions
  addOrUpdateItem: (item: Omit<WatchHistoryItem, 'id' | 'createdAt' | 'lastWatched' | 'progress'> & { currentTime: number; duration: number }) => void;
  removeItem: (id: string) => void;
  clearHistory: () => void;

  // Getters
  getItem: (contentId: string, season?: number, episode?: number) => WatchHistoryItem | undefined;
  getContinueWatching: () => WatchHistoryItem[];
  getRecentlyWatched: () => WatchHistoryItem[];
  isWatched: (contentId: string, season?: number, episode?: number) => boolean;
}

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

function generateItemId(contentId: string, season?: number, episode?: number): string {
  if (season !== undefined && episode !== undefined) {
    return `${contentId}:${season}:${episode}`;
  }
  return contentId;
}

function calculateProgress(currentTime: number, duration: number): number {
  if (!duration || duration <= 0) return 0;
  return Math.min(100, Math.round((currentTime / duration) * 100));
}

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

export const useWatchHistory = create<WatchHistoryState>()(
  persist(
    (set, get) => ({
      items: {},

      addOrUpdateItem: (itemData) => {
        const id = generateItemId(itemData.contentId, itemData.season, itemData.episode);
        const now = Date.now();
        const progress = calculateProgress(itemData.currentTime, itemData.duration);

        set((state) => {
          const existingItem = state.items[id];

          const newItem: WatchHistoryItem = {
            ...itemData,
            id,
            progress,
            lastWatched: now,
            createdAt: existingItem?.createdAt || now,
          };

          return {
            items: {
              ...state.items,
              [id]: newItem,
            },
          };
        });
      },

      removeItem: (id) => {
        set((state) => {
          const { [id]: removed, ...rest } = state.items;
          return { items: rest };
        });
      },

      clearHistory: () => {
        set({ items: {} });
      },

      getItem: (contentId, season, episode) => {
        const id = generateItemId(contentId, season, episode);
        return get().items[id];
      },

      getContinueWatching: () => {
        const items = Object.values(get().items);

        // Filter items that are in progress (5% - 90% watched)
        // Sort by last watched (most recent first)
        return items
          .filter((item) => item.progress >= 5 && item.progress < 90)
          .sort((a, b) => b.lastWatched - a.lastWatched)
          .slice(0, 20); // Limit to 20 items
      },

      getRecentlyWatched: () => {
        const items = Object.values(get().items);

        // All items sorted by last watched
        return items
          .sort((a, b) => b.lastWatched - a.lastWatched)
          .slice(0, 50); // Limit to 50 items
      },

      isWatched: (contentId, season, episode) => {
        const item = get().getItem(contentId, season, episode);
        return item ? item.progress >= 90 : false;
      },
    }),
    {
      name: 'vela-watch-history',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
