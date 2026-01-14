/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SEARCH API
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * GET /api/search?q=query
 * POST /api/search - Advanced search
 * 
 * Uses TMDB and Cinemeta search catalogs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, searchHistory } from '@/lib/db';
import { nanoid } from 'nanoid';

// Stremio addons with search capability
const SEARCH_ADDONS = [
    { name: 'TMDB', url: 'https://94c8cb9f702d-tmdb-addon.baby-beamup.club' },
    { name: 'Cinemeta', url: 'https://v3-cinemeta.strem.io' },
];

const TIMEOUT = 10000;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/search?q=query
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';
        const type = searchParams.get('type') || 'movie';
        const limit = parseInt(searchParams.get('limit') || '20');

        if (query.length < 2) {
            return NextResponse.json({ results: [] });
        }

        // Search all addons in parallel
        const results = await searchAllAddons(query, type, limit);

        // Save to history (fire and forget)
        saveSearchHistory(user.userId, query, type).catch(() => { });

        return NextResponse.json({ results });

    } catch (error) {
        console.error('[SearchAPI] Error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/search
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { query, type = 'movie', limit = 20 } = body;

        if (!query || query.length < 2) {
            return NextResponse.json({ error: 'Query too short' }, { status: 400 });
        }

        const results = await searchAllAddons(query, type, limit);

        // Save to history
        saveSearchHistory(user.userId, query, type).catch(() => { });

        return NextResponse.json({ results });

    } catch (error) {
        console.error('[SearchAPI] Error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Search Implementation
// ─────────────────────────────────────────────────────────────────────────────

interface SearchResult {
    id: string;
    type: string;
    name: string;
    poster?: string;
    year?: number;
    description?: string;
}

async function searchAllAddons(query: string, type: string, limit: number): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];
    const seen = new Set<string>();

    const searchPromises = SEARCH_ADDONS.map(async (addon) => {
        try {
            const url = `${addon.url}/catalog/${type}/search/search=${encodeURIComponent(query)}.json`;

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), TIMEOUT);

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (!response.ok) return [];

            const data = await response.json();
            return (data.metas || []).map((m: SearchResult) => ({
                ...m,
                _source: addon.name,
            }));
        } catch {
            return [];
        }
    });

    const results = await Promise.all(searchPromises);

    // Merge and dedupe
    for (const addonResults of results) {
        for (const item of addonResults) {
            if (!seen.has(item.id)) {
                seen.add(item.id);
                allResults.push(item);
            }
            if (allResults.length >= limit) break;
        }
        if (allResults.length >= limit) break;
    }

    return allResults;
}

async function saveSearchHistory(userId: string, query: string, type: string) {
    await db.insert(searchHistory).values({
        id: nanoid(),
        userId,
        query: query.trim(),
        type,
        createdAt: new Date(),
    });
}
