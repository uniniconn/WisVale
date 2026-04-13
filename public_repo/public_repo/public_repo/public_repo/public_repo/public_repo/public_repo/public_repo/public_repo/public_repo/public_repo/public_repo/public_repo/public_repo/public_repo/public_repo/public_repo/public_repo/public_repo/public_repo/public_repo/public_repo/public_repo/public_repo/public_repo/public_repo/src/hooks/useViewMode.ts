import { useState, useEffect } from 'react';

export function useViewMode() {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [viewMode, setViewMode] = useState<'auto' | 'mobile' | 'desktop'>(
    (localStorage.getItem('view_mode') as any) || 'auto'
  );

  useEffect(() => {
    let timeoutId: number;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setWindowWidth(window.innerWidth);
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    
    // Listen for storage changes in case other tabs change it
    const handleStorage = () => {
      setViewMode((localStorage.getItem('view_mode') as any) || 'auto');
    };
    window.addEventListener('storage', handleStorage);

    // Custom event for same-tab changes if needed
    const handleViewModeChange = () => {
      setViewMode((localStorage.getItem('view_mode') as any) || 'auto');
    };
    window.addEventListener('view-mode-change', handleViewModeChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('view-mode-change', handleViewModeChange);
    };
  }, []);

  const isMobileView = viewMode === 'mobile' || (viewMode === 'auto' && windowWidth < 768);
  const isDesktopForced = viewMode === 'desktop';

  return { viewMode, isMobileView, isDesktopForced, windowWidth };
}
