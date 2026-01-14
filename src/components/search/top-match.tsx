'use client';

import { Play, Info, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TopMatchProps {
    result: {
        id: string;
        type: string;
        name: string;
        poster?: string;
        background?: string;
        description?: string;
        releaseInfo?: string;
        imdbRating?: string;
    };
}

export function TopMatch({ result }: TopMatchProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    if (!result) return null;

    const handlePlay = async () => {
        setIsLoading(true);
        try {
            const { playButtonService } = await import('@/core/player/play.service');

            const playResult = await playButtonService.resolveAndPlay({
                type: result.type as 'movie' | 'series' | 'anime',
                id: result.id,
            });

            if (playResult.streamUrl) {
                router.push(playResult.watchUrl);
            } else {
                router.push(`/watch/${result.id}?type=${result.type}`);
            }
        } catch (error) {
            console.error('[TopMatch] Play error:', error);
            toast.error('Failed to start playback');
            router.push(`/watch/${result.id}?type=${result.type}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative w-full overflow-hidden rounded-xl bg-muted/30 border border-white/5">
            {/* ... */}
            <div className="relative z-10 flex flex-col md:flex-row gap-6 p-6 md:p-8 items-start">
                {/* ... */}
                <div className="flex-1 space-y-4 pt-2">
                    {/* ... */}
                    <div className="flex items-center gap-3 pt-2">
                        <Button
                            onClick={handlePlay}
                            disabled={isLoading}
                            size="lg"
                            className="rounded-full font-bold px-8"
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <Play className="mr-2 h-5 w-5 fill-current" />
                            )}
                            Play
                        </Button>
                        <Button asChild variant="secondary" size="lg" className="rounded-full font-bold px-6">
                            <Link href={`/${result.type}/${result.id}`}>
                                <Info className="mr-2 h-5 w-5" />
                                More Info
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
