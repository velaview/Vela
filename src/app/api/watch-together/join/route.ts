// ─────────────────────────────────────────────────────────────
// Watch Together Join API
// POST: Join a room by invite code
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getRoomService } from '@/core/watch-together/room-service';

/**
 * POST /api/watch-together/join
 * Join a room using an invite code
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

        const { inviteCode } = await request.json() as { inviteCode: string };

        if (!inviteCode) {
            return NextResponse.json(
                { error: 'Invite code is required' },
                { status: 400 }
            );
        }

        const roomService = getRoomService();

        // Find room by invite code
        const room = await roomService.getRoomByInviteCode(inviteCode);
        if (!room) {
            return NextResponse.json(
                { error: 'Invalid or expired invite code' },
                { status: 404 }
            );
        }

        try {
            const member = await roomService.joinRoom(room.id, user.userId);
            const members = await roomService.getRoomMembers(room.id);

            return NextResponse.json({
                roomId: room.id,
                room,
                member,
                members,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to join room';
            return NextResponse.json(
                { error: message },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('[Watch Together] Error joining room:', error);
        return NextResponse.json(
            { error: 'Failed to join room' },
            { status: 500 }
        );
    }
}
