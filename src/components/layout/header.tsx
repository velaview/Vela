'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Menu, X, User, LogOut, Settings, Library, Moon, Sun, Puzzle, History as HistoryIcon, RefreshCw, Users } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuthStore, useUser } from '@/store/auth-store';
import { WatchTogetherButton } from '@/components/watch-together';

// ─────────────────────────────────────────────────────────────
// Navigation Links
// ─────────────────────────────────────────────────────────────

const navLinks = [
  { href: '/browse', label: 'Home' },
  { href: '/search', label: 'Discover' },
  { href: '/explore/movie', label: 'Movies' },
  { href: '/explore/series', label: 'Series' },
  { href: '/explore/anime', label: 'Anime' },
  { href: '/history', label: 'History' },
  { href: '/library', label: 'My List' },
];

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function Header() {
  const pathname = usePathname();
  const user = useUser();
  const logout = useAuthStore((state) => state.logout);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle mount for hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch search history
  useEffect(() => {
    if (isSearchOpen) {
      fetch('/api/search/history')
        .then(res => res.json())
        .then(data => setSearchHistory((data.data || []).slice(0, 6)))
        .catch(console.error);
    }
  }, [isSearchOpen]);

  // Handle scroll for background change
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e?: React.FormEvent, query?: string) => {
    if (e) e.preventDefault();
    const q = query || searchQuery;
    if (q.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(q.trim())}`;
      setIsSearchOpen(false);
      setShowHistory(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const handleRefreshFeed = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/feed/refresh', { method: 'POST' });
      if (res.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to refresh feed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-colors duration-300',
        isScrolled ? 'bg-background/95 backdrop-blur-sm' : 'bg-gradient-to-b from-background/80 to-transparent'
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 md:px-8 lg:px-12">
        {/* Left Section: Logo + Nav */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link href="/browse" className="text-xl font-bold text-primary md:text-2xl">
            VELA
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-foreground',
                  pathname === link.href
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right Section: Search + Notifications + Profile */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <AnimatePresence>
              {isSearchOpen ? (
                <motion.form
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 300, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSearch}
                  className="relative hidden md:block"
                >
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowHistory(true)}
                    onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                    className="h-9 pl-9 pr-9 rounded-full bg-background/50 focus:bg-background transition-all"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-2"
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery('');
                      setShowHistory(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  {/* History Dropdown */}
                  <AnimatePresence>
                    {showHistory && searchHistory.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-md border rounded-2xl shadow-2xl overflow-hidden z-50"
                      >
                        <div className="p-2">
                          <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Recent Searches
                          </p>
                          {searchHistory.map((h) => (
                            <button
                              key={h.id}
                              type="button"
                              onClick={() => handleSearch(undefined, h.query)}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent rounded-xl transition-colors text-sm text-left"
                            >
                              <HistoryIcon className="w-4 h-4 text-muted-foreground" />
                              <span className="truncate">{h.query}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.form>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:flex"
                  onClick={() => setIsSearchOpen(true)}
                >
                  <Search className="h-5 w-5" />
                </Button>
              )}
            </AnimatePresence>
          </div>

          {/* Refresh Feed */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={handleRefreshFeed}
            disabled={isRefreshing}
            title="Refresh Feed"
          >
            <RefreshCw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            {mounted && resolvedTheme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {/* Watch Together */}
          <WatchTogetherButton variant="ghost" size="icon" className="hidden md:flex" />

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar} alt={user?.displayName} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.displayName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/library" className="cursor-pointer">
                  <Library className="mr-2 h-4 w-4" />
                  My List
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/addons" className="cursor-pointer">
                  <Puzzle className="mr-2 h-4 w-4" />
                  Addons
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col gap-6 pt-6">
                {/* Mobile Search */}
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </form>

                {/* Mobile Navigation */}
                <nav className="flex flex-col gap-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        pathname === link.href
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                {/* Mobile User Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.avatar} alt={user?.displayName} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user?.displayName}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-col gap-1">
                    <Link
                      href="/addons"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      <Puzzle className="h-4 w-4" />
                      Addons
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <WatchTogetherButton
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-accent"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
