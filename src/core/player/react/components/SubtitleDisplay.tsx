'use client';

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface SubtitleCue {
    start: number;
    end: number;
    text: string;
}

interface SubtitleDisplayProps {
    currentTime: number;
    cues: SubtitleCue[];
    size?: number; // Percentage (100 = normal)
    background?: boolean;
    isFullscreen?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export const SubtitleDisplay = memo(function SubtitleDisplay({
    currentTime,
    cues,
    size = 100,
    background = true,
    isFullscreen = false,
}: SubtitleDisplayProps) {
    // Find current cue
    const currentCue = useMemo(() =>
        cues.find(c => currentTime >= c.start && currentTime <= c.end),
        [currentTime, cues]
    );

    const text = currentCue?.text || '';
    if (!text) return null;

    return (
        <div className="absolute inset-x-0 bottom-24 flex justify-center pointer-events-none px-4 z-30">
            <div
                className={cn(
                    "text-white text-center px-4 py-2 rounded-lg max-w-3xl transition-all",
                    background && "bg-black/60 backdrop-blur-sm"
                )}
                style={{
                    fontSize: `${(isFullscreen ? 1.5 : 1.125) * (size / 100)}rem`,
                    lineHeight: 1.4,
                    textShadow: background
                        ? 'none'
                        : '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
                }}
            >
                {text.split('\n').map((line, i) => (
                    <div key={i}>{line}</div>
                ))}
            </div>
        </div>
    );
});
