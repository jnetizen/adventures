import { useEffect } from 'react';
import { saveSessionToStorage } from '../lib/errorRecovery';
import type { GameSession } from '../types/game';

/**
 * Persists session to localStorage.
 * Only SAVES when session exists - does NOT clear when null.
 * This allows session recovery to work even if state temporarily becomes null.
 *
 * To explicitly clear the stored session (e.g., when ending a game),
 * call clearSessionFromStorage() directly.
 *
 * Extracted from duplicate code in DMPage.tsx:47-53 and PlayPage.tsx:46-52
 */
export function useSessionPersistence(session: GameSession | null): void {
  useEffect(() => {
    if (session) {
      saveSessionToStorage(session);
    }
    // NOTE: Intentionally NOT clearing storage when session is null
    // This preserves the session for recovery purposes
  }, [session]);
}
