import { db, contentCache } from '@/lib/db';
import { eq } from 'drizzle-orm';
import type { Meta } from '@/core/streaming';

export async function syncToContentCache(meta: Meta) {
    try {
        const genres = meta.genres || [];
        const cast = meta.cast || [];
        const director = meta.director || [];

        await db.insert(contentCache).values({
            id: meta.id,
            type: meta.type as 'movie' | 'series',
            name: meta.name,
            poster: meta.poster,
            background: meta.background,
            description: meta.description,
            releaseInfo: meta.releaseInfo,
            imdbRating: meta.imdbRating,
            runtime: meta.runtime,
            genres: genres,
            cast: cast,
            director: director,
            fetchedAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        }).onConflictDoUpdate({
            target: contentCache.id,
            set: {
                name: meta.name,
                poster: meta.poster,
                background: meta.background,
                description: meta.description,
                releaseInfo: meta.releaseInfo,
                imdbRating: meta.imdbRating,
                runtime: meta.runtime,
                genres: genres,
                cast: cast,
                director: director,
                fetchedAt: new Date(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            }
        });
    } catch (error) {
        console.warn(`[ContentCache] Failed to sync ${meta.id}:`, error);
    }
}

export async function syncManyToContentCache(metas: Meta[]) {
    for (const meta of metas) {
        await syncToContentCache(meta);
    }
}
