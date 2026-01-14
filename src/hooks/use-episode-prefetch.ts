'use client';

import { useCallback, useRef } from 'react';

interface Episode {
    season?: number;
    episode?: number;
    id?: string;
    title?: string;
}

interface PrefetchResult {
    success: boolean;
    count: number;
}

/**
 * Hook for prefetching episode streams on the details page.
 * 
 * Usage:
 * ```tsx
 * const { prefetchEpisodes, isPrefetching } = useEpisodePrefetch();
 * 
 * useEffect(() => {
 *   if (meta?.videos) {
 *     prefetchEpisodes(type, id, meta.videos.slice(0, 6));
 *   }
 * }, [meta]);
 * ```
 */
export function useEpisodePrefetch() {
    const prefetchingRef = useRef<Set<string>>(new Set());

    const prefetchEpisodes = useCallback(async (
        type: string,
        id: string,
        episodes: Episode[]
    ): Promise<PrefetchResult> => {
        // Filter to valid episodes with season/episode numbers
        const validEpisodes = episodes.filter(
            (ep): ep is { season: number; episode: number } =>
                typeof ep.season === 'number' && typeof ep.episode === 'number'
        );

        if (validEpisodes.length === 0) {
            return { success: true, count: 0 };
        }

        // Create a cache key to avoid duplicate requests
        const cacheKey = `${type}:${id}:${validEpisodes.map(e => `${e.season}x${e.episode}`).join(',')}`;

        if (prefetchingRef.current.has(cacheKey)) {
            return { success: true, count: 0 };
        }

        prefetchingRef.current.add(cacheKey);

        try {
            // Get the season from first episode
            const season = validEpisodes[0].season;

            // Call the preload API
            const response = await fetch('/api/preload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contentId: id,
                    type,
                    season,
                    episodes: validEpisodes.map(e => e.episode),
                }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`[useEpisodePrefetch] Preloaded ${data.preloaded}/${data.total} episodes for ${type}/${id}`);
                return { success: true, count: data.preloaded };
            } else {
                console.warn(`[useEpisodePrefetch] Preload API returned ${response.status}`);
                return { success: false, count: 0 };
            }
        } catch (error) {
            console.error('[useEpisodePrefetch] Prefetch error:', error);
            return { success: false, count: 0 };
        } finally {
            // Remove from tracking after a delay (allow for retry after 5 min)
            setTimeout(() => {
                prefetchingRef.current.delete(cacheKey);
            }, 5 * 60 * 1000);
        }
    }, []);

    /**
     * Prefetch adjacent episodes (prev, next) around the current episode
     */
    const prefetchAdjacent = useCallback(async (
        type: string,
        id: string,
        currentSeason: number,
        currentEpisode: number,
        allEpisodes: Episode[]
    ): Promise<void> => {
        const episodes = allEpisodes.filter(
            (ep): ep is { season: number; episode: number } =>
                typeof ep.season === 'number' && typeof ep.episode === 'number'
        );

        // Find adjacent episodes
        const adjacent: { season: number; episode: number }[] = [];

        // Next episode
        const nextInSeason = episodes.find(
            ep => ep.season === currentSeason && ep.episode === currentEpisode + 1
        );
        if (nextInSeason) {
            adjacent.push(nextInSeason);
        } else {
            // Try first episode of next season
            const nextSeason = episodes.find(ep => ep.season === currentSeason + 1 && ep.episode === 1);
            if (nextSeason) adjacent.push(nextSeason);
        }

        // Previous episode (for rewind scenarios)
        const prevInSeason = episodes.find(
            ep => ep.season === currentSeason && ep.episode === currentEpisode - 1
        );
        if (prevInSeason) {
            adjacent.push(prevInSeason);
        }

        if (adjacent.length > 0) {
            await prefetchEpisodes(type, id, adjacent);
        }
    }, [prefetchEpisodes]);

    return {
        prefetchEpisodes,
        prefetchAdjacent,
    };
}
