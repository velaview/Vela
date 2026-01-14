/**
 * ═══════════════════════════════════════════════════════════════════════════
 * KITSU PROVIDER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Anime metadata and catalogs from Kitsu Stremio addon.
 * Verified working (tested 2025-12-22).
 */

import type { ContentType } from '../types';

const KITSU = 'https://anime-kitsu.strem.fun';
const TIMEOUT = 15000;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AnimeMeta {
    id: string;
    type: string;
    name: string;
    poster?: string;
    background?: string;
    description?: string;
    genres?: string[];
    status?: string;
    episodes?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Exports
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get anime metadata.
 */
export async function getKitsuMeta(id: string): Promise<AnimeMeta | null> {
    try {
        const url = `${KITSU}/meta/anime/${id}.json`;

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
        console.error('[Kitsu] Error:', error);
        return null;
    }
}

/**
 * Get anime catalog.
 */
export async function getKitsuCatalog(
    catalogId: string = 'kitsu-anime-most-popular',
    extra?: Record<string, string>
): Promise<AnimeMeta[]> {
    try {
        let url = `${KITSU}/catalog/anime/${catalogId}.json`;

        if (extra && Object.keys(extra).length > 0) {
            const params = Object.entries(extra)
                .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                .join('&');
            url = `${KITSU}/catalog/anime/${catalogId}/${params}.json`;
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
        console.error('[Kitsu] Catalog error:', error);
        return [];
    }
}
