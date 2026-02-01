import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { findSessionByCode, selectAdventure } from '../lib/gameState';
import { supabase } from '../lib/supabase';
import { formatError, clearSessionFromStorage } from '../lib/errorRecovery';
import { setSessionId } from '../lib/remoteLogger';
import { getCurrentSceneWithBranching, allCharactersActed, calculateEnding, getAdventureList, getSceneActiveCharacters, getActiveCharacterTurns, getSceneById, isPuzzleScene, isPhysicalPuzzle, isDragPuzzle, isSeekerLensPuzzle, isMemoryPuzzle, getPhysicalPuzzleInstructions, getDragPuzzleInstructions, getSeekerLensInstructions, getMemoryPuzzleInstructions } from '../lib/adventures';
import { completePuzzle } from '../lib/gameState';
import { debugLog } from '../lib/debugLog';
import { GAME_PHASES, CONNECTION_STATUS, type ConnectionStatusType } from '../constants/game';
import {
  useSessionPersistence,
  useOfflineSync,
  useAdventureLoader,
  useSessionSubscription,
  useSessionRecovery,
  useWakeLock,
} from '../hooks';
import EndingPage from './EndingPage';
import RewardCelebration from '../components/RewardCelebration';
import CutsceneOverlay from '../components/CutsceneOverlay';
import DiceRollAnimation from '../components/DiceRollAnimation';
import DiceRoller from '../components/DiceRoller';
import PlaceholderImage from '../components/PlaceholderImage';
import PhysicalPuzzleOverlay from '../components/PhysicalPuzzleOverlay';
import SeekerLensPuzzle from '../components/SeekerLensPuzzle';
import DragPuzzle from '../components/DragPuzzle';
import MemoryPuzzle from '../components/MemoryPuzzle';
import AdventurePreviewGrid from '../components/AdventurePreviewGrid';
import { deriveSceneLabel } from '../lib/deriveSceneLabel';
import { getKidDisplayName } from '../lib/players';
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
  const [prologueImageError, setPrologueImageError] = useState(false);
  const [prologueVideoError, setPrologueVideoError] = useState(false);
  const [selectingAdventure, setSelectingAdventure] = useState(false);

  // Dice roll animation state
  const [pendingDiceRoll, setPendingDiceRoll] = useState<{
    kidName: string;
    roll: number;
    characterId: string;
  } | null>(null);
  const [processedRollCount, setProcessedRollCount] = useState(0);

  // Custom hooks for extracted logic
  useSessionPersistence(session);
  useWakeLock(); // Keep screen awake during gameplay
  const { isOffline, syncing, pendingOpsCount } = useOfflineSync(session);
  const { adventure, loading: loadingAdventure } = useAdventureLoader(session?.adventure_id);

  // Memoized callbacks for session subscription
  // PlayPage always accepts the new session state from the database
  // (unlike DMPage which has optimistic updates to preserve)
  const handleSessionUpdate = useCallback((newSession: GameSession) => {
    setSession((prev) => {
      if (!prev) return newSession;
      if (!prev.updated_at || !newSession.updated_at) return newSession;
      const prevUpdatedAt = Date.parse(prev.updated_at);
      const nextUpdatedAt = Date.parse(newSession.updated_at);
      if (Number.isNaN(prevUpdatedAt) || Number.isNaN(nextUpdatedAt)) {
        return newSession;
      }
      return nextUpdatedAt >= prevUpdatedAt ? newSession : prev;
    });
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

  // Direct polling fallback - bypasses subscription entirely
  // This ensures we always get the latest session state from the database
  useEffect(() => {
    if (!session?.id) return;

    const pollSession = async () => {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', session.id)
        .single();
      if (data) {
        handleSessionUpdate(data as GameSession);
      }
    };

    // Run immediately on mount/session change
    pollSession();

    // Poll every 1 second to catch any missed updates
    const interval = setInterval(pollSession, 1000);
    return () => clearInterval(interval);
  }, [session?.id, handleSessionUpdate]);

  // Derived: is the party currently split?
  const isSplit = !!(session?.is_split && session?.character_scenes && session.character_scenes.length > 0);

  // For split party: get the active character's scene state (based on current_scene_id set by DM)
  const activeCharacterScene = isSplit && session?.character_scenes && session?.current_scene_id
    ? session.character_scenes.find(cs => cs.sceneId === session.current_scene_id) || session.character_scenes[0]
    : null;

  // Compute derived state (currentScene) from session and adventure
  // When split, use the active character's scene to match what DM is showing
  const currentScene = (() => {
    if (!session || !adventure) return null;

    // When party is split, show the scene the DM is currently managing
    if (isSplit && activeCharacterScene) {
      return getSceneById(adventure, activeCharacterScene.sceneId);
    }

    // Standard lookup (supports both scene ID and legacy scene number)
    return getCurrentSceneWithBranching(adventure, session);
  })();

  // Get available adventures for preview while waiting
  const availableAdventures = useMemo(() => getAdventureList(), []);

  // Reset celebration state when session resets (e.g. new adventure)
  useEffect(() => {
    if (session?.phase === GAME_PHASES.SETUP || !session?.adventure_id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync celebration state when session resets
      setCelebratedSceneIds([]);
      setCelebratedEnding(false);
      setPrologueImageError(false);
      setPrologueVideoError(false);
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
        // eslint-disable-next-line react-hooks/set-state-in-effect -- trigger dice animation on new roll
        setPendingDiceRoll({
          kidName: getKidDisplayName(session?.players, latestChoice.characterId, 'Hero'),
          roll: latestChoice.roll,
          characterId: latestChoice.characterId,
        });
      }
    }
  }, [session?.scene_choices, processedRollCount, session?.players]);

  // Track the last scene we processed to avoid re-triggering animations when switching parallel scenes
  const lastSceneRef = useRef<string | null>(null);
  const currentSceneKey = `${session?.current_scene}-${session?.current_scene_id}`;

  // Reset dice roll tracking when scene changes (support both scene number and scene ID for branching)
  useEffect(() => {
    if (lastSceneRef.current !== currentSceneKey) {
      // Scene actually changed - set count to current choices to avoid animating old choices
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset roll tracking on scene change
      setProcessedRollCount(session?.scene_choices?.length ?? 0);
      setPendingDiceRoll(null);
      lastSceneRef.current = currentSceneKey;
    }
  }, [currentSceneKey, session?.scene_choices?.length]);

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

    // Clear any old session from storage to prevent confusion on refresh
    clearSessionFromStorage();
    setSession(data);
    setSessionId(data.id);  // Track session for remote logging
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
      setSessionId(recoveredSession.id);  // Track session for remote logging
    }
  };

  const handleSelectAdventure = async (adventureId: string) => {
    if (!session) return;
    setError(null);
    setSelectingAdventure(true);

    const { error: selectError } = await selectAdventure(session.id, adventureId);
    setSelectingAdventure(false);

    if (selectError) {
      setError(formatError(selectError));
      return;
    }

    // Update local state
    setSession((prev) => prev ? { ...prev, adventure_id: adventureId } : null);
  };

  // Compute these first so adventureEnded can use them
  // For parallel scenes, check if all characters in THIS branch have acted
  const allActed = (() => {
    if (!currentScene || !session) return false;

    if (isSplit && activeCharacterScene) {
      // For parallel scenes, check against the active characters in this scene
      const activeCharacters = getSceneActiveCharacters(currentScene, session.players || []);
      const scenePlayers = (session.players || []).filter(p => activeCharacters.includes(p.characterId));
      const activeTurns = getActiveCharacterTurns(currentScene, scenePlayers);
      return activeCharacterScene.turnIndex >= activeTurns.length;
    }

    // Standard check for non-split scenarios
    return allCharactersActed(currentScene, session);
  })();
  const isLastScene = !!currentScene && !currentScene.outcome?.nextSceneId;

  // Show ending only when phase is explicitly set to complete by the DM
  // Don't auto-trigger based on isLastScene - let DM control the flow
  const adventureEnded =
    session?.phase === GAME_PHASES.COMPLETE &&
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
      {/* Show full-screen prologue when adventure is selected but game hasn't started (SETUP or PROLOGUE phase) */}
      {session && adventure && (session.phase === GAME_PHASES.SETUP || session.phase === GAME_PHASES.PROLOGUE) ? (
        <div className="w-full h-[100dvh] fixed inset-0 bg-black">
          {/* Try video first, then image, then fallback */}
          {adventure.prologue?.prologueVideoUrl && !prologueVideoError ? (
            <video
              src={adventure.prologue.prologueVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain"
              onError={() => setPrologueVideoError(true)}
            />
          ) : adventure.prologue?.prologueImageUrl && !prologueImageError ? (
            <img
              src={adventure.prologue.prologueImageUrl}
              alt={`The world of ${adventure.title}`}
              className="w-full h-full object-contain"
              onError={() => setPrologueImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-amber-100 to-orange-100">
              <div className="text-center p-8">
                <h1 className="text-4xl font-bold text-amber-900 mb-4">{adventure.title}</h1>
                <p className="text-xl text-amber-700">The adventure begins...</p>
              </div>
            </div>
          )}
        </div>
      ) : !session || !adventure || (!currentScene && session?.phase !== GAME_PHASES.PROLOGUE) ? (
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
            <AdventurePreviewGrid
              adventures={availableAdventures}
              onSelect={handleSelectAdventure}
              loading={selectingAdventure}
            />
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
      ) : currentScene ? (
        <>
          {/* BUG-1 fix: Full-screen scene image only. No overlays — results/turns live on DM. */}
          <div className="w-full h-[100dvh] fixed inset-0 bg-black">
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
                className="w-full h-full object-contain"
                onError={() => setSceneImageError(true)}
              />
            )}
          </div>

          {/* Physical Puzzle Overlay - full screen challenge display (only after DM starts) */}
          {isPuzzleScene(currentScene) && isPhysicalPuzzle(currentScene) && session.puzzle_started && !session.puzzle_completed && (() => {
            const instructions = getPhysicalPuzzleInstructions(currentScene);
            if (!instructions) return null;
            return (
              <PhysicalPuzzleOverlay
                challenge={instructions.challenge}
                sceneImageUrl={currentScene.sceneImageUrl}
                title={currentScene.title}
              />
            );
          })()}

          {/* Drag Puzzle - interactive puzzle on player screen (only after DM starts) */}
          {isPuzzleScene(currentScene) && isDragPuzzle(currentScene) && session.puzzle_started && !session.puzzle_completed && (() => {
            const instructions = getDragPuzzleInstructions(currentScene);
            if (!instructions) return null;
            return (
              <DragPuzzle
                instructions={instructions}
                sceneImageUrl={currentScene.sceneImageUrl}
                onComplete={async (success) => {
                  await completePuzzle(session.id, success ? 'success' : 'fail');
                  setSession((prev) => prev ? {
                    ...prev,
                    puzzle_completed: true,
                    puzzle_outcome: success ? 'success' : 'fail',
                  } : null);
                }}
              />
            );
          })()}

          {/* Seeker's Lens Puzzle - AR camera + gyroscope puzzle (only after DM starts) */}
          {isPuzzleScene(currentScene) && isSeekerLensPuzzle(currentScene) && session.puzzle_started && !session.puzzle_completed && (() => {
            const instructions = getSeekerLensInstructions(currentScene);
            if (!instructions) return null;
            return (
              <SeekerLensPuzzle
                instructions={instructions}
                sceneImageUrl={currentScene.sceneImageUrl}
                onComplete={async (success) => {
                  await completePuzzle(session.id, success ? 'success' : 'fail');
                  setSession((prev) => prev ? {
                    ...prev,
                    puzzle_completed: true,
                    puzzle_outcome: success ? 'success' : 'fail',
                  } : null);
                }}
              />
            );
          })()}

          {/* Memory Puzzle - card matching game (only after DM starts) */}
          {isPuzzleScene(currentScene) && isMemoryPuzzle(currentScene) && session.puzzle_started && !session.puzzle_completed && (() => {
            const instructions = getMemoryPuzzleInstructions(currentScene);
            if (!instructions) return null;
            return (
              <MemoryPuzzle
                pairs={instructions.pairs}
                prompt={instructions.prompt}
                onComplete={async (success) => {
                  await completePuzzle(session.id, success ? 'success' : 'fail');
                  setSession((prev) => prev ? {
                    ...prev,
                    puzzle_completed: true,
                    puzzle_outcome: success ? 'success' : 'fail',
                  } : null);
                }}
              />
            );
          })()}

          {/* Puzzle Success Overlay - stays visible until DM advances to next scene */}
          {/* Only show if puzzle was actually started in this scene (puzzle_started is truthy) */}
          {isPuzzleScene(currentScene) && session.puzzle_started && session.puzzle_completed && session.puzzle_outcome === 'success' && !session.active_cutscene && (
            <div className="fixed inset-0 z-50 bg-gradient-to-b from-green-600 to-emerald-700 flex flex-col items-center justify-center p-6 text-center">
              <div className="text-8xl mb-6 animate-bounce">
                🎉
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">Amazing!</h2>
              <p className="text-xl text-green-100">Challenge Complete!</p>
              <div className="mt-8 flex gap-2">
                <div className="w-4 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
                <div className="w-4 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-4 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}

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
      ) : null}
    </div>
  );
}
