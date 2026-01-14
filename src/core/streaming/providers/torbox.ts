/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TORBOX CLIENT - Torrentio + TorBox Integration
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * OPTIMIZED 2025-12-23:
 * - Torrentio for fast hash lookup (~1-2s)
 * - TorBox checkcached for cache status (~0.5s)
 * - Direct HLS creation (~0.5s)
 * - Total: ~2-3 seconds!
 * 
 * Flow:
 * 1. Torrentio → get torrent hashes (fast!)
 * 2. TorBox /checkcached → which hashes are cached
 * 3. Add cached torrent to library → create HLS → play
 */

import { ContentType, Stream, Quality, StreamMetadata } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TORBOX_API = 'https://api.torbox.app/v1/api';
const TORRENTIO_API = 'https://torrentio.strem.fun';
const TIMEOUT = 10000;
const MAX_STREAMS_PER_QUALITY = 6;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TorrentioStream {
    hash: string;
    title: string;
    quality: Quality;
    magnet: string;
}

interface ParsedTorBoxUrl {
    hash?: string;
    type: 'torrent' | 'usenet';
    torboxId?: number;
    fileId?: number;
    magnet?: string;
}

interface CreateStreamResponse {
    success: boolean;
    data?: {
        hls_url?: string;
        playlist?: string;
        metadata?: {
            audios?: Array<{
                index: number;
                language?: string;
                language_full?: string;
                title?: string;
                default?: boolean;
            }>;
            intro_information?: {
                start_time?: number;
                end_time?: number;
            };
        };
    };
    error?: string;
    detail?: string;
}

interface TorrentFile {
    id: number;
    name: string;
    size: number;
}

interface TorrentItem {
    id: number;
    hash?: string;
    files?: TorrentFile[];
}

// ─────────────────────────────────────────────────────────────────────────────
// TorBox Client
// ─────────────────────────────────────────────────────────────────────────────

