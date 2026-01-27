import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { findSessionByCode, syncPendingOperations } from '../lib/gameState';
import { saveSessionToStorage, getSessionFromStorage, clearSessionFromStorage } from '../lib/errorRecovery';
import { isOnline, onOnlineStatusChange, getPendingOperations } from '../lib/offlineStorage';
import { loadAdventure, getCurrentScene, allCharactersActed, calculateEnding } from '../lib/adventures';
import EndingPage from './EndingPage';
import RewardCelebration from '../components/RewardCelebration';
import DiceRoller from '../components/DiceRoller';
import PlaceholderImage from '../components/PlaceholderImage';
import { deriveSceneLabel } from '../lib/deriveSceneLabel';
import type { GameSession } from '../types/game';
import type { Adventure } from '../types/adventure';
import ConnectionStatus from '../components/ConnectionStatus';

type ConnectionStatusType = "connected" | "connecting" | "disconnected" | "error" | "offline" | "syncing";

export default function PlayPage() {
  const [roomCode, setRoomCode] = useState('');
  const [session, setSession] = useState<GameSession | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusType>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [loadingAdventure, setLoadingAdventure] = useState(false);
  const [joining, setJoining] = useState(false);
  const [celebratedSceneIds, setCelebratedSceneIds] = useState<string[]>([]);
  const [celebratedEnding, setCelebratedEnding] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [isOffline, setIsOffline] = useState(!isOnline());
  const [syncing, setSyncing] = useState(false);
  const [pendingOpsCount, setPendingOpsCount] = useState(0);
  const [sceneImageError, setSceneImageError] = useState(false);

  // Persist session to localStorage
  useEffect(() => {
    if (session) {
      saveSessionToStorage(session);
    } else {
      clearSessionFromStorage();
    }
  }, [session]);

  // Track online/offline status and sync when back online
  useEffect(() => {
    const unsubscribe = onOnlineStatusChange(async (online) => {
      setIsOffline(!online);
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

  // Load adventure when session has adventure_id
  useEffect(() => {
    if (!session?.adventure_id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync adventure when session clears
      setAdventure(null);
      return;
    }

    setLoadingAdventure(true);
    loadAdventure(session.adventure_id).then((loadedAdventure) => {
      setLoadingAdventure(false);
      if (loadedAdventure) {
        setAdventure(loadedAdventure);
      }
    });
  }, [session?.adventure_id]);

  // Compute derived state (currentScene) from session and adventure
  const currentScene = session && adventure 
    ? getCurrentScene(adventure, session.current_scene)
    : null;

  // Reset celebration state when session resets (e.g. new adventure)
  useEffect(() => {
    if (session?.phase === 'setup' || !session?.adventure_id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync celebration state when session resets
      setCelebratedSceneIds([]);
      setCelebratedEnding(false);
    }
  }, [session?.phase, session?.adventure_id]);

  // Reset scene image error when scene changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset error when switching scenes
    setSceneImageError(false);
  }, [currentScene?.id]);

  // Subscribe to session updates
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
          setSession(payload.new as GameSession);
          setConnectionStatus("connected");
        }
      )
        .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus(isOffline ? "offline" : syncing ? "syncing" : "connected");
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus("error");
        } else {
          setConnectionStatus(isOffline ? "offline" : "connecting");
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
    setJoining(true);
    setConnectionStatus("connecting");

    const { data, error: sessionError } = await findSessionByCode(roomCode.trim().toUpperCase());

    setJoining(false);
    if (sessionError || !data) {
      setError('Room code not found. Please check and try again.');
      setConnectionStatus("error");
      return;
    }

    setSession(data);
  };

  const handleRecoverSession = async () => {
    const stored = getSessionFromStorage<GameSession>();
    if (!stored || !stored.room_code) {
      setError('No saved session found');
      return;
    }
    setError(null);
    setRecovering(true);
    setConnectionStatus("connecting");
    const { data, error: recoverError } = await findSessionByCode(stored.room_code);
    setRecovering(false);
    if (recoverError || !data) {
      setError('Could not recover session. Please join with a room code.');
      clearSessionFromStorage();
      setConnectionStatus("error");
      return;
    }
    setSession(data);
    setConnectionStatus("connected");
  };

  const storedSession = !session ? getSessionFromStorage<GameSession>() : null;

  const adventureEnded =
    session?.phase === 'complete' &&
    !!currentScene &&
    !!adventure;

  const allActed = currentScene && session && allCharactersActed(currentScene, session);
  const sceneRewards = allActed && currentScene?.outcome?.rewards;
  const showSceneCelebration = !!(
    !adventureEnded &&
    sceneRewards &&
    sceneRewards.length > 0 &&
    currentScene &&
    !celebratedSceneIds.includes(currentScene.id)
  );
  const ending = adventure ? calculateEnding(adventure, session?.success_count ?? 0) : null;
  const endingRewards = ending?.rewards;
  const showEndingCelebration = !!(
    adventureEnded &&
    endingRewards &&
    endingRewards.length > 0 &&
    !celebratedEnding
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {showSceneCelebration && currentScene?.outcome?.rewards && (
        <RewardCelebration
          rewards={currentScene.outcome.rewards}
          onClose={() => setCelebratedSceneIds((prev) => [...prev, currentScene.id])}
          variant="scene"
        />
      )}
      {showEndingCelebration && ending?.rewards && (
        <RewardCelebration
          rewards={ending.rewards}
          onClose={() => setCelebratedEnding(true)}
          variant="ending"
        />
      )}
      {!session || !adventure || !currentScene ? (
        <div className="px-4 py-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 text-center">Player Screen</h1>
            
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              <ConnectionStatus status={connectionStatus} pendingOps={pendingOpsCount} />

          {!session ? (
            <>
              {storedSession && storedSession.room_code && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3 mb-4">
                  <p className="text-sm font-medium text-amber-900">Recover session?</p>
                  <p className="text-xs text-amber-700">Room code: {storedSession.room_code}</p>
                  <button
                    onClick={handleRecoverSession}
                    disabled={recovering}
                    className="w-full bg-amber-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {recovering ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Recovering...
                      </span>
                    ) : (
                      'Recover Session'
                    )}
                  </button>
                </div>
              )}
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
                disabled={joining}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joining ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    Joining...
                  </span>
                ) : (
                  'Join Session'
                )}
              </button>
            </>
          ) : loadingAdventure ? (
            <div className="text-center py-8 px-6 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center justify-center gap-3">
                <span className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" aria-hidden />
                <p className="text-gray-700 font-medium">Loading adventure...</p>
              </div>
            </div>
          ) : !adventure ? (
            <div className="text-center py-8 px-6 rounded-xl bg-amber-50/60 border border-amber-100">
              <p className="text-gray-700 font-medium">Waiting for DM to start adventure...</p>
              <p className="text-sm text-gray-500 mt-1">Pick an adventure on the DM screen</p>
            </div>
          ) : !currentScene ? (
            <div className="text-center py-8 px-6 rounded-xl bg-amber-50/60 border border-amber-100">
              <p className="text-gray-700 font-medium">Waiting for scene to start...</p>
              <p className="text-sm text-gray-500 mt-1">The DM will begin when everyone is ready</p>
            </div>
          ) : null}

              {error && (
                <div className="text-red-600 text-sm text-center">{error}</div>
              )}
            </div>
          </div>
        </div>
      ) : adventureEnded && session && adventure ? (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 text-center">Player Screen</h1>
            <div className="flex justify-center">
              <ConnectionStatus status={connectionStatus} pendingOps={pendingOpsCount} />
            </div>
            <EndingPage adventure={adventure} session={session} />
          </div>
        </div>
      ) : (
        <>
          {/* BUG-1 fix: Full-screen scene image only. No overlays — results/turns live on DM. */}
          <div className="w-full h-screen fixed inset-0">
            {sceneImageError ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <PlaceholderImage
                  variant="scene"
                  label={deriveSceneLabel(currentScene.sceneImageUrl, currentScene.sceneNumber)}
                  className="max-w-2xl mx-4"
                />
              </div>
            ) : (
              <img
                src={currentScene.sceneImageUrl}
                alt={`Scene ${currentScene.sceneNumber + 1}`}
                className="w-full h-full object-cover"
                onError={() => setSceneImageError(true)}
              />
            )}
          </div>
          {/* Dice roller for future player-driven choices; disabled until then */}
          <div className="fixed bottom-4 right-4 z-40 opacity-60">
            <DiceRoller onRoll={() => {}} disabled min={1} max={20} />
          </div>
          {error && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border-2 border-red-500 text-red-700 px-4 py-2 rounded-lg shadow-lg z-50 text-sm">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}
