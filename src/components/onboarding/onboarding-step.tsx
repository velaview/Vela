'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface OnboardingStepProps {
    children: ReactNode;
    isActive: boolean;
    className?: string;
}

export function OnboardingStep({ children, isActive, className }: OnboardingStepProps) {
    if (!isActive) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.05, y: -20, filter: 'blur(10px)' }}
            transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                mass: 0.8
            }}
            className={cn('w-full max-w-4xl mx-auto', className)}
        >
            {children}
        </motion.div>
    );
}
