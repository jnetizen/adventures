import { useEffect } from 'react';
import { saveSessionToStorage, clearSessionFromStorage } from '../lib/errorRecovery';
import type { GameSession } from '../types/game';

/**
 * Persists session to localStorage.
 * Saves when session exists, clears when null.
 *
 * Extracted from duplicate code in DMPage.tsx:47-53 and PlayPage.tsx:46-52
 */
export function useSessionPersistence(session: GameSession | null): void {
  useEffect(() => {
    if (session) {
      saveSessionToStorage(session);
    } else {
      clearSessionFromStorage();
    }
  }, [session]);
}
