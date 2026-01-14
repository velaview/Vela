'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface CachedMeta {
  id: string;
  name: string;
  type: string;
  poster?: string;
  background?: string;
  logo?: string;
  description?: string;
  releaseInfo?: string;
  imdbRating?: string;
  runtime?: string;
  genres?: string[];
  cast?: string[];
  director?: string[];
  writer?: string[];
  country?: string;
  year?: string;
  trailers?: { source: string; type: string }[];
  videos?: {
    id: string;
    title: string;
    season?: number;
    episode?: number;
    released?: string;
    thumbnail?: string;
  }[];
  // Cache metadata
  _cachedAt: number;
  _source?: string;
}

export interface CachedStream {
  name?: string;
  title?: string;
  url: string;
  behaviorHints?: {
    bingeGroup?: string;
    notWebReady?: boolean;
  };
  // Cache metadata
  _cachedAt: number;
}

export interface CachedSubtitle {
  id: string;
  lang: string;
  url: string;
  _cachedAt: number;
}

export interface CatalogCache {
  items: CachedMeta[];
  genres: string[];
  hasMore: boolean;
  lastSkip: number;
  _cachedAt: number;
}

// Cache expiry times (in milliseconds)
const CACHE_EXPIRY = {
  CATALOG: 30 * 60 * 1000,      // 30 minutes for catalog lists
  META: 60 * 60 * 1000,         // 1 hour for metadata
  STREAMS: 15 * 60 * 1000,      // 15 minutes for streams (can change)
  SUBTITLES: 60 * 60 * 1000,    // 1 hour for subtitles
};

// Max items to keep in cache to avoid quota issues
const MAX_CACHE_ITEMS = {
  CATALOGS: 20,
  METAS: 100,
  STREAMS: 50,
  SUBTITLES: 30,
};

