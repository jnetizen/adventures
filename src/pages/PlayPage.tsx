import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { findSessionByCode, selectAdventure, submitPlayerRoll } from '../lib/gameState';
import { supabase } from '../lib/supabase';
import { formatError, clearSessionFromStorage } from '../lib/errorRecovery';
import { setSessionId } from '../lib/remoteLogger';
import { getCurrentSceneWithBranching, allCharactersActed, calculateEnding, getAdventureList, getSceneActiveCharacters, getActiveCharacterTurns, getSceneById, isPuzzleScene, isPhysicalPuzzle, isDragPuzzle, isSeekerLensPuzzle, isMemoryPuzzle, isSimonPuzzle, isTapMatchPuzzle, isDrawPuzzle, isARPortalPuzzle, isARCatchPuzzle, getPhysicalPuzzleInstructions, getDragPuzzleInstructions, getSeekerLensInstructions, getMemoryPuzzleInstructions, getSimonPuzzleInstructions, getTapMatchPuzzleInstructions, getDrawPuzzleInstructions, getARPortalPuzzleInstructions, getARCatchPuzzleInstructions, isAlwaysSucceedTurn, isTurnPuzzle } from '../lib/adventures';
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
import SimonSaysPuzzle from '../components/SimonSaysPuzzle';
import TapMatchPuzzle from '../components/TapMatchPuzzle';
import DrawCastPuzzle from '../components/DrawCastPuzzle';
import ARPortalPuzzle from '../components/ARPortalPuzzle';
import ARCatchPuzzle from '../components/ARCatchPuzzle';
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

  // Digital dice state - track when player has rolled and is waiting for DM
  const [playerRollSubmitted, setPlayerRollSubmitted] = useState(false);

  // Custom hooks for extracted logic
  useSessionPersistence(session);
  useWakeLock(); // Keep screen awake during gameplay
  const { isOffline, syncing, pendingOpsCount } = useOfflineSync(session);
  const { adventure, loading: loadingAdventure } = useAdventureLoader(session?.adventure_id, session?.family_slug);

  // Memoized callbacks for session subscription
  // PlayPage always accepts the new session state from the database
  // (unlike DMPage which has optimistic updates to preserve)
  const handleSessionUpdate = useCallback((newSession: GameSession) => {
    setSession((prev) => {
      if (!prev) return newSession;
      const sceneChanged =
        prev.current_scene_id !== newSession.current_scene_id ||
        prev.current_scene !== newSession.current_scene;
      if (sceneChanged && newSession.active_cutscene) {
        newSession = { ...newSession, active_cutscene: null };
      }
      // If we're mid-puzzle, don't allow scene regression or cutscene overlays to interrupt.
      if (prev.puzzle_started && !prev.puzzle_completed) {
        const sceneChanged =
          prev.current_scene_id !== newSession.current_scene_id ||
          prev.current_scene !== newSession.current_scene;
        if (sceneChanged && !newSession.puzzle_started) {
          return prev;
        }
        if (newSession.active_cutscene) {
          newSession = { ...newSession, active_cutscene: null };
        }
      }
      // If a puzzle is active, never allow cutscene overlay to reappear mid-puzzle.
      if (newSession.puzzle_started && !newSession.puzzle_completed && newSession.active_cutscene) {
        newSession = { ...newSession, active_cutscene: null };
      }
      // Prevent puzzle_started from being cleared by stray updates while still on the same scene.
      if (prev.puzzle_started && !prev.puzzle_completed && !newSession.puzzle_started) {
        const sameScene =
          prev.current_scene_id === newSession.current_scene_id &&
          prev.current_scene === newSession.current_scene;
        if (sameScene) {
          newSession = { ...newSession, puzzle_started: prev.puzzle_started };
        }
      }
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
      const latestChoice = choices[processedRollCount];

      // Skip dice animation for puzzle turns (DM submits choiceId 'puzzle-complete' with roll=1)
      if (latestChoice.choiceId === 'puzzle-complete') {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- skip past puzzle turn
        setProcessedRollCount(prev => prev + 1);
        return;
      }

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
  // But only if no dice animation is in progress - otherwise let it complete
  useEffect(() => {
    if (lastSceneRef.current !== currentSceneKey && !pendingDiceRoll) {
      // Scene actually changed and no animation in progress - reset count to current choices
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset roll tracking on scene change
      setProcessedRollCount(session?.scene_choices?.length ?? 0);
      lastSceneRef.current = currentSceneKey;
    } else if (lastSceneRef.current !== currentSceneKey && pendingDiceRoll) {
      // Scene changed but animation in progress - just update the ref, don't reset count
      // The animation will complete and increment the count naturally
      lastSceneRef.current = currentSceneKey;
    }
  }, [currentSceneKey, session?.scene_choices?.length, pendingDiceRoll]);

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

  // Memoized callbacks for RewardCelebration to prevent timer resets
  const handleSceneCelebrationClose = useCallback(() => {
    if (currentScene) {
      setCelebratedSceneIds((prev) => [...prev, currentScene.id]);
    }
  }, [currentScene]);

  const handleEndingCelebrationClose = useCallback(() => {
    setCelebratedEnding(true);
  }, []);

  // Detect whether the current turn is a puzzle turn (hide dice UI during puzzles)
  const currentTurnIsPuzzle = (() => {
    if (!currentScene) return false;
    const activeTurns = getActiveCharacterTurns(currentScene, session?.players || []);
    const turn = activeTurns[session?.current_character_turn_index ?? 0] ?? activeTurns[0];
    return turn ? isTurnPuzzle(turn) : false;
  })();

  // Reset player roll state when turn advances (scene_choices changes)
  useEffect(() => {
    setPlayerRollSubmitted(false);
  }, [session?.scene_choices?.length, session?.current_character_turn_index]);

  return (
    <div className="min-h-screen bg-gray-50">
      {showSceneCelebration && currentScene?.outcome?.rewards && (
        <RewardCelebration
          rewards={currentScene.outcome.rewards}
          onClose={handleSceneCelebrationClose}
          variant="scene"
        />
      )}
      {showEndingCelebration && ending?.rewards && (
        <RewardCelebration
          rewards={ending.rewards}
          onClose={handleEndingCelebrationClose}
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

          {/* Simon Says Puzzle - memory sequence game (only after DM starts) */}
          {isPuzzleScene(currentScene) && isSimonPuzzle(currentScene) && session.puzzle_started && !session.puzzle_completed && (() => {
            const instructions = getSimonPuzzleInstructions(currentScene);
            if (!instructions) return null;
            return (
              <SimonSaysPuzzle
                instructions={instructions}
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

          {/* Tap Match Puzzle - find hidden items game (only after DM starts) */}
          {isPuzzleScene(currentScene) && isTapMatchPuzzle(currentScene) && session.puzzle_started && !session.puzzle_completed && (() => {
            const instructions = getTapMatchPuzzleInstructions(currentScene);
            if (!instructions) return null;
            return (
              <TapMatchPuzzle
                instructions={instructions}
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

          {/* Draw Cast Puzzle - trace rune to cast spell (only after DM starts) */}
          {isPuzzleScene(currentScene) && isDrawPuzzle(currentScene) && session.puzzle_started && !session.puzzle_completed && (() => {
            const instructions = getDrawPuzzleInstructions(currentScene);
            if (!instructions) return null;
            return (
              <DrawCastPuzzle
                instructions={instructions}
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

          {/* AR Portal Puzzle - look through portal to find object (only after DM starts) */}
          {isPuzzleScene(currentScene) && isARPortalPuzzle(currentScene) && session.puzzle_started && !session.puzzle_completed && (() => {
            const instructions = getARPortalPuzzleInstructions(currentScene);
            if (!instructions) return null;
            return (
              <ARPortalPuzzle
                instructions={instructions}
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

          {/* AR Catch Puzzle - catch flying object (only after DM starts) */}
          {isPuzzleScene(currentScene) && isARCatchPuzzle(currentScene) && session.puzzle_started && !session.puzzle_completed && (() => {
            const instructions = getARCatchPuzzleInstructions(currentScene);
            if (!instructions) return null;
            return (
              <ARCatchPuzzle
                instructions={instructions}
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

          {/* Turn-level puzzle rendering - puzzle defined on a character turn, not the scene */}
          {!isPuzzleScene(currentScene) && session.puzzle_started && !session.puzzle_completed && (() => {
            const activeTurns = getActiveCharacterTurns(currentScene, session.players || []);
            const currentTurn = activeTurns[session.current_character_turn_index ?? 0] ?? activeTurns[0];
            if (!currentTurn || !isTurnPuzzle(currentTurn)) return null;
            const instructions = currentTurn.puzzleInstructions!;
            const puzzleType = instructions.type;
            const puzzleComplete = async (success: boolean) => {
              await completePuzzle(session.id, success ? 'success' : 'fail');
              setSession((prev) => prev ? {
                ...prev,
                puzzle_completed: true,
                puzzle_outcome: success ? 'success' : 'fail',
              } : null);
            };

            if (puzzleType === 'simon-says-cast') {
              return (
                <SimonSaysPuzzle
                  instructions={instructions as import('../types/adventure').SimonSaysPuzzleInstructions}
                  onComplete={puzzleComplete}
                />
              );
            }
            if (puzzleType === 'draw-to-cast') {
              return (
                <DrawCastPuzzle
                  instructions={instructions as import('../types/adventure').DrawCastPuzzleInstructions}
                  onComplete={puzzleComplete}
                />
              );
            }
            if (puzzleType === 'memory-match') {
              const memInst = instructions as import('../types/adventure').MemoryPuzzleInstructions;
              return (
                <MemoryPuzzle
                  pairs={memInst.pairs}
                  prompt={memInst.prompt}
                  onComplete={puzzleComplete}
                />
              );
            }
            if (puzzleType === 'tap-to-match') {
              return (
                <TapMatchPuzzle
                  instructions={instructions as import('../types/adventure').TapMatchPuzzleInstructions}
                  onComplete={puzzleComplete}
                />
              );
            }
            if (puzzleType === 'seeker-lens') {
              return (
                <SeekerLensPuzzle
                  instructions={instructions as import('../types/adventure').SeekerLensInstructions}
                  sceneImageUrl={currentScene.sceneImageUrl}
                  onComplete={puzzleComplete}
                />
              );
            }
            if (puzzleType === 'ar-catch-object') {
              return (
                <ARCatchPuzzle
                  instructions={instructions as import('../types/adventure').ARCatchPuzzleInstructions}
                  onComplete={puzzleComplete}
                />
              );
            }
            return null;
          })()}

          {/* Turn-level puzzle success overlay */}
          {!isPuzzleScene(currentScene) && session.puzzle_started && session.puzzle_completed && session.puzzle_outcome === 'success' && !session.active_cutscene && (() => {
            const activeTurns = getActiveCharacterTurns(currentScene, session.players || []);
            const currentTurn = activeTurns[session.current_character_turn_index ?? 0] ?? activeTurns[0];
            if (!currentTurn || !isTurnPuzzle(currentTurn)) return null;
            return (
              <div className="fixed inset-0 z-50 bg-gradient-to-b from-green-600 to-emerald-700 flex flex-col items-center justify-center p-6 text-center">
                <div className="text-8xl mb-6 animate-bounce">🎉</div>
                <h2 className="text-4xl font-bold text-white mb-4">Amazing!</h2>
                <p className="text-xl text-green-100">Challenge Complete!</p>
                <div className="mt-8 flex gap-2">
                  <div className="w-4 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
                  <div className="w-4 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-4 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
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
          {!pendingDiceRoll && ((session?.scene_choices?.length ?? 0) <= processedRollCount) && session.active_cutscene && !(session.puzzle_started && !session.puzzle_completed) && (
            <CutsceneOverlay
              imageUrl={session.active_cutscene.imageUrl}
              outcomeText={session.active_cutscene.outcomeText}
              characterName={
                adventure.characters.find(c => c.id === session.active_cutscene?.characterId)?.name ?? 'Hero'
              }
              reward={session.active_cutscene.reward}
            />
          )}
          
          {/* Digital dice roller - prominent when in digital mode and waiting for roll */}
          {session.dice_mode === 'digital' && !session.pending_player_roll && !playerRollSubmitted && !allActed && !pendingDiceRoll && !currentTurnIsPuzzle && (
            <div className="fixed inset-x-0 bottom-0 z-40 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="max-w-sm mx-auto text-center">
                <p className="text-white text-lg font-bold mb-3 drop-shadow-lg">
                  Tap to Roll!
                </p>
                <DiceRoller
                  onRoll={async (roll) => {
                    if (!session) return;
                    const diceMax = session.dice_type ?? 20;

                    // Climax scene: player rolls until they hit max
                    if (currentScene?.isClimax && roll < diceMax) {
                      // Show animation but don't submit to DM - player will roll again
                      const activeTurns = getActiveCharacterTurns(currentScene, session.players || []);
                      const currentTurn = activeTurns[session.current_character_turn_index ?? 0] ?? activeTurns[0];
                      if (currentTurn) {
                        const kidName = getKidDisplayName(session.players, currentTurn.characterId, 'Hero');
                        setPendingDiceRoll({ kidName, roll, characterId: currentTurn.characterId });
                      }
                      return;
                    }

                    // Max roll on climax or any other turn: submit to DM
                    setPlayerRollSubmitted(true);
                    await submitPlayerRoll(session.id, roll);

                    // Show dice animation immediately for alwaysSucceed turns
                    if (currentScene) {
                      const activeTurns = getActiveCharacterTurns(currentScene, session.players || []);
                      const currentTurn = activeTurns[session.current_character_turn_index ?? 0] ?? activeTurns[0];
                      if (currentTurn && isAlwaysSucceedTurn(currentTurn)) {
                        const kidName = getKidDisplayName(session.players, currentTurn.characterId, 'Hero');
                        setPendingDiceRoll({ kidName, roll, characterId: currentTurn.characterId });
                      }
                    }
                  }}
                  min={1}
                  max={session.dice_type ?? 20}
                />
              </div>
            </div>
          )}
          {/* Show waiting message after player rolls */}
          {session.dice_mode === 'digital' && (session.pending_player_roll || playerRollSubmitted) && !allActed && !pendingDiceRoll && !currentTurnIsPuzzle && (
            <div className="fixed inset-x-0 bottom-0 z-40 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="max-w-sm mx-auto text-center">
                <p className="text-white text-lg font-bold drop-shadow-lg">
                  You rolled: {session.pending_player_roll ?? '...'}
                </p>
                <p className="text-white/70 text-sm mt-1">
                  Waiting for DM...
                </p>
              </div>
            </div>
          )}
          {/* Physical dice mode - small indicator */}
          {session.dice_mode !== 'digital' && (
            <div className="fixed bottom-4 right-4 z-40 opacity-60">
              <DiceRoller onRoll={() => {}} disabled min={1} max={session.dice_type ?? 20} />
            </div>
          )}
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
