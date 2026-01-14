'use client';

// ─────────────────────────────────────────────────────────────
// Watch Together Button
// Button to create or join a watch party
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Users, Plus, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { InviteModal } from './invite-modal';
import { JoinModal } from './join-modal';
import { useWatchRoomStore } from '@/store/watch-room-store';
import type { CreateRoomRequest } from '@/core/watch-together';

interface WatchTogetherButtonProps {
    contentId?: string;
    contentTitle?: string;
    contentPoster?: string;
    season?: number;
    episode?: number;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    className?: string;
}

export function WatchTogetherButton({
    contentId,
    contentTitle,
    contentPoster,
    season,
    episode,
    variant = 'outline',
    size = 'default',
    className,
}: WatchTogetherButtonProps) {
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [inviteCode, setInviteCode] = useState('');

    const createRoom = useWatchRoomStore((s) => s.createRoom);
    const room = useWatchRoomStore((s) => s.room);
    const isConnected = useWatchRoomStore((s) => s.isConnected);

    const handleCreateRoom = async () => {
        const request: CreateRoomRequest = {
            contentId,
            contentTitle,
            contentPoster,
            season,
            episode,
        };

        const result = await createRoom(request);
        if (result) {
            setInviteCode(result.inviteCode);
            setShowInviteModal(true);
        }
    };

    const handleJoinSuccess = (roomId: string) => {
        // Navigate to watch page or handle join success
        console.log('Joined room:', roomId);
    };

    // If already in a room, show room controls
    if (room && isConnected) {
        return (
            <>
                <Button
                    variant={variant}
                    size={size}
                    onClick={() => setShowInviteModal(true)}
                    className={cn("gap-2", className)}
                >
                    <Users className="h-4 w-4" />
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                </Button>
                <InviteModal
                    open={showInviteModal}
                    onOpenChange={setShowInviteModal}
                    inviteCode={room.inviteCode}
                />
            </>
        );
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant={variant} size={size} className={cn("gap-2", className)}>
                        <Users className="h-4 w-4" />
                        {size !== 'icon' && 'Watch Together'}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleCreateRoom} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Party
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowJoinModal(true)} className="gap-2">
                        <LogIn className="h-4 w-4" />
                        Join Party
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <InviteModal
                open={showInviteModal}
                onOpenChange={setShowInviteModal}
                inviteCode={inviteCode}
            />

            <JoinModal
                open={showJoinModal}
                onOpenChange={setShowJoinModal}
                onJoined={handleJoinSuccess}
            />
        </>
    );
}
