'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { type Meta } from '@/core/streaming';
import { MasonryGrid } from '@/components/explore/masonry-grid';
import { SidebarFilters, SidebarAnimeFilters } from '@/components/explore/sidebar-filters';
import { QuickView } from '@/components/explore/quick-view';
import { getAnimeCatalog } from './actions';

// ─────────────────────────────────────────────────────────────
// Logging Utility
// ─────────────────────────────────────────────────────────────
const LOG_PREFIX = '[AnimeExplore:Client]';
const log = {
    info: (msg: string, data?: unknown) => console.log(`${LOG_PREFIX} ℹ️ ${msg}`, data ?? ''),
    warn: (msg: string, data?: unknown) => console.warn(`${LOG_PREFIX} ⚠️ ${msg}`, data ?? ''),
    error: (msg: string, data?: unknown) => console.error(`${LOG_PREFIX} ❌ ${msg}`, data ?? ''),
    success: (msg: string, data?: unknown) => console.log(`${LOG_PREFIX} ✅ ${msg}`, data ?? ''),
    fetch: (msg: string, data?: unknown) => console.log(`${LOG_PREFIX} 🔄 ${msg}`, data ?? ''),
    filter: (msg: string, data?: unknown) => console.log(`${LOG_PREFIX} 🔍 ${msg}`, data ?? ''),
    action: (msg: string, data?: unknown) => console.log(`${LOG_PREFIX} 👆 ${msg}`, data ?? ''),
};

export default function AnimeExplorePage() {
    const [items, setItems] = useState<Meta[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<SidebarAnimeFilters>({ sort: 'trending', contentRating: 'safe' });
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [selectedItem, setSelectedItem] = useState<Meta | null>(null);

    // Use ref to track loading state synchronously to prevent double-fetches
    const loadingRef = useRef(false);
    const fetchCount = useRef(0);
    const prevFiltersRef = useRef<SidebarAnimeFilters | null>(null);

    const fetchItems = useCallback(async (reset = false) => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        setLoading(true);

        const fetchId = ++fetchCount.current;
        const startTime = performance.now();

        try {
            const currentSkip = reset ? 0 : skip;
            let newItems: Meta[] = [];
            const extra: Record<string, string> = { skip: currentSkip.toString() };

            // Determine catalog based on sort
            const catalogMap: Record<string, string> = {
                trending: 'anilist_trending-now',
                popular: 'anilist_all-time-popular',
                rating: 'anilist_top-anime',
                newest: 'anilist_popular-this-season',
            };
            const catalogId = catalogMap[filters.sort || 'trending'] || 'anilist_trending-now';

            // Add filters
            if (filters.genre) extra.genre = filters.genre;
            if (filters.contentRating) extra.contentRating = filters.contentRating;

            log.fetch(`Fetch #${fetchId} started`, {
                catalog: catalogId,
                skip: currentSkip,
                contentRating: filters.contentRating,
                genre: filters.genre || 'none',
                reset,
            });

            newItems = await getAnimeCatalog(catalogId, extra);

            const elapsed = (performance.now() - startTime).toFixed(0);

            log.success(`Fetch #${fetchId} completed in ${elapsed}ms`, {
                itemCount: newItems.length,
            });

            // Log all returned titles
            if (newItems.length > 0) {
                log.info(`Titles received (${newItems.length}):`,
                    newItems.map((item, idx) => `${idx + 1}. ${item.name}`).join('\n')
                );
            }

            if (newItems.length === 0) {
                log.warn('No more items available');
                setHasMore(false);
            } else {
                setItems(prev => {
                    if (reset) {
                        log.info(`Reset: Displaying ${newItems.length} items`);
                        return newItems;
                    }
                    const currentIds = new Set(prev.map(i => i.id));
                    const uniqueNew = newItems.filter(i => !currentIds.has(i.id));
                    log.info(`Merged ${uniqueNew.length} unique items (${newItems.length - uniqueNew.length} duplicates removed)`);
                    return [...prev, ...uniqueNew];
                });
                setSkip(prev => prev + newItems.length);
            }
        } catch (error) {
            log.error(`Fetch #${fetchId} failed`, error);
        } finally {
            setLoading(false);
            loadingRef.current = false;
        }
    }, [filters, skip]);

    // Track filter changes
    const handleFilterChange = useCallback((newFilters: SidebarAnimeFilters) => {
        const prev = prevFiltersRef.current || filters;

        log.filter('═══════════════════════════════════════');
        log.filter('FILTER CHANGE DETECTED');
        log.filter('═══════════════════════════════════════');

        if (prev.sort !== newFilters.sort) {
            log.filter(`Sort: "${prev.sort}" → "${newFilters.sort}"`);
        }
        if (prev.contentRating !== newFilters.contentRating) {
            log.filter(`Content Rating: "${prev.contentRating}" → "${newFilters.contentRating}"`);
        }
        if (prev.genre !== newFilters.genre) {
            log.filter(`Genre: "${prev.genre || 'none'}" → "${newFilters.genre || 'none'}"`);
        }

        log.filter('New filter state:', newFilters);
        log.filter('═══════════════════════════════════════');

        prevFiltersRef.current = newFilters;
        setFilters(newFilters);
    }, [filters]);

    // Initial fetch and filter change
    useEffect(() => {
        log.info('Filter effect triggered, resetting and fetching...');
        setSkip(0);
        setHasMore(true);
        setItems([]);
        loadingRef.current = false;
        fetchItems(true);
    }, [filters]);

    const handleLoadMore = () => {
        if (!loading && hasMore && !loadingRef.current) {
            log.action(`Load more requested (current: ${items.length} items, skip: ${skip})`);
            fetchItems(false);
        }
    };

    const handleItemClick = (item: Meta) => {
        log.action(`Item clicked: "${item.name}"`, {
            id: item.id,
            type: item.type,
            genres: item.genres,
        });
        window.location.href = `/${item.type}/${item.id}`;
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">

            <div className="pt-4 px-4 md:px-8 lg:px-12 max-w-[2000px] mx-auto">

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 relative">

                    {/* Main Content Wall */}
                    <div className="min-h-screen">
                        <MasonryGrid
                            items={items}
                            loading={loading}
                            hasMore={hasMore}
                            onLoadMore={handleLoadMore}
                            onItemClick={handleItemClick}
                        />
                    </div>

                    {/* Persistent Sidebar */}
                    <div className="hidden lg:block relative">
                        <div className="sticky top-24 h-auto">
                            <SidebarFilters
                                filters={filters}
                                onFilterChange={handleFilterChange}
                            />
                        </div>
                    </div>

                    <div className="lg:hidden mb-8">
                        <SidebarFilters
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            className="h-auto pb-0"
                        />
                    </div>

                </div>
            </div>

        </div>
    );
}
