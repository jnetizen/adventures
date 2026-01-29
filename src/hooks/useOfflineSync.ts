import { useState, useEffect } from 'react';
import { isOnline, onOnlineStatusChange, getPendingOperations } from '../lib/offlineStorage';
import { syncPendingOperations } from '../lib/gameState';
import type { GameSession } from '../types/game';

interface UseOfflineSyncResult {
  isOffline: boolean;
  syncing: boolean;
  pendingOpsCount: number;
}

/**
 * Tracks online/offline status and syncs pending operations when back online.
 * Also periodically updates pending operations count.
 *
 * Extracted from duplicate code in:
 * - DMPage.tsx:56-83 (online sync + pending ops polling)
 * - PlayPage.tsx:55-82 (online sync + pending ops polling)
 */
export function useOfflineSync(session: GameSession | null): UseOfflineSyncResult {
  const [isOfflineState, setIsOfflineState] = useState(!isOnline());
  const [syncing, setSyncing] = useState(false);
  const [pendingOpsCount, setPendingOpsCount] = useState(0);

  // Track online/offline status and sync when back online
  useEffect(() => {
    const unsubscribe = onOnlineStatusChange(async (online) => {
      setIsOfflineState(!online);
      if (online && session) {
        setSyncing(true);
        const ops = await getPendingOperations();
        setPendingOpsCount(ops.length);
        if (ops.length > 0) {
          await syncPendingOperations();
          const remaining = await getPendingOperations();
          setPendingOpsCount(remaining.length);
        }
        setSyncing(false);
      }
    });
    return unsubscribe;
  }, [session]);

  // Update pending ops count periodically
  useEffect(() => {
    const updateCount = async () => {
      const ops = await getPendingOperations();
      setPendingOpsCount(ops.length);
    };
    updateCount();
    const interval = setInterval(updateCount, 2000);
    return () => clearInterval(interval);
  }, []);

  return { isOffline: isOfflineState, syncing, pendingOpsCount };
}
