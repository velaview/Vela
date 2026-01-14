/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CATALOG SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Unified catalog fetching from all providers.
 * This is the main entry point for getting content catalogs.
 */

import { getCinemetaCatalog, getCinemetaMeta } from './cinemeta';
import { getKitsuCatalog, getKitsuMeta } from './kitsu';
import { getTMDBCatalog, getTMDBMeta } from './tmdb';
import { getHanimeCatalog, getHanimeMeta } from './hanime';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Meta {
    id: string;
    type: string;
    name: string;
    poster?: string;
    background?: string;
    description?: string;
    genres?: string[];
    year?: number;
    releaseInfo?: string;
    imdbRating?: string;
    runtime?: string;
    videos?: { id: string; title: string; season?: number; episode?: number }[];
    // Extended fields for caching/enrichment
    cast?: string[];
    director?: string[];
    country?: string;
    language?: string;
}

export interface CatalogDefinition {
    type: string;
    id: string;
    name: string;
    genres?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Exports
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get catalog content from appropriate provider.
 */
export async function getCatalog(
    type: string,
    catalogId: string,
    extra?: Record<string, string>
): Promise<Meta[]> {
    // Route to appropriate provider
    if (type === 'anime' || catalogId.startsWith('kitsu')) {
        return getKitsuCatalog(catalogId, extra) as Promise<Meta[]>;
    }

    if (catalogId === 'hanime' || type === 'hentai') {
        return getHanimeCatalog(catalogId, extra) as Promise<Meta[]>;
    }

    if (catalogId.startsWith('tmdb')) {
        return getTMDBCatalog(type, catalogId, extra) as Promise<Meta[]>;
    }

    // Default: Cinemeta
    return getCinemetaCatalog(type, catalogId, extra) as Promise<Meta[]>;
}

/**
 * Get metadata for a specific item.
 */
export async function getMeta(type: string, id: string): Promise<Meta | null> {
    // Route based on ID prefix
    if (id.startsWith('kitsu:')) {
        return getKitsuMeta(id) as Promise<Meta | null>;
    }

    if (id.startsWith('hanime:')) {
        return getHanimeMeta(id) as Promise<Meta | null>;
    }

    // Try providers in order
    const providers = [
        () => getCinemetaMeta(id, type as 'movie' | 'series'),
        () => getTMDBMeta(id, type as 'movie' | 'series'),
        () => getKitsuMeta(id),
    ];

    for (const provider of providers) {
        try {
            const meta = await provider();
            if (meta) return meta as Meta;
        } catch {
            // Try next
        }
    }

    return null;
}

/**
 * Get available catalogs.
 */
export async function getAvailableCatalogs(): Promise<CatalogDefinition[]> {
    return [
        // Cinemeta
        { type: 'movie', id: 'top', name: 'Popular Movies' },
        { type: 'movie', id: 'year', name: 'New Movies' },
        { type: 'movie', id: 'imdbRating', name: 'Top Rated Movies' },
        { type: 'series', id: 'top', name: 'Popular Series' },
        { type: 'series', id: 'year', name: 'New Series' },
        { type: 'series', id: 'imdbRating', name: 'Top Rated Series' },
        // Kitsu Anime
        { type: 'anime', id: 'kitsu-anime-trending', name: 'Trending Anime' },
        { type: 'anime', id: 'kitsu-anime-most-popular', name: 'Popular Anime' },
        { type: 'anime', id: 'kitsu-anime-highest-rated', name: 'Top Rated Anime' },
        { type: 'anime', id: 'kitsu-anime-newest', name: 'New Anime' },
    ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Backward Compatibility
// ─────────────────────────────────────────────────────────────────────────────

/**
 * catalogService object for backward compatibility.
 */
export const catalogService = {
    getCatalog,
    getMeta,
    getAvailableCatalogs,
};
