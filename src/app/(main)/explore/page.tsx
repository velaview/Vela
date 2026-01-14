'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getKitsuCatalog, type Meta } from '@/core/streaming';
import { MasonryGrid } from '@/components/explore/masonry-grid';
import { SidebarFilters, SidebarAnimeFilters } from '@/components/explore/sidebar-filters';
import { QuickView } from '@/components/explore/quick-view';
import { Sparkles } from 'lucide-react';
import { maturityToContentRating, MaturityLevel, passesRatingFilter, getRequiredRating } from '@/lib/utils/content-rating';

// ─────────────────────────────────────────────────────────────
// Logging Utility
// ─────────────────────────────────────────────────────────────
const LOG_PREFIX = '[ExplorePage]';
const log = {
  info: (msg: string, data?: unknown) => console.log(`${LOG_PREFIX} ℹ️ ${msg}`, data ?? ''),
  warn: (msg: string, data?: unknown) => console.warn(`${LOG_PREFIX} ⚠️ ${msg}`, data ?? ''),
  error: (msg: string, data?: unknown) => console.error(`${LOG_PREFIX} ❌ ${msg}`, data ?? ''),
  success: (msg: string, data?: unknown) => console.log(`${LOG_PREFIX} ✅ ${msg}`, data ?? ''),
  fetch: (msg: string, data?: unknown) => console.log(`${LOG_PREFIX} 🔄 ${msg}`, data ?? ''),
  filter: (msg: string, data?: unknown) => console.log(`${LOG_PREFIX} 🔍 ${msg}`, data ?? ''),
  action: (msg: string, data?: unknown) => console.log(`${LOG_PREFIX} 👆 ${msg}`, data ?? ''),
};

