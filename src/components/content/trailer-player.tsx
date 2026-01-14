'use client';

import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TrailerPlayerProps {
  url: string;
  isPlaying: boolean;
  muted?: boolean;
  onEnded?: () => void;
  className?: string;
}

export function TrailerPlayer({ url, isPlaying, muted = true, onEnded, className }: TrailerPlayerProps) {
  const [isReady, setIsReady] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);

  // Sync internal mute state with prop, but allow toggle
  useEffect(() => {
    setIsMuted(muted);
  }, [muted]);


  if (!url) return null;

  return (
    <div className={cn("relative w-full h-full bg-black overflow-hidden", className)}>
      {url.includes('youtube.com') || url.includes('youtu.be') ? (
        <iframe
          src={`${url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}?autoplay=${isPlaying ? 1 : 0}&mute=${isMuted ? 1 : 0}&controls=0&showinfo=0&rel=0&iv_load_policy=3&disablekb=1`}
          className="absolute inset-0 w-full h-full border-0"
          allow="autoplay; encrypted-media"
          onLoad={() => setIsReady(true)}
        />
      ) : (
        <video
          src={url}
          autoPlay={isPlaying}
          muted={isMuted}
          className="absolute inset-0 w-full h-full object-cover"
          onCanPlay={() => setIsReady(true)}
          onEnded={onEnded}
        />
      )}

      {/* Loading State / Poster placeholder could go here */}
      <div className={cn(
        "absolute inset-0 bg-black transition-opacity duration-500",
        isReady ? "opacity-0" : "opacity-100"
      )} />

      {/* Mute Toggle (Only show if playing) */}
      {isPlaying && isReady && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-2 right-2 z-20 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsMuted(!isMuted);
          }}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}