// Safe localStorage wrapper that handles quota errors
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    // Quota exceeded - clear old data and retry
    console.warn('[Cache] Storage quota exceeded, clearing old cache');
    try {
      localStorage.removeItem('vela-content-cache');
      localStorage.setItem(key, value);
      return true;
    } catch {
      console.error('[Cache] Failed to save even after clearing');
      return false;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Store State
// ─────────────────────────────────────────────────────────────

interface ContentCacheState {
  // Catalog cache: key = "type/catalogId" or "type/catalogId?genre=X"
  catalogs: Record<string, CatalogCache>;

  // Meta cache: key = "type:id" (e.g., "movie:tt1234567")
  metas: Record<string, CachedMeta>;

  // Streams cache: key = "type:id" or "type:id:season:episode"
  streams: Record<string, CachedStream[]>;

  // Subtitles cache: key = "type:id" or "type:id:season:episode"
  subtitles: Record<string, CachedSubtitle[]>;

  // Prefetch queue for background loading
  prefetchQueue: string[];

  // Loading states
  loadingCatalogs: Set<string>;
  loadingMetas: Set<string>;
  loadingStreams: Set<string>;
  loadingSubtitles: Set<string>;
}

interface ContentCacheActions {
  // Catalog operations
  getCatalog: (type: string, catalogId: string, genre?: string) => CatalogCache | null;
  setCatalog: (type: string, catalogId: string, data: CatalogCache, genre?: string) => void;
  appendCatalog: (type: string, catalogId: string, items: CachedMeta[], genre?: string) => void;

  // Meta operations
  getMeta: (type: string, id: string) => CachedMeta | null;
  setMeta: (type: string, id: string, meta: CachedMeta) => void;
  setMetas: (metas: CachedMeta[]) => void;

  // Stream operations
  getStreams: (type: string, id: string, season?: number, episode?: number) => CachedStream[] | null;
  setStreams: (type: string, id: string, streams: CachedStream[], season?: number, episode?: number) => void;

  // Subtitle operations
  getSubtitles: (type: string, id: string, season?: number, episode?: number) => CachedSubtitle[] | null;
  setSubtitles: (type: string, id: string, subtitles: CachedSubtitle[], season?: number, episode?: number) => void;

  // Loading state helpers
  isLoadingCatalog: (key: string) => boolean;
  setLoadingCatalog: (key: string, loading: boolean) => void;
  isLoadingMeta: (key: string) => boolean;
  setLoadingMeta: (key: string, loading: boolean) => void;
  isLoadingStreams: (key: string) => boolean;
  setLoadingStreams: (key: string, loading: boolean) => void;
  isLoadingSubtitles: (key: string) => boolean;
  setLoadingSubtitles: (key: string, loading: boolean) => void;

  // Prefetch operations
  addToPrefetchQueue: (ids: string[]) => void;
  getNextPrefetch: () => string | null;

  // Cache management
  clearExpiredCache: () => void;
  clearAllCache: () => void;
  getCacheStats: () => { catalogs: number; metas: number; streams: number; subtitles: number };
}

type ContentCacheStore = ContentCacheState & ContentCacheActions;

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

function getCatalogKey(type: string, catalogId: string, genre?: string): string {
  const base = `${type}/${catalogId}`;
  return genre ? `${base}?genre=${genre}` : base;
}

function getMetaKey(type: string, id: string): string {
  return `${type}:${id}`;
}

function getStreamKey(type: string, id: string, season?: number, episode?: number): string {
  if (season !== undefined && episode !== undefined) {
    return `${type}:${id}:${season}:${episode}`;
  }
  return `${type}:${id}`;
}

function isExpired(cachedAt: number, expiryMs: number): boolean {
  return Date.now() - cachedAt > expiryMs;
}

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

export const useContentCache = create<ContentCacheStore>()(
  persist(
    (set, get) => ({
      // Initial state
      catalogs: {},
      metas: {},
      streams: {},
      subtitles: {},
      prefetchQueue: [],
      loadingCatalogs: new Set(),
      loadingMetas: new Set(),
      loadingStreams: new Set(),
      loadingSubtitles: new Set(),

      // ─────────────────────────────────────────────────────────────
      // Catalog Operations
      // ─────────────────────────────────────────────────────────────

      getCatalog: (type, catalogId, genre) => {
        const key = getCatalogKey(type, catalogId, genre);
        const cached = get().catalogs[key];

        if (!cached) return null;
        if (isExpired(cached._cachedAt, CACHE_EXPIRY.CATALOG)) {
          // Don't delete, just return null to trigger refresh
          return null;
        }

        return cached;
      },

      setCatalog: (type, catalogId, data, genre) => {
        const key = getCatalogKey(type, catalogId, genre);

        set((state) => ({
          catalogs: {
            ...state.catalogs,
            [key]: { ...data, _cachedAt: Date.now() },
          },
        }));

        // Also cache individual metas
        get().setMetas(data.items);
      },

      appendCatalog: (type, catalogId, items, genre) => {
        const key = getCatalogKey(type, catalogId, genre);

        set((state) => {
          const existing = state.catalogs[key];
          if (!existing) return state;

          // Deduplicate by ID
          const existingIds = new Set(existing.items.map(i => i.id));
          const newItems = items.filter(i => !existingIds.has(i.id));

          return {
            catalogs: {
              ...state.catalogs,
              [key]: {
                ...existing,
                items: [...existing.items, ...newItems],
                lastSkip: existing.lastSkip + items.length,
                hasMore: items.length >= 20,
              },
            },
          };
        });

        // Also cache individual metas
        get().setMetas(items);
      },

      // ─────────────────────────────────────────────────────────────
      // Meta Operations
      // ─────────────────────────────────────────────────────────────

      getMeta: (type, id) => {
        const key = getMetaKey(type, id);
        const cached = get().metas[key];

        if (!cached) return null;
        if (isExpired(cached._cachedAt, CACHE_EXPIRY.META)) {
          return null;
        }

        return cached;
      },

      setMeta: (type, id, meta) => {
        const key = getMetaKey(type, id);

        set((state) => ({
          metas: {
            ...state.metas,
            [key]: { ...meta, _cachedAt: Date.now() },
          },
        }));
      },

      setMetas: (metas) => {
        const now = Date.now();

        set((state) => {
          const newMetas = { ...state.metas };

          for (const meta of metas) {
            const key = getMetaKey(meta.type, meta.id);
            // Only update if not already cached or if new data has more info
            const existing = newMetas[key];
            if (!existing || (meta.description && !existing.description)) {
              newMetas[key] = { ...meta, _cachedAt: now };
            }
          }

          return { metas: newMetas };
        });
      },

      // ─────────────────────────────────────────────────────────────
      // Stream Operations
      // ─────────────────────────────────────────────────────────────

      getStreams: (type, id, season, episode) => {
        const key = getStreamKey(type, id, season, episode);
        const cached = get().streams[key];

        if (!cached) return null;
        if (cached.length > 0 && isExpired(cached[0]._cachedAt, CACHE_EXPIRY.STREAMS)) {
          return null;
        }

        return cached;
      },

      setStreams: (type, id, streams, season, episode) => {
        const key = getStreamKey(type, id, season, episode);
        const now = Date.now();

        set((state) => ({
          streams: {
            ...state.streams,
            [key]: streams.map(s => ({ ...s, _cachedAt: now })),
          },
        }));
      },

      // ─────────────────────────────────────────────────────────────
      // Subtitle Operations
      // ─────────────────────────────────────────────────────────────

      getSubtitles: (type, id, season, episode) => {
        const key = getStreamKey(type, id, season, episode);
        const cached = get().subtitles[key];

        if (!cached) return null;
        if (cached.length > 0 && isExpired(cached[0]._cachedAt, CACHE_EXPIRY.SUBTITLES)) {
          return null;
        }

        return cached;
      },

      setSubtitles: (type, id, subtitles, season, episode) => {
        const key = getStreamKey(type, id, season, episode);
        const now = Date.now();

        set((state) => ({
          subtitles: {
            ...state.subtitles,
            [key]: subtitles.map(s => ({ ...s, _cachedAt: now })),
          },
        }));
      },

      // ─────────────────────────────────────────────────────────────
      // Loading State Helpers
      // ─────────────────────────────────────────────────────────────

      isLoadingCatalog: (key) => get().loadingCatalogs.has(key),

      setLoadingCatalog: (key, loading) => {
        set((state) => {
          const newSet = new Set(state.loadingCatalogs);
          if (loading) newSet.add(key);
          else newSet.delete(key);
          return { loadingCatalogs: newSet };
        });
      },

      isLoadingMeta: (key) => get().loadingMetas.has(key),

      setLoadingMeta: (key, loading) => {
        set((state) => {
          const newSet = new Set(state.loadingMetas);
          if (loading) newSet.add(key);
          else newSet.delete(key);
          return { loadingMetas: newSet };
        });
      },

      isLoadingStreams: (key) => get().loadingStreams.has(key),

      setLoadingStreams: (key, loading) => {
        set((state) => {
          const newSet = new Set(state.loadingStreams);
          if (loading) newSet.add(key);
          else newSet.delete(key);
          return { loadingStreams: newSet };
        });
      },

      isLoadingSubtitles: (key) => get().loadingSubtitles.has(key),

      setLoadingSubtitles: (key, loading) => {
        set((state) => {
          const newSet = new Set(state.loadingSubtitles);
          if (loading) newSet.add(key);
          else newSet.delete(key);
          return { loadingSubtitles: newSet };
        });
      },

      // ─────────────────────────────────────────────────────────────
      // Prefetch Operations
      // ─────────────────────────────────────────────────────────────

      addToPrefetchQueue: (ids) => {
        set((state) => {
          const existingSet = new Set(state.prefetchQueue);
          const newIds = ids.filter(id => !existingSet.has(id) && !state.metas[id]);
          return { prefetchQueue: [...state.prefetchQueue, ...newIds] };
        });
      },

      getNextPrefetch: () => {
        const queue = get().prefetchQueue;
        if (queue.length === 0) return null;

        const next = queue[0];
        set((state) => ({ prefetchQueue: state.prefetchQueue.slice(1) }));
        return next;
      },

      // ─────────────────────────────────────────────────────────────
      // Cache Management
      // ─────────────────────────────────────────────────────────────

      clearExpiredCache: () => {
        const now = Date.now();

        set((state) => {
          const newCatalogs: Record<string, CatalogCache> = {};
          const newMetas: Record<string, CachedMeta> = {};
          const newStreams: Record<string, CachedStream[]> = {};
          const newSubtitles: Record<string, CachedSubtitle[]> = {};

          // Clean catalogs
          for (const [key, value] of Object.entries(state.catalogs)) {
            if (!isExpired(value._cachedAt, CACHE_EXPIRY.CATALOG * 2)) {
              newCatalogs[key] = value;
            }
          }

          // Clean metas
          for (const [key, value] of Object.entries(state.metas)) {
            if (!isExpired(value._cachedAt, CACHE_EXPIRY.META * 2)) {
              newMetas[key] = value;
            }
          }

          // Clean streams
          for (const [key, value] of Object.entries(state.streams)) {
            if (value.length > 0 && !isExpired(value[0]._cachedAt, CACHE_EXPIRY.STREAMS * 2)) {
              newStreams[key] = value;
            }
          }

          // Clean subtitles
          for (const [key, value] of Object.entries(state.subtitles)) {
            if (value.length > 0 && !isExpired(value[0]._cachedAt, CACHE_EXPIRY.SUBTITLES * 2)) {
              newSubtitles[key] = value;
            }
          }

          return {
            catalogs: newCatalogs,
            metas: newMetas,
            streams: newStreams,
            subtitles: newSubtitles,
          };
        });
      },

      clearAllCache: () => {
        set({
          catalogs: {},
          metas: {},
          streams: {},
          subtitles: {},
          prefetchQueue: [],
        });
      },

      getCacheStats: () => {
        const state = get();
        return {
          catalogs: Object.keys(state.catalogs).length,
          metas: Object.keys(state.metas).length,
          streams: Object.keys(state.streams).length,
          subtitles: Object.keys(state.subtitles).length,
        };
      },
    }),
    {
      name: 'vela-content-cache',
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          try {
            return localStorage.getItem(name);
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          safeSetItem(name, value);
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch {
            // Ignore
          }
        },
      })),
      partialize: (state) => {
        // Trim cache to max sizes before persisting
        const catalogs: Record<string, CatalogCache> = {};
        const catalogKeys = Object.keys(state.catalogs).slice(-MAX_CACHE_ITEMS.CATALOGS);
        for (const key of catalogKeys) {
          catalogs[key] = state.catalogs[key];
        }

        const metas: Record<string, CachedMeta> = {};
        const metaKeys = Object.keys(state.metas).slice(-MAX_CACHE_ITEMS.METAS);
        for (const key of metaKeys) {
          metas[key] = state.metas[key];
        }

        const streams: Record<string, CachedStream[]> = {};
        const streamKeys = Object.keys(state.streams).slice(-MAX_CACHE_ITEMS.STREAMS);
        for (const key of streamKeys) {
          streams[key] = state.streams[key];
        }

        const subtitles: Record<string, CachedSubtitle[]> = {};
        const subtitleKeys = Object.keys(state.subtitles).slice(-MAX_CACHE_ITEMS.SUBTITLES);
        for (const key of subtitleKeys) {
          subtitles[key] = state.subtitles[key];
        }

        return { catalogs, metas, streams, subtitles };
      },
      // Rehydrate Sets properly
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.loadingCatalogs = new Set();
          state.loadingMetas = new Set();
          state.loadingStreams = new Set();
          state.loadingSubtitles = new Set();
          state.prefetchQueue = [];
          // Clear expired cache on load
          state.clearExpiredCache();
        }
      },
    }
  )
);

// ─────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────

export const useCachedMeta = (type: string, id: string) =>
  useContentCache((state) => state.metas[getMetaKey(type, id)]);

export const useCacheStats = () =>
  useContentCache((state) => state.getCacheStats());
