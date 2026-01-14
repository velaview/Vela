'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Download, User, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────
// Navigation Items
// ─────────────────────────────────────────────────────────────

const bottomNavItems = [
  { href: '/browse', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/library', label: 'Library', icon: Download },
  { href: '/history', label: 'History', icon: User },
];

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isAtTop, setIsAtTop] = useState(true);

  // Handle scroll behavior with performance optimization
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const isScrollingDown = currentScrollY > lastScrollY;
          const isScrollingUp = currentScrollY < lastScrollY;
          
          // Hide when scrolling down, show when scrolling up
          if (isScrollingDown && currentScrollY > 100) {
            setIsVisible(false);
          } else if (isScrollingUp || currentScrollY < 50) {
            setIsVisible(true);
          }
          
          // Track if at top of page
          setIsAtTop(currentScrollY < 10);
          
          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <>
      {/* Bottom Navigation */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50 md:hidden',
              'bg-background/95 backdrop-blur-lg border-t border-border',
              'safe-area-inset-bottom' // For iOS notch and home indicator
            )}
          >
            <div className="flex items-center justify-around h-16 px-2">
              {bottomNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 min-w-[60px] py-1 px-2 rounded-lg transition-all duration-200',
                      'hover:bg-accent/50',
                      isActive
                        ? 'text-primary scale-110'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative"
                    >
                      <Icon className="h-5 w-5" />
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute -bottom-1 left-1/2 w-1 h-1 bg-primary rounded-full"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.1 }}
                        />
                      )}
                    </motion.div>
                    <span className={cn(
                      'text-xs font-medium truncate max-w-[60px]',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll to Top Indicator */}
      <AnimatePresence>
        {!isAtTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={cn(
              'fixed bottom-20 right-4 z-40 md:hidden',
              'bg-primary text-primary-foreground rounded-full p-2 shadow-lg',
              'hover:bg-primary/90 transition-colors'
            )}
          >
            <ChevronUp className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Add padding for bottom nav to prevent content overlap */}
      <div className="h-16 md:hidden" />
    </>
  );
}
