// ─────────────────────────────────────────────────────────────
// Watch Together Sync Protocol
// WebSocket message types for real-time synchronization
// ─────────────────────────────────────────────────────────────

import type { RoomState, PlaybackState, RoomMember } from './types';

// ─────────────────────────────────────────────────────────────
// Client → Server Messages
// ─────────────────────────────────────────────────────────────

export type ClientMessage =
    | ClientJoinMessage
    | ClientLeaveMessage
    | ClientControlMessage
    | ClientHeartbeatMessage
    | ClientChatMessage;

export interface ClientJoinMessage {
    type: 'join';
    roomId: string;
    userId: string;
    token: string; // Auth token for verification
}

export interface ClientLeaveMessage {
    type: 'leave';
    roomId: string;
}

export interface ClientControlMessage {
    type: 'control';
    action: 'play' | 'pause' | 'seek';
    position?: number;          // Required for seek
    timestamp: number;          // Client timestamp for ordering
}

export interface ClientHeartbeatMessage {
    type: 'heartbeat';
    position: number;
    timestamp: number;
}

export interface ClientChatMessage {
    type: 'chat';
    message: string;
}

// ─────────────────────────────────────────────────────────────
// Server → Client Messages
// ─────────────────────────────────────────────────────────────

export type ServerMessage =
    | ServerRoomStateMessage
    | ServerMemberJoinedMessage
    | ServerMemberLeftMessage
    | ServerSyncMessage
    | ServerControlMessage
    | ServerChatMessage
    | ServerErrorMessage
    | ServerRoomClosedMessage;

export interface ServerRoomStateMessage {
    type: 'room_state';
    state: RoomState;
    serverTime: number;         // For client time sync
}

export interface ServerMemberJoinedMessage {
    type: 'member_joined';
    member: RoomMember;
}

export interface ServerMemberLeftMessage {
    type: 'member_left';
    userId: string;
    newHost?: string;           // If host left and was transferred
}

export interface ServerSyncMessage {
    type: 'sync';
    playback: PlaybackState;
    serverTime: number;
}

export interface ServerControlMessage {
    type: 'control';
    action: 'play' | 'pause' | 'seek';
    position: number;
    initiator: string;          // userId who triggered
    serverTime: number;
}

export interface ServerChatMessage {
    type: 'chat';
    userId: string;
    displayName: string;
    message: string;
    timestamp: number;
}

export interface ServerErrorMessage {
    type: 'error';
    code: ErrorCode;
    message: string;
}

export interface ServerRoomClosedMessage {
    type: 'room_closed';
    reason: 'host_left' | 'expired' | 'ended';
}

// ─────────────────────────────────────────────────────────────
// Error Codes
// ─────────────────────────────────────────────────────────────

export type ErrorCode =
    | 'ROOM_NOT_FOUND'
    | 'ROOM_FULL'
    | 'ROOM_EXPIRED'
    | 'NOT_AUTHORIZED'
    | 'INVALID_INVITE_CODE'
    | 'ALREADY_IN_ROOM'
    | 'NOT_IN_ROOM'
    | 'CONTROL_DENIED'
    | 'INVALID_MESSAGE';

// ─────────────────────────────────────────────────────────────
// Message Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Parse incoming WebSocket message
 */
export function parseClientMessage(data: string): ClientMessage | null {
    try {
        const parsed = JSON.parse(data);
        if (!parsed.type) return null;
        return parsed as ClientMessage;
    } catch {
        return null;
    }
}

/**
 * Serialize outgoing WebSocket message
 */
export function serializeServerMessage(message: ServerMessage): string {
    return JSON.stringify(message);
}

/**
 * Create a sync message
 */
export function createSyncMessage(playback: PlaybackState): ServerSyncMessage {
    return {
        type: 'sync',
        playback,
        serverTime: Date.now(),
    };
}

/**
 * Create a control message
 */
export function createControlMessage(
    action: 'play' | 'pause' | 'seek',
    position: number,
    initiator: string
): ServerControlMessage {
    return {
        type: 'control',
        action,
        position,
        initiator,
        serverTime: Date.now(),
    };
}

/**
 * Create an error message
 */
export function createErrorMessage(code: ErrorCode, message: string): ServerErrorMessage {
    return {
        type: 'error',
        code,
        message,
    };
}
