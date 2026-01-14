/**
 * ═══════════════════════════════════════════════════════════════════════════
 * OPENSUBTITLES PROVIDER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Uses OpenSubtitles Stremio addon.
 * NO API KEY REQUIRED! (tested 2025-12-22)
 */

import { Subtitle, ContentType } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const OPENSUBTITLES_STREMIO = 'https://opensubtitles-v3.strem.io';
const TIMEOUT = 10000;

// Language code to name mapping
const LANGUAGE_NAMES: Record<string, string> = {
    eng: 'English',
    spa: 'Spanish',
    fra: 'French',
    deu: 'German',
    ita: 'Italian',
    por: 'Portuguese',
    pob: 'Portuguese (BR)',
    rus: 'Russian',
    jpn: 'Japanese',
    kor: 'Korean',
    zho: 'Chinese',
    ara: 'Arabic',
    hin: 'Hindi',
    tur: 'Turkish',
    pol: 'Polish',
    nld: 'Dutch',
    ell: 'Greek',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch subtitles from OpenSubtitles Stremio addon.
 * No authentication required!
 */
export async function getSubtitles(
    contentId: string,
    type: ContentType,
    season?: number,
    episode?: number
): Promise<Subtitle[]> {
    try {
        // Build subtitle ID
        let subId = contentId;
        if (type === 'series' && season !== undefined && episode !== undefined) {
            subId = `${contentId}:${season}:${episode}`;
        }

        const url = `${OPENSUBTITLES_STREMIO}/subtitles/${type}/${subId}.json`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        const subtitles = data.subtitles || [];

        return subtitles.map((s: { id: string; lang: string; url: string }, i: number) => ({
            id: s.id || `sub-${i}`,
            language: s.lang,
            languageName: LANGUAGE_NAMES[s.lang] || s.lang,
            url: s.url,
        }));

    } catch (error) {
        console.error('[OpenSubtitles] Error:', error);
        return [];
    }
}
