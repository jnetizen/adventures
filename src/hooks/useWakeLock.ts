import { useEffect, useRef } from 'react';

/**
 * Hook to keep the screen awake using the Wake Lock API.
 * Automatically requests wake lock when component mounts and releases on unmount.
 * Re-acquires lock when page becomes visible again (e.g., after switching tabs).
 */
export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    // Check if Wake Lock API is supported
    if (!('wakeLock' in navigator)) {
      console.log('[WakeLock] API not supported on this device');
      return;
    }

    const requestWakeLock = async () => {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('[WakeLock] Screen wake lock acquired');

        wakeLockRef.current.addEventListener('release', () => {
          console.log('[WakeLock] Screen wake lock released');
        });
      } catch (err) {
        console.error('[WakeLock] Failed to acquire wake lock:', err);
      }
    };

    // Request wake lock immediately
    requestWakeLock();

    // Re-acquire wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, []);
}
