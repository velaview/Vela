import { NextRequest, NextResponse } from 'next/server';

const TORBOX_API = 'https://api.torbox.app/v1/api';
const TORRENTIO = 'https://torrentio.strem.fun';

function getTorBoxApiKey(): string {
    return process.env.TORBOX_API_KEY || '';
}

function getTorBoxStremioUrl(): string {
    return `https://stremio.torbox.app/${getTorBoxApiKey()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Kitsu to IMDB conversion
// ─────────────────────────────────────────────────────────────────────────────

async function convertKitsuToImdb(kitsuId: string): Promise<string | null> {
    const num = kitsuId.replace('kitsu:', '');
    try {
        const resp = await fetch(`https://anime-kitsu.strem.fun/meta/series/${kitsuId}.json`, { signal: AbortSignal.timeout(5000) });
        const data = await resp.json();
        if (data.meta?.imdb_id) return data.meta.imdb_id;
        if (data.meta?.imdbId) return data.meta.imdbId;
        const mappings: Record<string, string> = {
            '7442': 'tt2560140',  // Attack on Titan
            '11469': 'tt5626028', // My Hero Academia
            '21856': 'tt5311514', // Your Name
        };
        return mappings[num] || null;
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Types & Functions
// ─────────────────────────────────────────────────────────────────────────────

interface TestResult {
    method: string;
    success: boolean;
    url?: string | null;
    quality?: string;
    latencyMs: number;
    error?: string;
    metadata?: any;
    urlType?: string;
}

async function measure<T>(fn: () => Promise<T>): Promise<{ result: T; latency: number }> {
    const start = performance.now();
    try {
        const result = await fn();
        return { result, latency: Math.round(performance.now() - start) };
    } catch (e) {
        throw e;
    }
}

async function fetchJson(url: string, options?: RequestInit) {
    const resp = await fetch(url, { ...options, signal: AbortSignal.timeout(60000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
}

// Quality/Format Filter - Prioritize 1080p MP4
function filterAndSortStreams(streams: any[]): any[] {
    if (!streams || streams.length === 0) return streams;

    // Score each stream: higher = better match for 1080p MP4
    const scored = streams.map(s => {
        let score = 0;
        const name = (s.name || s.title || '').toLowerCase();
        const url = (s.url || '').toLowerCase();

        // Quality scoring (1080p > 720p > 4K/2160p)
        if (name.includes('1080p')) score += 100;
        else if (name.includes('720p')) score += 50;
        else if (name.includes('2160p') || name.includes('4k')) score += 10; // Deprioritize 4K

        // Format scoring (MP4 > MKV)
        if (url.includes('.mp4') || name.includes('mp4')) score += 50;
        if (url.includes('.mkv') || name.includes('mkv')) score += 10;

        // Penalize HDR/DV (often larger files, compatibility issues)
        if (name.includes('hdr') || name.includes('dv') || name.includes('dolby')) score -= 20;

        return { stream: s, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.map(s => s.stream);
}

// ─────────────────────────────────────────────────────────────────────────────
// The 12+ Testing Methods
// ─────────────────────────────────────────────────────────────────────────────

// 1. Torrentio Baseline (Hashes Only)
async function methodTorrentioBaseline(id: string, type: string, season?: number, episode?: number): Promise<TestResult> {
    const streamId = type === 'series' ? `${id}:${season}:${episode}` : id;
    const { result, latency } = await measure(() => fetchJson(`${TORRENTIO}/stream/${type}/${streamId}.json`));
    const streams = filterAndSortStreams(result.streams || []);
    const best = streams[0];
    return {
        method: '1. Torrentio Baseline',
        success: streams.length > 0,
        latencyMs: latency,
        quality: best?.name?.match(/\d{3,4}p/)?.[0] || 'unknown',
        metadata: { count: streams.length, title: best?.title?.substring(0, 50) },
        urlType: 'hash',
    };
}

// 2. TorBox Stremio (Default Addon) - Filtered for 1080p MP4
async function methodTorBoxStremio(id: string, type: string, season?: number, episode?: number): Promise<TestResult> {
    const streamId = type === 'series' ? `${id}:${season}:${episode}` : id;
    const { result, latency } = await measure(() => fetchJson(`${getTorBoxStremioUrl()}/stream/${type}/${streamId}.json`));
    const streams = filterAndSortStreams(result.streams || []);
    const best = streams[0];
    const url = best?.url || '';
    return {
        method: '2. TorBox Stremio (1080p)',
        success: streams.length > 0,
        latencyMs: latency,
        url: best?.url,
        quality: best?.name?.match(/\d{3,4}p/)?.[0] || 'unknown',
        urlType: url.includes('.mp4') ? 'mp4' : url.includes('.mkv') ? 'mkv' : 'other',
        metadata: { title: best?.title?.substring(0, 50), totalStreams: streams.length }
    };
}

// 4. TorBox HLS (Library -> Create HLS)
async function methodTorBoxHLSLibrary(id: string, type: string, season?: number, episode?: number): Promise<TestResult> {
    const apiKey = getTorBoxApiKey();
    const start = performance.now();

    // 1. Get torrents
    const streamId = type === 'series' ? `${id}:${season}:${episode}` : id;
    const torrentData = await fetchJson(`${TORRENTIO}/stream/${type}/${streamId}.json`);
    const hashes = (torrentData.streams || []).slice(0, 5).map((t: any) => t.infoHash);
    if (!hashes.length) return { method: '4. TorBox HLS', success: false, latencyMs: performance.now() - start, error: 'No torrents' };

    // 2. Check cached
    const cacheData = await fetchJson(`${TORBOX_API}/torrents/checkcached?hash=${hashes.join('&hash=')}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    const cachedHashes = Object.entries(cacheData.data || {}).filter(([_, v]) => v).map(([k]) => k.toLowerCase());
    if (!cachedHashes.length) return { method: '4. TorBox HLS', success: false, latencyMs: performance.now() - start, error: 'No cached torrents' };

    // 3. Check library
    const libData = await fetchJson(`${TORBOX_API}/torrents/mylist`, { headers: { Authorization: `Bearer ${apiKey}` } });
    const match = (libData.data || []).find((t: any) => cachedHashes.includes(t.hash?.toLowerCase()));
    if (!match) return { method: '4. TorBox HLS', success: false, latencyMs: performance.now() - start, error: 'Not in library' };

    // 4. Create HLS
    const fileId = match.files?.[0]?.id || 0;
    const hlsData = await fetchJson(`${TORBOX_API}/stream/createstream?id=${match.id}&file_id=${fileId}&type=torrent`, { headers: { Authorization: `Bearer ${apiKey}` } });

    return {
        method: '4. TorBox HLS',
        success: !!hlsData.data?.hls_url,
        latencyMs: Math.round(performance.now() - start),
        url: hlsData.data?.hls_url,
        urlType: 'hls',
        metadata: { audioTracks: hlsData.data?.metadata?.audios?.length },
    };
}

// 5. TorBox MP4 (Library -> Request DL) - NEW: Instant MP4
async function methodTorBoxMP4Library(id: string, type: string, season?: number, episode?: number): Promise<TestResult> {
    const apiKey = getTorBoxApiKey();
    const start = performance.now();

    // Steps 1-3 same as HLS
    const streamId = type === 'series' ? `${id}:${season}:${episode}` : id;
    const torrentData = await fetchJson(`${TORRENTIO}/stream/${type}/${streamId}.json`);
    const hashes = (torrentData.streams || []).slice(0, 5).map((t: any) => t.infoHash);
    if (!hashes.length) return { method: '5. TorBox MP4', success: false, latencyMs: performance.now() - start, error: 'No torrents' };

    const cacheData = await fetchJson(`${TORBOX_API}/torrents/checkcached?hash=${hashes.join('&hash=')}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    const cachedHashes = Object.entries(cacheData.data || {}).filter(([_, v]) => v).map(([k]) => k.toLowerCase());
    if (!cachedHashes.length) return { method: '5. TorBox MP4', success: false, latencyMs: performance.now() - start, error: 'No cached torrents' };

    const libData = await fetchJson(`${TORBOX_API}/torrents/mylist`, { headers: { Authorization: `Bearer ${apiKey}` } });
    const match = (libData.data || []).find((t: any) => cachedHashes.includes(t.hash?.toLowerCase()));
    if (!match) return { method: '5. TorBox MP4', success: false, latencyMs: performance.now() - start, error: 'Not in library' };

    // 4. Request DL (Instant Link)
    const fileId = match.files?.[0]?.id || 0;
    const dlData = await fetchJson(`${TORBOX_API}/torrents/requestdl?token=${apiKey}&torrent_id=${match.id}&file_id=${fileId}&zip=false`);

    return {
        method: '5. TorBox MP4 (Instant)',
        success: !!dlData.data,
        latencyMs: Math.round(performance.now() - start),
        url: dlData.data,
        urlType: 'mp4', // usually direct link
    };
}

// 7. Usenet Library (Direct)
async function methodUsenetDirect(id: string, type: string): Promise<TestResult> {
    const apiKey = getTorBoxApiKey();
    const start = performance.now();

    const libData = await fetchJson(`${TORBOX_API}/usenet/mylist`, { headers: { Authorization: `Bearer ${apiKey}` } });
    const items = libData.data || [];
    // Just pick first for test, in real app we match content
    const match = items[0];

    if (!match) return { method: '7. Usenet Direct', success: false, latencyMs: Date.now() - start, error: 'No Usenet items' };

    const dlData = await fetchJson(`${TORBOX_API}/usenet/requestdl?token=${apiKey}&usenet_id=${match.id}&file_id=${match.files?.[0]?.id || 0}`);

    return {
        method: '7. Usenet Direct',
        success: !!dlData.data,
        latencyMs: Math.round(performance.now() - start),
        url: dlData.data,
        urlType: 'mp4',
    };
}

// 11. Hanime Direct
async function methodHanimeDirect(id: string): Promise<TestResult> {
    // Only works if ID is hanime ID
    if (!id.includes('hanime') && !id.match(/[a-z-]+/)) return { method: '11. Hanime', success: false, latencyMs: 0, error: 'Not Hanime ID' };

    const start = performance.now();
    try {
        const resp = await fetch(`https://86f0740f37f6-hanime-stremio.baby-beamup.club/stream/movie/${id}.json`);
        const data = await resp.json();
        return {
            method: '11. Hanime Direct',
            success: (data.streams || []).length > 0,
            latencyMs: Math.round(performance.now() - start),
            url: data.streams?.[0]?.url,
            urlType: 'hls',
        };
    } catch (e) {
        return { method: '11. Hanime', success: false, latencyMs: Math.round(performance.now() - start), error: String(e) };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Route Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    let id = request.nextUrl.searchParams.get('id') || '';
    const type = request.nextUrl.searchParams.get('type') || 'movie';
    const method = request.nextUrl.searchParams.get('method') || 'all';
    const season = parseInt(request.nextUrl.searchParams.get('season') || '1');
    const episode = parseInt(request.nextUrl.searchParams.get('episode') || '1');

    if (id.startsWith('kitsu:')) {
        const imdb = await convertKitsuToImdb(id);
        if (imdb) id = imdb;
    }

    try {
        const results: TestResult[] = [];

        // Execute requested methods
        if (method === 'all' || method === '1') results.push(await methodTorrentioBaseline(id, type, season, episode));
        if (method === 'all' || method === '2') results.push(await methodTorBoxStremio(id, type, season, episode));
        if (method === 'all' || method === '4') results.push(await methodTorBoxHLSLibrary(id, type, season, episode));
        // 6. Hybrid V3 (Smart Direct) - The Ultimate logic?
        async function methodHybridV3Smart(id: string, type: string, season?: number, episode?: number): Promise<TestResult> {
            const apiKey = getTorBoxApiKey();
            const start = performance.now();

            // 1. Get torrent hashes (Torrentio)
            const streamId = type === 'series' ? `${id}:${season}:${episode}` : id;
            const torrentData = await fetchJson(`${TORRENTIO}/stream/${type}/${streamId}.json`);
            const torrents = (torrentData.streams || []).slice(0, 8); // Top 8
            const hashes = torrents.map((t: any) => t.infoHash);

            if (!hashes.length) return { method: '6. Hybrid V3 (Smart)', success: false, latencyMs: performance.now() - start, error: 'No torrents' };

            // 2. Check Cache (TorBox)
            const cacheData = await fetchJson(`${TORBOX_API}/torrents/checkcached?hash=${hashes.join('&hash=')}`, { headers: { Authorization: `Bearer ${apiKey}` } });
            const cachedMap = cacheData.data || {};
            const cachedHashes = Object.keys(cachedMap).filter(h => cachedMap[h]);

            if (!cachedHashes.length) return { method: '6. Hybrid V3 (Smart)', success: false, latencyMs: performance.now() - start, error: 'No cached torrents' };

            // 3. Select best cached torrent (Mocking priority: 1080p > 4K)
            // Find first cached hash in our original torrent list order (assuming Torrentio ordered them well)
            // But we want to prefer 1080p.
            const bestHash = cachedHashes[0]; // Simplified for test
            const magnet = torrents.find((t: any) => t.infoHash === bestHash)?.url || `magnet:?xt=urn:btih:${bestHash}`;

            // 4. Add to Library (Optimistic)
            // Note: use form data for add
            const formData = new FormData();
            formData.append('magnet', magnet);
            formData.append('seed', '1');
            formData.append('allow_zip', 'false');
            formData.append('add_only_if_cached', 'true');

            const addRes = await fetch(`${TORBOX_API}/torrents/createtorrent`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiKey}` },
                body: formData,
            });
            if (!addRes.ok) {
                const text = await addRes.text();
                return { method: '6. Hybrid V3 (Smart)', success: false, latencyMs: performance.now() - start, error: `Add failed ${addRes.status}: ${text.substring(0, 50)}` };
            }
            const addData = await addRes.json();

            if (!addData.success || !addData.data) {
                return { method: '6. Hybrid V3 (Smart)', success: false, latencyMs: performance.now() - start, error: 'Add failed' };
            }

            const torrentId = addData.data.torrent_id || addData.data.id;

            // 5. Smart File Check
            const listData = await fetchJson(`${TORBOX_API}/torrents/mylist?id=${torrentId}`, { headers: { Authorization: `Bearer ${apiKey}` } });
            const files = listData.data.files || [];

            // Find largest video
            const videoFiles = files.filter((f: any) => {
                const ext = f.name.split('.').pop()?.toLowerCase();
                return ['mp4', 'mkv', 'avi', 'webm', 'mov'].includes(ext);
            }).sort((a: any, b: any) => b.size - a.size);

            if (!videoFiles.length) return { method: '6. Hybrid V3 (Smart)', success: false, latencyMs: performance.now() - start, error: 'No video files' };

            const bestFile = videoFiles[0];
            const ext = bestFile.name.split('.').pop()?.toLowerCase();
            const isDirectPlay = ['mp4', 'webm'].includes(ext);

            let finalUrl = '';
            let finalType = '';

            if (isDirectPlay) {
                // Direct Link!
                const dlData = await fetchJson(`${TORBOX_API}/torrents/requestdl?token=${apiKey}&torrent_id=${torrentId}&file_id=${bestFile.id}&zip=false`);
                finalUrl = dlData.data;
                finalType = ext;
            } else {
                // HLS Fallback (MKV etc)
                const hlsData = await fetchJson(`${TORBOX_API}/stream/createstream?id=${torrentId}&file_id=${bestFile.id}&type=torrent`, { headers: { Authorization: `Bearer ${apiKey}` } });
                finalUrl = hlsData.data?.hls_url;
                finalType = 'hls (transcoded)';
            }

            return {
                method: '6. Hybrid V3 (Smart)',
                success: !!finalUrl,
                latencyMs: Math.round(performance.now() - start),
                url: finalUrl,
                urlType: finalType,
                metadata: { filename: bestFile.name, size: bestFile.size, mode: isDirectPlay ? 'Direct' : 'HLS' }
            };
        }

        if (method === 'all' || method === '5') results.push(await methodTorBoxMP4Library(id, type, season, episode));
        if (method === 'all' || method === '6') results.push(await methodHybridV3Smart(id, type, season, episode));
        if (method === 'all' || method === '7') results.push(await methodUsenetDirect(id, type));
        if (method === 'all' || method === '11') results.push(await methodHanimeDirect(id));

        return NextResponse.json({ results });

    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
