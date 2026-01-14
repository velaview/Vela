'use client';

import { useEffect, useRef } from 'react';

const CACHE_PREFIX = 'stream_cache_';
const CACHE_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours (TorBox HLS valid ~3 hours)

interface CachedStream {
    url: string;
    quality: string;
    cachedAt: number;
    expiresAt: number;
}

/**
 * Hook to pre-resolve streams when visiting content details page.
 * Stores resolved URLs in localStorage for instant playback.
 * 
 * @param type - Content type (movie/series/anime)
 * @param contentId - Content ID (e.g., tt1234567)
 * @param currentSeason - Current season for series (default: 1)
 */
export function useStreamPreload(
    type: 'movie' | 'series' | 'anime',
    contentId: string,
    currentSeason: number = 1
) {
    const preloadedRef = useRef(false);

    useEffect(() => {
        // Only preload once per mount
        if (preloadedRef.current || !contentId) return;
        preloadedRef.current = true;

        async function preload() {
            try {
                console.log(`[Preload] Starting for ${type}/${contentId}`);

                const response = await fetch('/api/preload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contentId,
                        type,
                        season: currentSeason,
                    }),
                });

                if (!response.ok) {
                    console.warn('[Preload] API returned:', response.status);
                    return;
                }

                const data = await response.json();
                console.log(`[Preload] Complete:`, data);

            } catch (error) {
                console.error('[Preload] Failed:', error);
            }
        }

        // Start preload after a short delay to not block initial render
        const timer = setTimeout(preload, 500);
        return () => clearTimeout(timer);

    }, [type, contentId, currentSeason]);
}

/**
 * Get a pre-loaded stream URL from localStorage.
 * Returns null if not cached or expired.
 */
export function getPreloadedUrl(
    contentId: string,
    season?: number,
    episode?: number
): CachedStream | null {
    if (typeof window === 'undefined') return null;

    const key = season && episode
        ? `${CACHE_PREFIX}${contentId}:S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
        : `${CACHE_PREFIX}${contentId}`;

    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const data: CachedStream = JSON.parse(cached);

        // Check if expired
        if (Date.now() > data.expiresAt) {
            localStorage.removeItem(key);
            return null;
        }

        return data;
    } catch {
        return null;
    }
}

/**
 * Store a resolved stream URL in localStorage.
 */
export function cacheStreamUrl(
    contentId: string,
    url: string,
    quality: string,
    season?: number,
    episode?: number
): void {
    if (typeof window === 'undefined') return;

    const key = season && episode
        ? `${CACHE_PREFIX}${contentId}:S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
        : `${CACHE_PREFIX}${contentId}`;

    const data: CachedStream = {
        url,
        quality,
        cachedAt: Date.now(),
        expiresAt: Date.now() + CACHE_DURATION_MS,
    };

    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        // localStorage might be full, ignore
        console.warn('[StreamCache] Failed to cache:', error);
    }
}

/**
 * Clear all cached stream URLs.
 */
export function clearStreamCache(): void {
    if (typeof window === 'undefined') return;

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
            keysToRemove.push(key);
        }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`[StreamCache] Cleared ${keysToRemove.length} items`);
}
