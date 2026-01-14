// ─────────────────────────────────────────────────────────────
// Watch Together Room Service
// Database operations for watch rooms
// ─────────────────────────────────────────────────────────────

import { nanoid } from 'nanoid';
import { eq, and, gt, lt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { watchRooms, watchRoomMembers, users, roomPlaybackState, roomMemberReadiness } from '@/lib/db/schema';
import type {
    WatchRoom,
    RoomMember,
    CreateRoomRequest,
    CreateRoomResponse,
    ControlMode,
    RoomStatus,
} from './types';
import { ROOM_TTL_MS, MAX_ROOM_MEMBERS } from './types';

/**
 * Generate a unique 6-character invite code
 */
function generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar chars
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Room Service
 * Handles all database operations for watch rooms
 */
export class RoomService {
    /**
     * Create a new watch room
     */
    async createRoom(userId: string, request: CreateRoomRequest): Promise<CreateRoomResponse> {
        const roomId = nanoid();
        const inviteCode = generateInviteCode();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ROOM_TTL_MS);

        // Create the room
        await db.insert(watchRooms).values({
            id: roomId,
            hostUserId: userId,
            inviteCode,
            contentId: request.contentId,
            contentTitle: request.contentTitle,
            contentPoster: request.contentPoster,
            season: request.season,
            episode: request.episode,
            controlMode: request.controlMode || 'anyone',
            status: 'waiting',
            maxMembers: MAX_ROOM_MEMBERS,
            createdAt: now,
            expiresAt,
        });

        // Add host as first member
        await db.insert(watchRoomMembers).values({
            id: nanoid(),
            roomId,
            userId,
            role: 'host',
            joinedAt: now,
        });

        // Initialize playback state for polling-based sync
        await db.insert(roomPlaybackState).values({
            roomId,
            position: 0,
            isPlaying: false,
            updatedAt: now,
        });

        // Initialize host readiness
        await db.insert(roomMemberReadiness).values({
            id: nanoid(),
            roomId,
            userId,
            isReady: false,
            bufferPercent: 0,
            updatedAt: now,
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        return {
            roomId,
            inviteCode,
            inviteUrl: `${baseUrl}/watch-together/join/${inviteCode}`,
            expiresAt,
        };
    }

    /**
     * Get room by ID
     */
    async getRoom(roomId: string): Promise<WatchRoom | null> {
        const result = await db.query.watchRooms.findFirst({
            where: eq(watchRooms.id, roomId),
        });

        if (!result) return null;

        return this.mapToWatchRoom(result);
    }

    /**
     * Get room by invite code
     */
    async getRoomByInviteCode(inviteCode: string): Promise<WatchRoom | null> {
        const result = await db.query.watchRooms.findFirst({
            where: and(
                eq(watchRooms.inviteCode, inviteCode.toUpperCase()),
                gt(watchRooms.expiresAt, new Date())
            ),
        });

        if (!result) return null;

        return this.mapToWatchRoom(result);
    }

    /**
     * Get room members with user details
     */
    async getRoomMembers(roomId: string): Promise<RoomMember[]> {
        const results = await db
            .select({
                id: watchRoomMembers.id,
                roomId: watchRoomMembers.roomId,
                userId: watchRoomMembers.userId,
                role: watchRoomMembers.role,
                joinedAt: watchRoomMembers.joinedAt,
                displayName: users.displayName,
                avatar: users.avatar,
            })
            .from(watchRoomMembers)
            .innerJoin(users, eq(watchRoomMembers.userId, users.id))
            .where(eq(watchRoomMembers.roomId, roomId));

        return results.map((r) => ({
            id: r.id,
            roomId: r.roomId,
            userId: r.userId,
            displayName: r.displayName,
            avatar: r.avatar || undefined,
            role: r.role as 'host' | 'guest',
            joinedAt: r.joinedAt,
        }));
    }

    /**
     * Join a room
     */
    async joinRoom(roomId: string, userId: string): Promise<RoomMember> {
        const room = await this.getRoom(roomId);
        if (!room) {
            throw new Error('Room not found');
        }

        if (room.status === 'ended') {
            throw new Error('Room has ended');
        }

        if (room.expiresAt < new Date()) {
            throw new Error('Room has expired');
        }

        // Check member count
        const members = await this.getRoomMembers(roomId);
        if (members.length >= room.maxMembers) {
            throw new Error('Room is full');
        }

        // Check if already a member
        const existingMember = members.find((m) => m.userId === userId);
        if (existingMember) {
            return existingMember;
        }

        // Get user details
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Add as guest
        const memberId = nanoid();
        const now = new Date();

        await db.insert(watchRoomMembers).values({
            id: memberId,
            roomId,
            userId,
            role: 'guest',
            joinedAt: now,
        });

        // Initialize readiness for new member
        await db.insert(roomMemberReadiness).values({
            id: nanoid(),
            roomId,
            userId,
            isReady: false,
            bufferPercent: 0,
            updatedAt: now,
        });

        return {
            id: memberId,
            roomId,
            userId,
            displayName: user.displayName,
            avatar: user.avatar || undefined,
            role: 'guest',
            joinedAt: now,
        };
    }

    /**
     * Leave a room
     */
    async leaveRoom(roomId: string, userId: string): Promise<{ newHostId?: string }> {
        const members = await this.getRoomMembers(roomId);
        const member = members.find((m) => m.userId === userId);

        if (!member) {
            return {};
        }

        // Remove member
        await db
            .delete(watchRoomMembers)
            .where(
                and(
                    eq(watchRoomMembers.roomId, roomId),
                    eq(watchRoomMembers.userId, userId)
                )
            );

        // If host left, transfer or close
        if (member.role === 'host') {
            const remainingMembers = members.filter((m) => m.userId !== userId);

            if (remainingMembers.length === 0) {
                // No one left, end the room
                await this.updateRoomStatus(roomId, 'ended');
                return {};
            }

            // Transfer host to the oldest member
            const newHost = remainingMembers.sort(
                (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime()
            )[0];

            await db
                .update(watchRoomMembers)
                .set({ role: 'host' })
                .where(eq(watchRoomMembers.id, newHost.id));

            await db
                .update(watchRooms)
                .set({ hostUserId: newHost.userId })
                .where(eq(watchRooms.id, roomId));

            return { newHostId: newHost.userId };
        }

        return {};
    }

    /**
     * Update room status
     */
    async updateRoomStatus(roomId: string, status: RoomStatus): Promise<void> {
        await db
            .update(watchRooms)
            .set({ status })
            .where(eq(watchRooms.id, roomId));
    }

    /**
     * Update room content (when changing what's being watched)
     */
    async updateRoomContent(
        roomId: string,
        content: {
            contentId?: string;
            contentTitle?: string;
            contentPoster?: string;
            season?: number;
            episode?: number;
        }
    ): Promise<void> {
        await db
            .update(watchRooms)
            .set(content)
            .where(eq(watchRooms.id, roomId));
    }

    /**
     * Close a room (host only)
     */
    async closeRoom(roomId: string, userId: string): Promise<void> {
        const room = await this.getRoom(roomId);
        if (!room) {
            throw new Error('Room not found');
        }

        if (room.hostUserId !== userId) {
            throw new Error('Only the host can close the room');
        }

        await this.updateRoomStatus(roomId, 'ended');
    }

    /**
     * Get active rooms for a user
     */
    async getUserRooms(userId: string): Promise<WatchRoom[]> {
        const memberships = await db
            .select({ roomId: watchRoomMembers.roomId })
            .from(watchRoomMembers)
            .where(eq(watchRoomMembers.userId, userId));

        if (memberships.length === 0) return [];

        const roomIds = memberships.map((m) => m.roomId);
        const rooms = await Promise.all(
            roomIds.map((id) => this.getRoom(id))
        );

        return rooms
            .filter((r): r is WatchRoom => r !== null && r.status !== 'ended')
            .filter((r) => r.expiresAt > new Date());
    }

    /**
     * Cleanup expired rooms
     */
    async cleanupExpiredRooms(): Promise<number> {
        const result = await db
            .delete(watchRooms)
            .where(lt(watchRooms.expiresAt, new Date()));

        // SQLite doesn't return count directly, so we just return 0
        // In practice, you'd want to count first then delete
        return 0;
    }

    /**
     * Map database row to WatchRoom type
     */
    private mapToWatchRoom(row: typeof watchRooms.$inferSelect): WatchRoom {
        return {
            id: row.id,
            hostUserId: row.hostUserId,
            inviteCode: row.inviteCode,
            contentId: row.contentId || undefined,
            contentTitle: row.contentTitle || undefined,
            contentPoster: row.contentPoster || undefined,
            season: row.season || undefined,
            episode: row.episode || undefined,
            controlMode: (row.controlMode as ControlMode) || 'anyone',
            status: (row.status as RoomStatus) || 'waiting',
            maxMembers: row.maxMembers || MAX_ROOM_MEMBERS,
            createdAt: row.createdAt,
            expiresAt: row.expiresAt,
        };
    }
}

// Singleton instance
let roomServiceInstance: RoomService | null = null;

export function getRoomService(): RoomService {
    if (!roomServiceInstance) {
        roomServiceInstance = new RoomService();
    }
    return roomServiceInstance;
}
