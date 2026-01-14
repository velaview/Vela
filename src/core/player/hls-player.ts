// ─────────────────────────────────────────────────────────────
// HLS Player Implementation
// Implements the Player interface using HLS.js
// ─────────────────────────────────────────────────────────────

import Hls from 'hls.js';
import type { Player, PlayerConfig } from './player-factory';

export interface PlayerEvents {
    ready: () => void;
    play: () => void;
    pause: () => void;
    timeupdate: (time: number) => void;
    durationchange: (duration: number) => void;
    progress: (buffered: number) => void;
    waiting: () => void;
    playing: () => void;
    ended: () => void;
    error: (error: Error) => void;
    qualitychange: (level: number) => void;
    audiotrackchange: (track: number) => void;
}

type EventCallback<K extends keyof PlayerEvents> = PlayerEvents[K];

/**
 * HLS.js based player for non-Safari browsers.
 * Implements the Player interface with all required functionality.
 */
export class HlsPlayer implements Player {
    private video: HTMLVideoElement;
    private hls: Hls | null = null;
    private config: PlayerConfig;
    private events: Map<string, Set<Function>> = new Map();
    private isDestroyed = false;
    private currentSrc: string | null = null;

    constructor(video: HTMLVideoElement, config: PlayerConfig) {
        this.video = video;
        this.config = config;
        this.setupVideoEvents();
    }

    // ─────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────

    async load(src: string): Promise<void> {
        if (this.isDestroyed) return;
        if (this.currentSrc === src && this.hls) {
            console.log('[HlsPlayer] Source unchanged, skipping reload');
            return;
        }

        this.currentSrc = src;
        this.cleanup();

        const isHls = src.includes('.m3u8') || src.includes('playlist');

        if (isHls && Hls.isSupported()) {
            await this.loadHls(src);
        } else if (isHls && this.video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari native HLS
            this.loadNative(src);
        } else {
            // Direct video
            this.loadNative(src);
        }
    }

