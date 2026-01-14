/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PLAY API
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * POST /api/play
 * 
 * Single endpoint to get a playable stream.
 * Returns session ID and HLS URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveStream, PlayRequest, ContentType } from '@/core/streaming';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/play
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate request
        const playRequest = validateRequest(body);

        // Resolve stream
        const response = await resolveStream(playRequest);

        return NextResponse.json(response);

    } catch (error) {
        console.error('[Play API] Error:', error);

        const message = error instanceof Error ? error.message : 'Failed to resolve stream';
        const status = message.includes('No streams') ? 404 : 500;

        return NextResponse.json(
            { error: message },
            { status }
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

function validateRequest(body: unknown): PlayRequest {
    if (!body || typeof body !== 'object') {
        throw new Error('Invalid request body');
    }

    const { contentId, type, season, episode, preferredQuality } = body as Record<string, unknown>;

    if (!contentId || typeof contentId !== 'string') {
        throw new Error('contentId is required');
    }

    if (!type || !['movie', 'series', 'anime'].includes(type as string)) {
        throw new Error('type must be movie, series, or anime');
    }

    // Series requires season and episode
    if (type === 'series') {
        if (typeof season !== 'number' || typeof episode !== 'number') {
            throw new Error('season and episode are required for series');
        }
    }

    return {
        contentId,
        type: type as ContentType,
        season: typeof season === 'number' ? season : undefined,
        episode: typeof episode === 'number' ? episode : undefined,
        preferredQuality: preferredQuality as PlayRequest['preferredQuality'],
    };
}
