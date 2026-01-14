// ─────────────────────────────────────────────────────────────
// Play Button Service
// ─────────────────────────────────────────────────────────────
// Centralized service for "Play" button logic across the app.
// Calls the new /api/play endpoint.

export interface PlayRequest {
    type: 'movie' | 'series' | 'anime';
    id: string;
    season?: number;
    episode?: number;
}

export interface PlayResult {
    sessionId: string | null;
    streamUrl: string | null;
    watchUrl: string;
    quality?: string;
    source?: string;
}

class PlayButtonService {
    /**
     * Resolve stream via /api/play and generate watch URL.
     */
    async resolveAndPlay(request: PlayRequest): Promise<PlayResult> {
        const { type, id, season, episode } = request;

        try {
            // Call new /api/play endpoint
            const response = await fetch('/api/play', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contentId: id,
                    type,
                    season,
                    episode,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to resolve stream');
            }

            const data = await response.json();

            console.log('[PlayService] Resolved:', {
                sessionId: data.sessionId,
                quality: data.stream?.quality,
                source: data.stream?.source,
            });

            // Use the session-based stream URL from the response
            const streamUrl = data.streamUrl || null;

            // Build watch URL with session ID
            const params = new URLSearchParams();
            params.set('type', type);
            if (season) params.set('season', season.toString());
            if (episode) params.set('episode', episode.toString());
            if (streamUrl) params.set('url', streamUrl);

            const watchUrl = `/watch/${id}?${params.toString()}`;

            return {
                sessionId: data.sessionId || null,
                streamUrl,
                watchUrl,
                quality: data.stream?.quality,
                source: data.stream?.source,
            };

        } catch (error) {
            console.error('[PlayService] Error:', error);

            // Return watch URL anyway - watch page will show error
            const params = new URLSearchParams();
            params.set('type', type);
            if (season) params.set('season', season.toString());
            if (episode) params.set('episode', episode.toString());

            const watchUrl = `/watch/${id}?${params.toString()}`;

            return { sessionId: null, streamUrl: null, watchUrl };
        }
    }
}

export const playButtonService = new PlayButtonService();
