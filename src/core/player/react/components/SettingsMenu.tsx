'use client';

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings,
    ChevronLeft,
    ChevronRight,
    Check,
    Gauge,
    Volume2,
    Subtitles,
    MonitorPlay,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface SettingsMenuProps {
    isOpen: boolean;
    onClose: () => void;
    // Quality
    qualities: string[];
    currentQuality: number;
    onQualityChange: (quality: string) => void;
    // Audio
    audioTracks: { id: string; label: string }[];
    currentAudioTrack: number;
    onAudioChange: (id: string) => void;
    // Speed
    playbackSpeed: number;
    onSpeedChange: (speed: number) => void;
    // Subtitles
    subtitles?: { id: string; label: string }[];
    currentSubtitle: string | null;
    onSubtitleChange: (id: string | null) => void;
}

type MenuPanel = 'main' | 'quality' | 'audio' | 'speed' | 'subtitles';

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export const SettingsMenu = memo(function SettingsMenu({
    isOpen,
    onClose,
    qualities,
    currentQuality,
    onQualityChange,
    audioTracks,
    currentAudioTrack,
    onAudioChange,
    playbackSpeed,
    onSpeedChange,
    subtitles = [],
    currentSubtitle,
    onSubtitleChange,
}: SettingsMenuProps) {
    const [panel, setPanel] = useState<MenuPanel>('main');

    // Close and reset panel
    const handleClose = () => {
        setPanel('main');
        onClose();
    };

    // Format speed label
    const speedLabel = playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`;

    // Current quality label
    const qualityLabel = currentQuality === -1
        ? 'Auto'
        : qualities[currentQuality] || 'Auto';

    // Current audio label
    const audioLabel = audioTracks[currentAudioTrack]?.label || 'Default';

    // Current subtitle label
    const subtitleLabel = currentSubtitle
        ? subtitles.find(s => s.id === currentSubtitle)?.label || 'On'
        : 'Off';

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-4 bottom-20 w-64 bg-zinc-900/95 backdrop-blur-sm rounded-xl border border-zinc-800 overflow-hidden shadow-2xl z-50"
                >
                    <AnimatePresence mode="wait">
                        {panel === 'main' && (
                            <MainPanel
                                key="main"
                                qualityLabel={qualityLabel}
                                audioLabel={audioLabel}
                                speedLabel={speedLabel}
                                subtitleLabel={subtitleLabel}
                                onNavigate={setPanel}
                            />
                        )}

                        {panel === 'quality' && (
                            <SubPanel
                                key="quality"
                                title="Quality"
                                onBack={() => setPanel('main')}
                            >
                                <MenuItem
                                    label="Auto"
                                    isActive={currentQuality === -1}
                                    onClick={() => { onQualityChange('auto'); setPanel('main'); }}
                                />
                                {qualities.map((q, i) => (
                                    <MenuItem
                                        key={q}
                                        label={q}
                                        isActive={currentQuality === i}
                                        onClick={() => { onQualityChange(q); setPanel('main'); }}
                                    />
                                ))}
                            </SubPanel>
                        )}

                        {panel === 'audio' && (
                            <SubPanel
                                key="audio"
                                title="Audio"
                                onBack={() => setPanel('main')}
                            >
                                {audioTracks.map((track, i) => (
                                    <MenuItem
                                        key={track.id}
                                        label={track.label}
                                        isActive={currentAudioTrack === i}
                                        onClick={() => { onAudioChange(track.id); setPanel('main'); }}
                                    />
                                ))}
                            </SubPanel>
                        )}

                        {panel === 'speed' && (
                            <SubPanel
                                key="speed"
                                title="Playback Speed"
                                onBack={() => setPanel('main')}
                            >
                                {PLAYBACK_SPEEDS.map((speed) => (
                                    <MenuItem
                                        key={speed}
                                        label={speed === 1 ? 'Normal' : `${speed}x`}
                                        isActive={playbackSpeed === speed}
                                        onClick={() => { onSpeedChange(speed); setPanel('main'); }}
                                    />
                                ))}
                            </SubPanel>
                        )}

                        {panel === 'subtitles' && (
                            <SubPanel
                                key="subtitles"
                                title="Subtitles"
                                onBack={() => setPanel('main')}
                            >
                                <MenuItem
                                    label="Off"
                                    isActive={currentSubtitle === null}
                                    onClick={() => { onSubtitleChange(null); setPanel('main'); }}
                                />
                                {subtitles.map((sub) => (
                                    <MenuItem
                                        key={sub.id}
                                        label={sub.label}
                                        isActive={currentSubtitle === sub.id}
                                        onClick={() => { onSubtitleChange(sub.id); setPanel('main'); }}
                                    />
                                ))}
                            </SubPanel>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
});

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

const MainPanel = memo(function MainPanel({
    qualityLabel,
    audioLabel,
    speedLabel,
    subtitleLabel,
    onNavigate,
}: {
    qualityLabel: string;
    audioLabel: string;
    speedLabel: string;
    subtitleLabel: string;
    onNavigate: (panel: MenuPanel) => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-2"
        >
            <div className="px-3 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Settings
            </div>

            <MainMenuItem
                icon={<MonitorPlay className="h-4 w-4" />}
                label="Quality"
                value={qualityLabel}
                onClick={() => onNavigate('quality')}
            />

            <MainMenuItem
                icon={<Volume2 className="h-4 w-4" />}
                label="Audio"
                value={audioLabel}
                onClick={() => onNavigate('audio')}
            />

            <MainMenuItem
                icon={<Gauge className="h-4 w-4" />}
                label="Speed"
                value={speedLabel}
                onClick={() => onNavigate('speed')}
            />

            <MainMenuItem
                icon={<Subtitles className="h-4 w-4" />}
                label="Subtitles"
                value={subtitleLabel}
                onClick={() => onNavigate('subtitles')}
            />
        </motion.div>
    );
});

const MainMenuItem = memo(function MainMenuItem({
    icon,
    label,
    value,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    onClick: () => void;
}) {
    return (
        <button
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-left"
            onClick={onClick}
        >
            <span className="text-zinc-400">{icon}</span>
            <span className="flex-1 text-sm text-white font-medium">{label}</span>
            <span className="text-sm text-zinc-400">{value}</span>
            <ChevronRight className="h-4 w-4 text-zinc-500" />
        </button>
    );
});

const SubPanel = memo(function SubPanel({
    title,
    onBack,
    children,
}: {
    title: string;
    onBack: () => void;
    children: React.ReactNode;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.1 }}
        >
            <button
                className="w-full flex items-center gap-2 px-3 py-3 hover:bg-white/5 border-b border-zinc-800"
                onClick={onBack}
            >
                <ChevronLeft className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-semibold text-white">{title}</span>
            </button>
            <ScrollArea className="max-h-64">
                <div className="p-2">
                    {children}
                </div>
            </ScrollArea>
        </motion.div>
    );
});

const MenuItem = memo(function MenuItem({
    label,
    isActive,
    onClick,
}: {
    label: string;
    isActive: boolean;
    onClick: () => void;
}) {
    return (
        <button
            className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                isActive ? "bg-primary/20 text-primary" : "hover:bg-white/10 text-white"
            )}
            onClick={onClick}
        >
            <div className="w-4">
                {isActive && <Check className="h-4 w-4" />}
            </div>
            <span className="text-sm font-medium">{label}</span>
        </button>
    );
});
