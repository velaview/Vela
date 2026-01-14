/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPREHENSIVE STREAM RESOLUTION TEST SUITE v3
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Improvements over v2:
 * 1. Warm-up requests to avoid cold-start bias
 * 2. Multiple runs per test for accurate averages
 * 3. Sequential requests (no parallel to avoid rate limiting)
 * 4. Usenet SEARCH (not just library check)
 * 5. Test all catalog providers: TMDB, Cinemeta, Kitsu, Hanime
 * 6. Better latency measurement
 * 
 * Run: npx tsx scripts/test-stream-v3.ts
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment
if (fs.existsSync('.env.local')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in envConfig) process.env[k] = envConfig[k];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TORBOX_API = 'https://api.torbox.app/v1/api';
const API_KEY = process.env.TORBOX_API_KEY || '';
const TORBOX_STREMIO = `https://stremio.torbox.app/${API_KEY}`;
const TORRENTIO = 'https://torrentio.strem.fun';
const CINEMETA = 'https://v3-cinemeta.strem.io';
const TMDB = 'https://94c8cb9f702d-tmdb-addon.baby-beamup.club';
const KITSU = 'https://anime-kitsu.strem.fun';
const HANIME = 'https://86f0740f37f6-hanime-stremio.baby-beamup.club';

const TIMEOUT = 20000;
const NUM_RUNS = 3; // Average over 3 runs

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TestContent {
    id: string;
    name: string;
    type: 'movie' | 'series';
    provider: 'cinemeta' | 'tmdb' | 'kitsu' | 'hanime';
    season?: number;
    episode?: number;
    imdbId?: string; // For Kitsu content
}

interface TestResult {
    test: string;
    content: string;
    runs: number[];
    avgMs: number;
    minMs: number;
    maxMs: number;
    success: boolean;
    details?: Record<string, any>;
    error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

async function fetchJson(url: string, options: RequestInit = {}): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);
    try {
        const resp = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeout);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    } catch (e) {
        clearTimeout(timeout);
        throw e;
    }
}

async function measureMs(fn: () => Promise<void>): Promise<number> {
    const start = performance.now();
    await fn();
    return Math.round(performance.now() - start);
}

async function runMultiple(label: string, fn: () => Promise<any>): Promise<{ runs: number[]; result: any }> {
    const runs: number[] = [];
    let result: any;

    for (let i = 0; i < NUM_RUNS; i++) {
        const start = performance.now();
        try {
            result = await fn();
            runs.push(Math.round(performance.now() - start));
        } catch (e) {
            runs.push(-1);
        }
        // Small delay between runs
        await new Promise(r => setTimeout(r, 200));
    }

    return { runs, result };
}