export default function ExplorePage() {
  const [items, setItems] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SidebarAnimeFilters>({ sort: 'trending', contentRating: 'safe' });
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Meta | null>(null);
  const fetchCount = useRef(0);

  // Page mount logging
  useEffect(() => {
    log.info('Page mounted', { timestamp: new Date().toISOString() });
    return () => log.info('Page unmounted');
  }, []);

  // Load user preferences on mount and set default content rating
  useEffect(() => {
    async function loadUserPreferences() {
      log.fetch('Loading user preferences from /api/user/preferences');
      const startTime = performance.now();

      try {
        const res = await fetch('/api/user/preferences');
        const elapsed = (performance.now() - startTime).toFixed(0);

        if (res.ok) {
          const data = await res.json();
          const maturity = (data.preferences?.maturityLevel as MaturityLevel) || 'all';
          const defaultRating = maturityToContentRating(maturity);

          log.success(`Preferences loaded in ${elapsed}ms`, {
            maturityLevel: maturity,
            mappedContentRating: defaultRating,
            rawPreferences: data.preferences,
          });

          setFilters(prev => ({ ...prev, contentRating: defaultRating }));
        } else {
          log.warn(`Preferences API returned ${res.status} in ${elapsed}ms`);
        }
      } catch (error) {
        log.error('Failed to load user preferences', error);
      } finally {
        setPrefsLoaded(true);
      }
    }
    loadUserPreferences();
  }, []);

  // Track filter changes
  const handleFilterChange = useCallback((newFilters: SidebarAnimeFilters) => {
    log.filter('Filter change detected', {
      previous: filters,
      new: newFilters,
      changes: {
        sort: filters.sort !== newFilters.sort ? `${filters.sort} → ${newFilters.sort}` : 'unchanged',
        contentRating: filters.contentRating !== newFilters.contentRating ? `${filters.contentRating} → ${newFilters.contentRating}` : 'unchanged',
        genre: filters.genre !== newFilters.genre ? `${filters.genre || 'none'} → ${newFilters.genre || 'none'}` : 'unchanged',
      },
    });
    setFilters(newFilters);
  }, [filters]);

  const fetchItems = useCallback(async (reset = false) => {
    const fetchId = ++fetchCount.current;
    setLoading(true);

    const fetchStartTime = performance.now();
    log.fetch(`Fetch #${fetchId} started`, {
      reset,
      currentSkip: reset ? 0 : skip,
      filters,
    });

    try {
      const currentSkip = reset ? 0 : skip;
      let newItems: Meta[] = [];

      // Determine which catalog to fetch based on sort/filters
      const catalogMap: Record<string, string> = {
        trending: 'kitsu-anime-trending',
        popular: 'kitsu-anime-most-popular',
        rating: 'kitsu-anime-highest-rated',
        newest: 'kitsu-anime-newest',
      };

      log.fetch(`Fetch #${fetchId}: Requesting ${filters.sort || 'trending'} catalog`, {
        catalogId: catalogMap[filters.sort || 'trending'] || 'kitsu-anime-trending',
        skip: currentSkip,
      });

      if (filters.sort === 'trending') {
        newItems = await getKitsuCatalog('kitsu-anime-trending', { skip: String(currentSkip) });
      } else if (filters.sort === 'popular') {
        newItems = await getKitsuCatalog('kitsu-anime-most-popular', { skip: String(currentSkip) });
      } else if (filters.sort === 'rating') {
        newItems = await getKitsuCatalog('kitsu-anime-highest-rated', { skip: String(currentSkip) });
      } else if (filters.sort === 'newest') {
        newItems = await getKitsuCatalog('kitsu-anime-newest', { skip: String(currentSkip) });
      } else {
        newItems = await getKitsuCatalog('kitsu-anime-trending', { skip: String(currentSkip) });
      }

      const rawCount = newItems.length;

      // Apply content rating filter
      if (filters.contentRating !== 'mature') {
        const beforeFilter = newItems.length;
        newItems = newItems.filter(item => {
          const genres = item.genres || [];
          const passes = passesRatingFilter(genres, filters.contentRating || 'safe');
          if (!passes) {
            log.filter(`Filtered out: "${item.name}"`, {
              genres,
              requiredRating: getRequiredRating(genres),
              allowedRating: filters.contentRating,
            });
          }
          return passes;
        });

        if (beforeFilter !== newItems.length) {
          log.filter(`Content rating filter applied`, {
            rating: filters.contentRating,
            before: beforeFilter,
            after: newItems.length,
            filtered: beforeFilter - newItems.length,
          });
        }
      }

      const elapsed = (performance.now() - fetchStartTime).toFixed(0);

      if (newItems.length === 0) {
        log.warn(`Fetch #${fetchId}: No more items`, { elapsed: `${elapsed}ms` });
        setHasMore(false);
      } else {
        log.success(`Fetch #${fetchId}: Completed in ${elapsed}ms`, {
          rawCount,
          filteredCount: newItems.length,
          firstThree: newItems.slice(0, 3).map(i => ({ name: i.name, genres: i.genres?.slice(0, 3) })),
          totalAfterMerge: reset ? newItems.length : items.length + newItems.length,
        });
        setItems(prev => reset ? newItems : [...prev, ...newItems]);
        setSkip(prev => prev + newItems.length);
      }
    } catch (error) {
      const elapsed = (performance.now() - fetchStartTime).toFixed(0);
      log.error(`Fetch #${fetchId}: Failed after ${elapsed}ms`, error);
    } finally {
      setLoading(false);
    }
  }, [filters, skip, items.length]);

  // Handle item click
  const handleItemClick = useCallback((item: Meta) => {
    log.action('Item clicked', {
      id: item.id,
      name: item.name,
      type: item.type,
      genres: item.genres,
    });
    setSelectedItem(item);
  }, []);

  // Handle quick view close
  const handleQuickViewClose = useCallback(() => {
    log.action('QuickView closed', { previousItem: selectedItem?.name });
    setSelectedItem(null);
  }, [selectedItem]);

  // Initial fetch and filter change - wait for preferences to load first
  useEffect(() => {
    if (!prefsLoaded) return; // Don't fetch until preferences are loaded
    setSkip(0);
    setHasMore(true);
    fetchItems(true);
  }, [filters, prefsLoaded]);
  // Note: We don't include fetchItems in dependency array to avoid loops, 
  // but we depend on filters changing to trigger reset.

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchItems(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      {/* Header */}
      <div className="pt-24 px-4 md:px-8 lg:px-12 max-w-[2000px] mx-auto">
        <div className="flex items-center gap-3 mb-2 text-primary font-bold text-xs uppercase tracking-[0.3em] animate-in fade-in slide-in-from-top-4 duration-700">
          <Sparkles className="w-4 h-4" />
          <span>Endless Discovery</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 animate-in fade-in slide-in-from-left-4 duration-700 delay-100">
          Explore Anime
        </h1>

        <SidebarFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          className="mb-8"
        />

        <MasonryGrid
          items={items}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          onItemClick={handleItemClick}
        />
      </div>

      {/* Branching / Quick View */}
      <QuickView
        item={selectedItem}
        onClose={handleQuickViewClose}
      />

    </div>
  );
}
