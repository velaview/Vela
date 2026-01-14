// ─────────────────────────────────────────────────────────────
// Browser Detection Utility
// Detects browser capabilities for player selection
// ─────────────────────────────────────────────────────────────

/**
 * Browser identification
 */
export type BrowserType = 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown';

/**
 * Browser capability flags
 */
export interface BrowserCapabilities {
    browser: BrowserType;

    // HLS Support
    nativeHls: boolean;           // Safari/iOS has native HLS
    hlsJs: boolean;               // Needs hls.js for HLS playback

    // Codec support
    hevc: boolean;                // HEVC/H.265
    av1: boolean;                 // AV1 codec
    dolbyVision: boolean;         // Dolby Vision

    // Audio
    eAc3: boolean;                // E-AC3 / Dolby Digital Plus
    ac3: boolean;                 // AC3 / Dolby Digital
    dts: boolean;                 // DTS

    // Platform hints
    isMobile: boolean;
    isIos: boolean;
    isMac: boolean;

    // Performance hints
    preferredQuality: '4K' | '1080p' | '720p';
    maxBitrate: number;           // Suggested max bitrate in Mbps
}

/**
 * Detect browser from User-Agent
 */
export function detectBrowser(userAgent: string): BrowserType {
    const ua = userAgent.toLowerCase();

    if (ua.includes('edg/')) return 'edge';
    if (ua.includes('chrome')) return 'chrome';
    if (ua.includes('firefox')) return 'firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';

    return 'unknown';
}

/**
 * Get browser capabilities from User-Agent
 */
export function getBrowserCapabilities(userAgent: string): BrowserCapabilities {
    const browser = detectBrowser(userAgent);
    const ua = userAgent.toLowerCase();

    // Platform detection
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isMac = ua.includes('macintosh');
    const isMobile = isIos || /android/.test(ua);

    // Base capabilities
    const caps: BrowserCapabilities = {
        browser,
        nativeHls: false,
        hlsJs: true,
        hevc: false,
        av1: false,
        dolbyVision: false,
        eAc3: false,
        ac3: false,
        dts: false,
        isMobile,
        isIos,
        isMac,
        preferredQuality: isMobile ? '720p' : '1080p',
        maxBitrate: isMobile ? 8 : 20,
    };

    // Browser-specific capabilities
    switch (browser) {
        case 'safari':
            caps.nativeHls = true;
            caps.hlsJs = false; // Safari uses native HLS
            caps.hevc = true;   // Safari supports HEVC
            caps.eAc3 = true;   // Safari supports E-AC3
            caps.ac3 = true;
            if (isMac) {
                caps.dolbyVision = true;
                caps.preferredQuality = '4K';
                caps.maxBitrate = 40;
            }
            break;

        case 'chrome':
        case 'edge':
            caps.av1 = true;    // Chrome/Edge support AV1
            caps.hevc = false;  // Limited HEVC support on Windows
            caps.eAc3 = false;  // Need to transcode to AAC
            if (!isMobile) {
                caps.preferredQuality = '4K';
                caps.maxBitrate = 40;
            }
            break;

        case 'firefox':
            caps.av1 = true;
            caps.hevc = false;
            caps.eAc3 = false;
            break;
    }

    // iOS always uses native HLS
    if (isIos) {
        caps.nativeHls = true;
        caps.hlsJs = false;
    }

    return caps;
}

/**
 * Check if browser supports MSE (MediaSource Extensions)
 * Required for hls.js
 */
export function supportsMSE(): boolean {
    if (typeof window === 'undefined') return true; // SSR assume yes
    return 'MediaSource' in window;
}

/**
 * Get recommended player type based on capabilities
 */
export function getRecommendedPlayer(caps: BrowserCapabilities): 'native' | 'hlsjs' | 'videojs' {
    if (caps.nativeHls) {
        return 'native';
    }

    if (caps.hlsJs && supportsMSE()) {
        return 'hlsjs';
    }

    // Fallback
    return 'videojs';
}

/**
 * Check if specific audio codec needs transcoding
 */
export function needsAudioTranscode(caps: BrowserCapabilities, codec: string): boolean {
    const lowerCodec = codec.toLowerCase();

    if (lowerCodec.includes('ec-3') || lowerCodec.includes('eac3')) {
        return !caps.eAc3;
    }

    if (lowerCodec.includes('ac-3') || lowerCodec.includes('ac3')) {
        return !caps.ac3;
    }

    if (lowerCodec.includes('dts')) {
        return !caps.dts;
    }

    // AAC, MP3, Opus are widely supported
    return false;
}
