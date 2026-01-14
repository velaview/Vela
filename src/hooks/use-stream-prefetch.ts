'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useContentCache } from '@/store/content-cache';

interface PrefetchItem {
  type: string;
  id: string;
  season?: number;
  episode?: number;
}

// Queue for managing prefetch requests
const prefetchQueue: PrefetchItem[] = [];
let isProcessing = false;
const MAX_CONCURRENT = 2; // Max concurrent prefetch requests
const PREFETCH_DELAY = 500; // Delay between prefetches (ms)
let activeRequests = 0;

// Process the prefetch queue
async function processQueue(
  getStreams: (type: string, id: string, season?: number, episode?: number) => any,
  setStreams: (type: string, id: string, streams: any[], season?: number, episode?: number) => void,
  isLoadingStreams: (key: string) => boolean,
  setLoadingStreams: (key: string, loading: boolean) => void
) {
  if (isProcessing || prefetchQueue.length === 0) return;

  isProcessing = true;

  while (prefetchQueue.length > 0 && activeRequests < MAX_CONCURRENT) {
    const item = prefetchQueue.shift();
    if (!item) continue;

    const key = item.season !== undefined && item.episode !== undefined
      ? `${item.type}:${item.id}:${item.season}:${item.episode}`
      : `${item.type}:${item.id}`;

    // Skip if already cached or loading
    const cached = getStreams(item.type, item.id, item.season, item.episode);
    if (cached || isLoadingStreams(key)) continue;

    activeRequests++;
    setLoadingStreams(key, true);

    // Fetch streams in background
    (async () => {
      try {
        let path = `${item.type}/${item.id}`;
        if (item.season !== undefined && item.episode !== undefined) {
          path = `${item.type}/${item.id}:${item.season}:${item.episode}`;
        }

        // TODO: /api/streams endpoint doesn't exist - disable prefetch for now
        // The correct endpoint is /api/play (POST)
        console.debug(`[Prefetch] Would prefetch ${path} - endpoint not implemented`);

        // Early return - don't make broken API call
      } catch (error) {
        // Silently fail - this is background prefetching
        console.debug(`[Prefetch] Failed for ${item.type}/${item.id}:`, error);
      } finally {
        activeRequests--;
        setLoadingStreams(key, false);

        // Continue processing if there are more items
        if (prefetchQueue.length > 0) {
          setTimeout(() => processQueue(getStreams, setStreams, isLoadingStreams, setLoadingStreams), PREFETCH_DELAY);
        }
      }
    })();
  }

  isProcessing = false;
}

/**
 * Hook to prefetch streams for content items
 * Call this with an array of content items after they're displayed
 */
export function useStreamPrefetch() {
  const { getStreams, setStreams, isLoadingStreams, setLoadingStreams } = useContentCache();
  const processTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const prefetchStreams = useCallback((items: PrefetchItem[]) => {
    // Add items to queue (avoid duplicates)
    const existingKeys = new Set(prefetchQueue.map(i =>
      i.season !== undefined ? `${i.type}:${i.id}:${i.season}:${i.episode}` : `${i.type}:${i.id}`
    ));

    for (const item of items) {
      const key = item.season !== undefined ? `${item.type}:${item.id}:${item.season}:${item.episode}` : `${item.type}:${item.id}`;

      // Skip if already in queue or already cached
      if (existingKeys.has(key)) continue;

      const cached = getStreams(item.type, item.id, item.season, item.episode);
      if (cached) continue;

      prefetchQueue.push(item);
      existingKeys.add(key);
    }

    // Start processing after a short delay (to batch requests)
    if (processTimeoutRef.current) {
      clearTimeout(processTimeoutRef.current);
    }

    processTimeoutRef.current = setTimeout(() => {
      processQueue(getStreams, setStreams, isLoadingStreams, setLoadingStreams);
    }, 100);
  }, [getStreams, setStreams, isLoadingStreams, setLoadingStreams]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processTimeoutRef.current) {
        clearTimeout(processTimeoutRef.current);
      }
    };
  }, []);

  return { prefetchStreams };
}

/**
 * Hook that automatically prefetches streams when content is loaded
 * Use this in components that display content lists
 */
export function useAutoPrefetch(items: Array<{ id: string; type: string }> | undefined) {
  const { prefetchStreams } = useStreamPrefetch();
  const prefetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!items || items.length === 0) return;

    // Filter to only new items we haven't prefetched yet
    const newItems = items.filter(item => {
      const key = `${item.type}:${item.id}`;
      if (prefetchedRef.current.has(key)) return false;
      prefetchedRef.current.add(key);
      return true;
    });

    if (newItems.length === 0) return;

    // Delay prefetch to prioritize UI rendering
    const timeout = setTimeout(() => {
      prefetchStreams(newItems.map(item => ({
        type: item.type,
        id: item.id,
      })));
    }, 1000); // Wait 1 second after content loads

    return () => clearTimeout(timeout);
  }, [items, prefetchStreams]);
}
