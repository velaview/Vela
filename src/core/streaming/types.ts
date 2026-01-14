/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STREAMING TYPES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Core type definitions for the streaming system.
 * Keep this file small and focused.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Quality & Sources
// ─────────────────────────────────────────────────────────────────────────────

export type Quality = '4k' | '1080p' | '720p' | '480p' | 'unknown';

export type StreamSource = 'torbox' | 'torrentio' | 'usenet' | 'hianime' | 'hanime';

export type ContentType = 'movie' | 'series' | 'anime';

// ─────────────────────────────────────────────────────────────────────────────
// Stream
// ─────────────────────────────────────────────────────────────────────────────

export interface AudioTrack {
    index: number;
    language: string;
    title?: string;
    default?: boolean;
}

export interface StreamMetadata {
    audioTracks?: AudioTrack[];
    introStart?: number;
    introEnd?: number;
}

export interface Stream {
    id: string;
    url: string;                    // Primary playback URL (HLS preferred)
    quality: Quality;
    source: StreamSource;
    title: string;
    size?: string;
    seeders?: number;
    cached?: boolean;

    // HLS transcoding
    hlsUrl?: string;                // Cross-browser HLS URL
    directUrl?: string;             // Original direct download URL (fallback)

    // TorBox specific
    torboxId?: number;              // TorBox internal ID
    fileId?: number;                // File index within torrent/usenet
    type?: 'torrent' | 'usenet' | 'mp4' | 'mkv';    // Source type in TorBox

    // Multi-stream support
    inLibrary?: boolean;            // Whether torrent is in user's library
    hash?: string;                  // Torrent hash for lazy loading
    magnet?: string;                // Magnet link for adding to library

    // Metadata (audio tracks, intro detection)
    metadata?: StreamMetadata;
}

// ─────────────────────────────────────────────────────────────────────────────
// Subtitle
// ─────────────────────────────────────────────────────────────────────────────

export interface Subtitle {
    id: string;
    language: string;
    languageName: string;
    url: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Play Request/Response
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayRequest {
    contentId: string;          // tt0111161 or kitsu:7442
    type: ContentType;
    season?: number;
    episode?: number;
    preferredQuality?: Quality;
}

export interface PlayResponse {
    sessionId: string;
    streamUrl: string;          // /api/stream/{sessionId}/master.m3u8
    stream: Stream;
    alternatives: Stream[];
    subtitles: Subtitle[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Session
// ─────────────────────────────────────────────────────────────────────────────

export interface StreamSession {
    id: string;
    contentId: string;
    type: ContentType;
    season?: number;
    episode?: number;
    stream: Stream;
    upstreamUrl: string;        // Original HLS URL from TorBox
    createdAt: number;
    expiresAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider Response (internal)
// ─────────────────────────────────────────────────────────────────────────────

export interface ProviderStream {
    name?: string;
    title?: string;
    url?: string;
    infoHash?: string;
    fileIdx?: number;
}
