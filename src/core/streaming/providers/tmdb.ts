/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TMDB PROVIDER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * TMDB metadata enrichment via Stremio addon.
 * Adds: trailers, cast, crew, keywords, ratings.
 * 
 * Addon: https://94c8cb9f702d-tmdb-addon.baby-beamup.club
 * Verified: Working (tested 2025-12-22)
 */

import type { ContentType } from '../types';

const TMDB_ADDON = 'https://94c8cb9f702d-tmdb-addon.baby-beamup.club';
const TIMEOUT = 15000;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TMDBMeta {
    id: string;
    type: string;
    name: string;
    poster?: string;
    background?: string;
    logo?: string;
    description?: string;
    genres?: string[];
    releaseInfo?: string;
    year?: number;
    runtime?: string;
    imdbRating?: string;
    cast?: string[];
    director?: string[];
    writer?: string[];
    trailers?: { source: string; type: string }[];
    videos?: TMDBVideo[];
}

export interface TMDBVideo {
    id: string;
    title: string;
    season?: number;
    episode?: number;
    released?: string;
    thumbnail?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Exports
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get enriched metadata from TMDB addon.
 */
export async function getTMDBMeta(
    id: string,
    type: ContentType
): Promise<TMDBMeta | null> {
    try {
        const url = `${TMDB_ADDON}/meta/${type}/${id}.json`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data.meta || null;

    } catch (error) {
        console.error('[TMDB] Error:', error);
        return null;
    }
}

/**
 * Get catalog from TMDB addon.
 */
export async function getTMDBCatalog(
    type: string,
    catalogId: string,
    extra?: Record<string, string>
): Promise<TMDBMeta[]> {
    try {
        let url = `${TMDB_ADDON}/catalog/${type}/${catalogId}.json`;

        if (extra && Object.keys(extra).length > 0) {
            const params = Object.entries(extra)
                .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                .join('&');
            url = `${TMDB_ADDON}/catalog/${type}/${catalogId}/${params}.json`;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        return data.metas || [];

    } catch (error) {
        console.error('[TMDB] Catalog error:', error);
        return [];
    }
}

/**
 * Search TMDB catalog.
 */
export async function searchTMDB(
    query: string,
    type: string = 'movie'
): Promise<TMDBMeta[]> {
    return getTMDBCatalog(type, 'search', { search: query });
}
