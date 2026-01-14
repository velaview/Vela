'use client';

import { useState } from 'react';
import { VideoPlayer } from '@/core/player/react';

export default function TestNewPlayerPage() {
    const [url, setUrl] = useState('');
    const [activeUrl, setActiveUrl] = useState<string | null>(null);

    const handleLoad = () => {
        if (url.trim()) {
            setActiveUrl(url.trim());
        }
    };

    const testUrls = [
        { label: 'Public HLS (Big Buck Bunny)', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
        { label: 'Sintel 4K', url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8' },
    ];

    return (
        <div className="min-h-screen bg-black text-white p-6">
            <h1 className="text-2xl font-bold mb-6">🎬 New Player Test</h1>

            {/* URL Input */}
            <div className="mb-6 space-y-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste HLS URL here..."
                        className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                        onClick={handleLoad}
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition"
                    >
                        Load
                    </button>
                </div>

                {/* Quick Test URLs */}
                <div className="flex flex-wrap gap-2">
                    {testUrls.map((t) => (
                        <button
                            key={t.label}
                            onClick={() => { setUrl(t.url); setActiveUrl(t.url); }}
                            className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Player */}
            {activeUrl && (
                <div className="w-full max-w-5xl aspect-video rounded-xl overflow-hidden border border-zinc-800">
                    <VideoPlayer
                        src={activeUrl}
                        title="Test Video"
                        subtitle="New Player Implementation"
                        autoplay
                        onBack={() => setActiveUrl(null)}
                    />
                </div>
            )}

            {!activeUrl && (
                <div className="w-full max-w-5xl aspect-video rounded-xl border border-dashed border-zinc-700 flex items-center justify-center">
                    <p className="text-zinc-500">Enter a URL and click Load to test the new player</p>
                </div>
            )}

            {/* Info */}
            <div className="mt-8 p-4 bg-zinc-900 rounded-lg max-w-5xl">
                <h2 className="font-semibold mb-2">Features</h2>
                <ul className="text-sm text-zinc-400 space-y-1">
                    <li>✅ Netflix-style auto-hide controls (3s timeout)</li>
                    <li>✅ Smooth animations (framer-motion)</li>
                    <li>✅ Keyboard shortcuts (Space, K, M, F, arrows)</li>
                    <li>✅ Volume slider on hover</li>
                    <li>✅ Play/pause overlay animation</li>
                    <li>✅ CORS-compatible (no withCredentials)</li>
                    <li>✅ Clean codebase (~350 lines vs 1932)</li>
                </ul>
            </div>
        </div>
    );
}
