// ─────────────────────────────────────────────────────────────
// Watch Together Readiness API
// Member buffer/readiness reporting
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { watchRoomMembers, roomMemberReadiness } from '@/lib/db/schema';

/**
 * GET /api/watch-together/readiness?roomId=xxx
 * Check if all members are ready
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get('roomId');

        if (!roomId) {
            return NextResponse.json({ error: 'Room ID required' }, { status: 400 });
        }

        // Verify user is a member
        const membership = await db.query.watchRoomMembers.findFirst({
            where: and(
                eq(watchRoomMembers.roomId, roomId),
                eq(watchRoomMembers.userId, user.userId)
            ),
        });

        if (!membership) {
            return NextResponse.json({ error: 'Not a member of this room' }, { status: 403 });
        }

        // Fetch all readiness entries
        const readiness = await db
            .select()
            .from(roomMemberReadiness)
            .where(eq(roomMemberReadiness.roomId, roomId));

        const allReady = readiness.length > 0 && readiness.every(r => r.isReady);
        const avgBuffer = readiness.length > 0
            ? Math.round(readiness.reduce((sum, r) => sum + (r.bufferPercent || 0), 0) / readiness.length)
            : 0;

        return NextResponse.json({
            allReady,
            avgBuffer,
            members: readiness.map(r => ({
                userId: r.userId,
                isReady: r.isReady,
                bufferPercent: r.bufferPercent,
            })),
        });
    } catch (error) {
        console.error('[Watch Together Readiness] GET error:', error);
        return NextResponse.json({ error: 'Failed to check readiness' }, { status: 500 });
    }
}

/**
 * POST /api/watch-together/readiness
 * Report buffer/readiness status
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json() as {
            roomId: string;
            isReady: boolean;
            bufferPercent: number;
        };

        const { roomId, isReady, bufferPercent } = body;

        if (!roomId) {
            return NextResponse.json({ error: 'Room ID required' }, { status: 400 });
        }

        // Update readiness
        const now = new Date();
        await db
            .update(roomMemberReadiness)
            .set({
                isReady: isReady ?? false,
                bufferPercent: Math.min(100, Math.max(0, bufferPercent || 0)),
                updatedAt: now,
            })
            .where(
                and(
                    eq(roomMemberReadiness.roomId, roomId),
                    eq(roomMemberReadiness.userId, user.userId)
                )
            );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Watch Together Readiness] POST error:', error);
        return NextResponse.json({ error: 'Failed to update readiness' }, { status: 500 });
    }
}
