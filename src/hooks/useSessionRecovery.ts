import { useState, useCallback } from 'react';
import { getSessionFromStorage, clearSessionFromStorage, formatError } from '../lib/errorRecovery';
import { findSessionByCode } from '../lib/gameState';
import { CONNECTION_STATUS, type ConnectionStatusType } from '../constants/game';
import type { GameSession } from '../types/game';

interface UseSessionRecoveryResult {
  recovering: boolean;
  storedSession: GameSession | null;
  recoverSession: () => Promise<{ session: GameSession | null; error: string | null }>;
}

interface UseSessionRecoveryOptions {
  currentSession: GameSession | null;
  onStatusChange: (status: ConnectionStatusType) => void;
}

/**
 * Handles session recovery from localStorage.
 * Provides stored session info and recovery function.
 *
 * Extracted from duplicate code in:
 * - DMPage.tsx:472-491
 * - PlayPage.tsx:201-220
 */
export function useSessionRecovery({
  currentSession,
  onStatusChange,
}: UseSessionRecoveryOptions): UseSessionRecoveryResult {
  const [recovering, setRecovering] = useState(false);

  // Only get stored session if no current session
  const storedSession = !currentSession ? getSessionFromStorage<GameSession>() : null;

  const recoverSession = useCallback(async (): Promise<{ session: GameSession | null; error: string | null }> => {
    const stored = getSessionFromStorage<GameSession>();
    console.log('[RECOVERY] Attempting recovery, stored session:', stored?.room_code || 'none');

    if (!stored || !stored.room_code) {
      return { session: null, error: 'No saved session found. Please create a new game.' };
    }

    setRecovering(true);
    onStatusChange(CONNECTION_STATUS.CONNECTING);

    const { data, error: recoverError } = await findSessionByCode(stored.room_code);

    setRecovering(false);

    if (recoverError || !data) {
      console.warn('[RECOVERY] Failed to recover session:', recoverError);
      // Only clear storage if the session truly doesn't exist (not just a network error)
      const errorMsg = formatError(recoverError);
      if (errorMsg.includes('not found')) {
        console.log('[RECOVERY] Session not found in database, clearing storage');
        clearSessionFromStorage();
      }
      onStatusChange(CONNECTION_STATUS.ERROR);
      return { session: null, error: errorMsg || 'Could not recover session. Please try again.' };
    }

    console.log('[RECOVERY] Session recovered successfully:', data.room_code);
    onStatusChange(CONNECTION_STATUS.CONNECTED);
    return { session: data, error: null };
  }, [onStatusChange]);

  return { recovering, storedSession, recoverSession };
}
