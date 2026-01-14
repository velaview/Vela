'use client';

import { create } from 'zustand';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface UIState {
  isSidebarOpen: boolean;
  isSearchOpen: boolean;
  isMobileMenuOpen: boolean;
  isPlayerFullscreen: boolean;
}

interface UIActions {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSearch: () => void;
  setSearchOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  setPlayerFullscreen: (fullscreen: boolean) => void;
}

type UIStore = UIState & UIActions;

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

export const useUIStore = create<UIStore>()((set) => ({
  // State
  isSidebarOpen: false,
  isSearchOpen: false,
  isMobileMenuOpen: false,
  isPlayerFullscreen: false,

  // Actions
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
  setPlayerFullscreen: (fullscreen) => set({ isPlayerFullscreen: fullscreen }),
}));

// ─────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────

export const useIsSidebarOpen = () => useUIStore((state) => state.isSidebarOpen);
export const useIsSearchOpen = () => useUIStore((state) => state.isSearchOpen);
export const useIsMobileMenuOpen = () => useUIStore((state) => state.isMobileMenuOpen);
export const useIsPlayerFullscreen = () => useUIStore((state) => state.isPlayerFullscreen);
