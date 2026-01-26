import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { findSessionByCode } from '../lib/gameState';
import type { GameSession } from '../types/game';
import ConnectionStatus from '../components/ConnectionStatus';

type ConnectionStatusType = "connected" | "connecting" | "disconnected" | "error";

export default function PlayPage() {
  const [roomCode, setRoomCode] = useState('');
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

  const handleJoin = async () => {
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setError(null);
    setConnectionStatus("connecting");

    const { data, error: sessionError } = await findSessionByCode(roomCode.trim().toUpperCase());

    if (sessionError || !data) {
      setError('Room code not found. Please check and try again.');
      setConnectionStatus("error");
      return;
    }

    setSession(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 text-center">Player Screen</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <ConnectionStatus status={connectionStatus} />

          {!session ? (
            <>
              <div>
                <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Room Code
                </label>
                <input
                  id="roomCode"
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ABCD"
                  maxLength={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleJoin}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Join Session
              </button>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Current Scene</p>
                <p className="text-4xl font-bold text-gray-900">{session.current_scene}</p>
              </div>
              <p className="text-sm text-gray-500">Waiting for DM to advance scenes...</p>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}
