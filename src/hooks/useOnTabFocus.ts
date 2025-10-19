import { useEffect } from 'react';

/**
 * Hook that calls a callback when the tab becomes visible/focused
 * Useful for refreshing data when user returns to the tab
 */
export function useOnTabFocus(callback: () => void) {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        callback();
      }
    };

    const handleFocus = () => {
      callback();
    };

    // Listen for tab visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for window focus (when switching between apps)
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [callback]);
}
