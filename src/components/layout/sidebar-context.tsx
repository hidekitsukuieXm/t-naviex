'use client';

import * as React from 'react';

const SIDEBAR_COOKIE_NAME = 't-naviex-sidebar-state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

type SidebarState = 'expanded' | 'collapsed';

interface SidebarContextValue {
  state: SidebarState;
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

function getInitialSidebarState(defaultOpen: boolean): boolean {
  if (typeof document === 'undefined') {
    return defaultOpen;
  }
  const cookies = document.cookie.split(';');
  const sidebarCookie = cookies.find((c) => c.trim().startsWith(`${SIDEBAR_COOKIE_NAME}=`));
  if (sidebarCookie) {
    const value = sidebarCookie.split('=')[1];
    return value === 'expanded';
  }
  return defaultOpen;
}

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function SidebarProvider({ children, defaultOpen = true }: SidebarProviderProps) {
  const [open, setOpenState] = React.useState(() => getInitialSidebarState(defaultOpen));
  const [openMobile, setOpenMobile] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  // Check for mobile viewport
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const setOpen = React.useCallback((value: boolean) => {
    setOpenState(value);
    // Save to cookie
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${value ? 'expanded' : 'collapsed'}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
  }, []);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((prev) => !prev);
    } else {
      setOpen(!open);
    }
  }, [isMobile, open, setOpen]);

  const state: SidebarState = open ? 'expanded' : 'collapsed';

  const value = React.useMemo(
    () => ({
      state,
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}
