'use client';

// ─────────────────────────────────────────────────────────────
// Watch Together Join Page
// Page for joining a room via invite code from URL
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWatchRoomStore } from '@/store/watch-room-store';

interface JoinPageProps {
    params: Promise<{ code: string }>;
}

export default function WatchTogetherJoinPage({ params }: JoinPageProps) {
    const router = useRouter();
    const [code, setCode] = useState<string | null>(null);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const joinRoom = useWatchRoomStore((s) => s.joinRoom);
    const room = useWatchRoomStore((s) => s.room);

    // Extract code from params
    useEffect(() => {
        params.then((p) => setCode(p.code));
    }, [params]);

    // Auto-join when code is available
    useEffect(() => {
        if (!code || isJoining || room) return;

        const join = async () => {
            setIsJoining(true);
            setError(null);

            try {
                const success = await joinRoom(code);
                if (success) {
                    // Redirect to watch page with room context
                    router.push('/');
                } else {
                    setError('Invalid or expired invite code');
                }
            } catch {
                setError('Failed to join room');
            } finally {
                setIsJoining(false);
            }
        };

        join();
    }, [code, joinRoom, router, isJoining, room]);

    if (isJoining) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Joining watch party...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-6">
                <div className="rounded-full bg-destructive/10 p-4">
                    <AlertCircle className="h-12 w-12 text-destructive" />
                </div>
                <div className="text-center">
                    <h1 className="text-2xl font-bold">Unable to Join</h1>
                    <p className="mt-2 text-muted-foreground">{error}</p>
                </div>
                <Button onClick={() => router.push('/')} variant="outline">
                    Go Home
                </Button>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
            <div className="rounded-full bg-primary/10 p-4">
                <Users className="h-12 w-12 text-primary" />
            </div>
            <p className="text-lg text-muted-foreground">Preparing to join...</p>
        </div>
    );
}
