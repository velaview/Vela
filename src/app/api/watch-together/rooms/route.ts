// ─────────────────────────────────────────────────────────────
// Watch Together Rooms API
// POST: Create a new room
// GET: Get user's active rooms
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getRoomService } from '@/core/watch-together/room-service';
import type { CreateRoomRequest } from '@/core/watch-together';

/**
 * POST /api/watch-together/rooms
 * Create a new watch room
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json() as CreateRoomRequest;
        const roomService = getRoomService();

        const result = await roomService.createRoom(user.userId, body);

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('[Watch Together] Error creating room:', error);
        return NextResponse.json(
            { error: 'Failed to create room' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/watch-together/rooms
 * Get user's active rooms
 */
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const roomService = getRoomService();
        const rooms = await roomService.getUserRooms(user.userId);

        return NextResponse.json({ rooms });
    } catch (error) {
        console.error('[Watch Together] Error fetching rooms:', error);
        return NextResponse.json(
            { error: 'Failed to fetch rooms' },
            { status: 500 }
        );
    }
}
