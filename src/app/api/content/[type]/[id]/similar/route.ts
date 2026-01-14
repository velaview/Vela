/**
 * GET /api/content/[type]/[id]/similar
 * 
 * Find similar content based on genres.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contentCache } from '@/lib/db/schema';
import { eq, and, ne, like, desc, or } from 'drizzle-orm';
import { getMeta } from '@/core/streaming';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ type: string; id: string }> }
) {
    try {
        const { type, id } = await params;

        // 1. Get source content from cache
        let sourceContent = await db.query.contentCache.findFirst({
            where: and(
                eq(contentCache.id, id),
                eq(contentCache.type, type)
            ),
        });

        // 2. If not in cache, fetch from Stremio
        if (!sourceContent) {
            const meta = await getMeta(type, id);

            if (meta) {
                // Don't try to insert - just use the fetched data
                sourceContent = {
                    id: meta.id,
                    type: meta.type,
                    name: meta.name,
                    genres: meta.genres || [],
                    poster: meta.poster || null,
                    background: null,
                    description: null,
                    releaseInfo: null,
                    imdbRating: null,
                    runtime: null,
                    cast: null,
                    director: null,
                    country: null,
                    language: null,
                    popularity: null,
                    catalogType: null,
                    catalogId: null,
                    fetchedAt: new Date(),
                    expiresAt: new Date(),
                };
            }
        }

        if (!sourceContent) {
            return NextResponse.json({ data: [] });
        }

        // 3. Find similar by genre
        const genres = (sourceContent.genres || []) as string[];
        let candidates: (typeof sourceContent)[] = [];

        if (genres.length > 0) {
            const genreConditions = genres.map(g => like(contentCache.genres, `%${g}%`));

            candidates = await db.query.contentCache.findMany({
                where: and(
                    eq(contentCache.type, type),
                    ne(contentCache.id, id),
                    or(...genreConditions)
                ),
                limit: 30,
            });
        }

        // 4. Fallback to popular if no matches
        if (candidates.length === 0) {
            candidates = await db.query.contentCache.findMany({
                where: and(
                    eq(contentCache.type, type),
                    ne(contentCache.id, id)
                ),
                orderBy: [desc(contentCache.popularity)],
                limit: 10,
            });
        }

        // 5. Score by genre overlap
        const scored = candidates.map(item => {
            const itemGenres = (item.genres || []) as string[];
            const overlap = itemGenres.filter(g => genres.includes(g)).length;
            return { ...item, score: overlap * 10 + ((item.popularity || 0) / 1000) };
        });

        scored.sort((a, b) => b.score - a.score);

        return NextResponse.json({ data: scored.slice(0, 10) });

    } catch (error) {
        console.error('[SimilarAPI] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
