/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TORRENTIO PROVIDER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Torrent stream sources from Torrentio Stremio addon.
 * Returns infoHashes that need resolution via TorBox.
 * 
 * Verified: 50+ streams per title (tested 2025-12-22).
 */

import type { ContentType, Quality } from '../types';

const TORRENTIO = 'https://torrentio.strem.fun';
const TIMEOUT = 15000;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TorrentioStream {
    infoHash: string;
    fileIdx?: number;
    name: string;
    title: string;
    quality: Quality;
    size?: string;
    seeders?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get torrent sources for content.
 * Returns infoHashes - NOT direct URLs.
 * Use TorBox to resolve these to HLS.
 */
export async function getTorrentioStreams(
    contentId: string,
    type: ContentType,
    season?: number,
    episode?: number
): Promise<TorrentioStream[]> {
    try {
        // Build stream ID
        let streamId = contentId;
        if (type === 'series' && season !== undefined && episode !== undefined) {
            streamId = `${contentId}:${season}:${episode}`;
        }

        const url = `${TORRENTIO}/stream/${type}/${streamId}.json`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        const streams = data.streams || [];

        return streams
            .filter((s: { infoHash?: string }) => s.infoHash)
            .map((s: { infoHash: string; fileIdx?: number; name?: string; title?: string }) => ({
                infoHash: s.infoHash,
                fileIdx: s.fileIdx,
                name: s.name || 'Torrentio',
                title: s.title || '',
                quality: extractQuality(s.name || s.title || ''),
                size: extractSize(s.title || ''),
                seeders: extractSeeders(s.title || ''),
            }));

    } catch (error) {
        console.error('[Torrentio] Error:', error);
        return [];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function extractQuality(text: string): Quality {
    const lower = text.toLowerCase();

    if (lower.includes('4k') || lower.includes('2160p')) return '4k';
    if (lower.includes('1080p')) return '1080p';
    if (lower.includes('720p')) return '720p';
    if (lower.includes('480p')) return '480p';

    return 'unknown';
}

function extractSize(text: string): string | undefined {
    const match = text.match(/(\d+(?:\.\d+)?)\s*(GB|MB|TB)/i);
    if (match) {
        return `${match[1]} ${match[2].toUpperCase()}`;
    }
    return undefined;
}

function extractSeeders(text: string): number | undefined {
    // Look for 👤 or seeders pattern
    const match = text.match(/👤\s*(\d+)/);
    if (match) {
        return parseInt(match[1]);
    }
    return undefined;
}
