// ─────────────────────────────────────────────────────────────
// Watch Together Chat API
// Text chat messages for rooms
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gt, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { watchRoomMembers, roomChatMessages, users } from '@/lib/db/schema';

/**
 * GET /api/watch-together/chat?roomId=xxx&limit=50
 * Fetch recent chat messages
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get('roomId');
        const limit = parseInt(searchParams.get('limit') || '50');

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

        // Fetch recent messages
        const messages = await db
            .select({
                id: roomChatMessages.id,
                userId: roomChatMessages.userId,
                message: roomChatMessages.message,
                createdAt: roomChatMessages.createdAt,
                displayName: users.displayName,
                nickname: users.nickname,
                avatar: users.avatar,
            })
            .from(roomChatMessages)
            .innerJoin(users, eq(roomChatMessages.userId, users.id))
            .where(eq(roomChatMessages.roomId, roomId))
            .orderBy(desc(roomChatMessages.createdAt))
            .limit(limit);

        console.log(`[Watch Together Chat] Fetched ${messages.length} messages for room ${roomId}`);

        // Return in chronological order
        return NextResponse.json({
            messages: messages.reverse().map(m => ({
                id: m.id,
                userId: m.userId,
                displayName: m.nickname || m.displayName,
                avatar: m.avatar,
                message: m.message,
                createdAt: m.createdAt.getTime(),
            })),
        });
    } catch (error) {
        console.error('[Watch Together Chat] GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

/**
 * POST /api/watch-together/chat
 * Send a chat message
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json() as {
            roomId: string;
            message: string;
        };

        const { roomId, message } = body;

        if (!roomId || !message?.trim()) {
            return NextResponse.json({ error: 'Room ID and message required' }, { status: 400 });
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

        // Insert message
        const messageId = nanoid();
        const now = new Date();

        await db.insert(roomChatMessages).values({
            id: messageId,
            roomId,
            userId: user.userId,
            message: message.trim().slice(0, 500), // Limit message length
            createdAt: now,
        });

        console.log(`[Watch Together Chat] Message sent to room ${roomId} by user ${user.userId}`);

        return NextResponse.json({
            id: messageId,
            createdAt: now.getTime(),
        });
    } catch (error) {
        console.error('[Watch Together Chat] POST error:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}
