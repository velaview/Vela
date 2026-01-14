'use server';

import { catalogService, getHanimeCatalog, type Meta } from '@/core/streaming';
import {
    getRequiredRatingWithFallback,
    EXPLICIT_GENRES,
    SUGGESTIVE_GENRES,
} from '@/lib/utils/content-rating';

// ─────────────────────────────────────────────────────────────
// Logging Utility
// ─────────────────────────────────────────────────────────────
const LOG_PREFIX = '[AnimeExplore:Server]';

// ─────────────────────────────────────────────────────────────
// Catalog Fetching with SFW/NSFW Filter
// ─────────────────────────────────────────────────────────────

export async function getAnimeCatalog(id: string, extra: Record<string, string> = {}): Promise<Meta[]> {
    try {
        // Parse content rating from extra params (default: sfw)
        const contentRating = extra.contentRating || 'sfw';

        // For NSFW mode, fetch directly from Hanime
        let results: Meta[] = [];

        if (contentRating === 'nsfw') {
            try {
                const hanimeItems = await getHanimeCatalog('mostviews', { skip: extra.skip || '0' });

                if (hanimeItems.length > 0) {
                    results = hanimeItems.map(item => ({
                        id: item.id,
                        type: 'movie' as const,
                        name: item.name,
                        poster: item.poster,
                        background: item.background,
                        genres: item.genres || ['Hentai'],
                        description: item.description,
                    }));
                } else {
                    // Fallback to anime catalogs with Ecchi genre
                    results = await catalogService.getCatalog('anime', id, { ...extra, genre: 'Ecchi' });
                }
            } catch {
                results = await catalogService.getCatalog('anime', id, { ...extra, genre: 'Ecchi' });
            }
        } else {
            // SFW mode - use regular anime catalogs
            results = await catalogService.getCatalog('anime', id, extra);
        }

        // Classify each item as SFW or NSFW
        const itemRatings = results.map(item => {
            const genres = item.genres || [];
            const title = item.name || '';
            const rating = getRequiredRatingWithFallback(genres as string[], title);
            const isNsfw = rating !== 'safe';
            return { item, rating, isNsfw, title, genres };
        });

        // Apply SFW/NSFW filter
        let finalResults: Meta[] = [];

        if (contentRating === 'sfw') {
            finalResults = itemRatings.filter(r => !r.isNsfw).map(r => r.item);
        } else if (contentRating === 'nsfw') {
            finalResults = itemRatings.filter(r => r.isNsfw).map(r => r.item);
        } else {
            finalResults = results;
        }

        return finalResults;
    } catch (error) {
        console.error(`${LOG_PREFIX} ❌ ERROR:`, error);
        return [];
    }
}