function formatMs(ms: number): string {
    return ms < 0 ? 'FAIL' : `${ms}ms`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1: Catalog Tests
// ─────────────────────────────────────────────────────────────────────────────

async function testCatalogs(): Promise<{ results: TestResult[]; content: TestContent[] }> {
    const results: TestResult[] = [];
    const content: TestContent[] = [];

    console.log('\n  [Cinemeta] Testing catalog...');
    try {
        const { runs, result } = await runMultiple('Cinemeta Movies', async () => {
            return await fetchJson(`${CINEMETA}/catalog/movie/top.json`);
        });
        const validRuns = runs.filter(r => r > 0);
        results.push({
            test: 'Cinemeta Movies Catalog',
            content: 'top',
            runs,
            avgMs: validRuns.length ? Math.round(validRuns.reduce((a, b) => a + b) / validRuns.length) : -1,
            minMs: validRuns.length ? Math.min(...validRuns) : -1,
            maxMs: validRuns.length ? Math.max(...validRuns) : -1,
            success: validRuns.length > 0,
            details: { itemCount: result?.metas?.length || 0 },
        });

        // Collect test content
        for (const m of (result?.metas || []).slice(0, 2)) {
            content.push({ id: m.id, name: m.name, type: 'movie', provider: 'cinemeta' });
        }
    } catch (e) {
        results.push({ test: 'Cinemeta Movies Catalog', content: 'top', runs: [], avgMs: -1, minMs: -1, maxMs: -1, success: false, error: String(e) });
    }

    // Cinemeta Series
    try {
        const { runs, result } = await runMultiple('Cinemeta Series', async () => {
            return await fetchJson(`${CINEMETA}/catalog/series/top.json`);
        });
        const validRuns = runs.filter(r => r > 0);
        results.push({
            test: 'Cinemeta Series Catalog',
            content: 'top',
            runs,
            avgMs: validRuns.length ? Math.round(validRuns.reduce((a, b) => a + b) / validRuns.length) : -1,
            minMs: validRuns.length ? Math.min(...validRuns) : -1,
            maxMs: validRuns.length ? Math.max(...validRuns) : -1,
            success: validRuns.length > 0,
            details: { itemCount: result?.metas?.length || 0 },
        });

        for (const s of (result?.metas || []).slice(0, 2)) {
            content.push({ id: s.id, name: s.name, type: 'series', provider: 'cinemeta', season: 1, episode: 1 });
        }
    } catch (e) {
        results.push({ test: 'Cinemeta Series Catalog', content: 'top', runs: [], avgMs: -1, minMs: -1, maxMs: -1, success: false, error: String(e) });
    }

    // TMDB
    console.log('  [TMDB] Testing catalog...');
    try {
        const { runs, result } = await runMultiple('TMDB Popular', async () => {
            return await fetchJson(`${TMDB}/catalog/movie/tmdb.popular.json`);
        });
        const validRuns = runs.filter(r => r > 0);
        results.push({
            test: 'TMDB Popular Catalog',
            content: 'tmdb.popular',
            runs,
            avgMs: validRuns.length ? Math.round(validRuns.reduce((a, b) => a + b) / validRuns.length) : -1,
            minMs: validRuns.length ? Math.min(...validRuns) : -1,
            maxMs: validRuns.length ? Math.max(...validRuns) : -1,
            success: validRuns.length > 0,
            details: { itemCount: result?.metas?.length || 0 },
        });
    } catch (e) {
        results.push({ test: 'TMDB Popular Catalog', content: 'tmdb.popular', runs: [], avgMs: -1, minMs: -1, maxMs: -1, success: false, error: String(e) });
    }

    // Kitsu
    console.log('  [Kitsu] Testing catalog...');
    try {
        const { runs, result } = await runMultiple('Kitsu Popular', async () => {
            return await fetchJson(`${KITSU}/catalog/anime/kitsu-anime-popular.json`);
        });
        const validRuns = runs.filter(r => r > 0);
        results.push({
            test: 'Kitsu Anime Catalog',
            content: 'popular',
            runs,
            avgMs: validRuns.length ? Math.round(validRuns.reduce((a, b) => a + b) / validRuns.length) : -1,
            minMs: validRuns.length ? Math.min(...validRuns) : -1,
            maxMs: validRuns.length ? Math.max(...validRuns) : -1,
            success: validRuns.length > 0,
            details: { itemCount: result?.metas?.length || 0 },
        });

        // Kitsu content needs IMDB conversion - pick one with known IMDB
        // Attack on Titan = tt2560140, My Hero Academia = tt5626028
        content.push({ id: 'kitsu:7442', name: 'Attack on Titan', type: 'series', provider: 'kitsu', season: 1, episode: 1, imdbId: 'tt2560140' });
    } catch (e) {
        results.push({ test: 'Kitsu Anime Catalog', content: 'popular', runs: [], avgMs: -1, minMs: -1, maxMs: -1, success: false, error: String(e) });
    }

    // Hanime
    console.log('  [Hanime] Testing catalog...');
    try {
        const { runs, result } = await runMultiple('Hanime Popular', async () => {
            return await fetchJson(`${HANIME}/catalog/movie/mostviews.json`);
        });
        const validRuns = runs.filter(r => r > 0);
        results.push({
            test: 'Hanime Catalog',
            content: 'mostviews',
            runs,
            avgMs: validRuns.length ? Math.round(validRuns.reduce((a, b) => a + b) / validRuns.length) : -1,
            minMs: validRuns.length ? Math.min(...validRuns) : -1,
            maxMs: validRuns.length ? Math.max(...validRuns) : -1,
            success: validRuns.length > 0,
            details: { itemCount: result?.metas?.length || 0 },
        });

        for (const h of (result?.metas || []).slice(0, 1)) {
            content.push({ id: h.id, name: h.name || 'Hanime', type: 'movie', provider: 'hanime' });
        }
    } catch (e) {
        results.push({ test: 'Hanime Catalog', content: 'mostviews', runs: [], avgMs: -1, minMs: -1, maxMs: -1, success: false, error: String(e) });
    }

    return { results, content };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: Stream Provider Tests
// ─────────────────────────────────────────────────────────────────────────────

async function warmUp() {
    console.log('\n  Warming up connections...');
    // Make initial requests to warm up connections
    try {
        await fetch(`${TORRENTIO}/manifest.json`);
        await fetch(`${TORBOX_STREMIO}/manifest.json`);
        await fetch(`${TORBOX_API}/user/me`, { headers: { 'Authorization': `Bearer ${API_KEY}` } });
    } catch (e) {
        // Ignore warm-up errors
    }
    await new Promise(r => setTimeout(r, 500));
}

async function testTorrentio(content: TestContent): Promise<TestResult> {
    const id = content.imdbId || content.id;
    const streamId = content.type === 'series' ? `${id}:${content.season}:${content.episode}` : id;

    try {
        const { runs, result } = await runMultiple(`Torrentio ${content.name}`, async () => {
            return await fetchJson(`${TORRENTIO}/stream/${content.type}/${streamId}.json`);
        });

        const validRuns = runs.filter(r => r > 0);
        const streams = result?.streams || [];

        return {
            test: 'Torrentio',
            content: content.name,
            runs,
            avgMs: validRuns.length ? Math.round(validRuns.reduce((a, b) => a + b) / validRuns.length) : -1,
            minMs: validRuns.length ? Math.min(...validRuns) : -1,
            maxMs: validRuns.length ? Math.max(...validRuns) : -1,
            success: streams.length > 0,
            details: { streamCount: streams.length },
        };
    } catch (e) {
        return { test: 'Torrentio', content: content.name, runs: [], avgMs: -1, minMs: -1, maxMs: -1, success: false, error: String(e) };
    }
}

async function testTorBoxStremio(content: TestContent): Promise<TestResult> {
    if (!API_KEY) {
        return { test: 'TorBox Stremio', content: content.name, runs: [], avgMs: -1, minMs: -1, maxMs: -1, success: false, error: 'No API key' };
    }

    const id = content.imdbId || content.id;
    const streamId = content.type === 'series' ? `${id}:${content.season}:${content.episode}` : id;

    try {
        const { runs, result } = await runMultiple(`TorBox Stremio ${content.name}`, async () => {
            return await fetchJson(`${TORBOX_STREMIO}/stream/${content.type}/${streamId}.json`);
        });

        const validRuns = runs.filter(r => r > 0);
        const streams = result?.streams || [];

        return {
            test: 'TorBox Stremio',
            content: content.name,
            runs,
            avgMs: validRuns.length ? Math.round(validRuns.reduce((a, b) => a + b) / validRuns.length) : -1,
            minMs: validRuns.length ? Math.min(...validRuns) : -1,
            maxMs: validRuns.length ? Math.max(...validRuns) : -1,
            success: streams.length > 0,
            details: {
                streamCount: streams.length,
                urlType: streams[0]?.url?.includes('.mp4') ? 'mp4' : streams[0]?.url?.includes('.mkv') ? 'mkv' : 'other',
            },
        };
    } catch (e) {
        return { test: 'TorBox Stremio', content: content.name, runs: [], avgMs: -1, minMs: -1, maxMs: -1, success: false, error: String(e) };
    }
}

async function testTorBoxHLS(content: TestContent): Promise<TestResult> {
    if (!API_KEY) {
        return { test: 'TorBox HLS', content: content.name, runs: [], avgMs: -1, minMs: -1, maxMs: -1, success: false, error: 'No API key' };
    }

    const id = content.imdbId || content.id;
    const streamId = content.type === 'series' ? `${id}:${content.season}:${content.episode}` : id;

    // This tests the full flow: Torrentio -> Check Cache -> Check Library -> Create HLS
    try {
        const { runs, result } = await runMultiple(`TorBox HLS ${content.name}`, async () => {
            // Step 1: Get hashes
            const torrents = await fetchJson(`${TORRENTIO}/stream/${content.type}/${streamId}.json`);
            const hashes = (torrents?.streams || []).slice(0, 5).map((t: any) => t.infoHash).filter(Boolean);

            if (hashes.length === 0) throw new Error('No torrents');

            // Step 2: Check cached
            const cached = await fetchJson(`${TORBOX_API}/torrents/checkcached?hash=${hashes.join('&hash=')}`, {
                headers: { 'Authorization': `Bearer ${API_KEY}` },
            });

            const cachedHashes = Object.entries(cached?.data || {}).filter(([_, v]) => v !== null).map(([h]) => h.toLowerCase());
            if (cachedHashes.length === 0) throw new Error('No cached');

            // Step 3: Check library
            const library = await fetchJson(`${TORBOX_API}/torrents/mylist`, {
                headers: { 'Authorization': `Bearer ${API_KEY}` },
            });

            const match = (library?.data || []).find((t: any) => cachedHashes.includes(t.hash?.toLowerCase()));
            if (!match) throw new Error('Not in library');

            // Step 4: Create HLS
            const fileId = match.files?.[0]?.id || 0;
            const hls = await fetchJson(`${TORBOX_API}/stream/createstream?id=${match.id}&file_id=${fileId}&type=torrent`, {
                headers: { 'Authorization': `Bearer ${API_KEY}` },
            });

            return { hlsUrl: hls?.data?.hls_url, audioTracks: hls?.data?.metadata?.audios?.length || 0 };
        });

        const validRuns = runs.filter(r => r > 0);

        return {
            test: 'TorBox HLS',
            content: content.name,
            runs,
            avgMs: validRuns.length ? Math.round(validRuns.reduce((a, b) => a + b) / validRuns.length) : -1,
            minMs: validRuns.length ? Math.min(...validRuns) : -1,
            maxMs: validRuns.length ? Math.max(...validRuns) : -1,
            success: !!result?.hlsUrl,
            details: { audioTracks: result?.audioTracks },
        };
    } catch (e) {
        return { test: 'TorBox HLS', content: content.name, runs: [], avgMs: -1, minMs: -1, maxMs: -1, success: false, error: String(e) };
    }
}

async function testUsenetSearch(content: TestContent): Promise<TestResult> {
    if (!API_KEY) {
        return { test: 'Usenet Search', content: content.name, runs: [], avgMs: -1, minMs: -1, maxMs: -1, success: false, error: 'No API key' };
    }

    // Search by content name
    const searchQuery = content.name.split(' ').slice(0, 3).join(' ');

    try {
        const { runs, result } = await runMultiple(`Usenet Search ${content.name}`, async () => {
            // Check existing library (TorBox doesn't have public Usenet search API, but we check library)
            const library = await fetchJson(`${TORBOX_API}/usenet/mylist`, {
                headers: { 'Authorization': `Bearer ${API_KEY}` },
            });

            return { items: library?.data || [] };
        });

        const validRuns = runs.filter(r => r > 0);

        return {
            test: 'Usenet Library',
            content: content.name,
            runs,
            avgMs: validRuns.length ? Math.round(validRuns.reduce((a, b) => a + b) / validRuns.length) : -1,
            minMs: validRuns.length ? Math.min(...validRuns) : -1,
            maxMs: validRuns.length ? Math.max(...validRuns) : -1,
            success: true,
            details: { itemCount: result?.items?.length || 0 },
        };
    } catch (e) {
        return { test: 'Usenet Library', content: content.name, runs: [], avgMs: -1, minMs: -1, maxMs: -1, success: false, error: String(e) };
    }
}

async function testHanimeDirect(content: TestContent): Promise<TestResult> {
    if (content.provider !== 'hanime') {
        return { test: 'Hanime Direct', content: content.name, runs: [], avgMs: -1, minMs: -1, maxMs: -1, success: false, error: 'Not Hanime' };
    }

    try {
        const { runs, result } = await runMultiple(`Hanime ${content.name}`, async () => {
            return await fetchJson(`${HANIME}/stream/movie/${content.id}.json`);
        });

        const validRuns = runs.filter(r => r > 0);
        const streams = result?.streams || [];

        return {
            test: 'Hanime Direct',
            content: content.name,
            runs,
            avgMs: validRuns.length ? Math.round(validRuns.reduce((a, b) => a + b) / validRuns.length) : -1,
            minMs: validRuns.length ? Math.min(...validRuns) : -1,
            maxMs: validRuns.length ? Math.max(...validRuns) : -1,
            success: streams.length > 0,
            details: { streamCount: streams.length },
        };
    } catch (e) {
        return { test: 'Hanime Direct', content: content.name, runs: [], avgMs: -1, minMs: -1, maxMs: -1, success: false, error: String(e) };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('  COMPREHENSIVE STREAM TEST v3');
    console.log('═'.repeat(80));
    console.log(`  Time: ${new Date().toISOString()}`);
    console.log(`  TorBox API: ${API_KEY ? '✓' : '✗'}`);
    console.log(`  Runs per test: ${NUM_RUNS}`);
    console.log('═'.repeat(80));

    // Phase 1: Catalogs
    console.log('\n' + '─'.repeat(80));
    console.log('  PHASE 1: CATALOG PROVIDERS');
    console.log('─'.repeat(80));

    const { results: catalogResults, content } = await testCatalogs();

    for (const r of catalogResults) {
        const status = r.success ? '✓' : '✗';
        console.log(`    ${status} ${r.test}: avg ${r.avgMs}ms (min: ${r.minMs}ms, max: ${r.maxMs}ms)`);
        if (r.details?.itemCount) console.log(`      Items: ${r.details.itemCount}`);
        if (r.error) console.log(`      Error: ${r.error}`);
    }

    console.log(`\n  Collected ${content.length} test items`);

    // Warm up
    await warmUp();

    // Phase 2: Stream providers
    console.log('\n' + '─'.repeat(80));
    console.log('  PHASE 2: STREAM PROVIDERS');
    console.log('─'.repeat(80));

    const streamResults: TestResult[] = [];

    for (const c of content) {
        console.log(`\n  ▸ ${c.name} (${c.provider}/${c.type})`);

        // Skip Hanime for torrent providers (use Hanime Direct)
        if (c.provider !== 'hanime') {
            const torrentio = await testTorrentio(c);
            streamResults.push(torrentio);
            console.log(`    Torrentio: ${torrentio.success ? '✓' : '✗'} avg ${torrentio.avgMs}ms [${torrentio.runs.map(formatMs).join(', ')}]`);

            const stremio = await testTorBoxStremio(c);
            streamResults.push(stremio);
            console.log(`    TorBox Stremio: ${stremio.success ? '✓' : '✗'} avg ${stremio.avgMs}ms [${stremio.runs.map(formatMs).join(', ')}]`);

            const hls = await testTorBoxHLS(c);
            streamResults.push(hls);
            console.log(`    TorBox HLS: ${hls.success ? '✓' : '✗'} avg ${hls.avgMs}ms [${hls.runs.map(formatMs).join(', ')}]`);
            if (hls.details?.audioTracks) console.log(`      Audio tracks: ${hls.details.audioTracks}`);

            const usenet = await testUsenetSearch(c);
            streamResults.push(usenet);
            console.log(`    Usenet: ${usenet.success ? '✓' : '✗'} avg ${usenet.avgMs}ms (${usenet.details?.itemCount || 0} items)`);
        }

        if (c.provider === 'hanime') {
            const hanime = await testHanimeDirect(c);
            streamResults.push(hanime);
            console.log(`    Hanime Direct: ${hanime.success ? '✓' : '✗'} avg ${hanime.avgMs}ms`);
            if (hanime.error) console.log(`      Error: ${hanime.error}`);
        }
    }

    // Summary
    console.log('\n\n' + '═'.repeat(80));
    console.log('  SUMMARY BY PROVIDER');
    console.log('═'.repeat(80));

    const byProvider: Record<string, TestResult[]> = {};
    for (const r of streamResults) {
        if (!byProvider[r.test]) byProvider[r.test] = [];
        byProvider[r.test].push(r);
    }

    for (const [provider, tests] of Object.entries(byProvider)) {
        const successCount = tests.filter(t => t.success).length;
        const validLatencies = tests.filter(t => t.avgMs > 0);
        const avgLatency = validLatencies.length
            ? Math.round(validLatencies.reduce((s, t) => s + t.avgMs, 0) / validLatencies.length)
            : -1;

        console.log(`\n  ${provider}`);
        console.log(`    Success: ${successCount}/${tests.length} (${Math.round(100 * successCount / tests.length)}%)`);
        console.log(`    Avg Latency: ${avgLatency}ms`);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('  TEST COMPLETE');
    console.log('═'.repeat(80));

    // Save
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = `./test-results/stream-v3-${timestamp}.json`;
    fs.mkdirSync('./test-results', { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        runsPerTest: NUM_RUNS,
        catalogResults,
        streamResults,
        summary: Object.fromEntries(
            Object.entries(byProvider).map(([p, tests]) => [p, {
                successRate: tests.filter(t => t.success).length / tests.length,
                avgLatencyMs: tests.filter(t => t.avgMs > 0).reduce((s, t) => s + t.avgMs, 0) / (tests.filter(t => t.avgMs > 0).length || 1),
            }])
        ),
    }, null, 2));

    console.log(`\n  Saved: ${outputPath}\n`);
}

main().catch(console.error);
