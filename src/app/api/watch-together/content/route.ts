// ─────────────────────────────────────────────────────────────
// Watch Together Content API
// Host-only content selection
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { watchRooms, watchRoomMembers, roomPlaybackState, roomMemberReadiness } from '@/lib/db/schema';

/**
 * POST /api/watch-together/content
 * Update room content (host only)
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json() as {
            roomId: string;
            contentId: string;
            contentTitle: string;
            contentPoster?: string;
            season?: number;
            episode?: number;
        };

        const { roomId, contentId, contentTitle, contentPoster, season, episode } = body;

        if (!roomId || !contentId || !contentTitle) {
            return NextResponse.json({ error: 'Room ID, content ID, and title required' }, { status: 400 });
        }

        // Verify user is the host
        const room = await db.query.watchRooms.findFirst({
            where: eq(watchRooms.id, roomId),
        });

        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        if (room.hostUserId !== user.userId) {
            return NextResponse.json({ error: 'Only the host can change content' }, { status: 403 });
        }

        const now = new Date();

        // Update room content
        await db
            .update(watchRooms)
            .set({
                contentId,
                contentTitle,
                contentPoster: contentPoster || null,
                season: season || null,
                episode: episode || null,
                status: 'active',
            })
            .where(eq(watchRooms.id, roomId));

        // Reset playback state
        await db
            .update(roomPlaybackState)
            .set({
                position: 0,
                isPlaying: false,
                lastAction: null,
                lastActionBy: null,
                lastActionAt: null,
                updatedAt: now,
            })
            .where(eq(roomPlaybackState.roomId, roomId));

        // Reset all member readiness
        await db
            .update(roomMemberReadiness)
            .set({
                isReady: false,
                bufferPercent: 0,
                updatedAt: now,
            })
            .where(eq(roomMemberReadiness.roomId, roomId));

        return NextResponse.json({
            success: true,
            content: {
                contentId,
                contentTitle,
                contentPoster,
                season,
                episode,
            },
        });
    } catch (error) {
        console.error('[Watch Together Content] POST error:', error);
        return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
    }
}
