/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RIGOROUS STREAM RESOLUTION TEST SUITE v2
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * End-to-end testing:
 * 1. Fetch real content from catalog providers (TMDB, Cinemeta, Kitsu, Hanime)
 * 2. Test each stream resolution approach with actual content
 * 3. Measure latency, follow redirects, probe audio tracks
 * 
 * Run: npx tsx scripts/test-stream-rigorous.ts
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

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
const KITSU = 'https://anime-kitsu.strem.fun';
const HANIME = 'https://86f0740f37f6-hanime-stremio.baby-beamup.club';
const TIMEOUT = 15000;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CatalogContent {
    id: string;
    name: string;
    type: 'movie' | 'series';
    provider: string;
    season?: number;
    episode?: number;
}

interface StreamTestResult {
    content: CatalogContent;
    approach: string;
    success: boolean;
    latencyMs: number;
    streamCount?: number;
    bestQuality?: string;
    finalUrl?: string;
    urlType?: 'hls' | 'mp4' | 'mkv' | 'redirect' | 'unknown';
    audioTracks?: number;
    audioLanguages?: string[];
    cached?: boolean;
    error?: string;
}

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

async function measureLatency<T>(fn: () => Promise<T>): Promise<{ result: T; latencyMs: number }> {
    const start = performance.now();
    const result = await fn();
    return { result, latencyMs: Math.round(performance.now() - start) };
}

function detectUrlType(url: string): 'hls' | 'mp4' | 'mkv' | 'redirect' | 'unknown' {
    if (!url) return 'unknown';
    const lower = url.toLowerCase();
    if (lower.includes('.m3u8') || lower.includes('playlist')) return 'hls';
    if (lower.includes('.mp4')) return 'mp4';
    if (lower.includes('.mkv')) return 'mkv';
    if (lower.includes('new-stream-url') || lower.includes('redirect')) return 'redirect';
    return 'unknown';
}

