// ─────────────────────────────────────────────────────────────
// Stream Logger
// ─────────────────────────────────────────────────────────────
// Centralized logging for streaming events

class StreamLogger {
    private enabled = process.env.NODE_ENV === 'development';

    private log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
        if (!this.enabled) return;

        const timestamp = new Date().toISOString();
        const prefix = `[StreamLogger ${timestamp}]`;

        switch (level) {
            case 'info':
                console.log(prefix, message, data || '');
                break;
            case 'warn':
                console.warn(prefix, message, data || '');
                break;
            case 'error':
                console.error(prefix, message, data || '');
                break;
        }
    }

    playbackStart(contentId: string, streamUrl: string) {
        this.log('info', `Playback started for ${contentId}`, { streamUrl });
    }

    playbackError(contentId: string, error: string, details?: any) {
        this.log('error', `Playback error for ${contentId}: ${error}`, details);
    }

    sourceSwitch(contentId: string, fromUrl: string, toUrl: string) {
        this.log('info', `Source switched for ${contentId}`, { from: fromUrl, to: toUrl });
    }

    qualityChange(contentId: string, quality: string) {
        this.log('info', `Quality changed for ${contentId} to ${quality}`);
    }

    bufferStart(contentId: string) {
        this.log('warn', `Buffering started for ${contentId}`);
    }

    bufferEnd(contentId: string, duration: number) {
        this.log('info', `Buffering ended for ${contentId}`, { durationMs: duration });
    }

    sessionCreated(sessionId: string, contentId: string) {
        this.log('info', `Session created: ${sessionId} for ${contentId}`);
    }

    sessionEnded(sessionId: string, watchTime: number) {
        this.log('info', `Session ended: ${sessionId}`, { watchTimeSeconds: watchTime });
    }

    audioTrackSelected(contentId: string, trackId: string) {
        this.log('info', `Audio track selected for ${contentId}`, { trackId });
    }
}

export const streamLogger = new StreamLogger();
