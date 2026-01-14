/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CINEMETA PROVIDER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Movies & Series metadata from Cinemeta Stremio addon.
 * Verified working (tested 2025-12-22).
 */

import type { ContentType } from '../types';

const CINEMETA = 'https://v3-cinemeta.strem.io';
const TIMEOUT = 15000;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ContentMeta {
    id: string;
    type: string;
    name: string;
    poster?: string;
    background?: string;
    description?: string;
    genres?: string[];
    year?: number;
    runtime?: string;
    cast?: string[];
    director?: string[];
    imdbRating?: string;
    videos?: Episode[];
}

export interface Episode {
    id: string;
    title: string;
    season: number;
    episode: number;
    released?: string;
    thumbnail?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Exports
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get metadata for content (movie or series).
 */
export async function getCinemetaMeta(
    id: string,
    type: ContentType
): Promise<ContentMeta | null> {
    try {
        const url = `${CINEMETA}/meta/${type}/${id}.json`;

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
        console.error('[Cinemeta] Error:', error);
        return null;
    }
}

/**
 * Get catalog items.
 */
export async function getCinemetaCatalog(
    type: string,
    catalogId: string,
    extra?: Record<string, string>
): Promise<ContentMeta[]> {
    try {
        let url = `${CINEMETA}/catalog/${type}/${catalogId}.json`;

        if (extra && Object.keys(extra).length > 0) {
            const params = Object.entries(extra)
                .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                .join('&');
            url = `${CINEMETA}/catalog/${type}/${catalogId}/${params}.json`;
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
        console.error('[Cinemeta] Catalog error:', error);
        return [];
    }
}
