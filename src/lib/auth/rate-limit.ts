// ─────────────────────────────────────────────────────────────
// Rate Limiting (Cloudflare Compatible)
// ─────────────────────────────────────────────────────────────
// In-memory rate limiter with LRU eviction and size bounds.
// For production at scale, consider using Cloudflare Rate Limiting
// or a distributed cache like Cloudflare KV.

export type RateLimitType = 'auth' | 'api' | 'stream';

interface RateLimitConfig {
    windowMs: number;  // Time window in milliseconds
    max: number;       // Max requests per window
}

interface RateLimitRecord {
    count: number;
    resetAt: number;
    lastAccess: number;  // For LRU eviction
}

// Rate limit configurations
const RATE_LIMITS: Record<RateLimitType, RateLimitConfig> = {
    auth: { windowMs: 15 * 60 * 1000, max: 5 },    // 5 attempts per 15 minutes
    api: { windowMs: 60 * 1000, max: 100 },        // 100 requests per minute
    stream: { windowMs: 60 * 1000, max: 30 },      // 30 stream requests per minute
};

// Maximum entries per rate limit type (prevents memory exhaustion)
const MAX_ENTRIES_PER_TYPE = 10000;

// LRU eviction: remove this many entries when limit is reached
const EVICTION_COUNT = 1000;

// In-memory stores per rate limit type
const stores = new Map<RateLimitType, Map<string, RateLimitRecord>>([
    ['auth', new Map()],
    ['api', new Map()],
    ['stream', new Map()],
]);

// Track cleanup state (no interval needed - cleanup on demand)
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Perform opportunistic cleanup and LRU eviction.
 * Called on each rate limit check instead of using setInterval.
 */
function maybeCleanup(store: Map<string, RateLimitRecord>): void {
    const now = Date.now();

    // Only cleanup every 5 minutes
    if (now - lastCleanup < CLEANUP_INTERVAL) {
        return;
    }
    lastCleanup = now;

    // Remove expired entries
    for (const [key, record] of store) {
        if (now > record.resetAt) {
            store.delete(key);
        }
    }
}

/**
 * Perform LRU eviction when store exceeds max size.
 * Removes the oldest accessed entries.
 */
function evictLRU(store: Map<string, RateLimitRecord>): void {
    if (store.size <= MAX_ENTRIES_PER_TYPE) {
        return;
    }

    // Sort entries by last access time (oldest first)
    const entries = Array.from(store.entries())
        .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    // Remove oldest entries
    const toRemove = entries.slice(0, EVICTION_COUNT);
    for (const [key] of toRemove) {
        store.delete(key);
    }

    console.log(`[RateLimit] LRU eviction: removed ${toRemove.length} entries`);
}

// ─────────────────────────────────────────────────────────────
// Check Rate Limit
// ─────────────────────────────────────────────────────────────

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfter?: number;  // Seconds until limit resets
}

export function checkRateLimit(
    identifier: string,
    type: RateLimitType
): RateLimitResult {
    const config = RATE_LIMITS[type];
    const store = stores.get(type)!;
    const now = Date.now();

    // Opportunistic cleanup
    maybeCleanup(store);

    // LRU eviction if needed
    evictLRU(store);

    let record = store.get(identifier);

    // First request or window expired - reset
    if (!record || now > record.resetAt) {
        record = { count: 1, resetAt: now + config.windowMs, lastAccess: now };
        store.set(identifier, record);
        return { allowed: true, remaining: config.max - 1 };
    }

    // Update last access time
    record.lastAccess = now;

    // Check if over limit
    if (record.count >= config.max) {
        const retryAfter = Math.ceil((record.resetAt - now) / 1000);
        return {
            allowed: false,
            remaining: 0,
            retryAfter,
        };
    }

    // Increment and allow
    record.count++;
    return { allowed: true, remaining: config.max - record.count };
}

// ─────────────────────────────────────────────────────────────
// Get Client IP
// ─────────────────────────────────────────────────────────────

export function getClientIp(request: Request): string {
    // Cloudflare
    const cfIp = request.headers.get('cf-connecting-ip');
    if (cfIp) return cfIp;

    // Standard proxy header (use first IP if multiple)
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        const firstIp = forwarded.split(',')[0].trim();
        if (firstIp) return firstIp;
    }

    // Direct connection
    const realIp = request.headers.get('x-real-ip');
    if (realIp) return realIp;

    // Fallback (for local dev)
    return '127.0.0.1';
}

// ─────────────────────────────────────────────────────────────
// Reset Rate Limit (useful for testing)
// ─────────────────────────────────────────────────────────────

export function resetRateLimit(identifier: string, type: RateLimitType): void {
    const store = stores.get(type);
    store?.delete(identifier);
}

export function resetAllRateLimits(): void {
    for (const store of stores.values()) {
        store.clear();
    }
}

// ─────────────────────────────────────────────────────────────
// Stats (for debugging)
// ─────────────────────────────────────────────────────────────

export function getRateLimitStats(): Record<RateLimitType, number> {
    return {
        auth: stores.get('auth')!.size,
        api: stores.get('api')!.size,
        stream: stores.get('stream')!.size,
    };
}
