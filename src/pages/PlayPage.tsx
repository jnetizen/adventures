import { useState, useEffect, useCallback, useMemo } from 'react';
import { findSessionByCode } from '../lib/gameState';
import { formatError } from '../lib/errorRecovery';
import { getCurrentScene, allCharactersActed, calculateEnding, getAdventureList } from '../lib/adventures';
import { debugLog } from '../lib/debugLog';
import { GAME_PHASES, CONNECTION_STATUS, type ConnectionStatusType } from '../constants/game';
import {
  useSessionPersistence,
  useOfflineSync,
  useAdventureLoader,
  useSessionSubscription,
  useSessionRecovery,
} from '../hooks';
import EndingPage from './EndingPage';
import RewardCelebration from '../components/RewardCelebration';
import CutsceneOverlay from '../components/CutsceneOverlay';
import DiceRollAnimation from '../components/DiceRollAnimation';
import DiceRoller from '../components/DiceRoller';
import PlaceholderImage from '../components/PlaceholderImage';
import AdventurePreviewGrid from '../components/AdventurePreviewGrid';
import { deriveSceneLabel } from '../lib/deriveSceneLabel';
import type { GameSession } from '../types/game';
import ConnectionStatus from '../components/ConnectionStatus';

export default function PlayPage() {
  const [roomCode, setRoomCode] = useState('');
  const [session, setSession] = useState<GameSession | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusType>(CONNECTION_STATUS.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [celebratedSceneIds, setCelebratedSceneIds] = useState<string[]>([]);
  const [celebratedEnding, setCelebratedEnding] = useState(false);
  const [sceneImageError, setSceneImageError] = useState(false);

  // Dice roll animation state
  const [pendingDiceRoll, setPendingDiceRoll] = useState<{
    kidName: string;
    roll: number;
    characterId: string;
  } | null>(null);
  const [processedRollCount, setProcessedRollCount] = useState(0);

  // Custom hooks for extracted logic
  useSessionPersistence(session);
  const { isOffline, syncing, pendingOpsCount } = useOfflineSync(session);
  const { adventure, loading: loadingAdventure } = useAdventureLoader(session?.adventure_id);

  // Memoized callbacks for session subscription
  const handleSessionUpdate = useCallback((newSession: GameSession) => {
    setSession(newSession);
  }, []);

  const handleStatusChange = useCallback((status: ConnectionStatusType) => {
    setConnectionStatus(status);
  }, []);

  useSessionSubscription({
    session,
    isOffline,
    syncing,
    onSessionUpdate: handleSessionUpdate,
    onStatusChange: handleStatusChange,
  });

  const { recovering, storedSession, recoverSession } = useSessionRecovery({
    currentSession: session,
    onStatusChange: handleStatusChange,
  });

  // Compute derived state (currentScene) from session and adventure
  const currentScene = session && adventure
    ? getCurrentScene(adventure, session.current_scene)
    : null;

  // Get available adventures for preview while waiting
  const availableAdventures = useMemo(() => getAdventureList(), []);

  // Reset celebration state when session resets (e.g. new adventure)
  useEffect(() => {
    if (session?.phase === GAME_PHASES.SETUP || !session?.adventure_id) {
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

  // Detect new dice rolls and trigger animation
  useEffect(() => {
    const choices = session?.scene_choices ?? [];
    if (choices.length > processedRollCount) {
      const latestChoice = choices[choices.length - 1];
      if (latestChoice.roll !== undefined) {
        const player = session?.players?.find(p => p.characterId === latestChoice.characterId);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- trigger dice animation on new roll
        setPendingDiceRoll({
          kidName: player?.kidName ?? 'Hero',
          roll: latestChoice.roll,
          characterId: latestChoice.characterId,
        });
      }
    }
  }, [session?.scene_choices, processedRollCount, session?.players]);

  // Reset dice roll tracking when scene changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset roll tracking on scene change
    setProcessedRollCount(0);
    setPendingDiceRoll(null);
  }, [session?.current_scene]);

  const handleJoin = async () => {
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setError(null);
    setJoining(true);
    setConnectionStatus(CONNECTION_STATUS.CONNECTING);

    const { data, error: sessionError } = await findSessionByCode(roomCode.trim().toUpperCase());

    setJoining(false);
    if (sessionError || !data) {
      setError(formatError(sessionError) || 'Room code not found. Please check and try again.');
      setConnectionStatus(CONNECTION_STATUS.ERROR);
      return;
    }

    setSession(data);
  };

  const handleRecoverSession = async () => {
    setError(null);
    const { session: recoveredSession, error: recoverError } = await recoverSession();
    if (recoverError) {
      setError(recoverError === 'No saved session found'
        ? recoverError
        : 'Could not recover session. Please join with a room code.');
      return;
    }
    if (recoveredSession) {
      setSession(recoveredSession);
    }
  };

  // Compute these first so adventureEnded can use them
  const allActed = currentScene && session && allCharactersActed(currentScene, session);
  const isLastScene = !!currentScene && !currentScene.outcome?.nextSceneId;

  // Show ending when on last scene and all characters have acted (matches DM behavior)
  // OR when phase is explicitly set to complete
  const adventureEnded =
    (session?.phase === GAME_PHASES.COMPLETE || (isLastScene && allActed)) &&
    !!currentScene &&
    !!adventure;

  const sceneRewards = allActed && currentScene?.outcome?.rewards;
  const showSceneCelebration = !!(
    !adventureEnded &&
    !pendingDiceRoll && // Wait for dice roll animation to finish
    sceneRewards &&
    sceneRewards.length > 0 &&
    currentScene &&
    !celebratedSceneIds.includes(currentScene.id)
  );
  const ending = adventure ? calculateEnding(adventure, session?.success_count ?? 0) : null;
  const endingRewards = ending?.rewards;
  // Match DMPage logic: show ending celebration when on last scene and all acted
  // Use isLastScene instead of adventureEnded to catch the moment before phase changes
  const showEndingCelebration = !!(
    allActed &&
    isLastScene &&
    !pendingDiceRoll && // Wait for dice roll animation to finish
    endingRewards &&
    endingRewards.length > 0 &&
    !celebratedEnding &&
    !showSceneCelebration // Wait for scene celebration to finish
  );

  // Debug logging for rewards and phase transitions
  useEffect(() => {
    debugLog('rewards', 'PlayPage reward state', {
      allActed,
      isLastScene,
      sceneRewards: sceneRewards ? (sceneRewards as unknown[]).length : 0,
      endingRewards: endingRewards ? endingRewards.length : 0,
      showSceneCelebration,
      showEndingCelebration,
      celebratedSceneIds,
      celebratedEnding,
      currentSceneId: currentScene?.id,
    });
  }, [allActed, isLastScene, sceneRewards, endingRewards, showSceneCelebration, showEndingCelebration, celebratedSceneIds, celebratedEnding, currentScene?.id]);

  useEffect(() => {
    debugLog('phase', 'PlayPage session phase', {
      phase: session?.phase,
      adventureId: session?.adventure_id,
      currentScene: session?.current_scene,
      adventureEnded,
    });
  }, [session?.phase, session?.adventure_id, session?.current_scene, adventureEnded]);

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
            <AdventurePreviewGrid adventures={availableAdventures} />
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
          
          {/* Dice Roll Animation - shows before cutscene */}
          {pendingDiceRoll && (
            <DiceRollAnimation
              kidName={pendingDiceRoll.kidName}
              roll={pendingDiceRoll.roll}
              diceMax={session.dice_type ?? 20}
              onComplete={() => {
                setProcessedRollCount(prev => prev + 1);
                setPendingDiceRoll(null);
              }}
            />
          )}
          
          {/* Cutscene Overlay - shown when DM triggers a cutscene (after dice animation) */}
          {!pendingDiceRoll && session.active_cutscene && (
            <CutsceneOverlay
              imageUrl={session.active_cutscene.imageUrl}
              outcomeText={session.active_cutscene.outcomeText}
              characterName={
                adventure.characters.find(c => c.id === session.active_cutscene?.characterId)?.name ?? 'Hero'
              }
              reward={session.active_cutscene.reward}
            />
          )}
          
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
