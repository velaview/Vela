'use client';

// ─────────────────────────────────────────────────────────────
// Join Modal
// Modal for joining a room via invite code
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Users, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useWatchRoomStore } from '@/store/watch-room-store';

interface JoinModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onJoined?: (roomId: string) => void;
    initialCode?: string;
}

export function JoinModal({ open, onOpenChange, onJoined, initialCode = '' }: JoinModalProps) {
    const [code, setCode] = useState(initialCode);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const joinRoom = useWatchRoomStore((s) => s.joinRoom);
    const room = useWatchRoomStore((s) => s.room);

    const handleCodeChange = (value: string) => {
        // Only allow alphanumeric, auto-uppercase
        const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        setCode(cleaned);
        setError(null);
    };

    const handleJoin = async () => {
        if (code.length !== 6) {
            setError('Please enter a 6-character code');
            return;
        }

        setIsJoining(true);
        setError(null);

        try {
            const success = await joinRoom(code);
            if (success) {
                // Get the room ID from the store after successful join
                const currentRoom = useWatchRoomStore.getState().room;
                if (currentRoom) {
                    onJoined?.(currentRoom.id);
                }
                onOpenChange(false);
            } else {
                setError('Invalid or expired invite code');
            }
        } catch {
            setError('Failed to join room');
        } finally {
            setIsJoining(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && code.length === 6) {
            handleJoin();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Join Watch Party
                    </DialogTitle>
                    <DialogDescription>
                        Enter the 6-character code to join a watch party
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Code Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                            Room Code
                        </label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => handleCodeChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="ABC123"
                            maxLength={6}
                            className="w-full rounded-lg border bg-muted p-4 text-center font-mono text-2xl font-bold tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary"
                            autoFocus
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <p className="text-sm text-destructive text-center">{error}</p>
                    )}

                    {/* Join Button */}
                    <Button
                        onClick={handleJoin}
                        disabled={code.length !== 6 || isJoining}
                        className="w-full"
                        size="lg"
                    >
                        {isJoining ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Joining...
                            </>
                        ) : (
                            'Join Party'
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
