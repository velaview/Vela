// ─────────────────────────────────────────────────────────────
// Watch Room Durable Object
// Cloudflare Durable Object for managing room state and WebSocket connections
// Note: This file is for Cloudflare Workers deployment only
// ─────────────────────────────────────────────────────────────

// @ts-ignore - Cloudflare Workers types
import { DurableObject } from 'cloudflare:workers';
import type {
    ClientMessage,
    ServerMessage,
    PlaybackState,
    RoomMember,
} from '@/core/watch-together';
import {
    parseClientMessage,
    serializeServerMessage,
    createSyncMessage,
    createControlMessage,
    createErrorMessage,
} from '@/core/watch-together';

interface SessionData {
    userId: string;
    displayName: string;
    avatar?: string;
    role: 'host' | 'guest';
}

interface RoomStateData {
    roomId: string;
    hostUserId: string;
    members: Map<string, SessionData>;
    playback: PlaybackState;
}

export class WatchRoomDurableObject extends DurableObject {
    private sessions: Map<WebSocket, SessionData>;
    private state: RoomStateData;

    // @ts-ignore - Cloudflare Workers types
    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.sessions = new Map();
        this.state = {
            roomId: '',
            hostUserId: '',
            members: new Map(),
            playback: {
                position: 0,
                isPlaying: false,
                playbackRate: 1,
                lastSyncAt: 0,
            },
        };
    }

    async fetch(request: Request): Promise<Response> {
        // Upgrade to WebSocket
        const upgradeHeader = request.headers.get('Upgrade');
        if (upgradeHeader !== 'websocket') {
            return new Response('Expected WebSocket', { status: 426 });
        }

        // @ts-ignore - Cloudflare Workers WebSocket
        const webSocketPair = new WebSocketPair();
        const [client, server] = Object.values(webSocketPair);

        // Accept the WebSocket connection
        // @ts-ignore - Durable Object context
        this.ctx.acceptWebSocket(server);

        // @ts-ignore - Cloudflare Workers WebSocket response
        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }

    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
        if (typeof message !== 'string') return;

        const clientMessage = parseClientMessage(message);
        if (!clientMessage) {
            this.sendError(ws, 'INVALID_MESSAGE', 'Invalid message format');
            return;
        }

        try {
            await this.handleMessage(ws, clientMessage);
        } catch (error) {
            console.error('[WatchRoom] Error handling message:', error);
            this.sendError(ws, 'INVALID_MESSAGE', 'Failed to process message');
        }
    }

    async webSocketClose(ws: WebSocket, code: number, reason: string) {
        const session = this.sessions.get(ws);
        if (!session) return;

        // Remove from members
        this.state.members.delete(session.userId);
        this.sessions.delete(ws);

        // Notify others
        this.broadcast({
            type: 'member_left',
            userId: session.userId,
        }, ws);

        // If host left, transfer or close
        if (session.role === 'host' && this.state.members.size > 0) {
            const newHost = Array.from(this.state.members.values())[0];
            newHost.role = 'host';
            this.state.hostUserId = newHost.userId;

            this.broadcast({
                type: 'member_left',
                userId: session.userId,
                newHost: newHost.userId,
            });
        } else if (this.state.members.size === 0) {
            // Room is empty, can be cleaned up
            // In production, you'd want to persist final state or mark for deletion
        }
    }

    private async handleMessage(ws: WebSocket, message: ClientMessage) {
        switch (message.type) {
            case 'join':
                await this.handleJoin(ws, message);
                break;

            case 'control':
                this.handleControl(ws, message);
                break;

            case 'heartbeat':
                this.handleHeartbeat(ws, message);
                break;

            case 'chat':
                this.handleChat(ws, message);
                break;

            case 'leave':
                ws.close(1000, 'User left');
                break;
        }
    }

    private async handleJoin(ws: WebSocket, message: ClientMessage & { type: 'join' }) {
        // Verify user is authorized (in production, validate token)
        // For now, trust the client

        const session: SessionData = {
            userId: message.userId,
            displayName: message.userId, // Should fetch from DB
            role: this.state.members.size === 0 ? 'host' : 'guest',
        };

        this.sessions.set(ws, session);
        this.state.members.set(session.userId, session);

        if (session.role === 'host') {
            this.state.hostUserId = session.userId;
            this.state.roomId = message.roomId;
        }

        // Send current room state to the new member
        const members: RoomMember[] = Array.from(this.state.members.values()).map((m) => ({
            id: m.userId,
            roomId: this.state.roomId,
            userId: m.userId,
            displayName: m.displayName,
            avatar: m.avatar,
            role: m.role,
            joinedAt: new Date(),
        }));

        this.send(ws, {
            type: 'room_state',
            state: {
                id: this.state.roomId,
                hostUserId: this.state.hostUserId,
                inviteCode: '', // Not needed in sync
                controlMode: 'anyone',
                status: 'active',
                maxMembers: 10,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
                members,
                playback: this.state.playback,
            },
            serverTime: Date.now(),
        });

        // Notify others
        this.broadcast({
            type: 'member_joined',
            member: {
                id: session.userId,
                roomId: this.state.roomId,
                userId: session.userId,
                displayName: session.displayName,
                avatar: session.avatar,
                role: session.role,
                joinedAt: new Date(),
            },
        }, ws);
    }

    private handleControl(ws: WebSocket, message: ClientMessage & { type: 'control' }) {
        const session = this.sessions.get(ws);
        if (!session) return;

        // Update playback state
        this.state.playback = {
            position: message.position || this.state.playback.position,
            isPlaying: message.action === 'play',
            playbackRate: this.state.playback.playbackRate,
            lastSyncAt: Date.now(),
            initiatorId: session.userId,
        };

        // Broadcast to all
        this.broadcast(
            createControlMessage(
                message.action,
                this.state.playback.position,
                session.userId
            )
        );
    }

    private handleHeartbeat(ws: WebSocket, message: ClientMessage & { type: 'heartbeat' }) {
        const session = this.sessions.get(ws);
        if (!session || session.role !== 'host') return;

        // Update position from host
        this.state.playback.position = message.position;
        this.state.playback.lastSyncAt = Date.now();

        // Broadcast sync to guests
        this.broadcast(createSyncMessage(this.state.playback), ws);
    }

    private handleChat(ws: WebSocket, message: ClientMessage & { type: 'chat' }) {
        const session = this.sessions.get(ws);
        if (!session) return;

        this.broadcast({
            type: 'chat',
            userId: session.userId,
            displayName: session.displayName,
            message: message.message,
            timestamp: Date.now(),
        });
    }

    private send(ws: WebSocket, message: ServerMessage) {
        try {
            ws.send(serializeServerMessage(message));
        } catch (error) {
            console.error('[WatchRoom] Failed to send message:', error);
        }
    }

    private broadcast(message: ServerMessage, exclude?: WebSocket) {
        const serialized = serializeServerMessage(message);
        for (const [ws] of this.sessions) {
            if (ws !== exclude) {
                try {
                    ws.send(serialized);
                } catch (error) {
                    console.error('[WatchRoom] Failed to broadcast:', error);
                }
            }
        }
    }

    private sendError(ws: WebSocket, code: string, message: string) {
        this.send(ws, createErrorMessage(code as any, message));
    }
}