function extractQuality(text: string): string {
    const match = text.match(/\d{3,4}p/i);
    return match ? match[0].toLowerCase() : 'unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1: Fetch Content from Catalogs
// ─────────────────────────────────────────────────────────────────────────────

async function fetchCinemetaContent(): Promise<CatalogContent[]> {
    console.log('  [Cinemeta] Fetching popular movies...');
    const results: CatalogContent[] = [];

    try {
        // Popular movies
        const moviesUrl = `${CINEMETA}/catalog/movie/top.json`;
        const moviesResp = await fetchWithTimeout(moviesUrl);
        if (moviesResp.ok) {
            const data = await moviesResp.json();
            const movies = (data.metas || []).slice(0, 3);
            for (const m of movies) {
                results.push({
                    id: m.id,
                    name: m.name || m.title,
                    type: 'movie',
                    provider: 'cinemeta',
                });
            }
        }

        // Popular series
        console.log('  [Cinemeta] Fetching popular series...');
        const seriesUrl = `${CINEMETA}/catalog/series/top.json`;
        const seriesResp = await fetchWithTimeout(seriesUrl);
        if (seriesResp.ok) {
            const data = await seriesResp.json();
            const series = (data.metas || []).slice(0, 2);
            for (const s of series) {
                results.push({
                    id: s.id,
                    name: s.name || s.title,
                    type: 'series',
                    provider: 'cinemeta',
                    season: 1,
                    episode: 1,
                });
            }
        }
    } catch (e) {
        console.log(`  [Cinemeta] Error: ${e}`);
    }

    console.log(`  [Cinemeta] Found ${results.length} items`);
    return results;
}

async function fetchKitsuContent(): Promise<CatalogContent[]> {
    console.log('  [Kitsu] Fetching popular anime...');
    const results: CatalogContent[] = [];

    try {
        const url = `${KITSU}/catalog/anime/kitsu-anime-popular.json`;
        const resp = await fetchWithTimeout(url);
        if (resp.ok) {
            const data = await resp.json();
            const animes = (data.metas || []).slice(0, 2);
            for (const a of animes) {
                // Kitsu IDs need conversion for streams
                results.push({
                    id: a.id,
                    name: a.name || a.title,
                    type: 'series',
                    provider: 'kitsu',
                    season: 1,
                    episode: 1,
                });
            }
        }
    } catch (e) {
        console.log(`  [Kitsu] Error: ${e}`);
    }

    console.log(`  [Kitsu] Found ${results.length} items`);
    return results;
}

async function fetchHanimeContent(): Promise<CatalogContent[]> {
    console.log('  [Hanime] Fetching adult anime catalog...');
    const results: CatalogContent[] = [];

    try {
        const url = `${HANIME}/catalog/movie/mostviews.json`;
        const resp = await fetchWithTimeout(url);
        if (resp.ok) {
            const data = await resp.json();
            const items = (data.metas || []).slice(0, 2);
            for (const h of items) {
                results.push({
                    id: h.id,
                    name: h.name || h.title || 'Hanime Content',
                    type: 'movie',
                    provider: 'hanime',
                });
            }
        }
    } catch (e) {
        console.log(`  [Hanime] Error: ${e}`);
    }

    console.log(`  [Hanime] Found ${results.length} items`);
    return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: Test Stream Providers
// ─────────────────────────────────────────────────────────────────────────────

async function testTorrentio(content: CatalogContent): Promise<StreamTestResult> {
    const streamId = content.type === 'series'
        ? `${content.id}:${content.season}:${content.episode}`
        : content.id;
    const url = `${TORRENTIO}/stream/${content.type}/${streamId}.json`;

    try {
        const { result: resp, latencyMs } = await measureLatency(() => fetchWithTimeout(url));

        if (!resp.ok) {
            return {
                content,
                approach: 'Torrentio',
                success: false,
                latencyMs,
                error: `HTTP ${resp.status}`,
            };
        }

        const data = await resp.json();
        const streams = data.streams || [];

        // Quality distribution
        const qualities: Record<string, number> = {};
        for (const s of streams) {
            const q = extractQuality(s.name || s.title || '');
            qualities[q] = (qualities[q] || 0) + 1;
        }

        const best = streams.find((s: any) => extractQuality(s.name || '') === '1080p') || streams[0];

        return {
            content,
            approach: 'Torrentio',
            success: streams.length > 0,
            latencyMs,
            streamCount: streams.length,
            bestQuality: best ? extractQuality(best.name || best.title || '') : undefined,
            cached: undefined, // Torrentio doesn't tell us
        };
    } catch (e) {
        return {
            content,
            approach: 'Torrentio',
            success: false,
            latencyMs: -1,
            error: String(e),
        };
    }
}

async function testTorBoxStremio(content: CatalogContent): Promise<StreamTestResult> {
    if (!TORBOX_API_KEY) {
        return {
            content,
            approach: 'TorBox Stremio',
            success: false,
            latencyMs: -1,
            error: 'No API key',
        };
    }

    const streamId = content.type === 'series'
        ? `${content.id}:${content.season}:${content.episode}`
        : content.id;
    const url = `${TORBOX_STREMIO}/stream/${content.type}/${streamId}.json`;

    try {
        const { result: resp, latencyMs } = await measureLatency(() => fetchWithTimeout(url));

        if (!resp.ok) {
            return {
                content,
                approach: 'TorBox Stremio',
                success: false,
                latencyMs,
                error: `HTTP ${resp.status}`,
            };
        }

        const data = await resp.json();
        const streams = data.streams || [];

        if (streams.length === 0) {
            return {
                content,
                approach: 'TorBox Stremio',
                success: false,
                latencyMs,
                streamCount: 0,
                error: 'No streams from addon',
            };
        }

        // Find best 1080p stream
        const best = streams.find((s: any) =>
            (s.name || '').includes('1080p') || (s.title || '').includes('1080p')
        ) || streams[0];

        const streamUrl = best.url || '';
        const urlType = detectUrlType(streamUrl);

        // If it's a redirect URL, try to follow it to get final URL
        let finalUrl = streamUrl;
        let audioTracks: number | undefined;
        let audioLanguages: string[] | undefined;

        if (urlType === 'redirect' && streamUrl) {
            try {
                const headResp = await fetch(streamUrl, { method: 'HEAD', redirect: 'follow' });
                finalUrl = headResp.url;
            } catch {
                // Keep original URL
            }
        }

        return {
            content,
            approach: 'TorBox Stremio',
            success: true,
            latencyMs,
            streamCount: streams.length,
            bestQuality: extractQuality(best.name || best.title || ''),
            finalUrl: finalUrl.substring(0, 80) + (finalUrl.length > 80 ? '...' : ''),
            urlType: detectUrlType(finalUrl),
            cached: true, // Stremio only returns cached
        };
    } catch (e) {
        return {
            content,
            approach: 'TorBox Stremio',
            success: false,
            latencyMs: -1,
            error: String(e),
        };
    }
}

async function testTorBoxHLS(content: CatalogContent): Promise<StreamTestResult> {
    if (!TORBOX_API_KEY) {
        return {
            content,
            approach: 'TorBox HLS',
            success: false,
            latencyMs: -1,
            error: 'No API key',
        };
    }

    const totalStart = performance.now();

    try {
        // Step 1: Get torrents from Torrentio
        const streamId = content.type === 'series'
            ? `${content.id}:${content.season}:${content.episode}`
            : content.id;
        const torrentioUrl = `${TORRENTIO}/stream/${content.type}/${streamId}.json`;
        const torrentioResp = await fetchWithTimeout(torrentioUrl);

        if (!torrentioResp.ok) {
            return {
                content,
                approach: 'TorBox HLS',
                success: false,
                latencyMs: Math.round(performance.now() - totalStart),
                error: 'Torrentio failed',
            };
        }

        const torrentioData = await torrentioResp.json();
        const torrents = (torrentioData.streams || []).slice(0, 10);
        const hashes = torrents.map((t: any) => t.infoHash).filter(Boolean);

        if (hashes.length === 0) {
            return {
                content,
                approach: 'TorBox HLS',
                success: false,
                latencyMs: Math.round(performance.now() - totalStart),
                error: 'No torrents found',
            };
        }

        // Step 2: Check cached
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
                content,
                approach: 'TorBox HLS',
                success: false,
                latencyMs: Math.round(performance.now() - totalStart),
                error: 'No cached torrents',
            };
        }

        // Step 3: Check library
        const libraryResp = await fetchWithTimeout(`${TORBOX_API}/torrents/mylist`, {
            headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` },
        });
        const libraryData = await libraryResp.json();
        const libraryItems = libraryData.data || [];

        // Find matching cached torrent in library
        const match = libraryItems.find((item: any) =>
            cachedHashes.includes(item.hash?.toLowerCase())
        );

        if (!match) {
            return {
                content,
                approach: 'TorBox HLS',
                success: false,
                latencyMs: Math.round(performance.now() - totalStart),
                error: 'Cached torrent not in library',
                cached: true,
            };
        }

        // Step 4: Create HLS stream
        const fileId = match.files?.[0]?.id || 0;
        const streamUrl = `${TORBOX_API}/stream/createstream?id=${match.id}&file_id=${fileId}&type=torrent`;
        const streamResp = await fetchWithTimeout(streamUrl, {
            headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` },
        });
        const streamData = await streamResp.json();

        const hlsUrl = streamData.data?.hls_url || streamData.data?.playlist;
        const audios = streamData.data?.metadata?.audios || [];

        return {
            content,
            approach: 'TorBox HLS',
            success: !!hlsUrl,
            latencyMs: Math.round(performance.now() - totalStart),
            bestQuality: extractQuality(match.name || ''),
            finalUrl: hlsUrl?.substring(0, 80) + '...',
            urlType: 'hls',
            audioTracks: audios.length,
            audioLanguages: audios.map((a: any) => a.language || a.language_full || 'unknown'),
            cached: true,
        };
    } catch (e) {
        return {
            content,
            approach: 'TorBox HLS',
            success: false,
            latencyMs: Math.round(performance.now() - totalStart),
            error: String(e),
        };
    }
}

