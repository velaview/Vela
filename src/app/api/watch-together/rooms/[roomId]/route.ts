// ─────────────────────────────────────────────────────────────
// Watch Together Room By ID API
// GET: Get room details
// DELETE: Close/end the room (host only)
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getRoomService } from '@/core/watch-together/room-service';

interface RouteParams {
    params: Promise<{ roomId: string }>;
}

/**
 * GET /api/v1/watch-together/rooms/[roomId]
 * Get room details with members
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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
        const room = await roomService.getRoom(roomId);

        if (!room) {
            return NextResponse.json(
                { error: 'Room not found' },
                { status: 404 }
            );
        }

        const members = await roomService.getRoomMembers(roomId);

        return NextResponse.json({
            room,
            members,
        });
    } catch (error) {
        console.error('[Watch Together] Error fetching room:', error);
        return NextResponse.json(
            { error: 'Failed to fetch room' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/v1/watch-together/rooms/[roomId]
 * Close the room (host only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

        try {
            await roomService.closeRoom(roomId, user.userId);
            return NextResponse.json({ success: true });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to close room';
            return NextResponse.json(
                { error: message },
                { status: 403 }
            );
        }
    } catch (error) {
        console.error('[Watch Together] Error closing room:', error);
        return NextResponse.json(
            { error: 'Failed to close room' },
            { status: 500 }
        );
    }
}
