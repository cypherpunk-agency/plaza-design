import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

const MOBILE_BREAKPOINT = 768;

interface MobileNavContextType {
  isMobile: boolean;
  isSidebarOpen: boolean;
  isUserPanelOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  openUserPanel: () => void;
  closeUserPanel: () => void;
  toggleUserPanel: () => void;
}

const MobileNavContext = createContext<MobileNavContextType | undefined>(undefined);

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);

      // Auto-close drawers when switching to desktop
      if (!mobile) {
        setIsSidebarOpen(false);
        setIsUserPanelOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isMobile && (isSidebarOpen || isUserPanelOpen)) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, isSidebarOpen, isUserPanelOpen]);

  const openSidebar = useCallback(() => {
    setIsSidebarOpen(true);
    setIsUserPanelOpen(false); // Close user panel when opening sidebar
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => {
      if (!prev) setIsUserPanelOpen(false);
      return !prev;
    });
  }, []);

  const openUserPanel = useCallback(() => {
    setIsUserPanelOpen(true);
    setIsSidebarOpen(false); // Close sidebar when opening user panel
  }, []);

  const closeUserPanel = useCallback(() => {
    setIsUserPanelOpen(false);
  }, []);

  const toggleUserPanel = useCallback(() => {
    setIsUserPanelOpen(prev => {
      if (!prev) setIsSidebarOpen(false);
      return !prev;
    });
  }, []);

  return (
    <MobileNavContext.Provider
      value={{
        isMobile,
        isSidebarOpen,
        isUserPanelOpen,
        openSidebar,
        closeSidebar,
        toggleSidebar,
        openUserPanel,
        closeUserPanel,
        toggleUserPanel
      }}
    >
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  const context = useContext(MobileNavContext);
  if (context === undefined) {
    throw new Error('useMobileNav must be used within a MobileNavProvider');
  }
  return context;
}