async function testUsenet(content: CatalogContent): Promise<StreamTestResult> {
    if (!TORBOX_API_KEY) {
        return {
            content,
            approach: 'TorBox Usenet',
            success: false,
            latencyMs: -1,
            error: 'No API key',
        };
    }

    const totalStart = performance.now();

    try {
        // Check Usenet library
        const resp = await fetchWithTimeout(`${TORBOX_API}/usenet/mylist`, {
            headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` },
        });
        const data = await resp.json();
        const items = data.data || [];

        return {
            content,
            approach: 'TorBox Usenet',
            success: true,
            latencyMs: Math.round(performance.now() - totalStart),
            streamCount: items.length,
            error: items.length === 0 ? 'No Usenet items in library' : undefined,
        };
    } catch (e) {
        return {
            content,
            approach: 'TorBox Usenet',
            success: false,
            latencyMs: Math.round(performance.now() - totalStart),
            error: String(e),
        };
    }
}

async function testHanimeStreams(content: CatalogContent): Promise<StreamTestResult> {
    if (content.provider !== 'hanime') {
        return {
            content,
            approach: 'Hanime Direct',
            success: false,
            latencyMs: -1,
            error: 'Not Hanime content',
        };
    }

    const url = `${HANIME}/stream/movie/${content.id}.json`;

    try {
        const { result: resp, latencyMs } = await measureLatency(() => fetchWithTimeout(url));

        if (!resp.ok) {
            return {
                content,
                approach: 'Hanime Direct',
                success: false,
                latencyMs,
                error: `HTTP ${resp.status}`,
            };
        }

        const data = await resp.json();
        const streams = data.streams || [];

        const best = streams.find((s: any) =>
            (s.name || '').includes('1080') || (s.title || '').includes('1080')
        ) || streams[0];

        return {
            content,
            approach: 'Hanime Direct',
            success: streams.length > 0,
            latencyMs,
            streamCount: streams.length,
            bestQuality: best ? extractQuality(best.name || best.title || '') : undefined,
            finalUrl: best?.url?.substring(0, 80) + '...',
            urlType: detectUrlType(best?.url || ''),
        };
    } catch (e) {
        return {
            content,
            approach: 'Hanime Direct',
            success: false,
            latencyMs: -1,
            error: String(e),
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Runner
// ─────────────────────────────────────────────────────────────────────────────

async function runTests() {
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('  RIGOROUS STREAM RESOLUTION TEST SUITE v2');
    console.log('═'.repeat(80));
    console.log(`  Time: ${new Date().toISOString()}`);
    console.log(`  TorBox API: ${TORBOX_API_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log('═'.repeat(80));

    // Phase 1: Fetch content
    console.log('\n\n' + '─'.repeat(80));
    console.log('  PHASE 1: FETCHING CONTENT FROM CATALOGS');
    console.log('─'.repeat(80));

    const allContent: CatalogContent[] = [];

    const cinemetaContent = await fetchCinemetaContent();
    allContent.push(...cinemetaContent);

    const kitsuContent = await fetchKitsuContent();
    allContent.push(...kitsuContent);

    const hanimeContent = await fetchHanimeContent();
    allContent.push(...hanimeContent);

    console.log(`\n  Total content items: ${allContent.length}`);

    // Phase 2: Test each content with each provider
    console.log('\n\n' + '─'.repeat(80));
    console.log('  PHASE 2: TESTING STREAM PROVIDERS');
    console.log('─'.repeat(80));

    const results: StreamTestResult[] = [];

    for (const content of allContent) {
        console.log(`\n  ▸ ${content.name} (${content.provider}/${content.type})`);

        // Test Torrentio
        if (content.provider !== 'hanime') {
            const torrentio = await testTorrentio(content);
            results.push(torrentio);
            console.log(`    Torrentio: ${torrentio.success ? '✓' : '✗'} ${torrentio.streamCount || 0} streams (${torrentio.latencyMs}ms)`);
        }

        // Test TorBox Stremio
        if (content.provider !== 'hanime') {
            const stremio = await testTorBoxStremio(content);
            results.push(stremio);
            console.log(`    TorBox Stremio: ${stremio.success ? '✓' : '✗'} ${stremio.bestQuality || '-'} ${stremio.urlType || ''} (${stremio.latencyMs}ms)`);
            if (stremio.error) console.log(`      Error: ${stremio.error}`);
        }

        // Test TorBox HLS (full flow)
        if (content.provider !== 'hanime') {
            const hls = await testTorBoxHLS(content);
            results.push(hls);
            console.log(`    TorBox HLS: ${hls.success ? '✓' : '✗'} ${hls.audioTracks || 0} audio tracks (${hls.latencyMs}ms)`);
            if (hls.audioLanguages && hls.audioLanguages.length > 0) {
                console.log(`      Audio: ${hls.audioLanguages.join(', ')}`);
            }
            if (hls.error) console.log(`      Error: ${hls.error}`);
        }

        // Test Usenet
        if (content.provider !== 'hanime') {
            const usenet = await testUsenet(content);
            results.push(usenet);
            console.log(`    Usenet: ${usenet.success ? '✓' : '✗'} ${usenet.streamCount || 0} items (${usenet.latencyMs}ms)`);
        }

        // Test Hanime Direct
        if (content.provider === 'hanime') {
            const hanime = await testHanimeStreams(content);
            results.push(hanime);
            console.log(`    Hanime Direct: ${hanime.success ? '✓' : '✗'} ${hanime.bestQuality || '-'} (${hanime.latencyMs}ms)`);
        }
    }

    // Phase 3: Summary
    console.log('\n\n' + '═'.repeat(80));
    console.log('  SUMMARY BY APPROACH');
    console.log('═'.repeat(80));

    const byApproach: Record<string, StreamTestResult[]> = {};
    for (const r of results) {
        if (!byApproach[r.approach]) byApproach[r.approach] = [];
        byApproach[r.approach].push(r);
    }

    for (const [approach, tests] of Object.entries(byApproach)) {
        const successCount = tests.filter(t => t.success).length;
        const validLatencies = tests.filter(t => t.latencyMs > 0);
        const avgLatency = validLatencies.length > 0
            ? Math.round(validLatencies.reduce((sum, t) => sum + t.latencyMs, 0) / validLatencies.length)
            : 0;

        console.log(`\n  ${approach}`);
        console.log(`    Success Rate: ${successCount}/${tests.length} (${Math.round(100 * successCount / tests.length)}%)`);
        console.log(`    Avg Latency: ${avgLatency}ms`);

        // Audio info for HLS
        const withAudio = tests.filter(t => t.audioTracks && t.audioTracks > 0);
        if (withAudio.length > 0) {
            console.log(`    Audio Support: ${withAudio.length}/${tests.length} have multi-audio`);
        }
    }

    // Recommendation
    console.log('\n\n' + '═'.repeat(80));
    console.log('  RECOMMENDATION');
    console.log('═'.repeat(80));

    const stremioResults = byApproach['TorBox Stremio'] || [];
    const hlsResults = byApproach['TorBox HLS'] || [];

    const stremioSuccessRate = stremioResults.length > 0
        ? stremioResults.filter(r => r.success).length / stremioResults.length
        : 0;
    const stremioAvgLatency = stremioResults.filter(r => r.latencyMs > 0)
        .reduce((sum, r) => sum + r.latencyMs, 0) / (stremioResults.filter(r => r.latencyMs > 0).length || 1);

    const hlsSuccessRate = hlsResults.length > 0
        ? hlsResults.filter(r => r.success).length / hlsResults.length
        : 0;
    const hlsAvgLatency = hlsResults.filter(r => r.latencyMs > 0)
        .reduce((sum, r) => sum + r.latencyMs, 0) / (hlsResults.filter(r => r.latencyMs > 0).length || 1);

    console.log(`\n  TorBox Stremio: ${Math.round(stremioSuccessRate * 100)}% success, ${Math.round(stremioAvgLatency)}ms avg`);
    console.log(`  TorBox HLS: ${Math.round(hlsSuccessRate * 100)}% success, ${Math.round(hlsAvgLatency)}ms avg`);

    if (stremioSuccessRate >= 0.5 && stremioAvgLatency < 1000) {
        console.log('\n  ✅ RECOMMEND: TorBox Stremio (Fast, high success rate)');
    } else if (hlsSuccessRate >= 0.5) {
        console.log('\n  ✅ RECOMMEND: TorBox HLS (Reliable, multi-audio support)');
    } else {
        console.log('\n  ⚠️ Both approaches have issues, investigate further');
    }

    console.log('\n' + '═'.repeat(80));
    console.log('  TEST COMPLETE');
    console.log('═'.repeat(80));

    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = './test-results';
    const outputPath = path.join(outputDir, `stream-rigorous-${timestamp}.json`);

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        contentTested: allContent.length,
        results,
        summary: Object.fromEntries(
            Object.entries(byApproach).map(([approach, tests]) => [
                approach,
                {
                    successRate: tests.filter(t => t.success).length / tests.length,
                    avgLatencyMs: Math.round(
                        tests.filter(t => t.latencyMs > 0).reduce((s, t) => s + t.latencyMs, 0) /
                        (tests.filter(t => t.latencyMs > 0).length || 1)
                    ),
                },
            ])
        ),
    }, null, 2));

    console.log(`\n  Results saved to: ${outputPath}\n`);
}

// Run
runTests().catch(console.error);
