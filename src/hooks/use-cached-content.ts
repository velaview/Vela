'use client';

import { useCallback, useEffect, useState } from 'react';
import { useContentCache, CachedMeta, CachedStream, CachedSubtitle, CatalogCache } from '@/store/content-cache';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface UseCatalogOptions {
  type: string;
  catalogId: string;
  genre?: string;
  skip?: number;
  enabled?: boolean;
}

interface UseCatalogResult {
  items: CachedMeta[];
  genres: string[];
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

interface UseMetaOptions {
  type: string;
  id: string;
  enabled?: boolean;
}

interface UseMetaResult {
  meta: CachedMeta | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UseStreamsOptions {
  type: string;
  id: string;
  season?: number;
  episode?: number;
  enabled?: boolean;
}

interface UseStreamsResult {
  streams: CachedStream[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UseSubtitlesOptions {
  type: string;
  id: string;
  season?: number;
  episode?: number;
  enabled?: boolean;
}

interface UseSubtitlesResult {
  subtitles: CachedSubtitle[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────
// useCachedCatalog - Fetch catalog with caching
// ─────────────────────────────────────────────────────────────

export function useCachedCatalog({
  type,
  catalogId,
  genre,
  enabled = true,
}: UseCatalogOptions): UseCatalogResult {
  const cache = useContentCache();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = genre ? `${type}/${catalogId}?genre=${genre}` : `${type}/${catalogId}`;

  // Get cached data
  const cached = cache.getCatalog(type, catalogId, genre);

  // Fetch from API
  const fetchCatalog = useCallback(async (skip: number = 0, append: boolean = false) => {
    if (!enabled) return;

    const loadingKey = `${cacheKey}:${skip}`;
    if (cache.isLoadingCatalog(loadingKey)) return;

    cache.setLoadingCatalog(loadingKey, true);
    setIsLoading(true);
    setError(null);

    try {
      let apiType = type;
      let apiCatalogId = catalogId;

      // Handle anime type
      if (type === 'anime') {
        apiType = 'series';
        apiCatalogId = 'top';
      }

      const params = new URLSearchParams();
      if (type === 'anime') {
        params.set('genre', 'Animation');
      } else if (genre) {
        params.set('genre', genre);
      }
      if (skip > 0) {
        params.set('skip', skip.toString());
      }

      const queryString = params.toString();
      const url = `/api/catalog/${apiType}/${apiCatalogId}${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        throw new Error(`Failed to fetch catalog: ${response.status}`);
      }

      const data = await response.json();
      const items = (data.data || []).map((item: CachedMeta) => ({
        ...item,
        _cachedAt: Date.now(),
      }));

      if (append && cached) {
        cache.appendCatalog(type, catalogId, items, genre);
      } else {
        cache.setCatalog(type, catalogId, {
          items,
          genres: data.genres || [],
          hasMore: items.length >= 20,
          lastSkip: skip + items.length,
          _cachedAt: Date.now(),
        }, genre);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch catalog');
    } finally {
      cache.setLoadingCatalog(loadingKey, false);
      setIsLoading(false);
    }
  }, [type, catalogId, genre, enabled, cache, cacheKey, cached]);

  // Initial fetch if not cached
  useEffect(() => {
    if (enabled && !cached && !isLoading) {
      fetchCatalog(0, false);
    }
  }, [enabled, cached, isLoading, fetchCatalog]);

  // Load more function
  const loadMore = useCallback(async () => {
    if (cached && cached.hasMore) {
      await fetchCatalog(cached.lastSkip, true);
    }
  }, [cached, fetchCatalog]);

  // Refresh function (force refetch)
  const refresh = useCallback(async () => {
    await fetchCatalog(0, false);
  }, [fetchCatalog]);

  return {
    items: cached?.items || [],
    genres: cached?.genres || [],
    hasMore: cached?.hasMore ?? true,
    isLoading: isLoading && !cached,
    error,
    loadMore,
    refresh,
  };
}

// ─────────────────────────────────────────────────────────────
// useCachedMeta - Fetch metadata with caching
// ─────────────────────────────────────────────────────────────

export function useCachedMeta({
  type,
  id,
  enabled = true,
}: UseMetaOptions): UseMetaResult {
  const cache = useContentCache();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = `${type}:${id}`;

  // Get cached data
  const cached = cache.getMeta(type, id);

  // Fetch from API
  const fetchMeta = useCallback(async () => {
    if (!enabled || !id) return;

    if (cache.isLoadingMeta(cacheKey)) return;

    cache.setLoadingMeta(cacheKey, true);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/meta/${type}/${id}`, { credentials: 'include' });

      if (!response.ok) {
        throw new Error(`Failed to fetch meta: ${response.status}`);
      }

      const data = await response.json();

      if (data.data) {
        cache.setMeta(type, id, {
          ...data.data,
          _cachedAt: Date.now(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metadata');
    } finally {
      cache.setLoadingMeta(cacheKey, false);
      setIsLoading(false);
    }
  }, [type, id, enabled, cache, cacheKey]);

  // Initial fetch if not cached or if cached data is incomplete
  useEffect(() => {
    if (enabled && id && (!cached || !cached.description) && !isLoading) {
      fetchMeta();
    }
  }, [enabled, id, cached, isLoading, fetchMeta]);

  // Refresh function
  const refresh = useCallback(async () => {
    await fetchMeta();
  }, [fetchMeta]);

  return {
    meta: cached || null,
    isLoading: isLoading && !cached,
    error,
    refresh,
  };
}

// ─────────────────────────────────────────────────────────────
// useCachedStreams - Fetch streams with caching
// ─────────────────────────────────────────────────────────────

export function useCachedStreams({
  type,
  id,
  season,
  episode,
  enabled = true,
}: UseStreamsOptions): UseStreamsResult {
  const cache = useContentCache();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = season !== undefined && episode !== undefined
    ? `${type}:${id}:${season}:${episode}`
    : `${type}:${id}`;

  // Get cached data
  const cached = cache.getStreams(type, id, season, episode);

  // Fetch from API
  const fetchStreams = useCallback(async () => {
    if (!enabled || !id) return;

    if (cache.isLoadingStreams(cacheKey)) return;

    cache.setLoadingStreams(cacheKey, true);
    setIsLoading(true);
    setError(null);

    try {
      const url = season !== undefined && episode !== undefined
        ? `/api/streams/${type}/${id}:${season}:${episode}`
        : `/api/streams/${type}/${id}`;

      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        throw new Error(`Failed to fetch streams: ${response.status}`);
      }

      const data = await response.json();

      let allStreams = [];
      if (data.data) {
        if (Array.isArray(data.data)) {
          allStreams = data.data;
        } else {
          // New format
          if (data.data.primary) allStreams.push(data.data.primary);
          if (Array.isArray(data.data.alternatives)) allStreams.push(...data.data.alternatives);
        }
      }

      cache.setStreams(type, id, allStreams, season, episode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch streams');
    } finally {
      cache.setLoadingStreams(cacheKey, false);
      setIsLoading(false);
    }
  }, [type, id, season, episode, enabled, cache, cacheKey]);

  // Initial fetch if not cached
  useEffect(() => {
    if (enabled && id && !cached && !isLoading) {
      fetchStreams();
    }
  }, [enabled, id, cached, isLoading, fetchStreams]);

  // Refresh function
  const refresh = useCallback(async () => {
    await fetchStreams();
  }, [fetchStreams]);

  return {
    streams: cached || [],
    isLoading: isLoading && !cached,
    error,
    refresh,
  };
}

// ─────────────────────────────────────────────────────────────
// useCachedSubtitles - Fetch subtitles with caching
// ─────────────────────────────────────────────────────────────

export function useCachedSubtitles({
  type,
  id,
  season,
  episode,
  enabled = true,
}: UseSubtitlesOptions): UseSubtitlesResult {
  const cache = useContentCache();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = season !== undefined && episode !== undefined
    ? `${type}:${id}:${season}:${episode}`
    : `${type}:${id}`;

  // Get cached data
  const cached = cache.getSubtitles(type, id, season, episode);

  // Fetch from API
  const fetchSubtitles = useCallback(async () => {
    if (!enabled || !id) return;

    if (cache.isLoadingSubtitles(cacheKey)) return;

    cache.setLoadingSubtitles(cacheKey, true);
    setIsLoading(true);
    setError(null);

    try {
      // Build the video ID for subtitles
      let videoId = id;
      if (season !== undefined && episode !== undefined) {
        videoId = `${id}:${season}:${episode}`;
      }

      const response = await fetch(`/api/subtitles/${type}/${videoId}`, { credentials: 'include' });

      if (!response.ok) {
        // Subtitles are optional, don't throw error
        cache.setSubtitles(type, id, [], season, episode);
        return;
      }

      const data = await response.json();

      cache.setSubtitles(type, id, data.data || [], season, episode);
    } catch (err) {
      // Subtitles are optional, just log the error
      console.warn('Failed to fetch subtitles:', err);
      cache.setSubtitles(type, id, [], season, episode);
    } finally {
      cache.setLoadingSubtitles(cacheKey, false);
      setIsLoading(false);
    }
  }, [type, id, season, episode, enabled, cache, cacheKey]);

  // Initial fetch if not cached
  useEffect(() => {
    if (enabled && id && !cached && !isLoading) {
      fetchSubtitles();
    }
  }, [enabled, id, cached, isLoading, fetchSubtitles]);

  // Refresh function
  const refresh = useCallback(async () => {
    await fetchSubtitles();
  }, [fetchSubtitles]);

  return {
    subtitles: cached || [],
    isLoading,
    error,
    refresh,
  };
}

// ─────────────────────────────────────────────────────────────
// Prefetch Helper - Prefetch content in background
// ─────────────────────────────────────────────────────────────

export function usePrefetch() {
  const cache = useContentCache();

  const prefetchMeta = useCallback(async (type: string, id: string) => {
    // Check if already cached
    if (cache.getMeta(type, id)) return;

    const cacheKey = `${type}:${id}`;
    if (cache.isLoadingMeta(cacheKey)) return;

    cache.setLoadingMeta(cacheKey, true);

    try {
      const response = await fetch(`/api/meta/${type}/${id}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          cache.setMeta(type, id, {
            ...data.data,
            _cachedAt: Date.now(),
          });
        }
      }
    } catch {
      // Ignore prefetch errors
    } finally {
      cache.setLoadingMeta(cacheKey, false);
    }
  }, [cache]);

  const prefetchCatalog = useCallback(async (type: string, catalogId: string, genre?: string) => {
    // Check if already cached
    if (cache.getCatalog(type, catalogId, genre)) return;

    const cacheKey = genre ? `${type}/${catalogId}?genre=${genre}` : `${type}/${catalogId}`;
    if (cache.isLoadingCatalog(cacheKey)) return;

    cache.setLoadingCatalog(cacheKey, true);

    try {
      const params = new URLSearchParams();
      if (genre) params.set('genre', genre);

      const queryString = params.toString();
      const url = `/api/catalog/${type}/${catalogId}${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const items = (data.data || []).map((item: CachedMeta) => ({
          ...item,
          _cachedAt: Date.now(),
        }));

        cache.setCatalog(type, catalogId, {
          items,
          genres: data.genres || [],
          hasMore: items.length >= 20,
          lastSkip: items.length,
          _cachedAt: Date.now(),
        }, genre);
      }
    } catch {
      // Ignore prefetch errors
    } finally {
      cache.setLoadingCatalog(cacheKey, false);
    }
  }, [cache]);

  return { prefetchMeta, prefetchCatalog };
}
