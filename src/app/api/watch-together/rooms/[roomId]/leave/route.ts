// ─────────────────────────────────────────────────────────────
// Watch Together Leave API
// POST: Leave a room
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getRoomService } from '@/core/watch-together/room-service';

interface RouteParams {
    params: Promise<{ roomId: string }>;
}

/**
 * POST /api/v1/watch-together/rooms/[roomId]/leave
 * Leave a room
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { roomId } = await params;
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const roomService = getRoomService();
        const result = await roomService.leaveRoom(roomId, user.userId);

        return NextResponse.json({
            success: true,
            newHostId: result.newHostId,
        });
    } catch (error) {
        console.error('[Watch Together] Error leaving room:', error);
        return NextResponse.json(
            { error: 'Failed to leave room' },
            { status: 500 }
        );
    }
}
