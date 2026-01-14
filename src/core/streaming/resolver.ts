/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STREAM RESOLVER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Main entry point for stream resolution.
 * Simple, clean, professional.
 * 
 * Strategy:
 * 1. Try TorBox Stremio (instant HLS)
 * 2. Pick best quality match
 * 3. Create session
 * 4. Return playable URL
 */

import { PlayRequest, PlayResponse, Stream, Quality } from './types';
import { getTorBoxStreams, getSubtitles } from './providers';
import { createSession } from './session';
import { db, resolvedStreams } from '@/lib/db';
import { eq, and, gt } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a play request to a playable stream.
 * Returns session ID and stream URL.
 */
export async function resolveStream(request: PlayRequest): Promise<PlayResponse> {
    const { contentId: rawContentId, type, season, episode, preferredQuality = '1080p' } = request;
    const startTime = Date.now();

    // Convert TMDB ID to IMDB ID if needed
    let contentId = rawContentId;
    if (rawContentId.includes('tmdb:') || rawContentId.includes('tmdb%3A')) {
        const tmdbId = rawContentId.replace('tmdb:', '').replace('tmdb%3A', '');
        console.log(`[StreamResolver] Converting TMDB ${tmdbId} to IMDB...`);
        const imdbId = await convertTmdbToImdb(tmdbId, type);
        if (imdbId) {
            contentId = imdbId;
            console.log(`[StreamResolver] Converted to IMDB: ${imdbId}`);
        } else {
            console.log(`[StreamResolver] ⚠️ Could not convert TMDB to IMDB`);
        }
    }

    // Convert Kitsu ID to IMDB ID if needed (handle URL-encoded %3A)
    if (contentId.includes('kitsu:') || contentId.includes('kitsu%3A')) {
        // Decode URL-encoded ID and normalize
        const kitsuId = decodeURIComponent(contentId);
        console.log(`[StreamResolver] Converting Kitsu ${kitsuId} to IMDB...`);
        const imdbId = await convertKitsuToImdb(kitsuId);
        if (imdbId) {
            contentId = imdbId;
            console.log(`[StreamResolver] Converted to IMDB: ${imdbId}`);
        } else {
            console.log(`[StreamResolver] ⚠️ Could not convert Kitsu to IMDB`);
        }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('[StreamResolver] Starting resolution');
    console.log('═'.repeat(70));
    console.log(`  Content: ${contentId} (${type})`);
    if (season !== undefined) console.log(`  Season: ${season}, Episode: ${episode}`);
    console.log(`  Preferred Quality: ${preferredQuality}`);
    console.log('─'.repeat(70));

    // 0. Check database cache first (instant!)
    const contentKey = season && episode
        ? `${contentId}:S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
        : contentId;

    const now = new Date();
    const cached = await db
        .select()
        .from(resolvedStreams)
        .where(and(
            eq(resolvedStreams.contentKey, contentKey),
            gt(resolvedStreams.expiresAt, now)
        ))
        .limit(1);

    if (cached.length > 0) {
        const cachedStream = cached[0];
        console.log(`[StreamResolver] ✅ CACHE HIT! Using cached stream`);
        console.log(`  Quality: ${cachedStream.quality}, Expires: ${cachedStream.expiresAt}`);

        // Create session with cached stream
        const stream: Stream = {
            id: cachedStream.id,
            url: cachedStream.streamUrl,
            quality: cachedStream.quality as Quality,
            source: 'torbox',
            title: cachedStream.filename || 'Cached Stream',
            cached: true,
            hlsUrl: cachedStream.streamUrl,
            hash: cachedStream.infoHash || undefined,
        };

        const session = await createSession(
            contentId,
            type,
            stream,
            cachedStream.streamUrl,
            season,
            episode
        );

        // Fetch subtitles in parallel
        const subtitles = await getSubtitles(contentId, type, season, episode);

        console.log(`\n[StreamResolver] ✅ Complete (CACHED) in ${Date.now() - startTime}ms`);
        console.log('═'.repeat(70) + '\n');

        return {
            sessionId: session.id,
            streamUrl: cachedStream.streamUrl,
            stream,
            alternatives: [],
            subtitles,
        };
    }

    // 1. Fetch streams from TorBox
    const torboxStart = Date.now();
    const streams = await getTorBoxStreams(contentId, type, season, episode);
    const torboxTime = Date.now() - torboxStart;

    console.log(`\n[TorBox Fetch] Completed in ${torboxTime}ms`);
    console.log(`  Total streams: ${streams.length}`);

    if (streams.length === 0) {
        console.log('  ❌ No streams found!');
        console.log('═'.repeat(70) + '\n');
        throw new Error('No streams available for this content');
    }

    // Quality distribution
    const qualityDist: Record<string, number> = {};
    streams.forEach(s => {
        qualityDist[s.quality] = (qualityDist[s.quality] || 0) + 1;
    });
    console.log('  Quality distribution:');
    Object.entries(qualityDist).forEach(([q, count]) => {
        console.log(`    ${q}: ${count} streams`);
    });

    // 2. Pick best stream matching preferred quality
    const best = pickBestStream(streams, preferredQuality);

    console.log(`\n[Stream Selection]`);
    console.log(`  Selected: ${best.quality} (${best.source})`);
    console.log(`  Title: ${best.title?.substring(0, 60)}...`);
    console.log(`  URL preview: ${best.url.substring(0, 80)}...`);
    console.log(`  Cached: ${best.cached ? 'Yes' : 'No'}`);

    // 3. Create session
    const session = await createSession(
        contentId,
        type,
        best,
        best.url,
        season,
        episode
    );
    console.log(`\n[Session Created]`);
    console.log(`  ID: ${session.id}`);

    // 4. Fetch subtitles (async, don't block)
    const subtitlesStart = Date.now();
    const subtitles = await getSubtitles(contentId, type, season, episode);
    const subtitlesTime = Date.now() - subtitlesStart;

    console.log(`\n[Subtitles] Fetched in ${subtitlesTime}ms`);
    console.log(`  Found: ${subtitles.length} subtitle tracks`);
    if (subtitles.length > 0) {
        const langs = [...new Set(subtitles.map(s => s.language))].slice(0, 5);
        console.log(`  Languages: ${langs.join(', ')}...`);
    }

    const totalTime = Date.now() - startTime;
    console.log('\n' + '─'.repeat(70));
    console.log(`[StreamResolver] ✅ Complete in ${totalTime}ms`);
    console.log(`  Stream URL: /api/stream/${session.id}/master.m3u8`);
    console.log(`  Alternatives: ${streams.length - 1}`);
    console.log('═'.repeat(70) + '\n');

    // 5. Build stream URL
    // If stream has direct HLS URL from TorBox, use it directly (no proxy needed)
    // If stream is direct video, use URL directly
    // Only use proxy for manifest rewriting cases
    const streamUrl = best.hlsUrl
        ? best.hlsUrl  // Direct TorBox HLS - no proxy needed!
        : best.url;    // Direct video URL

    console.log(`  URL Type: ${best.hlsUrl ? 'HLS (direct)' : 'Direct video'}`);

    // 5b. Cache newly resolved stream for future instant access
    try {
        const { nanoid } = await import('nanoid');
        const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
        await db.insert(resolvedStreams).values({
            id: nanoid(),
            contentKey,
            source: 'torbox',
            provider: 'torbox',
            quality: best.quality,
            streamUrl,
            infoHash: best.hash,
            filename: best.title,
            resolvedAt: now,
            expiresAt,
        }).onConflictDoUpdate({
            target: [resolvedStreams.contentKey, resolvedStreams.source, resolvedStreams.quality],
            set: {
                streamUrl,
                resolvedAt: now,
                expiresAt,
            },
        });
        console.log(`[StreamResolver] Cached stream for ${contentKey}`);
    } catch (cacheError) {
        console.warn('[StreamResolver] Failed to cache:', cacheError);
    }

    // 6. Return response
    return {
        sessionId: session.id,
        streamUrl,
        stream: best,
        alternatives: streams.filter(s => s.id !== best.id).slice(0, 10),
        subtitles,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stream Selection
// ─────────────────────────────────────────────────────────────────────────────

const QUALITY_PRIORITY: Quality[] = ['1080p', '4k', '720p', '480p', 'unknown'];

/**
 * Pick the best stream matching preferred quality.
 * PRIORITIZATION (Updated 2025-12-24):
 * 1. Direct Play (MP4/WebM) - Fastest, no transcoding needed.
 * 2. HLS - Reliable cross-browser support, but adds latency.
 * 3. Fallback - MKV/AVI (might not play in browser).
 * 
 * Quality: 1080p > 4k (Stability over Pixels)
 */
function pickBestStream(streams: Stream[], preferred: Quality): Stream {
    // Split streams by type
    const directPlayStreams = streams.filter(s => s.type === 'mp4' || (s.url && s.url.includes('.mp4')));
    const hlsStreams = streams.filter(s => s.hlsUrl);
    const otherStreams = streams.filter(s => !directPlayStreams.includes(s) && !hlsStreams.includes(s));

    console.log(`[StreamResolver] Availability: DirectMP4=${directPlayStreams.length}, HLS=${hlsStreams.length}, Other=${otherStreams.length}`);

    // Helper to find best quality match
    const findBestQuality = (list: Stream[]): Stream | null => {
        // Strict prioritization: 1080p is king.
        // If preferred is 4k, we still check if we have it, but generally 1080p is safer.

        let target = preferred;
        if (target === '4k' && list.some(s => s.quality === '1080p')) {
            // Optional: You could downgrade here if you wanted to FORCE 1080p
            // But for now we respect the user's "preferred" if it was explicitly passed.
            // However, default caller usually passes '1080p' or undefined.
        }

        // Try exact match
        const exact = list.find(s => s.quality === target);
        if (exact) return exact;

        // Try 1080p explicitly if target wasn't found
        const fallback1080 = list.find(s => s.quality === '1080p');
        if (fallback1080) return fallback1080;

        // Try 4k
        const fallback4k = list.find(s => s.quality === '4k');
        if (fallback4k) return fallback4k;

        // Try 720p
        const fallback720 = list.find(s => s.quality === '720p');
        if (fallback720) return fallback720;

        return list[0] || null;
    };

    // 1. Try Direct Play (Fastest)
    if (directPlayStreams.length > 0) {
        const best = findBestQuality(directPlayStreams);
        if (best) {
            console.log(`[StreamResolver] 🚀 Selected DIRECT MP4: ${best.quality}`);
            return best;
        }
    }

    // 2. Try HLS (Reliable)
    if (hlsStreams.length > 0) {
        const best = findBestQuality(hlsStreams);
        if (best) {
            console.log(`[StreamResolver] 🛡️ Selected HLS: ${best.quality}`);
            return best;
        }
    }

    // 3. Fallback
    if (otherStreams.length > 0) {
        const best = findBestQuality(otherStreams);
        if (best) {
            console.log(`[StreamResolver] ⚠️ Fallback to raw stream: ${best.quality}`);
            return best;
        }
    }

    return streams[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// TMDB to IMDB Conversion
// ─────────────────────────────────────────────────────────────────────────────

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || '';

/**
 * Convert TMDB ID to IMDB ID using TMDB external_ids API
 */
async function convertTmdbToImdb(tmdbId: string, type: string): Promise<string | null> {
    if (!TMDB_API_KEY) {
        console.warn('[TMDB] No API key configured');
        return null;
    }

    try {
        const mediaType = type === 'movie' ? 'movie' : 'tv';
        const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;

        const response = await fetch(url);
        if (!response.ok) {
            console.error(`[TMDB] HTTP ${response.status}`);
            return null;
        }

        const data = await response.json();
        const imdbId = data.imdb_id;

        if (imdbId && imdbId.startsWith('tt')) {
            return imdbId;
        }

        return null;
    } catch (error) {
        console.error('[TMDB] Conversion error:', error);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Kitsu to IMDB Conversion
// ─────────────────────────────────────────────────────────────────────────────

const KITSU_ADDON = 'https://anime-kitsu.strem.fun';

/**
 * Convert Kitsu ID to IMDB ID by fetching Kitsu metadata.
 * Kitsu addon embeds IMDB ID in behaviorHints.defaultVideoId or links.
 */
async function convertKitsuToImdb(kitsuId: string): Promise<string | null> {
    try {
        const url = `${KITSU_ADDON}/meta/anime/${kitsuId}.json`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
            console.error(`[Kitsu] HTTP ${response.status}`);
            return null;
        }

        const data = await response.json();
        const meta = data.meta;

        if (!meta) {
            return null;
        }

        // Try multiple locations where IMDB ID might be stored
        // 1. behaviorHints.defaultVideoId (most common)
        let imdbId = meta.behaviorHints?.defaultVideoId;

        // 2. Direct imdb_id field
        if (!imdbId) {
            imdbId = meta.imdb_id;
        }

        // 3. Search in links array for IMDB link
        if (!imdbId && meta.links) {
            const imdbLink = meta.links.find((link: any) =>
                link.category === 'imdb' ||
                link.url?.includes('imdb.com')
            );
            if (imdbLink) {
                const match = imdbLink.url?.match(/tt\d+/);
                if (match) {
                    imdbId = match[0];
                }
            }
        }

        // Validate it's a proper IMDB ID
        if (imdbId && imdbId.startsWith('tt')) {
            return imdbId;
        }

        console.warn('[Kitsu] No IMDB ID found in metadata');
        return null;

    } catch (error) {
        console.error('[Kitsu] Conversion error:', error);
        return null;
    }
}