    private async loadHls(src: string): Promise<void> {
        console.log('[HlsPlayer] Loading HLS:', src.substring(0, 60) + '...');

        this.hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: false,
            maxBufferLength: 30,
            maxMaxBufferLength: 600,
            maxBufferSize: 120 * 1000 * 1000,
            fragLoadingMaxRetry: 10,
            manifestLoadingMaxRetry: 3,
            levelLoadingMaxRetry: 6,
            // No withCredentials - TorBox CDN uses wildcard CORS
        });

        return new Promise((resolve, reject) => {
            if (!this.hls) return reject(new Error('HLS not initialized'));

            this.hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
                console.log('[HlsPlayer] Manifest parsed:', data.levels.length, 'levels');
                this.emit('ready');
                resolve();
            });

            this.hls.on(Hls.Events.ERROR, (_, data) => {
                // Only log fatal errors or network failures
                // Non-fatal buffer errors (bufferSeekOverHole, bufferAppendError, bufferStalledError)
                // are handled internally by HLS.js - no need to log them
                if (data.fatal) {
                    console.error('[HlsPlayer] Fatal error:', data.type, data.details);

                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.warn('[HlsPlayer] Network error, attempting recovery...');
                            this.hls?.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.warn('[HlsPlayer] Media error, attempting recovery...');
                            this.hls?.recoverMediaError();
                            break;
                        default:
                            const error = new Error(`HLS fatal error: ${data.details}`);
                            this.emit('error', error);
                    }
                }
            });

            this.hls.loadSource(src);
            this.hls.attachMedia(this.video);
        });
    }

    private loadNative(src: string): void {
        console.log('[HlsPlayer] Loading native:', src.substring(0, 60) + '...');
        this.video.src = src;

        const onLoadedMetadata = () => {
            this.emit('ready');
            this.video.removeEventListener('loadedmetadata', onLoadedMetadata);
        };
        this.video.addEventListener('loadedmetadata', onLoadedMetadata);
    }

    private cleanup(): void {
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
    }

    destroy(): void {
        this.isDestroyed = true;
        this.cleanup();
        this.events.clear();
    }

    // ─────────────────────────────────────────────────────────
    // Playback
    // ─────────────────────────────────────────────────────────

    async play(): Promise<void> {
        try {
            await this.video.play();
        } catch (e) {
            console.warn('[HlsPlayer] Play blocked:', e);
        }
    }

    pause(): void {
        this.video.pause();
    }

    seek(time: number): void {
        const clampedTime = Math.max(0, Math.min(this.getDuration(), time));
        this.video.currentTime = clampedTime;

        // Help HLS.js load if seeking to unbuffered content
        if (this.hls) {
            let isBuffered = false;
            for (let i = 0; i < this.video.buffered.length; i++) {
                if (clampedTime >= this.video.buffered.start(i) &&
                    clampedTime <= this.video.buffered.end(i)) {
                    isBuffered = true;
                    break;
                }
            }
            if (!isBuffered) {
                this.hls.startLoad(clampedTime);
            }
        }
    }

    setPlaybackRate(rate: number): void {
        this.video.playbackRate = rate;
    }

    // ─────────────────────────────────────────────────────────
    // Quality
    // ─────────────────────────────────────────────────────────

    getQualities(): string[] {
        if (!this.hls) return [];
        return this.hls.levels.map(level => `${level.height}p`);
    }

    setQuality(quality: string): void {
        if (!this.hls) return;

        if (quality === 'auto') {
            this.hls.currentLevel = -1;
            return;
        }

        const height = parseInt(quality);
        const index = this.hls.levels.findIndex(l => l.height === height);
        if (index !== -1) {
            this.hls.currentLevel = index;
            this.emit('qualitychange', index);
        }
    }

    getCurrentQuality(): number {
        return this.hls?.currentLevel ?? -1;
    }

    // ─────────────────────────────────────────────────────────
    // Audio
    // ─────────────────────────────────────────────────────────

    getAudioTracks(): { id: string; label: string }[] {
        if (!this.hls) return [];
        return this.hls.audioTracks.map((track, i) => ({
            id: String(i),
            label: track.name || `Track ${i + 1}`
        }));
    }

    setAudioTrack(id: string): void {
        if (!this.hls) return;
        const index = parseInt(id);
        if (!isNaN(index) && index >= 0 && index < this.hls.audioTracks.length) {
            this.hls.audioTrack = index;
            this.emit('audiotrackchange', index);
        }
    }

    getCurrentAudioTrack(): number {
        return this.hls?.audioTrack ?? -1;
    }

    // ─────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────

    getCurrentTime(): number {
        return this.video.currentTime;
    }

    getDuration(): number {
        return this.video.duration || 0;
    }

    isPaused(): boolean {
        return this.video.paused;
    }

    isBuffering(): boolean {
        return this.video.readyState < 3;
    }

    // ─────────────────────────────────────────────────────────
    // Volume
    // ─────────────────────────────────────────────────────────

    setVolume(volume: number): void {
        this.video.volume = Math.max(0, Math.min(1, volume));
    }

    getVolume(): number {
        return this.video.volume;
    }

    setMuted(muted: boolean): void {
        this.video.muted = muted;
    }

    isMuted(): boolean {
        return this.video.muted;
    }

    // ─────────────────────────────────────────────────────────
    // Subtitles
    // ─────────────────────────────────────────────────────────

    getSubtitleTracks(): { id: string; label: string; lang: string }[] {
        // Subtitles are handled externally via API
        return [];
    }

    setSubtitleTrack(_id: string | null): void {
        // Handled by VideoPlayer component
    }

    // ─────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────

    on<K extends keyof PlayerEvents>(event: K, callback: EventCallback<K>): void {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event)!.add(callback);
    }

    off<K extends keyof PlayerEvents>(event: K, callback: EventCallback<K>): void {
        this.events.get(event)?.delete(callback);
    }

    private emit<K extends keyof PlayerEvents>(event: K, ...args: Parameters<PlayerEvents[K]>): void {
        this.events.get(event)?.forEach(cb => (cb as Function)(...args));
    }

    private setupVideoEvents(): void {
        const video = this.video;

        video.addEventListener('play', () => this.emit('play'));
        video.addEventListener('pause', () => this.emit('pause'));
        video.addEventListener('timeupdate', () => this.emit('timeupdate', video.currentTime));
        video.addEventListener('durationchange', () => this.emit('durationchange', video.duration));
        video.addEventListener('progress', () => {
            if (video.buffered.length > 0) {
                this.emit('progress', video.buffered.end(video.buffered.length - 1));
            }
        });
        video.addEventListener('waiting', () => this.emit('waiting'));
        video.addEventListener('playing', () => this.emit('playing'));
        video.addEventListener('ended', () => this.emit('ended'));
        video.addEventListener('error', () => {
            const error = new Error(video.error?.message || 'Video playback error');
            this.emit('error', error);
        });
    }

    // ─────────────────────────────────────────────────────────
    // Raw HLS Access
    // ─────────────────────────────────────────────────────────

    getHlsInstance(): Hls | null {
        return this.hls;
    }

    getVideoElement(): HTMLVideoElement {
        return this.video;
    }
}
