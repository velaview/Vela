// ─────────────────────────────────────────────────────────────
// Player Factory
// Creates the appropriate player based on browser capabilities
// ─────────────────────────────────────────────────────────────

import {
    getBrowserCapabilities,
    getRecommendedPlayer,
    type BrowserCapabilities,
} from './browser-detect';

/**
 * Player configuration
 */
export interface PlayerConfig {
    // Source
    src: string;
    type?: 'hls' | 'mp4' | 'auto';

    // Quality preferences
    preferredQuality?: '4K' | '1080p' | '720p' | '480p' | 'auto';
    maxBitrate?: number;

    // Behavior
    autoplay?: boolean;
    muted?: boolean;
    startTime?: number;

    // Callbacks
    onReady?: () => void;
    onError?: (error: Error) => void;
    onQualityChange?: (quality: string) => void;
    onProgress?: (time: number, duration: number) => void;
    onEnded?: () => void;
}

/**
 * Player interface - abstract over different player implementations
 */
export interface Player {
    // Lifecycle
    load(src: string): Promise<void>;
    destroy(): void;

    // Playback
    play(): Promise<void>;
    pause(): void;
    seek(time: number): void;
    setPlaybackRate(rate: number): void;

    // Quality
    getQualities(): string[];
    setQuality(quality: string): void;

    // Audio
    getAudioTracks(): { id: string; label: string }[];
    setAudioTrack(id: string): void;

    // State
    getCurrentTime(): number;
    getDuration(): number;
    isPaused(): boolean;
    isBuffering(): boolean;

    // Volume
    setVolume(volume: number): void;
    getVolume(): number;
    setMuted(muted: boolean): void;
    isMuted(): boolean;

    // Subtitles
    getSubtitleTracks(): { id: string; label: string; lang: string }[];
    setSubtitleTrack(id: string | null): void;
}

/**
 * Player Factory
 */
export class PlayerFactory {
    private capabilities: BrowserCapabilities;

    constructor(userAgent: string) {
        this.capabilities = getBrowserCapabilities(userAgent);
    }

    /**
     * Get recommended player type
     */
    getRecommendedType(): 'native' | 'hlsjs' | 'videojs' {
        return getRecommendedPlayer(this.capabilities);
    }

    /**
     * Get capabilities
     */
    getCapabilities(): BrowserCapabilities {
        return this.capabilities;
    }

    /**
     * Create HLS configuration based on browser
     */
    getHlsConfig(): Record<string, unknown> {
        const config: Record<string, unknown> = {
            // Buffer settings
            maxBufferLength: 30,
            maxMaxBufferLength: 600,

            // Start level
            startLevel: -1, // Auto

            // ABR settings
            abrEwmaDefaultEstimate: 500000,

            // Error recovery
            enableWorker: true,
            lowLatencyMode: false,
        };

        // Browser-specific tweaks
        if (this.capabilities.browser === 'firefox') {
            // Firefox benefits from larger buffer
            config.maxBufferLength = 60;
        }

        if (this.capabilities.isMobile) {
            // Mobile: smaller buffers to save memory
            config.maxBufferLength = 15;
            config.maxMaxBufferLength = 120;
        }

        // Quality cap based on capabilities
        if (this.capabilities.maxBitrate) {
            // Note: hls.js uses bandwidth in bps
            config.abrBandWidthUpFactor = 0.7;
        }

        return config;
    }

    /**
     * Check if transcoding is needed for codec
     */
    needsTranscode(videoCodec?: string, audioCodec?: string): {
        video: boolean;
        audio: boolean;
        reason?: string;
    } {
        let videoTranscode = false;
        let audioTranscode = false;
        let reason: string | undefined;

        // Video codec check
        if (videoCodec) {
            const lower = videoCodec.toLowerCase();
            if (lower.includes('hevc') || lower.includes('h.265') || lower.includes('hev1')) {
                if (!this.capabilities.hevc) {
                    videoTranscode = true;
                    reason = 'HEVC not supported, will transcode to H.264';
                }
            }
        }

        // Audio codec check
        if (audioCodec) {
            const lower = audioCodec.toLowerCase();
            if ((lower.includes('ec-3') || lower.includes('eac3')) && !this.capabilities.eAc3) {
                audioTranscode = true;
                reason = reason ? `${reason}; E-AC3 not supported` : 'E-AC3 not supported, will transcode to AAC';
            }
            if ((lower.includes('ac-3') || lower.includes('ac3')) && !this.capabilities.ac3) {
                audioTranscode = true;
                reason = reason ? `${reason}; AC3 not supported` : 'AC3 not supported, will transcode to AAC';
            }
        }

        return { video: videoTranscode, audio: audioTranscode, reason };
    }
}

// Player module exports
export * from './browser-detect';
