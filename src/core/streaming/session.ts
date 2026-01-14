/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SESSION MANAGER (Cloudflare Compatible)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Manages streaming sessions with database-backed storage.
 * Sessions expire after 4 hours (TorBox link lifetime).
 *
 * This implementation uses the database for persistence, making it
 * compatible with Cloudflare Workers where globalThis is not persistent.
 */

import { db, streamSessions } from '@/lib/db';
import { eq, lt } from 'drizzle-orm';
import { StreamSession, Stream, ContentType } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_TTL = 4 * 60 * 60 * 1000; // 4 hours

// ─────────────────────────────────────────────────────────────────────────────
// Session Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new streaming session.
 */
export async function createSession(
    contentId: string,
    type: ContentType,
    stream: Stream,
    upstreamUrl: string,
    season?: number,
    episode?: number
): Promise<StreamSession> {
    const id = generateSessionId();
    const now = Date.now();
    const expiresAt = now + SESSION_TTL;

    const session: StreamSession = {
        id,
        contentId,
        type,
        season,
        episode,
        stream,
        upstreamUrl,
        createdAt: now,
        expiresAt,
    };

    // Store in database
    await db.insert(streamSessions).values({
        id,
        contentId,
        contentType: type,
        season,
        episode,
        streamData: {
            id: stream.id,
            url: stream.url,
            hlsUrl: stream.hlsUrl,
            quality: stream.quality,
            source: stream.source,
            title: stream.title,
            cached: stream.cached,
            hash: stream.hash,
        },
        upstreamUrl,
        createdAt: new Date(now),
        expiresAt: new Date(expiresAt),
    });

    console.log(`[SessionManager] Created session ${id}`);

    // Clean up expired sessions opportunistically (non-blocking)
    cleanupExpiredSessions().catch(() => { });

    return session;
}

/**
 * Get an existing session by ID.
 */
export async function getSession(id: string): Promise<StreamSession | null> {
    console.log(`[SessionManager] Looking for session ${id}`);

    const rows = await db.select()
        .from(streamSessions)
        .where(eq(streamSessions.id, id))
        .limit(1);

    if (rows.length === 0) {
        console.log(`[SessionManager] Session ${id} NOT found`);
        return null;
    }

    const row = rows[0];

    // Check expiry
    if (row.expiresAt.getTime() < Date.now()) {
        await db.delete(streamSessions).where(eq(streamSessions.id, id));
        console.log(`[SessionManager] Session ${id} expired, deleted`);
        return null;
    }

    // Reconstruct StreamSession from database row
    const session: StreamSession = {
        id: row.id,
        contentId: row.contentId,
        type: row.contentType as ContentType,
        season: row.season ?? undefined,
        episode: row.episode ?? undefined,
        stream: {
            id: row.streamData.id,
            url: row.streamData.url || row.upstreamUrl,
            hlsUrl: row.streamData.hlsUrl,
            quality: row.streamData.quality as Stream['quality'],
            source: row.streamData.source as Stream['source'],
            title: row.streamData.title || 'Stream',
            cached: row.streamData.cached,
            hash: row.streamData.hash,
        },
        upstreamUrl: row.upstreamUrl,
        createdAt: row.createdAt.getTime(),
        expiresAt: row.expiresAt.getTime(),
    };

    return session;
}

/**
 * Synchronous session lookup for backwards compatibility.
 * Uses a cached in-memory lookup for quick checks during request handling.
 * Falls back to empty if session not in cache (caller should use async version).
 *
 * @deprecated Use async getSession() instead
 */
export function getSessionSync(id: string): StreamSession | null {
    console.warn(`[SessionManager] getSessionSync is deprecated, use async getSession()`);
    // Cannot do sync database lookups - return null and let caller handle it
    return null;
}

/**
 * Update session's upstream URL (for self-healing).
 */
export async function updateSessionUrl(id: string, newUrl: string): Promise<boolean> {
    const result = await db.update(streamSessions)
        .set({
            upstreamUrl: newUrl,
            expiresAt: new Date(Date.now() + SESSION_TTL),
        })
        .where(eq(streamSessions.id, id));

    return true;
}

/**
 * Delete a session.
 */
export async function deleteSession(id: string): Promise<boolean> {
    await db.delete(streamSessions).where(eq(streamSessions.id, id));
    return true;
}

/**
 * Clean up expired sessions.
 * Called opportunistically during session creation.
 */
async function cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    const result = await db.delete(streamSessions)
        .where(lt(streamSessions.expiresAt, now));

    // Note: SQLite/LibSQL delete doesn't return count easily
    // Just log that cleanup ran
    console.log(`[SessionManager] Cleaned up expired sessions`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function generateSessionId(): string {
    // Simple base36 ID
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
