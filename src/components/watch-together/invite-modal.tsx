'use client';

// ─────────────────────────────────────────────────────────────
// Invite Modal
// Modal for sharing room invite code
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Copy, Check, Users, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWatchRoomStore } from '@/store/watch-room-store';

interface InviteModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    inviteCode: string;
}

export function InviteModal({ open, onOpenChange, inviteCode }: InviteModalProps) {
    const [copied, setCopied] = useState(false);
    const members = useWatchRoomStore((s) => s.members);
    const room = useWatchRoomStore((s) => s.room);

    const inviteUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/watch-together/join/${inviteCode}`
        : '';

    const handleCopyCode = async () => {
        await navigator.clipboard.writeText(inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyLink = async () => {
        await navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Watch Together
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Invite Code Section */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                            Room Code
                        </label>
                        <div className="flex gap-2">
                            <div className="flex-1 rounded-lg bg-muted p-4 text-center">
                                <span className="font-mono text-2xl font-bold tracking-widest">
                                    {inviteCode}
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleCopyCode}
                                className="h-auto"
                            >
                                {copied ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Share Link */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                            Share Link
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                readOnly
                                value={inviteUrl}
                                className="flex-1 rounded-lg border bg-muted px-3 py-2 text-sm"
                            />
                            <Button variant="outline" onClick={handleCopyLink}>
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    {/* Members List */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                            In Room ({members.length}/{room?.maxMembers || 10})
                        </label>
                        <div className="space-y-2">
                            {members.map((member) => (
                                <div
                                    key={member.userId}
                                    className="flex items-center gap-3 rounded-lg bg-muted/50 p-2"
                                >
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={member.avatar} />
                                        <AvatarFallback>
                                            {member.displayName.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="flex-1 text-sm font-medium">
                                        {member.displayName}
                                    </span>
                                    {member.role === 'host' && (
                                        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                            Host
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
