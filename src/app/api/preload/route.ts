/**
 * POST /api/preload
 * 
 * Pre-resolve stream URLs when user visits content details page.
 * For movies: Resolves main stream
 * For series: Fetches streams ONCE, then resolves episodes from same torrent
 * 
 * TorBox HLS URLs are valid for ~3 hours, we use 2-hour cache expiry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, resolvedStreams } from '@/lib/db';
import { eq, and, gt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { resolveStream } from '@/core/streaming/resolver';

const CACHE_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_EPISODES = 16;
const CONCURRENT_RESOLVES = 4; // Limit concurrent TorBox HLS creations

interface PreloadRequest {
    contentId: string;
    type: 'movie' | 'series' | 'anime';
    season?: number;
    episodes?: number[];
}

export async function POST(request: NextRequest) {
    try {
        const body: PreloadRequest = await request.json();
        const { contentId, type, season = 1 } = body;

        if (!contentId || !type) {
            return NextResponse.json({ error: 'contentId and type required' }, { status: 400 });
        }

        console.log(`[Preload] Starting for ${type}/${contentId} season ${season}`);
        const startTime = Date.now();

        // For movies, just resolve the movie stream
        if (type === 'movie') {
            const result = await preloadSingleContent(contentId, type);
            console.log(`[Preload] Movie resolved in ${Date.now() - startTime}ms`);
            return NextResponse.json({
                preloaded: result ? 1 : 0,
                cached: result?.cached || false,
            });
        }

        // For series, resolve episodes with limited concurrency
        const episodeNumbers = body.episodes || Array.from({ length: MAX_EPISODES }, (_, i) => i + 1);

        let resolved = 0;
        let cached = 0;

        // Process in batches of CONCURRENT_RESOLVES
        for (let i = 0; i < episodeNumbers.length; i += CONCURRENT_RESOLVES) {
            const batch = episodeNumbers.slice(i, i + CONCURRENT_RESOLVES);
            const results = await Promise.allSettled(
                batch.map(ep => preloadSingleContent(contentId, type, season, ep))
            );

            for (const result of results) {
                if (result.status === 'fulfilled' && result.value) {
                    resolved++;
                    if (result.value.cached) cached++;
                }
            }

            // Small delay between batches to avoid overwhelming TorBox
            if (i + CONCURRENT_RESOLVES < episodeNumbers.length) {
                await new Promise(r => setTimeout(r, 500));
            }
        }

        const elapsed = Date.now() - startTime;
        console.log(`[Preload] ✅ ${resolved}/${episodeNumbers.length} episodes (${cached} cached) in ${elapsed}ms`);

        return NextResponse.json({
            preloaded: resolved,
            cached,
            total: episodeNumbers.length,
            elapsed,
        });

    } catch (error) {
        console.error('[Preload] Error:', error);
        return NextResponse.json(
            { error: 'Failed to preload' },
            { status: 500 }
        );
    }
}

async function preloadSingleContent(
    contentId: string,
    type: string,
    season?: number,
    episode?: number
): Promise<{ url: string; cached: boolean } | null> {
    const contentKey = season && episode
        ? `${contentId}:S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
        : contentId;

    // Check if already cached and not expired
    const now = new Date();
    try {
        const cached = await db
            .select()
            .from(resolvedStreams)
            .where(and(
                eq(resolvedStreams.contentKey, contentKey),
                gt(resolvedStreams.expiresAt, now)
            ))
            .limit(1);

        if (cached.length > 0) {
            return { url: cached[0].streamUrl, cached: true };
        }
    } catch {
        // DB check failed, continue with resolution
    }

    // Resolve via streaming resolver directly (faster than HTTP call)
    try {
        const result = await resolveStream({
            contentId,
            type: type as 'movie' | 'series' | 'anime',
            season,
            episode,
            preferredQuality: '1080p',
        });

        if (result.streamUrl) {
            console.log(`[Preload] ✓ ${contentKey}`);
            return { url: result.streamUrl, cached: false };
        }

        return null;
    } catch (error) {
        console.error(`[Preload] ✗ ${contentKey}:`, error instanceof Error ? error.message : 'Unknown error');
        return null;
    }
}
