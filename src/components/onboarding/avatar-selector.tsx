'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const avatars = [
    // abstract/gradient avatars
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
    'linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)',
    'linear-gradient(to top, #fbc2eb 0%, #a6c1ee 100%)',
    'linear-gradient(to top, #fdcbf1 0%, #e6dee9 100%)',
    'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)',
    'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(to top, #c471f5 0%, #fa71cd 100%)',
    'linear-gradient(to right, #f78ca0 0%, #f9748f 19%, #fd868c 60%, #fe9a8b 100%)',
    // Solid colors with simple emojis/symbols could also work, using gradients for now for "Avant-Garde" feel
];

interface AvatarSelectorProps {
    selectedAvatar?: string;
    onSelect: (avatar: string) => void;
}

export function AvatarSelector({ selectedAvatar, onSelect }: AvatarSelectorProps) {
    return (
        <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
            {avatars.map((avatar, index) => (
                <motion.button
                    key={index}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onSelect(avatar)}
                    className={cn(
                        "w-12 h-12 md:w-16 md:h-16 rounded-full cursor-pointer transition-all duration-300 relative aspect-square",
                        selectedAvatar === avatar ? "ring-4 ring-primary ring-offset-2 ring-offset-background" : "hover:ring-2 hover:ring-primary/50"
                    )}
                    style={{ background: avatar }}
                />
            ))}
        </div>
    );
}
