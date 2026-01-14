// ─────────────────────────────────────────────────────────────
// Watch Together Types
// Core type definitions for synchronized co-viewing
// ─────────────────────────────────────────────────────────────

/**
 * Room control mode
 */
export type ControlMode = 'host-only' | 'anyone';

/**
 * Room status lifecycle
 */
export type RoomStatus = 'waiting' | 'active' | 'ended';

/**
 * Member role in the room
 */
export type MemberRole = 'host' | 'guest';

/**
 * Watch Room - core data model
 */
export interface WatchRoom {
    id: string;
    hostUserId: string;
    inviteCode: string;

    // Content being watched
    contentId?: string;
    contentTitle?: string;
    contentPoster?: string;
    season?: number;
    episode?: number;

    // Room settings
    controlMode: ControlMode;
    status: RoomStatus;
    maxMembers: number;

    // Lifecycle
    createdAt: Date;
    expiresAt: Date;
}

/**
 * Room Member
 */
export interface RoomMember {
    id: string;
    roomId: string;
    userId: string;
    displayName: string;
    avatar?: string;
    role: MemberRole;
    joinedAt: Date;

    // Connection state (ephemeral, not persisted)
    isOnline?: boolean;
    lastPing?: Date;
}

/**
 * Live playback state (ephemeral, managed by WebSocket server)
 */
export interface PlaybackState {
    position: number;           // Current position in seconds
    isPlaying: boolean;
    playbackRate: number;
    lastSyncAt: number;         // Unix timestamp of last sync
    initiatorId?: string;       // Who triggered the last action
}

/**
 * Full room state with members and playback
 */
export interface RoomState extends WatchRoom {
    members: RoomMember[];
    playback: PlaybackState;
}

/**
 * Create room request
 */
export interface CreateRoomRequest {
    contentId?: string;
    contentTitle?: string;
    contentPoster?: string;
    season?: number;
    episode?: number;
    controlMode?: ControlMode;
}

/**
 * Create room response
 */
export interface CreateRoomResponse {
    roomId: string;
    inviteCode: string;
    inviteUrl: string;
    expiresAt: Date;
}

/**
 * Join room request
 */
export interface JoinRoomRequest {
    inviteCode: string;
}

/**
 * Join room response
 */
export interface JoinRoomResponse {
    roomId: string;
    room: RoomState;
}

/**
 * Sync threshold for drift correction (in seconds)
 */
export const SYNC_THRESHOLD_SEC = 0.5;

/**
 * Heartbeat interval (in milliseconds)
 */
export const HEARTBEAT_INTERVAL_MS = 1000;

/**
 * Room TTL (4 hours by default)
 */
export const ROOM_TTL_MS = 4 * 60 * 60 * 1000;

/**
 * Max room members
 */
export const MAX_ROOM_MEMBERS = 10;
