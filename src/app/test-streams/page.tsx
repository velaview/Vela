'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, Play, Loader2, Volume2, Film, Tv, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VideoPlayer } from '@/core/player/react/VideoPlayer';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CatalogItem {
    id: string;
    name: string;
    type: 'movie' | 'series';
    poster?: string;
    year?: number;
    provider: string;
}

interface StreamResult {
    method: string;
    url?: string;
    quality?: string;
    latencyMs: number;
    success: boolean;
    error?: string;
    metadata?: any;
    urlType?: string;
    // Probe results
    probeStatus?: 'idle' | 'probing' | 'success' | 'failed';
    audioTracks?: number;
    audioLanguages?: string[];
    subtitles?: number;
    codec?: string;
}

interface LogEntry {
    time: string;
    level: 'info' | 'warn' | 'error' | 'success';
    message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function TestStreamsPage() {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [catalogResults, setCatalogResults] = useState<Record<string, CatalogItem[]>>({});
    const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
    const [streamResults, setStreamResults] = useState<StreamResult[]>([]);
    const [isLoadingStreams, setIsLoadingStreams] = useState(false);
    const [currentStream, setCurrentStream] = useState<string | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [audioTracks, setAudioTracks] = useState<{ id: string; label: string }[]>([]);

    const videoRef = useRef<HTMLVideoElement>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // ─────────────────────────────────────────────────────────────────────────
    // Logging
    // ─────────────────────────────────────────────────────────────────────────

    const log = useCallback((level: LogEntry['level'], message: string) => {
        const entry: LogEntry = {
            time: new Date().toLocaleTimeString(),
            level,
            message,
        };
        setLogs(prev => [...prev.slice(-100), entry]);
    }, []);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // ─────────────────────────────────────────────────────────────────────────
    // Search
    // ─────────────────────────────────────────────────────────────────────────

    const handleSearch = async () => {
        if (!query.trim()) return;

        setIsSearching(true);
        setCatalogResults({});
        setSelectedItem(null);
        setStreamResults([]);
        log('info', `Searching: "${query}"`);

        const providers = ['cinemeta', 'tmdb', 'kitsu', 'hanime'];

        for (const provider of providers) {
            try {
                const start = performance.now();
                const resp = await fetch(`/api/test-streams/search?q=${encodeURIComponent(query)}&provider=${provider}`);
                const data = await resp.json();
                const latency = Math.round(performance.now() - start);

                if (data.results?.length > 0) {
                    setCatalogResults(prev => ({ ...prev, [provider]: data.results }));
                    log('success', `[${provider}] ${data.results.length} results (${latency}ms)`);
                } else {
                    log('warn', `[${provider}] No results (${latency}ms)`);
                }
            } catch (e) {
                log('error', `[${provider}] Error: ${e}`);
            }
        }

        setIsSearching(false);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Get Streams
    // ─────────────────────────────────────────────────────────────────────────

    const handleSelectItem = async (item: CatalogItem) => {
        setSelectedItem(item);
        setStreamResults([]);
        setIsLoadingStreams(true);
        setCurrentStream(null);
        log('info', `Running ALL methods for: ${item.name} (${item.id})`);

        try {
            let url = `/api/test-streams/streams?id=${encodeURIComponent(item.id)}&type=${item.type}&method=all`;
            if (item.type === 'series') url += '&season=1&episode=1';

            const resp = await fetch(url);
            const data = await resp.json();

            if (data.results) {
                const results = data.results.map((r: any) => ({ ...r, probeStatus: 'idle' }));
                setStreamResults(results);
                results.forEach((r: StreamResult) => {
                    if (r.success) {
                        log('success', `[${r.method}] ${r.quality || ''} ${r.urlType || ''} (${r.latencyMs}ms)`);
                    } else {
                        log('error', `[${r.method}] Failed: ${r.error} (${r.latencyMs}ms)`);
                    }
                });
            } else {
                log('error', `API Error: ${data.error}`);
            }
        } catch (e) {
            log('error', `Request failed: ${e}`);
        }
        setIsLoadingStreams(false);
    };

    // Probe stream for audio/subtitle metadata
    const handleProbe = async (index: number) => {
        const result = streamResults[index];
        if (!result.url) return;
        log('info', `Probing ${result.method}...`);
        setStreamResults(prev => prev.map((r, i) => i === index ? { ...r, probeStatus: 'probing' } : r));

        try {
            if (result.urlType === 'hls' || result.url.includes('.m3u8')) {
                const Hls = (await import('hls.js')).default;
                if (Hls.isSupported()) {
                    const hls = new Hls();
                    hls.loadSource(result.url);
                    hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
                        log('success', `[Probe] ${data.levels.length} levels, ${data.audioTracks.length} audio, ${data.subtitleTracks?.length || 0} subs`);
                        setStreamResults(prev => prev.map((r, i) => i === index ? {
                            ...r, probeStatus: 'success',
                            audioTracks: data.audioTracks.length,
                            audioLanguages: data.audioTracks.map(t => t.lang || t.name || 'unknown'),
                            subtitles: data.subtitleTracks?.length || 0,
                            codec: data.levels[0]?.videoCodec || 'unknown'
                        } : r));
                        hls.destroy();
                    });
                    hls.on(Hls.Events.ERROR, (_, err) => {
                        if (err.fatal) {
                            log('error', `[Probe] HLS error: ${err.type}`);
                            setStreamResults(prev => prev.map((r, i) => i === index ? { ...r, probeStatus: 'failed' } : r));
                            hls.destroy();
                        }
                    });
                }
            } else {
                // Direct file probe (limited info)
                log('info', `[Probe] Direct file - limited metadata available`);
                setStreamResults(prev => prev.map((r, i) => i === index ? {
                    ...r, probeStatus: 'success', audioTracks: 1, codec: 'mp4/mkv'
                } : r));
            }
        } catch (e) {
            log('error', `[Probe] Exception: ${e}`);
            setStreamResults(prev => prev.map((r, i) => i === index ? { ...r, probeStatus: 'failed' } : r));
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Play Stream
    // ─────────────────────────────────────────────────────────────────────────

    const handlePlay = async (result: StreamResult) => {
        if (!result.url) {
            log('error', `No URL for ${result.method}`);
            return;
        }

        setCurrentStream(result.url);
        log('info', `Playing: ${result.url.substring(0, 80)}...`);

        // Load HLS.js if needed
        if (result.url.includes('.m3u8') && videoRef.current) {
            try {
                const Hls = (await import('hls.js')).default;
                if (Hls.isSupported()) {
                    const hls = new Hls();
                    hls.loadSource(result.url);
                    hls.attachMedia(videoRef.current);

                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        log('success', 'HLS manifest parsed');
                        const tracks = hls.audioTracks.map((t, i) => ({
                            id: String(i),
                            label: t.name || t.lang || `Track ${i + 1}`,
                        }));
                        setAudioTracks(tracks);
                        log('info', `Audio tracks: ${tracks.length}`);
                        videoRef.current?.play();
                    });

                    hls.on(Hls.Events.ERROR, (_, data) => {
                        if (data.fatal) {
                            log('error', `HLS error: ${data.details}`);
                        }
                    });
                }
            } catch (e) {
                log('error', `HLS.js error: ${e}`);
            }
        } else if (videoRef.current) {
            // Direct video
            videoRef.current.src = result.url;
            videoRef.current.play().catch(e => log('error', `Play error: ${e}`));
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold">Stream Test Lab</h1>
                    <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">Debug Mode</span>
                </div>

                {/* Search */}
                <div className="flex gap-2">
                    <Input
                        placeholder="Search movies, series, anime..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="bg-zinc-900 border-zinc-800"
                    />
                    <Button onClick={handleSearch} disabled={isSearching}>
                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Catalog Results */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Catalog Results</h2>
                        <Tabs defaultValue="cinemeta" className="w-full">
                            <TabsList className="bg-zinc-900 w-full grid grid-cols-4">
                                <TabsTrigger value="cinemeta">Cinemeta</TabsTrigger>
                                <TabsTrigger value="tmdb">TMDB</TabsTrigger>
                                <TabsTrigger value="kitsu">Kitsu</TabsTrigger>
                                <TabsTrigger value="hanime">Hanime</TabsTrigger>
                            </TabsList>

                            {['cinemeta', 'tmdb', 'kitsu', 'hanime'].map(provider => (
                                <TabsContent key={provider} value={provider}>
                                    <ScrollArea className="h-[300px] bg-zinc-900 rounded-lg p-2">
                                        {(catalogResults[provider] || []).length === 0 ? (
                                            <div className="text-zinc-500 text-center py-8">
                                                No results. Try searching.
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {(catalogResults[provider] || []).map((item) => (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => handleSelectItem(item)}
                                                        className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${selectedItem?.id === item.id
                                                            ? 'bg-blue-600'
                                                            : 'bg-zinc-800 hover:bg-zinc-700'
                                                            }`}
                                                    >
                                                        {item.poster ? (
                                                            <img src={item.poster} alt="" className="w-10 h-14 object-cover rounded" />
                                                        ) : (
                                                            <div className="w-10 h-14 bg-zinc-700 rounded flex items-center justify-center">
                                                                {item.type === 'movie' ? <Film className="h-5 w-5" /> : <Tv className="h-5 w-5" />}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium truncate">{item.name}</p>
                                                            <p className="text-xs text-zinc-400">{item.type} • {item.year || 'N/A'}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </TabsContent>
                            ))}
                        </Tabs>

                        {/* Stream Methods Results */}
                        {selectedItem && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold">Method Results</h3>
                                    {isLoadingStreams && <Loader2 className="h-4 w-4 animate-spin" />}
                                </div>
                                <div className="bg-zinc-900 rounded-lg overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-zinc-800 text-zinc-400">
                                            <tr>
                                                <th className="p-2 text-left">Method</th>
                                                <th className="p-2">Latency</th>
                                                <th className="p-2">Quality</th>
                                                <th className="p-2">Probe</th>
                                                <th className="p-2">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {streamResults.map((r, i) => (
                                                <tr key={i} className="border-t border-zinc-800">
                                                    <td className="p-2 flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${r.success ? 'bg-green-500' : 'bg-red-500'}`} />
                                                        <span className="truncate max-w-[150px]">{r.method}</span>
                                                    </td>
                                                    <td className="p-2 text-center font-mono text-zinc-400">{r.latencyMs}ms</td>
                                                    <td className="p-2 text-center">
                                                        <span className="text-zinc-300">{r.quality || '-'}</span>
                                                        <span className="text-zinc-600 ml-1">({r.urlType})</span>
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        {r.probeStatus === 'success' ? (
                                                            <span className="text-green-400">{r.audioTracks} audio • {r.subtitles || 0} subs</span>
                                                        ) : r.success && r.url ? (
                                                            <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => handleProbe(i)} disabled={r.probeStatus === 'probing'}>
                                                                {r.probeStatus === 'probing' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Probe'}
                                                            </Button>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        {r.success && r.url && (
                                                            <Button size="sm" className="h-6 text-xs bg-blue-600" onClick={() => handlePlay(r)}>
                                                                <Play className="w-3 h-3" />
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {streamResults.find(r => r.success && r.url) && (
                                    <p className="text-xs text-zinc-500 mt-2">Click 'Probe' to analyze audio/subtitle tracks via hls.js manifest parsing.</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: Video Player + Logs */}
                    <div className="space-y-4">
                        {/* Video Player */}
                        <div className="bg-black aspect-video rounded-lg overflow-hidden relative">
                            {currentStream ? (
                                <VideoPlayer
                                    src={currentStream}
                                    autoplay={true}
                                    title={selectedItem?.name || 'Test Stream'}
                                    className="w-full h-full"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-zinc-500 flex-col gap-2">
                                    <Play className="w-12 h-12 opacity-20" />
                                    <span>Select a stream to play</span>
                                </div>
                            )}
                        </div>

                        {/* Audio Tracks */}
                        {audioTracks.length > 0 && (
                            <div className="bg-zinc-900 rounded-lg p-3">
                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Volume2 className="h-4 w-4" /> Audio Tracks
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {audioTracks.map(track => (
                                        <Button key={track.id} size="sm" variant="outline" className="text-xs">
                                            {track.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Logs */}
                        <div className="bg-zinc-900 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-semibold">Logs</h4>
                                <Button size="sm" variant="ghost" onClick={() => setLogs([])}>
                                    Clear
                                </Button>
                            </div>
                            <ScrollArea className="h-[250px] font-mono text-xs">
                                {logs.map((entry, i) => (
                                    <div
                                        key={i}
                                        className={`py-0.5 ${entry.level === 'error' ? 'text-red-400' :
                                            entry.level === 'warn' ? 'text-yellow-400' :
                                                entry.level === 'success' ? 'text-green-400' :
                                                    'text-zinc-400'
                                            }`}
                                    >
                                        <span className="text-zinc-600">[{entry.time}]</span> {entry.message}
                                    </div>
                                ))}
                                <div ref={logsEndRef} />
                            </ScrollArea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
