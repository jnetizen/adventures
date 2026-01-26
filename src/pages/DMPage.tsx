import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { createSession, incrementScene } from '../lib/gameState';
import type { GameSession } from '../types/game';
import RoomCode from '../components/RoomCode';
import ConnectionStatus from '../components/ConnectionStatus';

type ConnectionStatusType = "connected" | "connecting" | "disconnected" | "error";

export default function DMPage() {
  const [session, setSession] = useState<GameSession | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusType>("disconnected");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;

    setConnectionStatus("connecting");

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
          setSession(payload.new as GameSession);
          setConnectionStatus("connected");
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus("connected");
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus("error");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const handleCreateSession = async () => {
    setError(null);
    setConnectionStatus("connecting");
    
    const { data, error: sessionError } = await createSession();
    
    if (sessionError || !data) {
      setError(sessionError?.message || 'Failed to create session');
      setConnectionStatus("error");
      return;
    }

    setSession(data);
  };

  const handleNextScene = async () => {
    if (!session) return;

    setError(null);
    const { error: updateError } = await incrementScene(session.id);
    
    if (updateError) {
      setError(updateError.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 text-center">DM Console</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <ConnectionStatus status={connectionStatus} />
          
          {session ? (
            <>
              <RoomCode code={session.room_code} />
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Current Scene</p>
                <p className="text-4xl font-bold text-gray-900">{session.current_scene}</p>
              </div>
              <button
                onClick={handleNextScene}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Next Scene
              </button>
            </>
          ) : (
            <button
              onClick={handleCreateSession}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Create Session
            </button>
          )}

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}
