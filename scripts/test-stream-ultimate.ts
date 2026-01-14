/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ULTIMATE STREAM RESOLUTION TEST SUITE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Comprehensive testing of ALL stream resolution strategies to determine
 * the fastest and most reliable approach.
 * 
 * Run: npx tsx scripts/test-stream-ultimate.ts
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment
if (fs.existsSync('.env.local')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TORBOX_API = 'https://api.torbox.app/v1/api';
const TORBOX_API_KEY = process.env.TORBOX_API_KEY || '';
const TORBOX_STREMIO = `https://stremio.torbox.app/${TORBOX_API_KEY}`;
const TORRENTIO = 'https://torrentio.strem.fun';
const CINEMETA = 'https://v3-cinemeta.strem.io';
const KITSU_ADDON = 'https://anime-kitsu.strem.fun';
const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const TIMEOUT = 15000;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TestContent {
    id: string;
    name: string;
    type: 'movie' | 'series';
    provider: 'imdb' | 'tmdb' | 'kitsu';
    season?: number;
    episode?: number;
}

interface TestMetrics {
    method: string;
    content: string;

    // Timing breakdown
    totalLatencyMs: number;
    torrentioLatencyMs?: number;
    cacheCheckLatencyMs?: number;
    libraryCheckLatencyMs?: number;
    hlsCreationLatencyMs?: number;

    // Quality
    streamCount: number;
    quality: string;
    hasHLS: boolean;
    hasMultiAudio: boolean;
    audioTrackCount: number;
    audioLanguages: string[];

    // Reliability
    success: boolean;
    errorType?: 'timeout' | 'no_streams' | 'not_cached' | 'not_in_library' | 'hls_failed' | 'conversion_failed' | 'network';
    error?: string;

    // URL info
    urlType: 'hls' | 'mp4' | 'mkv' | 'redirect' | 'unknown' | 'none';
    finalUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Content
// ─────────────────────────────────────────────────────────────────────────────

const TEST_CONTENT: TestContent[] = [
    // IMDB IDs - Direct resolution
    { id: 'tt0111161', name: 'Shawshank Redemption', type: 'movie', provider: 'imdb' },
    { id: 'tt0944947', name: 'Game of Thrones S1E1', type: 'series', provider: 'imdb', season: 1, episode: 1 },
    { id: 'tt0816692', name: 'Interstellar', type: 'movie', provider: 'imdb' }, // 4K/Common
    { id: 'tt0133093', name: 'The Matrix', type: 'movie', provider: 'imdb' }, // Older/Classic

    // TMDB ID - Requires conversion
    { id: 'tmdb:634649', name: 'Spider-Man: No Way Home', type: 'movie', provider: 'tmdb' },

    // Kitsu ID - Requires conversion
    { id: 'kitsu:7442', name: 'Attack on Titan S1E1', type: 'series', provider: 'kitsu', season: 1, episode: 1 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        return response;
    } finally {
        clearTimeout(timeout);
    }
}

function detectUrlType(url: string): TestMetrics['urlType'] {
    if (!url) return 'none';
    const lower = url.toLowerCase();
    if (lower.includes('.m3u8') || lower.includes('playlist') || lower.includes('hls')) return 'hls';
    if (lower.includes('.mp4')) return 'mp4';
    if (lower.includes('.mkv')) return 'mkv';
    if (lower.includes('new-stream-url') || lower.includes('redirect')) return 'redirect';
    return 'unknown';
}

function extractQuality(text: string): string {
    if (!text) return 'unknown';
    const match = text.match(/\d{3,4}p/i);
    return match ? match[0].toLowerCase() : 'unknown';
}

function buildStreamId(content: TestContent): string {
    const baseId = content.id.replace('tmdb:', '').replace('kitsu:', '');
    if (content.season && content.episode) {
        return `${baseId}:${content.season}:${content.episode}`;
    }
    return baseId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1: ID Conversion Tests
// ─────────────────────────────────────────────────────────────────────────────

async function convertTmdbToImdb(tmdbId: string, type: string): Promise<{ imdbId: string | null; latencyMs: number }> {
    const start = performance.now();

    if (!TMDB_API_KEY) {
        return { imdbId: null, latencyMs: 0 };
    }

    try {
        const mediaType = type === 'movie' ? 'movie' : 'tv';
        const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
        const response = await fetchWithTimeout(url);

        if (!response.ok) {
            return { imdbId: null, latencyMs: Math.round(performance.now() - start) };
        }

        const data = await response.json();
        const imdbId = data.imdb_id;

        return {
            imdbId: imdbId?.startsWith('tt') ? imdbId : null,
            latencyMs: Math.round(performance.now() - start),
        };
    } catch {
        return { imdbId: null, latencyMs: Math.round(performance.now() - start) };
    }
}

async function convertKitsuToImdb(kitsuId: string): Promise<{ imdbId: string | null; latencyMs: number }> {
    const start = performance.now();

    try {
        const url = `${KITSU_ADDON}/meta/anime/${kitsuId}.json`;
        const response = await fetchWithTimeout(url);

        if (!response.ok) {
            return { imdbId: null, latencyMs: Math.round(performance.now() - start) };
        }

        const data = await response.json();
        const meta = data.meta;

        // Try multiple locations
        let imdbId = meta?.behaviorHints?.defaultVideoId || meta?.imdb_id;

        if (!imdbId && meta?.links) {
            const imdbLink = meta.links.find((link: any) =>
                link.category === 'imdb' || link.url?.includes('imdb.com')
            );
            if (imdbLink) {
                const match = imdbLink.url?.match(/tt\d+/);
                if (match) imdbId = match[0];
            }
        }

        return {
            imdbId: imdbId?.startsWith('tt') ? imdbId : null,
            latencyMs: Math.round(performance.now() - start),
        };
    } catch {
        return { imdbId: null, latencyMs: Math.round(performance.now() - start) };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Methods
// ─────────────────────────────────────────────────────────────────────────────

// Method 1: Torrentio Only (hashes, no playable URL)
async function testTorrentioOnly(content: TestContent, imdbId: string): Promise<TestMetrics> {
    const start = performance.now();
    const streamId = buildStreamId({ ...content, id: imdbId });
    const url = `${TORRENTIO}/stream/${content.type}/${streamId}.json`;

    try {
        const resp = await fetchWithTimeout(url);
        if (!resp.ok) {
            return {
                method: 'TORRENTIO_ONLY',
                content: content.name,
                totalLatencyMs: Math.round(performance.now() - start),
                streamCount: 0,
                quality: 'unknown',
                hasHLS: false,
                hasMultiAudio: false,
                audioTrackCount: 0,
                audioLanguages: [],
                success: false,
                errorType: 'network',
                error: `HTTP ${resp.status}`,
                urlType: 'none',
            };
        }

        const data = await resp.json();
        const streams = data.streams || [];
        const best = streams.find((s: any) => s.title?.includes('1080p')) || streams[0];

        return {
            method: 'TORRENTIO_ONLY',
            content: content.name,
            totalLatencyMs: Math.round(performance.now() - start),
            torrentioLatencyMs: Math.round(performance.now() - start),
            streamCount: streams.length,
            quality: extractQuality(best?.title || best?.name || ''),
            hasHLS: false,
            hasMultiAudio: false,
            audioTrackCount: 0,
            audioLanguages: [],
            success: streams.length > 0,
            errorType: streams.length === 0 ? 'no_streams' : undefined,
            urlType: 'none', // Torrentio returns magnet/infoHash, not playable URLs
        };
    } catch (e) {
        return {
            method: 'TORRENTIO_ONLY',
            content: content.name,
            totalLatencyMs: Math.round(performance.now() - start),
            streamCount: 0,
            quality: 'unknown',
            hasHLS: false,
            hasMultiAudio: false,
            audioTrackCount: 0,
            audioLanguages: [],
            success: false,
            errorType: 'network',
            error: String(e),
            urlType: 'none',
        };
    }
}

// Method 2: TorBox Stremio (direct addon URLs)
async function testTorBoxStremio(content: TestContent, imdbId: string): Promise<TestMetrics> {
    const start = performance.now();

    if (!TORBOX_API_KEY) {
        return {
            method: 'TORBOX_STREMIO',
            content: content.name,
            totalLatencyMs: 0,
            streamCount: 0,
            quality: 'unknown',
            hasHLS: false,
            hasMultiAudio: false,
            audioTrackCount: 0,
            audioLanguages: [],
            success: false,
            error: 'No API key',
            urlType: 'none',
        };
    }

    const streamId = buildStreamId({ ...content, id: imdbId });
    const url = `${TORBOX_STREMIO}/stream/${content.type}/${streamId}.json`;

    try {
        const resp = await fetchWithTimeout(url);
        if (!resp.ok) {
            return {
                method: 'TORBOX_STREMIO',
                content: content.name,
                totalLatencyMs: Math.round(performance.now() - start),
                streamCount: 0,
                quality: 'unknown',
                hasHLS: false,
                hasMultiAudio: false,
                audioTrackCount: 0,
                audioLanguages: [],
                success: false,
                errorType: 'network',
                error: `HTTP ${resp.status}`,
                urlType: 'none',
            };
        }

        const data = await resp.json();
        const streams = data.streams || [];
        const best = streams.find((s: any) =>
            s.name?.includes('1080p') || s.title?.includes('1080p')
        ) || streams[0];

        const streamUrl = best?.url || '';
        const urlType = detectUrlType(streamUrl);

        return {
            method: 'TORBOX_STREMIO',
            content: content.name,
            totalLatencyMs: Math.round(performance.now() - start),
            streamCount: streams.length,
            quality: extractQuality(best?.name || best?.title || ''),
            hasHLS: urlType === 'hls',
            hasMultiAudio: false, // Can't know without probing
            audioTrackCount: 0,
            audioLanguages: [],
            success: streams.length > 0 && !!streamUrl,
            errorType: streams.length === 0 ? 'no_streams' : undefined,
            urlType,
            finalUrl: streamUrl.substring(0, 80),
        };
    } catch (e) {
        return {
            method: 'TORBOX_STREMIO',
            content: content.name,
            totalLatencyMs: Math.round(performance.now() - start),
            streamCount: 0,
            quality: 'unknown',
            hasHLS: false,
            hasMultiAudio: false,
            audioTrackCount: 0,
            audioLanguages: [],
            success: false,
            errorType: 'timeout',
            error: String(e),
            urlType: 'none',
        };
    }
}

// Method 3: Hybrid Cached (Torrentio → cache check → library → HLS)
async function testHybridCached(content: TestContent, imdbId: string): Promise<TestMetrics> {
    const totalStart = performance.now();
    let torrentioTime = 0, cacheCheckTime = 0, libraryTime = 0, hlsTime = 0;

    if (!TORBOX_API_KEY) {
        return {
            method: 'HYBRID_CACHED',
            content: content.name,
            totalLatencyMs: 0,
            streamCount: 0,
            quality: 'unknown',
            hasHLS: false,
            hasMultiAudio: false,
            audioTrackCount: 0,
            audioLanguages: [],
            success: false,
            error: 'No API key',
            urlType: 'none',
        };
    }

    try {
        // Step 1: Get hashes from Torrentio
        const torrentioStart = performance.now();
        const streamId = buildStreamId({ ...content, id: imdbId });
        const torrentioUrl = `${TORRENTIO}/stream/${content.type}/${streamId}.json`;
        const torrentioResp = await fetchWithTimeout(torrentioUrl);
        torrentioTime = Math.round(performance.now() - torrentioStart);

        if (!torrentioResp.ok) {
            return {
                method: 'HYBRID_CACHED',
                content: content.name,
                totalLatencyMs: Math.round(performance.now() - totalStart),
                torrentioLatencyMs: torrentioTime,
                streamCount: 0,
                quality: 'unknown',
                hasHLS: false,
                hasMultiAudio: false,
                audioTrackCount: 0,
                audioLanguages: [],
                success: false,
                errorType: 'network',
                error: 'Torrentio failed',
                urlType: 'none',
            };
        }

        const torrentioData = await torrentioResp.json();
        const torrents = (torrentioData.streams || []).slice(0, 15);
        const hashes = torrents.map((t: any) => t.infoHash).filter(Boolean);

        if (hashes.length === 0) {
            return {
                method: 'HYBRID_CACHED',
                content: content.name,
                totalLatencyMs: Math.round(performance.now() - totalStart),
                torrentioLatencyMs: torrentioTime,
                streamCount: 0,
                quality: 'unknown',
                hasHLS: false,
                hasMultiAudio: false,
                audioTrackCount: 0,
                audioLanguages: [],
                success: false,
                errorType: 'no_streams',
                error: 'No hashes from Torrentio',
                urlType: 'none',
            };
        }

        // Step 2: Check cache
        const cacheStart = performance.now();
        const cacheUrl = `${TORBOX_API}/torrents/checkcached?hash=${hashes.join('&hash=')}`;
        const cacheResp = await fetchWithTimeout(cacheUrl, {
            headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` },
        });
        const cacheData = await cacheResp.json();
        cacheCheckTime = Math.round(performance.now() - cacheStart);

        const cachedHashes = Object.entries(cacheData.data || {})
            .filter(([_, v]) => v !== null)
            .map(([h]) => h.toLowerCase());

        if (cachedHashes.length === 0) {
            return {
                method: 'HYBRID_CACHED',
                content: content.name,
                totalLatencyMs: Math.round(performance.now() - totalStart),
                torrentioLatencyMs: torrentioTime,
                cacheCheckLatencyMs: cacheCheckTime,
                streamCount: hashes.length,
                quality: 'unknown',
                hasHLS: false,
                hasMultiAudio: false,
                audioTrackCount: 0,
                audioLanguages: [],
                success: false,
                errorType: 'not_cached',
                error: 'No cached torrents',
                urlType: 'none',
            };
        }

        // Step 3: Check library
        const libraryStart = performance.now();
        const libraryResp = await fetchWithTimeout(`${TORBOX_API}/torrents/mylist`, {
            headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` },
        });
        const libraryData = await libraryResp.json();
        const libraryItems = libraryData.data || [];
        libraryTime = Math.round(performance.now() - libraryStart);

        const match = libraryItems.find((item: any) =>
            cachedHashes.includes(item.hash?.toLowerCase())
        );

        if (!match) {
            return {
                method: 'HYBRID_CACHED',
                content: content.name,
                totalLatencyMs: Math.round(performance.now() - totalStart),
                torrentioLatencyMs: torrentioTime,
                cacheCheckLatencyMs: cacheCheckTime,
                libraryCheckLatencyMs: libraryTime,
                streamCount: cachedHashes.length,
                quality: extractQuality(torrents[0]?.title || ''),
                hasHLS: false,
                hasMultiAudio: false,
                audioTrackCount: 0,
                audioLanguages: [],
                success: false,
                errorType: 'not_in_library',
                error: 'Cached but not in library',
                urlType: 'none',
            };
        }

        // Step 4: Create HLS stream
        const hlsStart = performance.now();
        const fileId = match.files?.[0]?.id || 0;
        const streamUrl = `${TORBOX_API}/stream/createstream?id=${match.id}&file_id=${fileId}&type=torrent`;
        const streamResp = await fetchWithTimeout(streamUrl, {
            headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` },
        });
        const streamData = await streamResp.json();
        hlsTime = Math.round(performance.now() - hlsStart);

        const hlsUrl = streamData.data?.hls_url || streamData.data?.playlist;
        const audios = streamData.data?.metadata?.audios || [];

        return {
            method: 'HYBRID_CACHED',
            content: content.name,
            totalLatencyMs: Math.round(performance.now() - totalStart),
            torrentioLatencyMs: torrentioTime,
            cacheCheckLatencyMs: cacheCheckTime,
            libraryCheckLatencyMs: libraryTime,
            hlsCreationLatencyMs: hlsTime,
            streamCount: 1,
            quality: extractQuality(match.name || ''),
            hasHLS: !!hlsUrl,
            hasMultiAudio: audios.length > 1,
            audioTrackCount: audios.length,
            audioLanguages: audios.map((a: any) => a.language || a.language_full || 'unknown'),
            success: !!hlsUrl,
            errorType: !hlsUrl ? 'hls_failed' : undefined,
            urlType: 'hls',
            finalUrl: hlsUrl?.substring(0, 80),
        };
    } catch (e) {
        return {
            method: 'HYBRID_CACHED',
            content: content.name,
            totalLatencyMs: Math.round(performance.now() - totalStart),
            torrentioLatencyMs: torrentioTime,
            cacheCheckLatencyMs: cacheCheckTime,
            libraryCheckLatencyMs: libraryTime,
            hlsCreationLatencyMs: hlsTime,
            streamCount: 0,
            quality: 'unknown',
            hasHLS: false,
            hasMultiAudio: false,
            audioTrackCount: 0,
            audioLanguages: [],
            success: false,
            errorType: 'network',
            error: String(e),
            urlType: 'none',
        };
    }
}

// Method 4: Hybrid Add (add to library if not present)
async function testHybridAdd(content: TestContent, imdbId: string): Promise<TestMetrics> {
    const totalStart = performance.now();

    if (!TORBOX_API_KEY) {
        return {
            method: 'HYBRID_ADD',
            content: content.name,
            totalLatencyMs: 0,
            streamCount: 0,
            quality: 'unknown',
            hasHLS: false,
            hasMultiAudio: false,
            audioTrackCount: 0,
            audioLanguages: [],
            success: false,
            error: 'No API key',
            urlType: 'none',
        };
    }

    try {
        // Step 1: Get hashes from Torrentio
        const streamId = buildStreamId({ ...content, id: imdbId });
        const torrentioUrl = `${TORRENTIO}/stream/${content.type}/${streamId}.json`;
        const torrentioResp = await fetchWithTimeout(torrentioUrl);

        if (!torrentioResp.ok) {
            return {
                method: 'HYBRID_ADD',
                content: content.name,
                totalLatencyMs: Math.round(performance.now() - totalStart),
                streamCount: 0,
                quality: 'unknown',
                hasHLS: false,
                hasMultiAudio: false,
                audioTrackCount: 0,
                audioLanguages: [],
                success: false,
                errorType: 'network',
                error: 'Torrentio failed',
                urlType: 'none',
            };
        }

        const torrentioData = await torrentioResp.json();
        const torrents = (torrentioData.streams || []).slice(0, 10);
        const hashes = torrents.map((t: any) => t.infoHash).filter(Boolean);

        if (hashes.length === 0) {
            return {
                method: 'HYBRID_ADD',
                content: content.name,
                totalLatencyMs: Math.round(performance.now() - totalStart),
                streamCount: 0,
                quality: 'unknown',
                hasHLS: false,
                hasMultiAudio: false,
                audioTrackCount: 0,
                audioLanguages: [],
                success: false,
                errorType: 'no_streams',
                error: 'No hashes',
                urlType: 'none',
            };
        }

        // Step 2: Check cache
        const cacheUrl = `${TORBOX_API}/torrents/checkcached?hash=${hashes.join('&hash=')}`;
        const cacheResp = await fetchWithTimeout(cacheUrl, {
            headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` },
        });
        const cacheData = await cacheResp.json();

        const cachedHashes = Object.entries(cacheData.data || {})
            .filter(([_, v]) => v !== null)
            .map(([h]) => h.toLowerCase());

        if (cachedHashes.length === 0) {
            return {
                method: 'HYBRID_ADD',
                content: content.name,
                totalLatencyMs: Math.round(performance.now() - totalStart),
                streamCount: hashes.length,
                quality: 'unknown',
                hasHLS: false,
                hasMultiAudio: false,
                audioTrackCount: 0,
                audioLanguages: [],
                success: false,
                errorType: 'not_cached',
                error: 'No cached torrents',
                urlType: 'none',
            };
        }

        // Step 3: Find cached torrent with magnet
        const cachedTorrent = torrents.find((t: any) =>
            cachedHashes.includes(t.infoHash?.toLowerCase())
        );

        if (!cachedTorrent) {
            return {
                method: 'HYBRID_ADD',
                content: content.name,
                totalLatencyMs: Math.round(performance.now() - totalStart),
                streamCount: cachedHashes.length,
                quality: 'unknown',
                hasHLS: false,
                hasMultiAudio: false,
                audioTrackCount: 0,
                audioLanguages: [],
                success: false,
                errorType: 'not_cached',
                error: 'Could not find cached torrent',
                urlType: 'none',
            };
        }

        // Build magnet link
        const magnet = `magnet:?xt=urn:btih:${cachedTorrent.infoHash}`;

        // Step 4: Add to library (instant for cached)
        const addForm = new FormData();
        addForm.append('magnet', magnet);
        addForm.append('seed', '3');
        addForm.append('allow_zip', 'false');

        const addResp = await fetchWithTimeout(`${TORBOX_API}/torrents/createtorrent`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` },
            body: addForm,
        });
        const addData = await addResp.json();

        const torrentId = addData.data?.torrent_id || addData.data?.id;
        if (!torrentId) {
            return {
                method: 'HYBRID_ADD',
                content: content.name,
                totalLatencyMs: Math.round(performance.now() - totalStart),
                streamCount: 1,
                quality: extractQuality(cachedTorrent.title || ''),
                hasHLS: false,
                hasMultiAudio: false,
                audioTrackCount: 0,
                audioLanguages: [],
                success: false,
                error: 'Failed to add torrent',
                urlType: 'none',
            };
        }

        // Step 5: Get file list
        const listResp = await fetchWithTimeout(`${TORBOX_API}/torrents/mylist?id=${torrentId}`, {
            headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` },
        });
        const listData = await listResp.json();
        const torrentInfo = listData.data;
        const fileId = torrentInfo?.files?.[0]?.id || 0;

        // Step 6: Create HLS stream
        const streamUrl = `${TORBOX_API}/stream/createstream?id=${torrentId}&file_id=${fileId}&type=torrent`;
        const streamResp = await fetchWithTimeout(streamUrl, {
            headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` },
        });
        const streamData = await streamResp.json();

        const hlsUrl = streamData.data?.hls_url || streamData.data?.playlist;
        const audios = streamData.data?.metadata?.audios || [];

        return {
            method: 'HYBRID_ADD',
            content: content.name,
            totalLatencyMs: Math.round(performance.now() - totalStart),
            streamCount: 1,
            quality: extractQuality(cachedTorrent.title || torrentInfo?.name || ''),
            hasHLS: !!hlsUrl,
            hasMultiAudio: audios.length > 1,
            audioTrackCount: audios.length,
            audioLanguages: audios.map((a: any) => a.language || a.language_full || 'unknown'),
            success: !!hlsUrl,
            errorType: !hlsUrl ? 'hls_failed' : undefined,
            urlType: 'hls',
            finalUrl: hlsUrl?.substring(0, 80),
        };
    } catch (e) {
        return {
            method: 'HYBRID_ADD',
            content: content.name,
            totalLatencyMs: Math.round(performance.now() - totalStart),
            streamCount: 0,
            quality: 'unknown',
            hasHLS: false,
            hasMultiAudio: false,
            audioTrackCount: 0,
            audioLanguages: [],
            success: false,
            errorType: 'network',
            error: String(e),
            urlType: 'none',
        };
    }
}

// Method 5: Parallel Race (race TorBox Stremio and Hybrid)
async function testParallelRace(content: TestContent, imdbId: string): Promise<TestMetrics> {
    const start = performance.now();

    try {
        // Race TorBox Stremio against Hybrid Cached
        const results = await Promise.allSettled([
            testTorBoxStremio(content, imdbId),
            testHybridCached(content, imdbId),
        ]);

        // Find first successful result with HLS
        let winner: TestMetrics | null = null;

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value.success) {
                if (result.value.hasHLS) {
                    winner = result.value;
                    break;
                }
                if (!winner) {
                    winner = result.value;
                }
            }
        }

        if (winner) {
            return {
                ...winner,
                method: 'PARALLEL_RACE',
                totalLatencyMs: Math.round(performance.now() - start),
            };
        }

        // All failed
        return {
            method: 'PARALLEL_RACE',
            content: content.name,
            totalLatencyMs: Math.round(performance.now() - start),
            streamCount: 0,
            quality: 'unknown',
            hasHLS: false,
            hasMultiAudio: false,
            audioTrackCount: 0,
            audioLanguages: [],
            success: false,
            error: 'All parallel methods failed',
            urlType: 'none',
        };
    } catch (e) {
        return {
            method: 'PARALLEL_RACE',
            content: content.name,
            totalLatencyMs: Math.round(performance.now() - start),
            streamCount: 0,
            quality: 'unknown',
            hasHLS: false,
            hasMultiAudio: false,
            audioTrackCount: 0,
            audioLanguages: [],
            success: false,
            error: String(e),
            urlType: 'none',
        };
    }
}

// Method 6: Hybrid V2 (Optimized)
async function testHybridV2(content: TestContent, imdbId: string): Promise<TestMetrics> {
    const totalStart = performance.now();
    let torrentioTime = 0, addTime = 0, hlsTime = 0;

    if (!TORBOX_API_KEY) {
        return {
            method: 'HYBRID_V2',
            content: content.name,
            totalLatencyMs: 0,
            streamCount: 0,
            quality: 'unknown',
            hasHLS: false,
            hasMultiAudio: false,
            audioTrackCount: 0,
            audioLanguages: [],
            success: false,
            error: 'No API key',
            urlType: 'none',
        };
    }

    try {
        // Step 1: Get hashes from Torrentio
        const torrentioStart = performance.now();
        const streamId = buildStreamId({ ...content, id: imdbId });
        const torrentioUrl = `${TORRENTIO}/stream/${content.type}/${streamId}.json`;
        const torrentioResp = await fetchWithTimeout(torrentioUrl);
        torrentioTime = Math.round(performance.now() - torrentioStart);

        if (!torrentioResp.ok) {
            return {
                method: 'HYBRID_V2',
                content: content.name,
                totalLatencyMs: Math.round(performance.now() - totalStart),
                torrentioLatencyMs: torrentioTime,
                streamCount: 0,
                quality: 'unknown',
                hasHLS: false,
                hasMultiAudio: false,
                audioTrackCount: 0,
                audioLanguages: [],
                success: false,
                errorType: 'network',
                error: 'Torrentio failed',
                urlType: 'none',
            };
        }

        const torrentioData = await torrentioResp.json();
        const torrents = (torrentioData.streams || []).slice(0, 5); // Try top 5

        if (torrents.length === 0) {
            return {
                method: 'HYBRID_V2',
                content: content.name,
                totalLatencyMs: Math.round(performance.now() - totalStart),
                torrentioLatencyMs: torrentioTime,
                streamCount: 0,
                quality: 'unknown',
                hasHLS: false,
                hasMultiAudio: false,
                audioTrackCount: 0,
                audioLanguages: [],
                success: false,
                errorType: 'no_streams',
                error: 'No torrents',
                urlType: 'none',
            };
        }

        // Step 2: Try to Add Optimized (First success wins)
        let successTorrent: any = null;
        let torrentId = 0;

        for (const torrent of torrents) {
            if (!torrent.infoHash) continue;
            const magnet = `magnet:?xt=urn:btih:${torrent.infoHash}`;

            const addStart = performance.now();
            const form = new FormData();
            form.append('magnet', magnet);
            form.append('seed', '3');
            form.append('allow_zip', 'false');
            form.append('add_only_if_cached', 'true');

            const addResp = await fetch(`${TORBOX_API}/torrents/createtorrent`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` },
                body: form,
            });
            const addData = await addResp.json();
            addTime += (performance.now() - addStart);

            if (addData.success && (addData.data?.torrent_id || addData.data?.id)) {
                successTorrent = torrent;
                torrentId = addData.data.torrent_id || addData.data.id;
                break;
            }
        }

        if (!successTorrent) {
            return {
                method: 'HYBRID_V2',
                content: content.name,
                totalLatencyMs: Math.round(performance.now() - totalStart),
                torrentioLatencyMs: torrentioTime,
                streamCount: torrents.length,
                quality: 'unknown',
                hasHLS: false,
                hasMultiAudio: false,
                audioTrackCount: 0,
                audioLanguages: [],
                success: false,
                errorType: 'not_cached',
                error: 'No cached torrents found in top 5',
                urlType: 'none',
            };
        }

        // Step 3: Get File ID
        const listResp = await fetchWithTimeout(`${TORBOX_API}/torrents/mylist?id=${torrentId}`, {
            headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` },
        });
        const listData = await listResp.json();
        const fileId = listData.data?.files?.[0]?.id || 0;

        // Step 4: Create HLS
        const hlsStart = performance.now();
        const streamUrl = `${TORBOX_API}/stream/createstream?id=${torrentId}&file_id=${fileId}&type=torrent`;
        const streamResp = await fetchWithTimeout(streamUrl, {
            headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` },
        });
        const streamData = await streamResp.json();
        hlsTime = Math.round(performance.now() - hlsStart);

        const hlsUrl = streamData.data?.hls_url || streamData.data?.playlist;
        const audios = streamData.data?.metadata?.audios || [];

        return {
            method: 'HYBRID_V2',
            content: content.name,
            totalLatencyMs: Math.round(performance.now() - totalStart),
            torrentioLatencyMs: torrentioTime,
            hlsCreationLatencyMs: hlsTime,
            streamCount: 1,
            quality: extractQuality(successTorrent.title || ''),
            hasHLS: !!hlsUrl,
            hasMultiAudio: audios.length > 1,
            audioTrackCount: audios.length,
            audioLanguages: audios.map((a: any) => a.language || a.language_full || 'unknown'),
            success: !!hlsUrl,
            errorType: !hlsUrl ? 'hls_failed' : undefined,
            urlType: 'hls',
            finalUrl: hlsUrl?.substring(0, 80),
        };

    } catch (e) {
        return {
            method: 'HYBRID_V2',
            content: content.name,
            totalLatencyMs: Math.round(performance.now() - totalStart),
            streamCount: 0,
            quality: 'unknown',
            hasHLS: false,
            hasMultiAudio: false,
            audioTrackCount: 0,
            audioLanguages: [],
            success: false,
            errorType: 'network',
            error: String(e),
            urlType: 'none',
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Test Runner
// ─────────────────────────────────────────────────────────────────────────────

async function runTests() {
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('  ULTIMATE STREAM RESOLUTION TEST SUITE');
    console.log('═'.repeat(80));
    console.log(`  Time: ${new Date().toISOString()}`);
    console.log(`  TorBox API: ${TORBOX_API_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`  TMDB API: ${TMDB_API_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log('═'.repeat(80));

    const allResults: TestMetrics[] = [];

    // ─────────────────────────────────────────────────────────────────────────
    // Phase 1: ID Conversion Tests
    // ─────────────────────────────────────────────────────────────────────────

    console.log('\n\n' + '─'.repeat(80));
    console.log('  PHASE 1: ID CONVERSION TESTS');
    console.log('─'.repeat(80));

    // TMDB test
    console.log('\n  Testing TMDB → IMDB conversion...');
    const tmdbResult = await convertTmdbToImdb('634649', 'movie');
    console.log(`    TMDB 634649 → ${tmdbResult.imdbId || 'FAILED'} (${tmdbResult.latencyMs}ms)`);

    // Kitsu test
    console.log('\n  Testing Kitsu → IMDB conversion...');
    const kitsuResult = await convertKitsuToImdb('kitsu:7442');
    console.log(`    Kitsu 7442 → ${kitsuResult.imdbId || 'FAILED'} (${kitsuResult.latencyMs}ms)`);

    // ─────────────────────────────────────────────────────────────────────────
    // Phase 2: Resolution Strategy Comparison
    // ─────────────────────────────────────────────────────────────────────────

    console.log('\n\n' + '─'.repeat(80));
    console.log('  PHASE 2: RESOLUTION STRATEGY COMPARISON');
    console.log('─'.repeat(80));

    for (const content of TEST_CONTENT) {
        console.log(`\n  ▸ Testing: ${content.name} (${content.provider})`);

        // Convert ID if needed
        let imdbId = content.id;

        if (content.provider === 'tmdb') {
            const conv = await convertTmdbToImdb(content.id.replace('tmdb:', ''), content.type);
            if (!conv.imdbId) {
                console.log(`    ✗ TMDB conversion failed`);
                continue;
            }
            imdbId = conv.imdbId;
            console.log(`    Converted to: ${imdbId}`);
        } else if (content.provider === 'kitsu') {
            const conv = await convertKitsuToImdb(content.id);
            if (!conv.imdbId) {
                console.log(`    ✗ Kitsu conversion failed`);
                continue;
            }
            imdbId = conv.imdbId;
            console.log(`    Converted to: ${imdbId}`);
        }

        // Run all test methods
        const methods = [
            () => testTorrentioOnly(content, imdbId),
            () => testTorBoxStremio(content, imdbId),
            // () => testHybridCached(content, imdbId), // Skip slow legacy methods
            // () => testHybridAdd(content, imdbId),    // Skip slow legacy methods
            // () => testParallelRace(content, imdbId), // Skip failed method
            () => testHybridV2(content, imdbId), // NEW OPTIMIZED METHOD
        ];

        for (const method of methods) {
            const result = await method();
            allResults.push(result);

            const status = result.success ? '✓' : '✗';
            const audioInfo = result.hasMultiAudio ? ` (${result.audioTrackCount} audio)` : '';
            console.log(`    ${status} ${result.method}: ${result.quality} ${result.urlType}${audioInfo} (${result.totalLatencyMs}ms)`);

            if (result.error && !result.success) {
                console.log(`      Error: ${result.error}`);
            }
        }

        // Consistency Check (Only for Hybrid V2 on Interstellar)
        if (content.name === 'Interstellar') {
            console.log(chalk.yellow('  \n    ⟳ Running Consistency Check (Hybrid V2 x3)...'));
            for (let j = 0; j < 3; j++) {
                const metric = await testHybridV2(content, imdbId);
                console.log(`      Run ${j + 1}: ${metric.success ? '✓' : '✗'} ${metric.totalLatencyMs}ms`);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Summary
    // ─────────────────────────────────────────────────────────────────────────

    console.log('\n\n' + '═'.repeat(80));
    console.log('  SUMMARY BY METHOD');
    console.log('═'.repeat(80));

    const byMethod: Record<string, TestMetrics[]> = {};
    for (const r of allResults) {
        if (!byMethod[r.method]) byMethod[r.method] = [];
        byMethod[r.method].push(r);
    }

    const methodStats: Array<{
        method: string;
        successRate: number;
        avgLatency: number;
        hlsRate: number;
        multiAudioRate: number;
    }> = [];

    for (const [method, tests] of Object.entries(byMethod)) {
        const successCount = tests.filter(t => t.success).length;
        const validLatencies = tests.filter(t => t.totalLatencyMs > 0 && t.success);
        const avgLatency = validLatencies.length > 0
            ? Math.round(validLatencies.reduce((sum, t) => sum + t.totalLatencyMs, 0) / validLatencies.length)
            : 0;
        const hlsCount = tests.filter(t => t.hasHLS).length;
        const multiAudioCount = tests.filter(t => t.hasMultiAudio).length;

        const successRate = tests.length > 0 ? successCount / tests.length : 0;
        const hlsRate = tests.length > 0 ? hlsCount / tests.length : 0;
        const multiAudioRate = tests.length > 0 ? multiAudioCount / tests.length : 0;

        methodStats.push({
            method,
            successRate,
            avgLatency,
            hlsRate,
            multiAudioRate,
        });

        console.log(`\n  ${method}`);
        console.log(`    Success: ${successCount}/${tests.length} (${Math.round(successRate * 100)}%)`);
        console.log(`    Avg Latency: ${avgLatency}ms`);
        console.log(`    HLS: ${Math.round(hlsRate * 100)}%`);
        console.log(`    Multi-Audio: ${Math.round(multiAudioRate * 100)}%`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Recommendations
    // ─────────────────────────────────────────────────────────────────────────

    console.log('\n\n' + '═'.repeat(80));
    console.log('  RECOMMENDATIONS');
    console.log('═'.repeat(80));

    // Sort by score: success rate * 0.4 + hls rate * 0.3 + (1 - normalized latency) * 0.2 + multi-audio * 0.1
    const maxLatency = Math.max(...methodStats.map(m => m.avgLatency), 1);
    const scored = methodStats
        .filter(m => m.method !== 'TORRENTIO_ONLY') // Exclude non-playable
        .map(m => ({
            ...m,
            score: m.successRate * 0.4
                + m.hlsRate * 0.3
                + (1 - m.avgLatency / maxLatency) * 0.2
                + m.multiAudioRate * 0.1,
        }))
        .sort((a, b) => b.score - a.score);

    console.log('\n  Ranking (by overall score):');
    scored.forEach((m, i) => {
        const badge = i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
        console.log(`    ${badge} ${i + 1}. ${m.method}`);
        console.log(`       Success: ${Math.round(m.successRate * 100)}% | Latency: ${m.avgLatency}ms | HLS: ${Math.round(m.hlsRate * 100)}%`);
    });

    if (scored.length > 0) {
        console.log(`\n  ✅ RECOMMENDED: ${scored[0].method}`);
        console.log(`     Best balance of speed (${scored[0].avgLatency}ms) and reliability (${Math.round(scored[0].successRate * 100)}%)`);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('  TEST COMPLETE');
    console.log('═'.repeat(80));

    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = './test-results';
    const outputPath = path.join(outputDir, `stream-ultimate-${timestamp}.json`);

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        idConversions: {
            tmdb: tmdbResult,
            kitsu: kitsuResult,
        },
        results: allResults,
        methodStats,
        recommendation: scored[0]?.method || 'NONE',
    }, null, 2));

    console.log(`\n  Results saved to: ${outputPath}\n`);
}

// Run
runTests().catch(console.error);
