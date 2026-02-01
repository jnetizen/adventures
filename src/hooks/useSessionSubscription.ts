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

// Heartbeat interval to keep connection alive (2 minutes)
const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;

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
 * FIX: Adds heartbeat to keep connection alive and prevent timeouts.
 */
export function useSessionSubscription({
  session,
  isOffline,
  syncing,
  onSessionUpdate,
  onStatusChange,
}: UseSessionSubscriptionOptions): void {
  const sessionIdRef = useRef(session?.id);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Keep ref in sync with session ID
  useEffect(() => {
    sessionIdRef.current = session?.id;
  }, [session?.id]);

  // Function to re-fetch session from database
  const refetchSession = useCallback(async () => {
    if (!sessionIdRef.current) return;

    console.log('[SUBSCRIPTION] Refetching session...');
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionIdRef.current)
        .single();

      if (error || !data) {
        console.warn('[SUBSCRIPTION] Failed to refetch session:', error);
        return;
      }

      const validatedSession = parseGameSession(data);
      if (validatedSession) {
        console.log('[SUBSCRIPTION] Session refetched successfully');
        onSessionUpdate(validatedSession);
        onStatusChange(CONNECTION_STATUS.CONNECTED);
      }
    } catch (e) {
      console.warn('[SUBSCRIPTION] Error refetching session:', e);
    }
  }, [onSessionUpdate, onStatusChange]);

  // Handle visibility change (iOS screen wake)
  useEffect(() => {
    if (!session?.id) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[SUBSCRIPTION] Page became visible - refetching session');
        // Page became visible - refetch session to catch any missed updates
        refetchSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session?.id, refetchSession]);

  // Heartbeat to keep connection alive and detect disconnections
  useEffect(() => {
    if (!session?.id) return;

    const heartbeat = setInterval(() => {
      // Refetch session periodically to keep connection alive
      // and ensure we haven't missed any updates
      console.log('[SUBSCRIPTION] Heartbeat - checking connection');
      refetchSession();
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      clearInterval(heartbeat);
    };
  }, [session?.id, refetchSession]);

  // Realtime subscription - only recreate when session ID changes
  const sessionId = session?.id;
  useEffect(() => {
    if (!sessionId) return;

    console.log('[SUBSCRIPTION] Setting up channel for session:', sessionId);

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          // Validate the incoming payload before updating state
          const validatedSession = parseGameSession(payload.new);
          if (validatedSession) {
            onSessionUpdate(validatedSession);
            onStatusChange(CONNECTION_STATUS.CONNECTED);
          } else {
            // If validation fails, still update but log warning
            console.warn('[SUBSCRIPTION] Session payload validation failed, using raw data');
            onSessionUpdate(payload.new as GameSession);
            onStatusChange(CONNECTION_STATUS.CONNECTED);
          }
        }
      )
      .subscribe((status) => {
        console.log('[SUBSCRIPTION] Channel status:', status);
        if (status === 'SUBSCRIBED') {
          onStatusChange(
            isOffline
              ? CONNECTION_STATUS.OFFLINE
              : syncing
                ? CONNECTION_STATUS.SYNCING
                : CONNECTION_STATUS.CONNECTED
          );
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[SUBSCRIPTION] Channel error/timeout, will refetch');
          onStatusChange(CONNECTION_STATUS.ERROR);
          // Try to refetch session on channel error or timeout
          refetchSession();
        } else if (status === 'CLOSED') {
          console.warn('[SUBSCRIPTION] Channel closed, will refetch');
          onStatusChange(CONNECTION_STATUS.CONNECTING);
          refetchSession();
        } else {
          onStatusChange(isOffline ? CONNECTION_STATUS.OFFLINE : CONNECTION_STATUS.CONNECTING);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('[SUBSCRIPTION] Cleaning up channel');
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // Only recreate subscription when session ID changes, not on every state update
  }, [sessionId, isOffline, syncing, onSessionUpdate, onStatusChange, refetchSession]);
}
