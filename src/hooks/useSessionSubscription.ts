import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { parseGameSession } from '../schemas/game';
import { CONNECTION_STATUS, type ConnectionStatusType } from '../constants/game';
import type { GameSession } from '../types/game';

interface UseSessionSubscriptionOptions {
  session: GameSession | null;
  isOffline: boolean;
  syncing: boolean;
  onSessionUpdate: (session: GameSession) => void;
  onStatusChange: (status: ConnectionStatusType) => void;
}

/**
 * Subscribes to Supabase realtime updates for a session.
 * Validates incoming payloads with Zod before updating state.
 *
 * Extracted from duplicate code in:
 * - DMPage.tsx:138-169
 * - PlayPage.tsx:146-177
 *
 * FIX: Adds isOffline and syncing to dependency array to prevent stale closure bug.
 * FIX: Validates incoming payload with Zod before updating state.
 * FIX: Re-fetches session when page becomes visible (handles iOS screen lock).
 */
export function useSessionSubscription({
  session,
  isOffline,
  syncing,
  onSessionUpdate,
  onStatusChange,
}: UseSessionSubscriptionOptions): void {
  const sessionIdRef = useRef(session?.id);

  // Keep ref in sync with session ID
  useEffect(() => {
    sessionIdRef.current = session?.id;
  }, [session?.id]);

  // Function to re-fetch session from database
  const refetchSession = useCallback(async () => {
    if (!sessionIdRef.current) return;

    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionIdRef.current)
        .single();

      if (error || !data) {
        console.warn('Failed to refetch session:', error);
        return;
      }

      const validatedSession = parseGameSession(data);
      if (validatedSession) {
        onSessionUpdate(validatedSession);
        onStatusChange(CONNECTION_STATUS.CONNECTED);
      }
    } catch (e) {
      console.warn('Error refetching session:', e);
    }
  }, [onSessionUpdate, onStatusChange]);

  // Handle visibility change (iOS screen wake)
  useEffect(() => {
    if (!session) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible - refetch session to catch any missed updates
        refetchSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, refetchSession]);

  // Realtime subscription
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel(`session:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          // Validate the incoming payload before updating state
          const validatedSession = parseGameSession(payload.new);
          if (validatedSession) {
            onSessionUpdate(validatedSession);
            onStatusChange(CONNECTION_STATUS.CONNECTED);
          } else {
            // If validation fails, still update but log warning
            console.warn('Session payload validation failed, using raw data');
            onSessionUpdate(payload.new as GameSession);
            onStatusChange(CONNECTION_STATUS.CONNECTED);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          onStatusChange(
            isOffline
              ? CONNECTION_STATUS.OFFLINE
              : syncing
                ? CONNECTION_STATUS.SYNCING
                : CONNECTION_STATUS.CONNECTED
          );
        } else if (status === 'CHANNEL_ERROR') {
          onStatusChange(CONNECTION_STATUS.ERROR);
          // Try to refetch session on channel error
          refetchSession();
        } else {
          onStatusChange(isOffline ? CONNECTION_STATUS.OFFLINE : CONNECTION_STATUS.CONNECTING);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // FIX: Include isOffline and syncing in dependencies to prevent stale closures
  }, [session, isOffline, syncing, onSessionUpdate, onStatusChange, refetchSession]);
}