class TorBoxClient {
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.TORBOX_API_KEY || '';
    }

    /**
     * Get streams for content with HLS transcoding.
     * Optimized: Direct URL parsing, early exit, limited streams.
     */
    /**
     * Get streams for content with HLS transcoding.
     * OPTIMIZED V2 (Hybrid Direct):
     * 1. Get hashes from Torrentio (Fast)
     * 2. Try to add to library with add_only_if_cached=true (Instant)
     * 3. If success -> Create Stream
     */
    async getStreams(
        contentId: string,
        type: ContentType,
        season?: number,
        episode?: number
    ): Promise<Stream[]> {
        if (!this.apiKey) {
            console.warn('[TorBox] API key not configured');
            return [];
        }

        const startTime = Date.now();
        console.log(`[TorBox] Getting streams for ${type}/${contentId}`);

        try {
            // 1. Get torrent hashes from Torrentio
            const torrentioStart = Date.now();
            const torrents = await this.getTorrentioStreams(contentId, type, season, episode);
            console.log(`[TorBox] Torrentio: ${torrents.length} in ${Date.now() - torrentioStart}ms`);

            if (torrents.length === 0) {
                return [];
            }

            // 2. Try to find a working stream (First 5 HQ sources)
            // We race them sequentially for reliability but stop at first success
            const candidates = torrents.slice(0, 8);

            for (const torrent of candidates) {
                if (!torrent.magnet) continue;

                // Try to add (optimistically)
                const added = await this.addTorrentOptimized(torrent.magnet);

                if (added) {
                    // Success! It was cached and added instantly.

                    // SMART CHECK: Inspect files to decide between Direct Play or HLS
                    const files = await this.getTorrentFileList(added.torrentId);

                    // Find largest video file
                    const videoFiles = files.filter((f: TorrentFile) => {
                        const ext = f.name.split('.').pop()?.toLowerCase();
                        return ['mp4', 'mkv', 'avi', 'webm', 'mov'].includes(ext || '');
                    }).sort((a: TorrentFile, b: TorrentFile) => b.size - a.size);

                    if (videoFiles.length > 0) {
                        const bestFile = videoFiles[0];
                        const ext = bestFile.name.split('.').pop()?.toLowerCase() || '';
                        const isDirectPlay = ['mp4', 'webm'].includes(ext);

                        if (isDirectPlay) {
                            // OPTION A: Direct Play (Fastest, no transcoding)
                            const dlLink = await this.requestDirectLink(added.torrentId, bestFile.id);
                            if (dlLink) {
                                const elapsed = Date.now() - startTime;
                                console.log(`[TorBox] ✅ Resolved DIRECT (${ext}) in ${elapsed}ms: ${torrent.title}`);
                                return [{
                                    id: `torbox-direct-${added.torrentId}`,
                                    url: dlLink,
                                    quality: torrent.quality,
                                    source: 'torbox' as const,
                                    title: torrent.title || 'TorBox Direct',
                                    cached: true,
                                    inLibrary: true,
                                    hash: torrent.hash?.toLowerCase(),
                                    type: 'mp4' // Signal for player
                                }];
                            }
                        }

                        // OPTION B: Fallback to HLS (Universal compatibility)
                        const hlsResult = await this.createHLSStream(added.torrentId, bestFile.id);
                        if (hlsResult) {
                            const elapsed = Date.now() - startTime;
                            console.log(`[TorBox] ✅ Resolved HLS in ${elapsed}ms: ${torrent.title}`);

                            return [{
                                id: `torbox-${added.torrentId}`,
                                url: hlsResult.hlsUrl,
                                hlsUrl: hlsResult.hlsUrl,
                                quality: torrent.quality,
                                source: 'torbox' as const,
                                title: torrent.title || 'TorBox Stream',
                                cached: true,
                                inLibrary: true,
                                hash: torrent.hash?.toLowerCase(),
                                metadata: hlsResult.metadata,
                            }];
                        }
                    }
                }
            }

            console.log(`[TorBox] ❌ No cached streams found in top ${candidates.length} candidates`);
            return [];

        } catch (error) {
            console.error('[TorBox] Error:', error);
            return [];
        }
    }

    /**
     * OPTIMIZED ADD:
     * Adds torrent ONLY if it's already cached.
     * This combines "Check Cache" and "Add" into one fast request (approx 800ms).
     */
    private async addTorrentOptimized(magnet: string): Promise<{ torrentId: number; fileId?: number } | null> {
        try {
            const formData = new FormData();
            formData.append('magnet', magnet);
            formData.append('seed', '1');
            formData.append('allow_zip', 'false');
            formData.append('add_only_if_cached', 'true'); // <--- THE MAGIC SAUCE

            const response = await fetch(`${TORBOX_API}/torrents/createtorrent`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.apiKey}` },
                body: formData,
            });

            const data = await response.json();

            // Success means it was cached and added
            if (data.success && (data.data?.torrent_id || data.data?.id)) {
                // Get file ID immediately
                const torrentId = data.data.torrent_id || data.data.id;
                const fileId = await this.getFirstFileId(torrentId);
                return { torrentId, fileId };
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Helper to get first file ID from a torrent
     */
    private async getFirstFileId(torrentId: number): Promise<number | undefined> {
        try {
            const response = await fetch(`${TORBOX_API}/torrents/mylist?id=${torrentId}`, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` },
            });
            const data = await response.json();
            return data.data?.files?.[0]?.id;
        } catch {
            return undefined;
        }
    }

    /**
     * Get user's library as a hash->id map
     */
    private async getLibraryHashes(): Promise<Map<string, { id: number; fileId?: number }>> {
        const map = new Map<string, { id: number; fileId?: number }>();

        try {
            const response = await fetch(`${TORBOX_API}/torrents/mylist`, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` },
            });

            if (!response.ok) return map;

            const data = await response.json();
            const items = data.data || [];

            for (const item of items) {
                if (item.hash) {
                    map.set(item.hash.toLowerCase(), {
                        id: item.id,
                        fileId: item.files?.[0]?.id,
                    });
                }
            }

            return map;

        } catch (error) {
            console.error('[TorBox] Library fetch error:', error);
            return map;
        }
    }

    /**
     * Get torrent info from Torrentio
     */
    private async getTorrentioStreams(
        contentId: string,
        type: ContentType,
        season?: number,
        episode?: number
    ): Promise<TorrentioStream[]> {
        let streamId = contentId;
        if ((type === 'series' || type === 'anime') && season !== undefined && episode !== undefined) {
            streamId = `${contentId}:${season}:${episode}`;
        }

        const stremioType = type === 'anime' ? 'series' : type;
        const url = `${TORRENTIO_API}/stream/${stremioType}/${streamId}.json`;

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), TIMEOUT);

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (!response.ok) {
                console.error(`[TorBox] Torrentio HTTP ${response.status}`);
                return [];
            }

            const data = await response.json();
            const streams: TorrentioStream[] = [];

            for (const s of (data.streams || [])) {
                const hash = this.extractHashFromUrl(s.infoHash || s.url || '');
                if (!hash) continue;

                streams.push({
                    hash,
                    title: s.title || s.name || '',
                    quality: this.extractQuality(s.title || s.name || ''),
                    magnet: `magnet:?xt=urn:btih:${hash}`,
                });
            }

            return streams;

        } catch (error) {
            console.error('[TorBox] Torrentio error:', error);
            return [];
        }
    }

    /**
     * Check which hashes are cached on TorBox
     */
    private async checkCached(hashes: string[]): Promise<Set<string>> {
        if (hashes.length === 0) return new Set();

        try {
            const url = `${TORBOX_API}/torrents/checkcached?hash=${hashes.join('&hash=')}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` },
            });

            if (!response.ok) {
                console.error(`[TorBox] checkcached HTTP ${response.status}`);
                return new Set();
            }

            const data = await response.json();
            const cached = new Set<string>();

            // Response format: { data: { "hash1": { ... }, "hash2": null } }
            if (data.data && typeof data.data === 'object') {
                for (const [hash, info] of Object.entries(data.data)) {
                    if (info !== null) {
                        cached.add(hash.toLowerCase());
                    }
                }
            }

            return cached;

        } catch (error) {
            console.error('[TorBox] checkcached error:', error);
            return new Set();
        }
    }

    /**
     * Extract hash from URL or infoHash
     */
    private extractHashFromUrl(urlOrHash: string): string | undefined {
        // Direct hash
        if (/^[a-fA-F0-9]{40}$/i.test(urlOrHash)) {
            return urlOrHash.toLowerCase();
        }

        // From magnet URL
        const magnetMatch = urlOrHash.match(/urn:btih:([a-fA-F0-9]{40})/i);
        if (magnetMatch) {
            return magnetMatch[1].toLowerCase();
        }

        return undefined;
    }


    /**
     * Group streams by quality for Torrentio streams
     */
    private groupByQuality(streams: TorrentioStream[]): Record<Quality, TorrentioStream[]> {
        const groups: Record<Quality, TorrentioStream[]> = {
            '4k': [],
            '1080p': [],
            '720p': [],
            '480p': [],
            'unknown': [],
        };

        for (const stream of streams) {
            const quality = stream.quality;
            if (groups[quality].length < MAX_STREAMS_PER_QUALITY) {
                groups[quality].push(stream);
            }
        }

        return groups;
    }

    /**
     * Add a torrent to user's library via magnet link
     * For cached torrents, this is INSTANT
     * Returns the torrent ID and first file ID
     */
    private async addTorrentToLibrary(magnet: string): Promise<{ torrentId: number; fileId?: number } | null> {
        try {
            const formData = new FormData();
            formData.append('magnet', magnet);
            formData.append('seed', '1');
            formData.append('allow_zip', 'false');

            const response = await fetch(`${TORBOX_API}/torrents/createtorrent`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const text = await response.text();
                console.warn(`[TorBox] Add torrent HTTP ${response.status}: ${text.substring(0, 100)}`);
                return null;
            }

            const data = await response.json();

            // Response format: { success: true, data: { torrent_id: 123, ... } }
            if (data.success && data.data?.torrent_id) {
                return {
                    torrentId: data.data.torrent_id,
                    fileId: data.data.files?.[0]?.id,
                };
            }

            // Torrent queued = not ready for HLS
            if (data.detail?.includes('queued')) {
                console.log(`[TorBox] Torrent queued, not ready`);
                return null;
            }

            console.warn('[TorBox] Add torrent unexpected response:', JSON.stringify(data).substring(0, 200));
            return null;

        } catch (error) {
            console.error('[TorBox] Add torrent error:', error);
            return null;
        }
    }

    /**
     * Find an existing torrent in user's library by hash
     * Existing library torrents are HLS-ready immediately!
     */
    private async findInLibrary(
        hash: string,
        type: 'torrent' | 'usenet' = 'torrent'
    ): Promise<{ id: number; fileId?: number } | null> {
        try {
            const endpoint = type === 'usenet'
                ? `${TORBOX_API}/usenet/mylist`
                : `${TORBOX_API}/torrents/mylist`;

            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` },
            });

            if (!response.ok) return null;

            const data = await response.json();
            const items = data.data || [];

            // Find item with matching hash
            const item = items.find((t: TorrentItem) =>
                t.hash?.toLowerCase() === hash.toLowerCase()
            );

            if (item) {
                return {
                    id: item.id,
                    fileId: item.files?.[0]?.id,
                };
            }

            return null;

        } catch (error) {
            console.error('[TorBox] Library lookup error:', error);
            return null;
        }
    }

    /**
     * Create HLS stream via TorBox Stream API
     */
    private async createHLSStream(
        id: number,
        fileId?: number,
        type: 'torrent' | 'usenet' = 'torrent'
    ): Promise<{ hlsUrl: string; metadata?: StreamMetadata } | null> {
        if (!id) return null;

        const params = new URLSearchParams({
            id: id.toString(),
            type,
        });

        if (fileId !== undefined) {
            params.set('file_id', fileId.toString());
        }

        const url = `${TORBOX_API}/stream/createstream?${params.toString()}`;

        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` },
            });

            if (!response.ok) {
                console.warn(`[TorBox] Stream API HTTP ${response.status}`);
                return null;
            }

            const data: CreateStreamResponse = await response.json();

            const hlsUrl = data.data?.hls_url || data.data?.playlist;
            if (!data.success || !hlsUrl) {
                console.warn('[TorBox] Stream API: No HLS URL returned');
                return null;
            }

            // Extract metadata
            const metadata: StreamMetadata = {};

            if (data.data?.metadata?.audios) {
                metadata.audioTracks = data.data.metadata.audios.map(a => ({
                    index: a.index,
                    language: a.language || a.language_full || 'unknown',
                    title: a.title,
                    default: a.default,
                }));
            }

            if (data.data?.metadata?.intro_information) {
                metadata.introStart = data.data.metadata.intro_information.start_time;
                metadata.introEnd = data.data.metadata.intro_information.end_time;
            }

            return { hlsUrl, metadata };

        } catch (error) {
            console.error('[TorBox] Stream API error:', error);
            return null;
        }
    }

    /**
     * Parse TorBox URL to extract torboxId and fileId
     * 
     * URL format: https://stremio.torbox.app/{apikey}/new-stream-url/{base64data}
     * 
     * Decoded base64 formats vary, but we look for:
     * - Torrent hash (40 hex chars)
     * - Type (torrent/usenet)
     * - TorboxId (integer)
     * - FileId (integer)
     */
    private parseTorBoxUrl(url: string): ParsedTorBoxUrl {
        const result: ParsedTorBoxUrl = { type: 'torrent' };

        try {
            const match = url.match(/new-stream-url\/([A-Za-z0-9+/=_-]+)/);
            if (!match) return result;

            // Decode base64 (handle URL-safe variant)
            const base64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
            const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
            const decoded = Buffer.from(padded, 'base64').toString('utf-8');

            // Extract hash (40 hex for torrent, 32 for usenet)
            const hashMatch = decoded.match(/^["\[]?"?([a-fA-F0-9]{32,40})["']?/);
            if (hashMatch) {
                result.hash = hashMatch[1].toLowerCase();
            }

            // Detect type
            if (decoded.includes('"usenet"') || (result.hash && result.hash.length === 32)) {
                result.type = 'usenet';
            }

            // Try to extract torboxId - look for numeric values in the array
            // Format could be: ["hash","torrent","magnet",imdbid,torboxId,fileId]
            // Or: ["hash","type","magnet"]
            const numberMatches = decoded.match(/,(\d+)(?=[,\]])/g);
            if (numberMatches && numberMatches.length >= 1) {
                // Last two numbers are usually torboxId and fileId
                const numbers = numberMatches.map(m => parseInt(m.replace(',', '')));

                if (numbers.length >= 2) {
                    result.torboxId = numbers[numbers.length - 2];
                    result.fileId = numbers[numbers.length - 1];
                } else if (numbers.length === 1) {
                    result.torboxId = numbers[0];
                }
            }

            // Extract magnet if present
            const magnetMatch = decoded.match(/magnet:\?[^"]+/);
            if (magnetMatch) {
                result.magnet = magnetMatch[0];
            }

        } catch (error) {
            console.warn('[TorBox] URL parse error:', error);
        }

        return result;
    }

    /**
     * Extract quality from stream name
     */
    private extractQuality(name: string): Quality {
        const lower = name.toLowerCase();
        if (lower.includes('2160p') || lower.includes('4k') || lower.includes('uhd')) return '4k';
        if (lower.includes('1080p')) return '1080p';
        if (lower.includes('720p')) return '720p';
        if (lower.includes('480p')) return '480p';
        return 'unknown';
    }

    /**
     * Get user's torrent list (for advanced features)
     */
    async getMyTorrents(): Promise<TorrentItem[]> {
        try {
            const response = await fetch(`${TORBOX_API}/torrents/mylist`, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` },
            });
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('[TorBox] Failed to get torrent list:', error);
            return [];
        }
    }
    /**
     * Get list of files in a torrent
     */
    private async getTorrentFileList(torrentId: number): Promise<TorrentFile[]> {
        try {
            const response = await fetch(`${TORBOX_API}/torrents/mylist?id=${torrentId}`, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` },
            });
            const data = await response.json();
            return data.data?.files || [];
        } catch {
            return [];
        }
    }

    /**
     * Request a direct download link for a file
     */
    private async requestDirectLink(torrentId: number, fileId: number): Promise<string | null> {
        try {
            const params = new URLSearchParams({
                torrent_id: torrentId.toString(),
                file_id: fileId.toString(),
                zip: 'false',
            });
            const response = await fetch(`${TORBOX_API}/torrents/requestdl?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` },
            });
            const data = await response.json();

            if (data.success && data.data) {
                return data.data;
            }
            return null;
        } catch (e) {
            console.error('[TorBox] Direct link request failed:', e);
            return null;
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────────────────────

export const torboxClient = new TorBoxClient();

/**
 * Get TorBox streams with HLS transcoding
 * Main export for use in resolver
 */
export async function getTorBoxStreams(
    contentId: string,
    type: ContentType,
    season?: number,
    episode?: number
): Promise<Stream[]> {
    return torboxClient.getStreams(contentId, type, season, episode);
}
