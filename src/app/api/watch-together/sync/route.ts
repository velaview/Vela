// ─────────────────────────────────────────────────────────────
// Watch Together Sync API
// Polling-based sync for room state
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import {
    watchRooms,
    watchRoomMembers,
    roomPlaybackState,
    roomMemberReadiness,
    roomChatMessages,
    users,
} from '@/lib/db/schema';

/**
 * GET /api/watch-together/sync?roomId=xxx&chatAfter=timestamp
 * Fetch current room state for polling
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get('roomId');
        const chatAfter = searchParams.get('chatAfter');

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

        // Fetch room
        const room = await db.query.watchRooms.findFirst({
            where: eq(watchRooms.id, roomId),
        });

        if (!room || room.status === 'ended') {
            return NextResponse.json({ error: 'Room not found or ended' }, { status: 404 });
        }

        // Fetch playback state
        const playback = await db.query.roomPlaybackState.findFirst({
            where: eq(roomPlaybackState.roomId, roomId),
        });

        // Fetch members with user details
        const members = await db
            .select({
                id: watchRoomMembers.id,
                roomId: watchRoomMembers.roomId,
                userId: watchRoomMembers.userId,
                role: watchRoomMembers.role,
                joinedAt: watchRoomMembers.joinedAt,
                displayName: users.displayName,
                nickname: users.nickname,
                avatar: users.avatar,
            })
            .from(watchRoomMembers)
            .innerJoin(users, eq(watchRoomMembers.userId, users.id))
            .where(eq(watchRoomMembers.roomId, roomId));

        // Fetch readiness status
        const readiness = await db
            .select()
            .from(roomMemberReadiness)
            .where(eq(roomMemberReadiness.roomId, roomId));

        // Fetch new chat messages (if chatAfter provided)
        let chatMessages: any[] = [];
        if (chatAfter) {
            const afterTimestamp = new Date(parseInt(chatAfter));
            chatMessages = await db
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
                .where(
                    and(
                        eq(roomChatMessages.roomId, roomId),
                        gt(roomChatMessages.createdAt, afterTimestamp)
                    )
                )
                .orderBy(roomChatMessages.createdAt);

            console.log(`[Watch Together Sync] Fetched ${chatMessages.length} messages after ${chatAfter}`);
        }

        // Map chat messages to consistent format
        const formattedChatMessages = chatMessages.map(msg => ({
            id: msg.id,
            userId: msg.userId,
            message: msg.message,
            displayName: msg.nickname || msg.displayName,
            avatar: msg.avatar,
            createdAt: new Date(msg.createdAt).getTime(),
        }));

        console.log(`[Watch Together Sync] Returning state for room ${roomId} to user ${user.userId}`);

        // Check if all members are ready
        const allReady = readiness.length > 0 && readiness.every(r => r.isReady);

        return NextResponse.json({
            room: {
                id: room.id,
                hostUserId: room.hostUserId,
                inviteCode: room.inviteCode,
                contentId: room.contentId,
                contentTitle: room.contentTitle,
                contentPoster: room.contentPoster,
                season: room.season,
                episode: room.episode,
                status: room.status,
                expiresAt: room.expiresAt,
            },
            playback: playback ? {
                position: playback.position,
                isPlaying: playback.isPlaying,
                lastAction: playback.lastAction,
                lastActionBy: playback.lastActionBy,
                lastActionAt: playback.lastActionAt?.getTime(),
                updatedAt: playback.updatedAt.getTime(),
            } : null,
            members: members.map(m => ({
                id: m.id,
                userId: m.userId,
                displayName: m.nickname || m.displayName,
                avatar: m.avatar,
                role: m.role,
                isReady: readiness.find(r => r.userId === m.userId)?.isReady ?? false,
                bufferPercent: readiness.find(r => r.userId === m.userId)?.bufferPercent ?? 0,
            })),
            allReady,
            chatMessages: formattedChatMessages,
            serverTime: Date.now(),
        });
    } catch (error) {
        console.error('[Watch Together Sync] GET error:', error);
        return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
    }
}

/**
 * POST /api/watch-together/sync
 * Send playback action (play/pause/seek)
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json() as {
            roomId: string;
            action: 'play' | 'pause' | 'seek';
            position?: number;
        };

        const { roomId, action, position } = body;

        if (!roomId || !action) {
            return NextResponse.json({ error: 'Room ID and action required' }, { status: 400 });
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

        // Anyone can control playback (as per user requirement)
        const now = new Date();
        const updates: any = {
            lastAction: action,
            lastActionBy: user.userId,
            lastActionAt: now,
            updatedAt: now,
        };

        if (action === 'play') {
            updates.isPlaying = true;
            if (typeof position === 'number') {
                updates.position = position;
            }
        } else if (action === 'pause') {
            updates.isPlaying = false;
            if (typeof position === 'number') {
                updates.position = position;
            }
        } else if (action === 'seek') {
            if (typeof position !== 'number') {
                return NextResponse.json({ error: 'Position required for seek' }, { status: 400 });
            }
            updates.position = position;
        }

        await db
            .update(roomPlaybackState)
            .set(updates)
            .where(eq(roomPlaybackState.roomId, roomId));

        console.log(`[Watch Together Sync] Action ${action} performed by ${user.userId} at ${position}`);

        return NextResponse.json({ success: true, action, position });
    } catch (error) {
        console.error('[Watch Together Sync] POST error:', error);
        return NextResponse.json({ error: 'Action failed' }, { status: 500 });
    }
}
