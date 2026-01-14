'use client';

// ─────────────────────────────────────────────────────────────
// Room Overlay
// Shows room members, chat, and controls when in a watch party
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { X, Send, Users, MessageCircle, Copy, Check, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useWatchRoomStore } from '@/store/watch-room-store';

export function RoomOverlay() {
    const room = useWatchRoomStore(s => s.room);
    const members = useWatchRoomStore(s => s.members);
    const chatMessages = useWatchRoomStore(s => s.chatMessages);
    const isConnected = useWatchRoomStore(s => s.isConnected);
    const isHost = useWatchRoomStore(s => s.isHost);
    const allReady = useWatchRoomStore(s => s.allReady);
    const leaveRoom = useWatchRoomStore(s => s.leaveRoom);
    const sendChatMessage = useWatchRoomStore(s => s.sendChatMessage);

    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<'members' | 'chat'>('members');
    const [message, setMessage] = useState('');
    const [copied, setCopied] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatMessages]);

    // Don't render if not in a room
    useEffect(() => {
        console.log('[RoomOverlay] State update:', {
            hasRoom: !!room,
            roomCode: room?.inviteCode,
            isConnected,
            members: members.length,
            messages: chatMessages.length,
            isExpanded
        });
    }, [room, isConnected, members.length, chatMessages.length, isExpanded]);

    if (!room || !isConnected) return null;

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        await sendChatMessage(message);
        setMessage('');
    };

    const handleCopyCode = async () => {
        await navigator.clipboard.writeText(room.inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleLeave = async () => {
        await leaveRoom();
    };

    return (
        <>
            {/* Floating pill button */}
            <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "fixed bottom-20 right-4 z-50",
                    "flex items-center gap-2 px-4 py-2 rounded-full",
                    "bg-primary text-primary-foreground shadow-lg",
                    "hover:bg-primary/90 transition-colors"
                )}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">{members.length}</span>
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
            </motion.button>

            {/* Expanded panel */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        className={cn(
                            "fixed bottom-20 right-4 z-50",
                            "w-80 max-h-[60vh] rounded-2xl",
                            "bg-background/95 backdrop-blur-md border shadow-2xl",
                            "flex flex-col overflow-hidden"
                        )}
                    >
                        {/* Header */}
                        <div className="p-4 border-b flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold">Watch Party</h3>
                                <button
                                    onClick={handleCopyCode}
                                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                >
                                    Code: {room.inviteCode}
                                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={handleLeave}
                                >
                                    <LogOut className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setIsExpanded(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b">
                            <button
                                onClick={() => setActiveTab('members')}
                                className={cn(
                                    "flex-1 py-2 text-sm font-medium transition-colors",
                                    activeTab === 'members'
                                        ? "text-primary border-b-2 border-primary"
                                        : "text-muted-foreground"
                                )}
                            >
                                <Users className="h-4 w-4 inline mr-1" />
                                Members ({members.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('chat')}
                                className={cn(
                                    "flex-1 py-2 text-sm font-medium transition-colors",
                                    activeTab === 'chat'
                                        ? "text-primary border-b-2 border-primary"
                                        : "text-muted-foreground"
                                )}
                            >
                                <MessageCircle className="h-4 w-4 inline mr-1" />
                                Chat
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden">
                            {activeTab === 'members' ? (
                                <ScrollArea className="h-[200px] p-4">
                                    <div className="space-y-3">
                                        {members.map(member => (
                                            <div key={member.id} className="flex items-center gap-3">
                                                <div className="relative">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={member.avatar} />
                                                        <AvatarFallback>
                                                            {member.displayName.charAt(0).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    {member.isReady && (
                                                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">
                                                        {member.displayName}
                                                        {member.role === 'host' && (
                                                            <span className="ml-1 text-xs text-primary">👑</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {member.isReady ? 'Ready' : `Buffering ${member.bufferPercent}%`}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="flex flex-col h-[200px]">
                                    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                                        <div className="space-y-3">
                                            {chatMessages.length === 0 ? (
                                                <p className="text-sm text-muted-foreground text-center py-8">
                                                    No messages yet
                                                </p>
                                            ) : (
                                                chatMessages.map(msg => (
                                                    <div key={msg.id} className="flex gap-2">
                                                        <Avatar className="h-6 w-6 shrink-0">
                                                            <AvatarImage src={msg.avatar} />
                                                            <AvatarFallback className="text-xs">
                                                                {msg.displayName.charAt(0).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <p className="text-xs text-muted-foreground">
                                                                {msg.displayName}
                                                            </p>
                                                            <p className="text-sm break-words">{msg.message}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                    <form onSubmit={handleSendMessage} className="p-2 border-t flex gap-2">
                                        <Input
                                            value={message}
                                            onChange={e => setMessage(e.target.value)}
                                            placeholder="Type a message..."
                                            className="h-8 text-sm"
                                        />
                                        <Button type="submit" size="icon" className="h-8 w-8 shrink-0">
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </form>
                                </div>
                            )}
                        </div>

                        {/* Readiness indicator - removed to reduce noise */}
                        {/* {!allReady && (
                            <div className="p-2 bg-yellow-500/10 border-t text-center">
                                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                    Waiting for all members to be ready...
                                </p>
                            </div>
                        )} */}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
