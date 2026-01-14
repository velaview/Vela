/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HANIME PROVIDER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Adult anime content via Hanime Stremio addon.
 * 
 * Addon: https://86f0740f37f6-hanime-stremio.baby-beamup.club
 * Catalogs work without auth, streams require session cookies.
 * 
 * Verified: Catalogs working (tested 2025-12-22)
 */

import type { Stream, Quality, ContentType } from '../types';

const HANIME_ADDON = 'https://86f0740f37f6-hanime-stremio.baby-beamup.club';
const TIMEOUT = 15000;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface HanimeMeta {
    id: string;
    type: string;
    name: string;
    poster?: string;
    background?: string;
    description?: string;
    genres?: string[];
    releaseInfo?: string;
}

export interface HanimeStream {
    url: string;
    name: string;
    quality: Quality;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Exports
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get Hanime catalog.
 * Available catalogs: mostviews, browse, random, new, trending
 */
export async function getHanimeCatalog(
    catalogId: string = 'mostviews',
    extra?: Record<string, string>
): Promise<HanimeMeta[]> {
    try {
        let url = `${HANIME_ADDON}/catalog/movie/${catalogId}.json`;

        if (extra && Object.keys(extra).length > 0) {
            const params = Object.entries(extra)
                .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                .join('&');
            url = `${HANIME_ADDON}/catalog/movie/${catalogId}/${params}.json`;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
            console.error(`[Hanime] Catalog error: ${response.status}`);
            return [];
        }

        const data = await response.json();
        return data.metas || [];

    } catch (error) {
        console.error('[Hanime] Catalog error:', error);
        return [];
    }
}

/**
 * Get Hanime metadata.
 */
export async function getHanimeMeta(id: string): Promise<HanimeMeta | null> {
    try {
        const url = `${HANIME_ADDON}/meta/movie/${id}.json`;

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
        console.error('[Hanime] Meta error:', error);
        return null;
    }
}

/**
 * Get Hanime streams.
 * Note: Requires authenticated session for actual playback.
 */
export async function getHanimeStreams(id: string): Promise<Stream[]> {
    try {
        const url = `${HANIME_ADDON}/stream/movie/${id}.json`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
            console.error(`[Hanime] Stream error: ${response.status}`);
            return [];
        }

        const data = await response.json();
        const streams = data.streams || [];

        return streams.map((s: { url?: string; name?: string; title?: string }) => ({
            url: s.url || '',
            name: s.name || 'Hanime',
            title: s.title || '',
            quality: extractQuality(s.name || s.title || ''),
            source: 'hanime' as const,
            _sourceAddon: 'hanime',
        })).filter((s: Stream) => s.url);

    } catch (error) {
        console.error('[Hanime] Stream error:', error);
        return [];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function extractQuality(text: string): Quality {
    const lower = text.toLowerCase();

    if (lower.includes('1080')) return '1080p';
    if (lower.includes('720')) return '720p';
    if (lower.includes('480')) return '480p';
    if (lower.includes('360')) return '480p';

    return 'unknown';
}
