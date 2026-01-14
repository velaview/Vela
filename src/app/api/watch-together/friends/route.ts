// ─────────────────────────────────────────────────────────────
// Watch Together Friends API
// Saved connections for watch parties
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, or, like } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { watchFriends, users } from '@/lib/db/schema';

/**
 * GET /api/watch-together/friends?search=xxx
 * List friends or search users by nickname
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');

        if (search) {
            // Search users by nickname or display name
            const results = await db
                .select({
                    id: users.id,
                    displayName: users.displayName,
                    nickname: users.nickname,
                    avatar: users.avatar,
                })
                .from(users)
                .where(
                    and(
                        or(
                            like(users.nickname, `%${search}%`),
                            like(users.displayName, `%${search}%`)
                        ),
                        // Exclude self
                        eq(users.id, user.userId) ? undefined : undefined
                    )
                )
                .limit(20);

            // Filter out self
            const filtered = results.filter(u => u.id !== user.userId);

            // Check which ones are already friends
            const friendIds = new Set<string>();
            const friendRecords = await db
                .select({ friendUserId: watchFriends.friendUserId })
                .from(watchFriends)
                .where(eq(watchFriends.userId, user.userId));
            friendRecords.forEach(f => friendIds.add(f.friendUserId));

            return NextResponse.json({
                users: filtered.map(u => ({
                    id: u.id,
                    displayName: u.nickname || u.displayName,
                    avatar: u.avatar,
                    isFriend: friendIds.has(u.id),
                })),
            });
        }

        // List all friends
        const friends = await db
            .select({
                id: watchFriends.id,
                friendUserId: watchFriends.friendUserId,
                addedAt: watchFriends.addedAt,
                displayName: users.displayName,
                nickname: users.nickname,
                avatar: users.avatar,
            })
            .from(watchFriends)
            .innerJoin(users, eq(watchFriends.friendUserId, users.id))
            .where(eq(watchFriends.userId, user.userId));

        return NextResponse.json({
            friends: friends.map(f => ({
                id: f.id,
                friendUserId: f.friendUserId,
                displayName: f.nickname || f.displayName,
                avatar: f.avatar,
                addedAt: f.addedAt.getTime(),
            })),
        });
    } catch (error) {
        console.error('[Watch Together Friends] GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 });
    }
}

/**
 * POST /api/watch-together/friends
 * Add a friend
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json() as { friendUserId: string };
        const { friendUserId } = body;

        if (!friendUserId) {
            return NextResponse.json({ error: 'Friend user ID required' }, { status: 400 });
        }

        if (friendUserId === user.userId) {
            return NextResponse.json({ error: 'Cannot add yourself as friend' }, { status: 400 });
        }

        // Check if friend exists
        const friendUser = await db.query.users.findFirst({
            where: eq(users.id, friendUserId),
        });

        if (!friendUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if already friends
        const existing = await db.query.watchFriends.findFirst({
            where: and(
                eq(watchFriends.userId, user.userId),
                eq(watchFriends.friendUserId, friendUserId)
            ),
        });

        if (existing) {
            return NextResponse.json({ error: 'Already friends' }, { status: 400 });
        }

        // Add friend
        const id = nanoid();
        const now = new Date();

        await db.insert(watchFriends).values({
            id,
            userId: user.userId,
            friendUserId,
            addedAt: now,
        });

        return NextResponse.json({
            id,
            friendUserId,
            displayName: friendUser.nickname || friendUser.displayName,
            avatar: friendUser.avatar,
        });
    } catch (error) {
        console.error('[Watch Together Friends] POST error:', error);
        return NextResponse.json({ error: 'Failed to add friend' }, { status: 500 });
    }
}

/**
 * DELETE /api/watch-together/friends
 * Remove a friend
 */
export async function DELETE(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const friendId = searchParams.get('id');

        if (!friendId) {
            return NextResponse.json({ error: 'Friend ID required' }, { status: 400 });
        }

        await db
            .delete(watchFriends)
            .where(
                and(
                    eq(watchFriends.id, friendId),
                    eq(watchFriends.userId, user.userId)
                )
            );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Watch Together Friends] DELETE error:', error);
        return NextResponse.json({ error: 'Failed to remove friend' }, { status: 500 });
    }
}
