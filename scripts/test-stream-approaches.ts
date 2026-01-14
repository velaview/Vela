/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STREAM RESOLUTION TEST SUITE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Tests all stream resolution approaches to find the optimal strategy.
 * 
 * Run: npx tsx scripts/test-stream-approaches.ts
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local if it exists (overriding defaults)
if (fs.existsSync('.env.local')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const TORBOX_API = 'https://api.torbox.app/v1/api';
// ... rest of constants
const TORBOX_STREMIO = `https://stremio.torbox.app/${process.env.TORBOX_API_KEY}`;
const TORRENTIO = 'https://torrentio.strem.fun';

// ─────────────────────────────────────────────────────────────────────────────
// Test Content
// ─────────────────────────────────────────────────────────────────────────────

const TEST_CONTENT = {
    movie: {
        id: 'tt0111161',
        name: 'The Shawshank Redemption',
        type: 'movie' as const,
    },
    series: {
        id: 'tt0944947',
        name: 'Game of Thrones S1E1',
        type: 'series' as const,
        season: 1,
        episode: 1,
    },
    anime: {
        id: 'tt5311514',
        name: 'Your Name (Kimi no Na wa)',
        type: 'movie' as const,
        // Anime with JP/EN audio tracks
    },
    animeSeries: {
        id: 'tt2560140',
        name: 'Attack on Titan S1E1',
        type: 'series' as const,
        season: 1,
        episode: 1,
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

interface TestResult {
    approach: string;
    content: string;
    success: boolean;
    latencyMs: number;
    streamUrl?: string;
    quality?: string;
    audioTracks?: number;
    audioDetails?: Array<{ index: number; language: string; title?: string }>;
    fileType?: string;
    error?: string;
}

async function measure<T>(fn: () => Promise<T>): Promise<{ result: T; latencyMs: number }> {
    const start = Date.now();
    const result = await fn();
    return { result, latencyMs: Date.now() - start };
}

function buildStreamId(content: typeof TEST_CONTENT.movie | typeof TEST_CONTENT.series): string {
    if ('season' in content && 'episode' in content) {
        return `${content.id}:${content.season}:${content.episode}`;
    }
    return content.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Approach A: TorBox Stremio Addon Direct URLs
// ─────────────────────────────────────────────────────────────────────────────

async function testApproachA(content: typeof TEST_CONTENT.movie | typeof TEST_CONTENT.series): Promise<TestResult> {
    const streamId = buildStreamId(content);
    const url = `${TORBOX_STREMIO}/stream/${content.type}/${streamId}.json`;

    try {
        const { result: response, latencyMs } = await measure(async () => {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 15000);
            return fetch(url, { signal: controller.signal });
        });

        if (!response.ok) {
            return {
                approach: 'A: TorBox Stremio',
                content: content.name,
                success: false,
                latencyMs: -1,
                error: `HTTP ${response.status}`,
            };
        }

        const data = await response.json();
        const streams = data.streams || [];

        // Find best 1080p stream
        const best = streams.find((s: any) =>
            s.name?.includes('1080p') || s.title?.includes('1080p')
        ) || streams[0];

        if (!best) {
            return {
                approach: 'A: TorBox Stremio',
                content: content.name,
                success: false,
                latencyMs: -1,
                error: 'No streams found',
            };
        }

        // Check if URL is directly playable
        const streamUrl = best.url || '';
        const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('playlist');
        const isMp4 = streamUrl.includes('.mp4');

        return {
            approach: 'A: TorBox Stremio',
            content: content.name,
            success: true,
            latencyMs: -1, // Will be set after
            streamUrl: streamUrl.substring(0, 100) + '...',
            quality: best.name?.match(/\d{3,4}p/)?.[0] || 'unknown',
            fileType: isHls ? 'HLS' : isMp4 ? 'MP4' : 'unknown',
            audioTracks: 0, // Need to check stream metadata
        };

    } catch (error) {
        return {
            approach: 'A: TorBox Stremio',
            content: content.name,
            success: false,
            latencyMs: -1,
            error: String(error),
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Approach B: Torrentio -> TorBox Library -> requestdl
// ─────────────────────────────────────────────────────────────────────────────

async function testApproachB(content: typeof TEST_CONTENT.movie | typeof TEST_CONTENT.series): Promise<TestResult> {
    const streamId = buildStreamId(content);
    const apiKey = process.env.TORBOX_API_KEY;

    if (!apiKey) {
        return {
            approach: 'B: requestdl',
            content: content.name,
            success: false,
            latencyMs: -1,
            error: 'No TORBOX_API_KEY',
        };
    }

    const totalStart = Date.now();

    try {
        // Step 1: Get hashes from Torrentio
        const torrentioUrl = `${TORRENTIO}/stream/${content.type}/${streamId}.json`;
        const torrentioResp = await fetch(torrentioUrl);
        const torrentioData = await torrentioResp.json();
        const torrents = torrentioData.streams || [];

        if (torrents.length === 0) {
            return {
                approach: 'B: requestdl',
                content: content.name,
                success: false,
                latencyMs: Date.now() - totalStart,
                error: 'No torrents from Torrentio',
            };
        }

        // Get first few hashes
        const hashes = torrents
            .slice(0, 10)
            .map((t: any) => t.infoHash)
            .filter(Boolean);

        // Step 2: Check which are cached
        const cacheUrl = `${TORBOX_API}/torrents/checkcached?hash=${hashes.join('&hash=')}`;
        const cacheResp = await fetch(cacheUrl, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        const cacheData = await cacheResp.json();

        const cachedHashes = Object.entries(cacheData.data || {})
            .filter(([_, v]) => v !== null)
            .map(([h]) => h.toLowerCase());

        if (cachedHashes.length === 0) {
            return {
                approach: 'B: requestdl',
                content: content.name,
                success: false,
                latencyMs: Date.now() - totalStart,
                error: 'No cached torrents',
            };
        }

        // Step 3: Check library for cached torrent
        const libraryResp = await fetch(`${TORBOX_API}/torrents/mylist`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        const libraryData = await libraryResp.json();
        const libraryItems = libraryData.data || [];

        // Find matching torrent in library
        const match = libraryItems.find((item: any) =>
            cachedHashes.includes(item.hash?.toLowerCase())
        );

        if (!match) {
            // Need to add to library first
            const firstCached = torrents.find((t: any) =>
                cachedHashes.includes(t.infoHash?.toLowerCase())
            );

            return {
                approach: 'B: requestdl',
                content: content.name,
                success: false,
                latencyMs: Date.now() - totalStart,
                error: 'Cached torrent not in library (need to add first)',
                quality: firstCached?.title?.match(/\d{3,4}p/)?.[0] || 'unknown',
            };
        }

        // Step 4: Get download URL
        const fileId = match.files?.[0]?.id || 0;
        const dlUrl = `${TORBOX_API}/torrents/requestdl?token=${apiKey}&torrent_id=${match.id}&file_id=${fileId}`;
        const dlResp = await fetch(dlUrl);
        const dlData = await dlResp.json();

        const cdnUrl = dlData.data;
        const isMp4 = cdnUrl?.includes('.mp4') || match.files?.[0]?.name?.includes('.mp4');

        return {
            approach: 'B: requestdl',
            content: content.name,
            success: !!cdnUrl,
            latencyMs: Date.now() - totalStart,
            streamUrl: cdnUrl?.substring(0, 100) + '...',
            quality: match.name?.match(/\d{3,4}p/)?.[0] || 'unknown',
            fileType: isMp4 ? 'MP4' : 'MKV/Other',
            audioTracks: 0, // Can't know without parsing file
        };

    } catch (error) {
        return {
            approach: 'B: requestdl',
            content: content.name,
            success: false,
            latencyMs: Date.now() - totalStart,
            error: String(error),
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Approach B2: TorBox Library -> createHLSStream (with audio tracks)
// ─────────────────────────────────────────────────────────────────────────────

async function testApproachB2(content: typeof TEST_CONTENT.movie | typeof TEST_CONTENT.series): Promise<TestResult> {
    const apiKey = process.env.TORBOX_API_KEY;

    if (!apiKey) {
        return {
            approach: 'B2: HLS createstream',
            content: content.name,
            success: false,
            latencyMs: -1,
            error: 'No TORBOX_API_KEY',
        };
    }

    const totalStart = Date.now();

    try {
        // Get library
        const libraryResp = await fetch(`${TORBOX_API}/torrents/mylist`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        const libraryData = await libraryResp.json();
        const items = libraryData.data || [];

        if (items.length === 0) {
            return {
                approach: 'B2: HLS createstream',
                content: content.name,
                success: false,
                latencyMs: Date.now() - totalStart,
                error: 'Library is empty',
            };
        }

        // Use first item for testing
        const item = items[0];
        const fileId = item.files?.[0]?.id || 0;

        // Create HLS stream
        const streamUrl = `${TORBOX_API}/stream/createstream?id=${item.id}&file_id=${fileId}&type=torrent`;
        const streamResp = await fetch(streamUrl, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        const streamData = await streamResp.json();

        const hlsUrl = streamData.data?.hls_url || streamData.data?.playlist;
        const audioTracks = streamData.data?.metadata?.audios || [];

        return {
            approach: 'B2: HLS createstream',
            content: item.name || content.name,
            success: !!hlsUrl,
            latencyMs: Date.now() - totalStart,
            streamUrl: hlsUrl?.substring(0, 100) + '...',
            quality: item.name?.match(/\d{3,4}p/)?.[0] || 'unknown',
            fileType: 'HLS',
            audioTracks: audioTracks.length,
            audioDetails: audioTracks.map((a: any) => ({
                index: a.index,
                language: a.language || a.language_full || 'unknown',
                title: a.title,
            })),
        };

    } catch (error) {
        return {
            approach: 'B2: HLS createstream',
            content: content.name,
            success: false,
            latencyMs: Date.now() - totalStart,
            error: String(error),
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Approach C: Usenet Search
// ─────────────────────────────────────────────────────────────────────────────

async function testApproachC(content: typeof TEST_CONTENT.movie | typeof TEST_CONTENT.series): Promise<TestResult> {
    const apiKey = process.env.TORBOX_API_KEY;

    if (!apiKey) {
        return {
            approach: 'C: Usenet',
            content: content.name,
            success: false,
            latencyMs: -1,
            error: 'No TORBOX_API_KEY',
        };
    }

    const totalStart = Date.now();

    try {
        // Check existing Usenet items in library
        const usenetResp = await fetch(`${TORBOX_API}/usenet/mylist`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        const usenetData = await usenetResp.json();
        const items = usenetData.data || [];

        return {
            approach: 'C: Usenet Library',
            content: content.name,
            success: true,
            latencyMs: Date.now() - totalStart,
            streamUrl: items.length > 0 ? 'Has Usenet items' : 'No Usenet items',
            audioTracks: 0,
            error: items.length === 0 ? 'No Usenet items in library' : undefined,
        };

    } catch (error) {
        return {
            approach: 'C: Usenet',
            content: content.name,
            success: false,
            latencyMs: Date.now() - totalStart,
            error: String(error),
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Torrentio Availability
// ─────────────────────────────────────────────────────────────────────────────

async function testTorrentioAvailability(content: typeof TEST_CONTENT.movie | typeof TEST_CONTENT.series): Promise<TestResult> {
    const streamId = buildStreamId(content);
    const url = `${TORRENTIO}/stream/${content.type}/${streamId}.json`;

    const start = Date.now();

    try {
        const response = await fetch(url);
        const data = await response.json();
        const streams = data.streams || [];

        // Quality distribution
        const qualities: Record<string, number> = {};
        for (const s of streams) {
            const q = s.title?.match(/\d{3,4}p/)?.[0] || 'unknown';
            qualities[q] = (qualities[q] || 0) + 1;
        }

        return {
            approach: 'Torrentio Availability',
            content: content.name,
            success: streams.length > 0,
            latencyMs: Date.now() - start,
            streamUrl: `${streams.length} streams`,
            quality: JSON.stringify(qualities),
        };

    } catch (error) {
        return {
            approach: 'Torrentio Availability',
            content: content.name,
            success: false,
            latencyMs: Date.now() - start,
            error: String(error),
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Test Runner
// ─────────────────────────────────────────────────────────────────────────────

async function runTests() {
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('  STREAM RESOLUTION TEST SUITE');
    console.log('═'.repeat(80));
    console.log(`  Time: ${new Date().toISOString()}`);
    console.log(`  API Key: ${process.env.TORBOX_API_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log('═'.repeat(80));

    const results: TestResult[] = [];

    // Test each content type
    for (const [key, content] of Object.entries(TEST_CONTENT)) {
        console.log(`\n\n${'─'.repeat(80)}`);
        console.log(`  Testing: ${content.name} (${content.type})`);
        console.log('─'.repeat(80));

        // Torrentio availability
        console.log('\n  [1/5] Checking Torrentio availability...');
        const torrentioResult = await testTorrentioAvailability(content);
        results.push(torrentioResult);
        console.log(`        ${torrentioResult.success ? '✓' : '✗'} ${torrentioResult.streamUrl} (${torrentioResult.latencyMs}ms)`);

        // Approach A
        console.log('\n  [2/5] Testing Approach A: TorBox Stremio Direct...');
        const aResult = await testApproachA(content);
        results.push(aResult);
        console.log(`        ${aResult.success ? '✓' : '✗'} ${aResult.quality || ''} ${aResult.fileType || ''} (${aResult.latencyMs}ms)`);
        if (aResult.error) console.log(`        Error: ${aResult.error}`);

        // Approach B
        console.log('\n  [3/5] Testing Approach B: requestdl...');
        const bResult = await testApproachB(content);
        results.push(bResult);
        console.log(`        ${bResult.success ? '✓' : '✗'} ${bResult.quality || ''} ${bResult.fileType || ''} (${bResult.latencyMs}ms)`);
        if (bResult.error) console.log(`        Error: ${bResult.error}`);

        // Approach B2
        console.log('\n  [4/5] Testing Approach B2: HLS createstream (audio tracks)...');
        const b2Result = await testApproachB2(content);
        results.push(b2Result);
        console.log(`        ${b2Result.success ? '✓' : '✗'} ${b2Result.quality || ''} Audio: ${b2Result.audioTracks} tracks (${b2Result.latencyMs}ms)`);
        if (b2Result.audioDetails && b2Result.audioDetails.length > 0) {
            console.log(`        Audio Details:`);
            for (const track of b2Result.audioDetails) {
                console.log(`          - Track ${track.index}: ${track.language} ${track.title || ''}`);
            }
        }
        if (b2Result.error) console.log(`        Error: ${b2Result.error}`);

        // Approach C
        console.log('\n  [5/5] Testing Approach C: Usenet...');
        const cResult = await testApproachC(content);
        results.push(cResult);
        console.log(`        ${cResult.success ? '✓' : '✗'} ${cResult.streamUrl} (${cResult.latencyMs}ms)`);
        if (cResult.error) console.log(`        Error: ${cResult.error}`);
    }

    // Summary
    console.log('\n\n');
    console.log('═'.repeat(80));
    console.log('  SUMMARY');
    console.log('═'.repeat(80));

    // Group by approach
    const byApproach: Record<string, TestResult[]> = {};
    for (const r of results) {
        if (!byApproach[r.approach]) byApproach[r.approach] = [];
        byApproach[r.approach].push(r);
    }

    for (const [approach, tests] of Object.entries(byApproach)) {
        const successCount = tests.filter(t => t.success).length;
        const avgLatency = tests.filter(t => t.latencyMs > 0).reduce((sum, t) => sum + t.latencyMs, 0) /
            tests.filter(t => t.latencyMs > 0).length || 0;

        console.log(`\n  ${approach}`);
        console.log(`    Success: ${successCount}/${tests.length}`);
        console.log(`    Avg Latency: ${Math.round(avgLatency)}ms`);
    }

    // Audio track summary
    console.log('\n  AUDIO TRACK AVAILABILITY');
    const audioResults = results.filter(r => r.audioTracks !== undefined && r.audioTracks > 0);
    if (audioResults.length > 0) {
        for (const r of audioResults) {
            console.log(`    ${r.content}: ${r.audioTracks} tracks`);
            if (r.audioDetails) {
                for (const a of r.audioDetails) {
                    console.log(`      - ${a.language} ${a.title || ''}`);
                }
            }
        }
    } else {
        console.log('    No audio track data found');
    }

    console.log('\n' + '═'.repeat(80));
    console.log('  TEST COMPLETE');
    console.log('═'.repeat(80) + '\n');

    // Write results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = './test-results';
    const outputPath = path.join(outputDir, `stream-approaches-${timestamp}.json`);

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`  Results saved to: ${outputPath}\n`);
}

// Run
runTests().catch(console.error);
