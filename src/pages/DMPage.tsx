import { useState, useCallback, useRef } from 'react';
import { Shield, Zap, Heart, User, CheckCircle2, Sparkles, Snowflake, Leaf } from 'lucide-react';
import { createSession, startAdventure, startScene, submitCharacterChoice, advanceToNextScene, submitSessionFeedback, resetSessionForNewAdventure, showCutscene, dismissCutscene, collectReward, startSceneById, splitParty, reuniteParty, setActiveParallelScene, updateCharacterSceneState, selectAdventure, completePuzzle, recordClimaxRoll, startPuzzle, resetPuzzleState } from '../lib/gameState';
import { formatError } from '../lib/errorRecovery';
import { setSessionId } from '../lib/remoteLogger';
import { getActiveCharacterTurns, calculateChoiceOutcome, getAdventureList, calculateEnding, hasPerTurnOutcomes, getTurnOutcome, getSuccessThreshold, isBranchingOutcome, getSceneById, initializeCharacterScenes, isAlwaysSucceedTurn, isPuzzleScene, isPhysicalPuzzle, isDragPuzzle, isSeekerLensPuzzle, getPhysicalPuzzleInstructions, getDragPuzzleInstructions, getSeekerLensInstructions, isRollUntilSuccessClimax } from '../lib/adventures';
import {
  computeIsSplit,
  computeActiveParallelCharacterId,
  computeActiveCharacterScene,
  computeCurrentScene,
  computeCurrentCharacterTurn,
  computeAllActed,
  isParallelSceneComplete,
  computeParallelSceneStatus,
  groupCharacterScenesBySceneId,
} from '../lib/dmDerivedState';
import { getKidDisplayName } from '../lib/players';
import { debugLog } from '../lib/debugLog';
import { GAME_PHASES, CONNECTION_STATUS, type ConnectionStatusType } from '../constants/game';
import type { GameSession, Player, DiceType } from '../types/game';
import { DICE_TYPES, DEFAULT_DICE_TYPE } from '../types/game';
import type { Choice, Character, CharacterTurn, SceneOutcome, TurnOutcome } from '../types/adventure';
import {
  useSessionPersistence,
  useOfflineSync,
  useAdventureLoader,
  useSessionSubscription,
  useSessionRecovery,
} from '../hooks';
import RoomCode from '../components/RoomCode';
import ConnectionStatus from '../components/ConnectionStatus';
import PlaceholderImage from '../components/PlaceholderImage';
import AnimationIndicator from '../components/AnimationIndicator';
import ProloguePage from './ProloguePage';
import AdventureSelectPage from './AdventureSelectPage';
import EndingPage from './EndingPage';
import FeedbackForm from '../components/FeedbackForm';
import RewardCelebration from '../components/RewardCelebration';
import DiceRoller from '../components/DiceRoller';
import PhysicalPuzzleDMControls from '../components/PhysicalPuzzleDMControls';
import DragPuzzleDMControls from '../components/DragPuzzleDMControls';
import SeekerLensDMControls from '../components/SeekerLensDMControls';
import RollUntilSuccessControls from '../components/RollUntilSuccessControls';

const getCharactersInScene = (
  characterScenes: GameSession['character_scenes'] | null | undefined,
  sceneId: string
) => characterScenes?.filter(cs => cs.sceneId === sceneId) ?? [];

const updateSceneTurnIndex = (
  characterScenes: GameSession['character_scenes'] | null | undefined,
  sceneId: string,
  turnIndex: number
): GameSession['character_scenes'] | null | undefined => {
  if (!characterScenes) return characterScenes;
  return characterScenes.map(cs =>
    cs.sceneId === sceneId
      ? { ...cs, turnIndex }
      : cs
  );
};

const resolveSceneChoiceOutcome = (
  characterTurn: CharacterTurn,
  sceneChoice: NonNullable<GameSession['scene_choices']>[number],
  diceType: number,
  choice: Choice | null,
  isClimaxTurn: boolean
) => {
  if (isClimaxTurn) {
    return characterTurn.outcome;
  }

  if (hasPerTurnOutcomes(characterTurn)) {
    return getTurnOutcome(characterTurn, sceneChoice.roll!, diceType, choice ?? undefined);
  }

  return choice
    ? calculateChoiceOutcome(choice, sceneChoice.roll!, diceType)
    : null;
};

const getDiceScaleHelpers = (diceType: number) => {
  const scaleThreshold = (t: number) => Math.ceil(t * (diceType / 20));
  const label = `Dice Roll (1-${diceType})`;
  const rollPrompt = `or roll d${diceType}`;
  return { scaleThreshold, label, rollPrompt };
};

const showOutcomeCutscene = async (
  sessionId: string,
  characterId: string,
  outcome: TurnOutcome
) => {
  console.log('[CUTSCENE DEBUG] showOutcomeCutscene called', {
    sessionId,
    characterId,
    hasOutcome: !!outcome,
    outcomeText: outcome?.text?.substring(0, 50),
    cutsceneImageUrl: outcome?.cutsceneImageUrl,
  });

  if (!outcome.cutsceneImageUrl) {
    console.log('[CUTSCENE DEBUG] No cutsceneImageUrl, skipping');
    return;
  }

  console.log('[CUTSCENE DEBUG] Calling showCutscene with URL:', outcome.cutsceneImageUrl);
  const { error: cutsceneError } = await showCutscene(sessionId, {
    characterId,
    imageUrl: outcome.cutsceneImageUrl,
    outcomeText: outcome.text,
    reward: outcome.reward ? {
      id: outcome.reward.id,
      name: outcome.reward.name,
      imageUrl: outcome.reward.imageUrl,
      type: outcome.reward.type,
    } : undefined,
  });

  debugLog('session', 'showCutscene called', {
    characterId,
    result: cutsceneError ? 'ERROR' : 'SUCCESS',
  });
  if (cutsceneError) {
    console.error('Failed to show cutscene:', cutsceneError);
  }

  if (outcome.reward) {
    const { error: rewardError } = await collectReward(sessionId, {
      id: outcome.reward.id,
      name: outcome.reward.name,
      imageUrl: outcome.reward.imageUrl,
      type: outcome.reward.type,
    });

    if (rewardError) {
      console.error('Failed to collect reward:', rewardError);
    }
  }
};

const renderSceneOutcome = (outcome: SceneOutcome) => (
  <div className="bg-green-50 p-4 rounded-lg mt-4">
    <h3 className="font-semibold text-green-900 mb-2">Scene Outcome</h3>
    <p className="text-green-800 whitespace-pre-line">{outcome.resultText}</p>
    {outcome.rewards && outcome.rewards.length > 0 && (
      <div className="mt-3">
        <p className="font-semibold text-green-900 mb-2">Rewards earned:</p>
        <ul className="space-y-2">
          {outcome.rewards.map((reward) => (
            <li key={reward.id} className="text-green-800 flex items-center gap-3">
              {reward.imageUrl ? (
                <img src={reward.imageUrl} alt={reward.name} className="w-8 h-8 object-contain rounded" />
              ) : (
                <PlaceholderImage variant="character" label={reward.name} className="w-8 h-8 flex-shrink-0" />
              )}
              <span>{reward.name}</span>
              <span className="text-xs text-green-600 uppercase">{reward.type}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

export default function DMPage() {
  const [session, setSession] = useState<GameSession | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusType>(CONNECTION_STATUS.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [diceRoll, setDiceRoll] = useState<string>('');
  const [assignmentStep, setAssignmentStep] = useState<'kids' | 'characters'>('kids');
  const [kidNames, setKidNames] = useState<string[]>(['', '']);
  const [playerAssignments, setPlayerAssignments] = useState<Array<{ kidName: string; characterId: string }>>([]);
  const [selectedDiceType, setSelectedDiceType] = useState<DiceType>(DEFAULT_DICE_TYPE);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false); // Ref-based guard for immediate double-click prevention
  const [advancing, setAdvancing] = useState(false);
  const [celebratedSceneIds, setCelebratedSceneIds] = useState<string[]>([]);
  const [celebratedEnding, setCelebratedEnding] = useState(false);
  // For narrative scenes (no turns) and epilogue display
  const [showingEpilogue, setShowingEpilogue] = useState(false);
  // For parallel scenes: which character's branch is being viewed (user can switch between branches)
  // This is a UI-only preference, not persisted to the session
  const [selectedParallelCharacterId, setSelectedParallelCharacterId] = useState<string | null>(null);
  // For climax scenes: whether to play video or show individual cutscenes
  const [climaxPlayMode, setClimaxPlayMode] = useState<'cutscenes' | 'video' | null>(null);
  // Track which climax cutscene we're showing (for cutscenes mode)
  const [climaxCutsceneIndex, setClimaxCutsceneIndex] = useState(0);

  // Custom hooks for extracted logic
  useSessionPersistence(session);
  const { isOffline, syncing, pendingOpsCount } = useOfflineSync(session);
  const { adventure, loading: loadingAdventure } = useAdventureLoader(session?.adventure_id);

  // Memoized callbacks for session subscription
  // Merge active_cutscene to preserve optimistic updates during race conditions
  const handleSessionUpdate = useCallback((newSession: GameSession) => {
    setSession((prev) => {
      console.log('%c[SUBSCRIPTION] Update received', 'color: cyan; font-weight: bold', {
        prevCutscene: prev?.active_cutscene?.characterId,
        newCutscene: newSession.active_cutscene?.characterId,
        newTurnIndex: newSession.current_character_turn_index,
      });
      // If we have an active_cutscene locally but the incoming update doesn't,
      // preserve our local value (it might be an optimistic update not yet confirmed)
      if (prev?.active_cutscene && !newSession.active_cutscene) {
        console.log('%c[SUBSCRIPTION] Preserving local active_cutscene', 'color: yellow; font-weight: bold', prev.active_cutscene);
        return { ...newSession, active_cutscene: prev.active_cutscene };
      }
      return newSession;
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

  // Debug logging for phase transitions (called on every render in dev only)
  debugLog('phase', 'DMPage render', {
    hasSession: !!session,
    phase: session?.phase,
    adventureId: session?.adventure_id,
    currentScene: session?.current_scene,
    successCount: session?.success_count,
    diceType: session?.dice_type,
  });

  // Derived: is the party currently split?
  const isSplit = computeIsSplit(session);

  // Debug logging for split state
  if (session?.phase === GAME_PHASES.PLAYING) {
    console.log('[PARALLEL DEBUG] Split state', {
      is_split: session?.is_split,
      isSplit,
      current_scene_id: session?.current_scene_id,
      character_scenes: session?.character_scenes?.map(cs => ({ char: cs.characterId, scene: cs.sceneId })),
      selectedParallelCharacterId,
    });
  }

  // Derive active parallel character: use user's selection if valid, otherwise first character in split
  const activeParallelCharacterId = computeActiveParallelCharacterId(
    isSplit,
    session?.character_scenes,
    selectedParallelCharacterId
  );

  // For split party: get the active character's scene state
  const activeCharacterScene = computeActiveCharacterScene(
    isSplit,
    session?.character_scenes,
    activeParallelCharacterId
  );

  if (isSplit) {
    console.log('[PARALLEL DEBUG] Active parallel state', {
      activeParallelCharacterId,
      activeCharacterSceneId: activeCharacterScene?.sceneId,
      sessionCurrentSceneId: session?.current_scene_id,
    });
  }

  // Compute derived state (currentScene and currentCharacterTurn) from session and adventure
  // When split, use the active character's scene; otherwise use branching-aware lookup
  const currentScene = computeCurrentScene(session, adventure, isSplit, activeCharacterScene);

  const currentCharacterTurn = computeCurrentCharacterTurn(
    session,
    adventure,
    currentScene,
    isSplit,
    activeCharacterScene
  );

  const handleCreateSession = async () => {
    setError(null);
    setConnectionStatus(CONNECTION_STATUS.CONNECTING);

    const { data, error: sessionError } = await createSession();

    if (sessionError || !data) {
      setError(formatError(sessionError) || 'Failed to create session');
      setConnectionStatus(CONNECTION_STATUS.ERROR);
      return;
    }

    setSession(data);
    setSessionId(data.id);  // Track session for remote logging
  };

  const persistAdventureSelection = async (adventureId: string) => {
    if (!session) return false;
    setError(null);

    // Save to database so player screen can see the selection
    const { error: selectError } = await selectAdventure(session.id, adventureId);
    if (selectError) {
      setError(formatError(selectError));
      return false;
    }
    return true;
  };

  const loadAdventureById = async (adventureId: string) => {
    if (!session) return;
    const didPersist = await persistAdventureSelection(adventureId);
    if (!didPersist) {
      return;
    }

    // Set adventure_id on session - the useAdventureLoader hook will load the adventure
    setSession((prev) => prev ? { ...prev, adventure_id: adventureId } : null);
    setAssignmentStep('kids');
    setKidNames(['', '']);
    setPlayerAssignments([]);
  };

  const availableAdventures = getAdventureList();

  const handleKidsNext = () => {
    const names = kidNames.filter(n => n.trim());
    if (names.length === 0) {
      setError('Enter at least one kid name');
      return;
    }
    if (names.length > 3) {
      setError('Maximum 3 kids');
      return;
    }
    setError(null);
    setPlayerAssignments(names.map(kidName => ({ kidName, characterId: '' })));
    setAssignmentStep('characters');
  };

  // Helper to get icon for character based on name/ID patterns
  const getCharacterIcon = (character: Character) => {
    const nameLower = character.name.toLowerCase();
    const idLower = character.id.toLowerCase();
    
    if (nameLower.includes('shield') || idLower.includes('shield')) {
      return <Shield className="w-8 h-8 text-blue-600" />;
    }
    if (nameLower.includes('swift') || idLower.includes('swift') || nameLower.includes('spark') || idLower.includes('spark')) {
      return <Zap className="w-8 h-8 text-amber-500" />;
    }
    if (nameLower.includes('kind') || idLower.includes('kind') || nameLower.includes('bloom') || idLower.includes('bloom')) {
      return <Heart className="w-8 h-8 text-rose-500" />;
    }
    if (nameLower.includes('frost') || idLower.includes('frost')) {
      return <Snowflake className="w-8 h-8 text-cyan-500" />;
    }
    // Default icons for wizards
    if (idLower.includes('spark')) {
      return <Sparkles className="w-8 h-8 text-yellow-500" />;
    }
    if (idLower.includes('bloom')) {
      return <Leaf className="w-8 h-8 text-green-500" />;
    }
    // Fallback
    return <Shield className="w-8 h-8 text-gray-600" />;
  };

  // Helper to get color classes for character cards
  const getCharacterColorClasses = (character: Character) => {
    const nameLower = character.name.toLowerCase();
    const idLower = character.id.toLowerCase();
    
    if (nameLower.includes('shield') || idLower.includes('shield')) {
      return { bg: 'bg-blue-50 border-blue-200', accent: 'text-blue-700' };
    }
    if (nameLower.includes('swift') || idLower.includes('swift') || nameLower.includes('spark') || idLower.includes('spark')) {
      return { bg: 'bg-amber-50 border-amber-200', accent: 'text-amber-700' };
    }
    if (nameLower.includes('kind') || idLower.includes('kind') || nameLower.includes('bloom') || idLower.includes('bloom')) {
      return { bg: 'bg-rose-50 border-rose-200', accent: 'text-rose-700' };
    }
    if (nameLower.includes('frost') || idLower.includes('frost')) {
      return { bg: 'bg-cyan-50 border-cyan-200', accent: 'text-cyan-700' };
    }
    // Fallback
    return { bg: 'bg-gray-50 border-gray-200', accent: 'text-gray-700' };
  };

  const handleCharacterSelect = (characterId: string, kidName: string) => {
    setPlayerAssignments(prev => {
      const next = [...prev];
      const currentAssignment = next.find(p => p.characterId === characterId);
      
      // If clicking the currently selected player, deselect them
      if (currentAssignment && currentAssignment.kidName === kidName) {
        const index = next.findIndex(p => p.kidName === kidName);
        if (index !== -1) {
          next[index] = { ...next[index], characterId: '' };
        }
        return next;
      }
      
      // Remove this character from any other player
      next.forEach(p => {
        if (p.characterId === characterId && p.kidName !== kidName) {
          p.characterId = '';
        }
      });
      
      // Assign this character to the selected kid
      const kidIndex = next.findIndex(p => p.kidName === kidName);
      if (kidIndex !== -1) {
        next[kidIndex] = { ...next[kidIndex], characterId };
      }
      
      return next;
    });
  };

  const handleStartAdventure = async () => {
    if (!session || !adventure) return;

    const players: Player[] = playerAssignments
      .filter(p => p.characterId)
      .map(p => ({ kidName: p.kidName, characterId: p.characterId }));

    if (players.length === 0) {
      setError('Assign each kid to a character');
      return;
    }

    const assigned = new Set(players.map(p => p.characterId));
    if (assigned.size !== players.length) {
      setError('Each character can only be assigned once');
      return;
    }

    setError(null);
    const { error: startError } = await startAdventure(session.id, adventure.id, players, selectedDiceType);
    if (startError) {
      setError(formatError(startError));
      return;
    }
    setSession((prev) =>
      prev ? { ...prev, players, adventure_id: adventure.id, phase: GAME_PHASES.PROLOGUE, dice_type: selectedDiceType } : null
    );
  };

  const handlePrologueStart = async () => {
    if (!session) return;
    setError(null);
    setAdvancing(true);
    const { error: sceneError } = await startScene(session.id, 0);
    setAdvancing(false);
    if (sceneError) {
      setError(formatError(sceneError));
      return;
    }
    setSession((prev) => prev ? { ...prev, phase: GAME_PHASES.PLAYING } : null);
  };

  const handleSubmitChoice = async () => {
    // CRITICAL: Ref-based guard against double-click race conditions
    // Refs update immediately, unlike state which batches updates
    if (submittingRef.current) {
      console.log('%c[SUBMIT] Blocked - already submitting (ref guard)', 'color: red; font-weight: bold');
      return;
    }
    submittingRef.current = true;

    // Capture turn data at the start to avoid race conditions with subscription updates
    const turn = currentCharacterTurn;
    const choice = selectedChoice;

    debugLog('session', 'Starting submit', {
      turnCharacterId: turn?.characterId,
      turnPrompt: turn?.promptText?.substring(0, 50),
      isSplit,
      activeSceneTurnIndex: activeCharacterScene?.turnIndex,
      globalTurnIndex: session?.current_character_turn_index,
      choiceId: choice?.id,
      diceRoll,
      hasSuccessOutcome: !!turn?.successOutcome,
      hasFailOutcome: !!turn?.failOutcome,
    });

    // Log detailed turn data for debugging cutscene issues
    console.log('%c[SUBMIT] Turn data captured', 'color: cyan; font-weight: bold', {
      characterId: turn?.characterId,
      hasSuccessOutcome: !!turn?.successOutcome,
      hasFailOutcome: !!turn?.failOutcome,
      successCutsceneUrl: turn?.successOutcome?.cutsceneImageUrl,
      failCutsceneUrl: turn?.failOutcome?.cutsceneImageUrl,
    });

    if (!session || !turn || !choice || !diceRoll.trim()) {
      setError('Please select a choice and enter a dice roll');
      submittingRef.current = false;
      return;
    }

    const roll = parseInt(diceRoll, 10);
    const maxRoll = session.dice_type ?? DEFAULT_DICE_TYPE;
    if (isNaN(roll) || roll < 1 || roll > maxRoll) {
      setError(`Dice roll must be between 1 and ${maxRoll}`);
      submittingRef.current = false;
      return;
    }

    // Get the success threshold (from turn or choice level)
    const threshold = getSuccessThreshold(turn, choice);

    setError(null);
    setSubmitting(true);
    const { error: submitError } = await submitCharacterChoice(
      session.id,
      turn.characterId,
      choice.id,
      roll,
      threshold
    );

    if (submitError) {
      setSubmitting(false);
      submittingRef.current = false;
      setError(formatError(submitError));
      return;
    }

    // If in split mode, also update the character scene's turn index
    // Important: Update ALL characters sharing the same scene, not just the one who acted
    if (isSplit && activeCharacterScene) {
      const newTurnIndex = (activeCharacterScene.turnIndex || 0) + 1;
      const currentSceneId = activeCharacterScene.sceneId;

      // Update all characters in the same scene
      const charactersInSameScene = getCharactersInScene(session.character_scenes, currentSceneId);

      for (const charScene of charactersInSameScene) {
        await updateCharacterSceneState(session.id, charScene.characterId, {
          turnIndex: newTurnIndex,
        });
      }

      // Update local state for all characters in the same scene
      setSession((prev) => {
        if (!prev?.character_scenes) return prev;
        return {
          ...prev,
          character_scenes: updateSceneTurnIndex(prev.character_scenes, currentSceneId, newTurnIndex),
        };
      });
    }

    // Check if this turn has cutscene outcomes (new format)
    // Use captured turn data to avoid race conditions
    console.log('%c[CUTSCENE] Step 1: Checking turn for cutscene', 'color: blue; font-weight: bold', {
      characterId: turn.characterId,
      turnIndex: session.current_character_turn_index,
      hasPerTurnOutcomes: hasPerTurnOutcomes(turn),
      successOutcome: turn.successOutcome,
      failOutcome: turn.failOutcome,
    });

    if (hasPerTurnOutcomes(turn)) {
      const turnOutcome = getTurnOutcome(turn, roll, maxRoll, choice);
      console.log('%c[CUTSCENE] Step 2: Outcome resolved', 'color: green; font-weight: bold', {
        roll,
        maxRoll,
        threshold: turn.successThreshold,
        isSuccess: turnOutcome === turn.successOutcome,
        outcomeText: turnOutcome?.text,
        cutsceneImageUrl: turnOutcome?.cutsceneImageUrl,
        hasOutcome: !!turnOutcome,
      });

      if (turnOutcome?.cutsceneImageUrl) {
        console.log('%c[CUTSCENE] Step 3: Setting cutscene for ' + turn.characterId, 'color: orange; font-weight: bold');
        // IMPORTANT: Set optimistic update BEFORE async call to prevent subscription race condition
        const cutsceneData = {
          characterId: turn.characterId,
          imageUrl: turnOutcome.cutsceneImageUrl,
          outcomeText: turnOutcome.text || '',
          reward: turnOutcome.reward ? {
            id: turnOutcome.reward.id,
            name: turnOutcome.reward.name,
            imageUrl: turnOutcome.reward.imageUrl,
            type: turnOutcome.reward.type,
          } : undefined,
        };
        console.log('%c[CUTSCENE] Step 3b: Cutscene data', 'color: orange', cutsceneData);
        setSession((prev) => {
          console.log('%c[CUTSCENE] Step 3c: setSession called, prev active_cutscene:', 'color: orange', prev?.active_cutscene);
          return prev ? { ...prev, active_cutscene: cutsceneData } : null;
        });
        console.log('%c[CUTSCENE] Step 4: Calling showOutcomeCutscene', 'color: purple; font-weight: bold');
        await showOutcomeCutscene(session.id, turn.characterId, turnOutcome);
        console.log('%c[CUTSCENE] Step 5: showOutcomeCutscene complete', 'color: purple; font-weight: bold');
      } else {
        console.log('%c[CUTSCENE] No cutsceneImageUrl in outcome', 'color: red', turnOutcome);
      }
    } else {
      console.log('%c[CUTSCENE] Turn does not have per-turn outcomes', 'color: red');
    }

    setSubmitting(false);
    submittingRef.current = false;

    // Reset selection for next turn
    setSelectedChoice(null);
    setDiceRoll('');
  };

  /**
   * Handle the entire climax sequence at once.
   * Shows either the video OR all cutscenes in sequence.
   * All character choices are submitted together.
   */
  const handleSubmitClimaxAll = async () => {
    if (!session || !currentScene || !adventure) {
      setError('Invalid climax state');
      return;
    }

    const climaxTurns = getActiveCharacterTurns(currentScene, players).filter(t => isAlwaysSucceedTurn(t));
    if (climaxTurns.length === 0) {
      setError('No climax turns found');
      return;
    }

    setError(null);
    setSubmitting(true);

    const diceType = session.dice_type ?? DEFAULT_DICE_TYPE;

    // Submit all character choices at once
    for (const turn of climaxTurns) {
      const { error: submitError } = await submitCharacterChoice(
        session.id,
        turn.characterId,
        'climax-action',
        diceType, // Always max roll = always success
        1 // Threshold of 1 means any roll succeeds
      );
      if (submitError) {
        console.error('Failed to submit climax choice for', turn.characterId, submitError);
      }
    }

    console.log('%c[CLIMAX] All choices submitted, now showing cutscene/video', 'color: lime; font-size: 14px; font-weight: bold');
    console.log('%c[CLIMAX] Mode:', 'color: lime', climaxPlayMode);
    console.log('%c[CLIMAX] currentScene.climaxVideoUrl:', 'color: lime', currentScene.climaxVideoUrl);
    console.log('%c[CLIMAX] currentScene:', 'color: lime', currentScene);

    // Show video OR first cutscene
    if (climaxPlayMode === 'video' && currentScene.climaxVideoUrl) {
      console.log('%c[CLIMAX] ✓ Video mode - showing video!', 'color: lime; font-size: 16px; font-weight: bold', currentScene.climaxVideoUrl);
      const videoCutsceneData = {
        characterId: 'climax-video',
        imageUrl: currentScene.climaxVideoUrl,
        outcomeText: 'The heroes strike together!',
      };
      setSession((prev) => prev ? { ...prev, active_cutscene: videoCutsceneData } : null);
      await showCutscene(session.id, videoCutsceneData);
    } else {
      // Cutscenes mode - show the first cutscene, DM will dismiss to see next
      const firstTurn = climaxTurns[0];
      if (firstTurn?.outcome?.cutsceneImageUrl) {
        console.log('[CLIMAX] Showing first cutscene for', firstTurn.characterId);
        const cutsceneData = {
          characterId: firstTurn.characterId,
          imageUrl: firstTurn.outcome.cutsceneImageUrl,
          outcomeText: firstTurn.outcome.text || '',
        };
        setSession((prev) => prev ? { ...prev, active_cutscene: cutsceneData } : null);
        await showCutscene(session.id, cutsceneData);
      }
    }

    setSubmitting(false);
  };

  /**
   * Handle dismissing climax cutscene - shows next cutscene or clears
   */
  const handleDismissClimaxCutscene = async () => {
    if (!session || !currentScene || !adventure) return;

    const climaxTurns = getActiveCharacterTurns(currentScene, players).filter(t => isAlwaysSucceedTurn(t));
    const nextIndex = climaxCutsceneIndex + 1;

    // Helper to go directly to epilogue after climax
    const goToEpilogue = async () => {
      setClimaxCutsceneIndex(0);
      setSession((prev) => prev ? { ...prev, active_cutscene: null } : null);
      await dismissCutscene(session.id);

      // Auto-advance to epilogue after climax cutscene
      if (adventure.ending) {
        setShowingEpilogue(true);
        if (adventure.ending.endingImageUrl) {
          await showCutscene(session.id, {
            characterId: 'epilogue',
            imageUrl: adventure.ending.endingImageUrl,
            outcomeText: adventure.ending.title || 'The End',
          });
        }
      }
    };

    // If video mode or we've shown all cutscenes, go to epilogue
    if (climaxPlayMode === 'video' || nextIndex >= climaxTurns.length) {
      await goToEpilogue();
      return;
    }

    // Show next cutscene
    const nextTurn = climaxTurns[nextIndex];
    if (nextTurn?.outcome?.cutsceneImageUrl) {
      const cutsceneData = {
        characterId: nextTurn.characterId,
        imageUrl: nextTurn.outcome.cutsceneImageUrl,
        outcomeText: nextTurn.outcome.text || '',
      };
      setClimaxCutsceneIndex(nextIndex);
      setSession((prev) => prev ? { ...prev, active_cutscene: cutsceneData } : null);
      await showCutscene(session.id, cutsceneData);
    } else {
      // No more cutscenes, go to epilogue
      await goToEpilogue();
    }
  };

  const handleDismissCutscene = async () => {
    if (!session || !adventure) return;
    setError(null);

    // For solo players (1 player), check if we should auto-advance
    const sessionPlayers = session.players || [];
    const isSoloPlayer = sessionPlayers.length === 1;
    let shouldAutoAdvance = false;

    if (isSoloPlayer && currentScene) {
      const scene = currentScene;
      const activeTurns = getActiveCharacterTurns(scene, sessionPlayers);
      const turnIndex = session.current_character_turn_index || 0;
      const allCharactersActed = turnIndex >= activeTurns.length;
      shouldAutoAdvance = allCharactersActed && !!scene.outcome?.nextSceneId;
    }

    if (shouldAutoAdvance) {
      // Keep cutscene visible while advancing scene to prevent flash
      // handleNextScene will dismiss the cutscene after scene is updated
      await handleNextScene();
      // Now dismiss the cutscene after scene has advanced
      setSession((prev) => prev ? { ...prev, active_cutscene: null } : null);
      await dismissCutscene(session.id);
    } else {
      // Normal flow - just dismiss the cutscene
      setSession((prev) => prev ? { ...prev, active_cutscene: null } : null);
      const { error: dismissError } = await dismissCutscene(session.id);
      if (dismissError) {
        setError(formatError(dismissError));
      }
    }
  };

  // ============================================
  // Puzzle Scene Handlers
  // ============================================

  /**
   * Handle physical puzzle success - DM confirms player completed the challenge
   */
  const handlePuzzleSuccess = async () => {
    if (!session || !currentScene || !adventure) return;

    setError(null);
    setSubmitting(true);

    const { error: puzzleError } = await completePuzzle(session.id, 'success');
    if (puzzleError) {
      setError(formatError(puzzleError));
      setSubmitting(false);
      return;
    }

    // Show success narration as cutscene if available
    const instructions = getPhysicalPuzzleInstructions(currentScene);
    if (instructions?.successNarration) {
      const character = adventure.characters[0];
      const cutsceneData = {
        characterId: character?.id ?? 'unknown',
        imageUrl: currentScene.sceneImageUrl || '',
        outcomeText: instructions.successNarration,
      };
      setSession((prev) => prev ? { ...prev, puzzle_completed: true, puzzle_outcome: 'success', active_cutscene: cutsceneData } : null);
      await showCutscene(session.id, cutsceneData);
    } else {
      // Update local state without cutscene
      setSession((prev) => prev ? { ...prev, puzzle_completed: true, puzzle_outcome: 'success' } : null);
    }
    setSubmitting(false);
  };

  /**
   * Handle physical puzzle "nice try" - DM confirms player gave effort but didn't fully succeed
   */
  const handlePuzzleFail = async () => {
    if (!session || !currentScene || !adventure) return;

    setError(null);
    setSubmitting(true);

    const { error: puzzleError } = await completePuzzle(session.id, 'fail');
    if (puzzleError) {
      setError(formatError(puzzleError));
      setSubmitting(false);
      return;
    }

    // Show fail narration as cutscene if available
    const instructions = getPhysicalPuzzleInstructions(currentScene);
    if (instructions?.failNarration) {
      const character = adventure.characters[0];
      const cutsceneData = {
        characterId: character?.id ?? 'unknown',
        imageUrl: currentScene.sceneImageUrl || '',
        outcomeText: instructions.failNarration,
      };
      setSession((prev) => prev ? { ...prev, puzzle_completed: true, puzzle_outcome: 'fail', active_cutscene: cutsceneData } : null);
      await showCutscene(session.id, cutsceneData);
    } else {
      // Update local state without cutscene
      setSession((prev) => prev ? { ...prev, puzzle_completed: true, puzzle_outcome: 'fail' } : null);
    }
    setSubmitting(false);
  };

  /**
   * Handle drag puzzle override - DM manually marks puzzle as complete when player is stuck
   */
  const handlePuzzleOverride = async () => {
    if (!session) return;

    setError(null);
    setSubmitting(true);

    const { error: puzzleError } = await completePuzzle(session.id, 'fail');
    if (puzzleError) {
      setError(formatError(puzzleError));
      setSubmitting(false);
      return;
    }

    setSession((prev) => prev ? { ...prev, puzzle_completed: true, puzzle_outcome: 'fail' } : null);
    setSubmitting(false);
  };

  /**
   * Handle starting a puzzle after DM reads narration
   */
  const handleStartPuzzle = async () => {
    if (!session) return;

    setError(null);
    setSubmitting(true);

    const { error: puzzleError } = await startPuzzle(session.id);
    if (puzzleError) {
      setError(formatError(puzzleError));
      setSubmitting(false);
      return;
    }

    // Update local state
    setSession((prev) => prev ? { ...prev, puzzle_started: true } : null);
    setSubmitting(false);
  };

  // ============================================
  // Roll-Until-Success Climax Handlers
  // ============================================

  /**
   * Handle a roll in the roll-until-success climax sequence
   */
  const handleRollUntilSuccessRoll = async (_roll: number, isMax: boolean) => {
    if (!session) return;

    const { error: rollError } = await recordClimaxRoll(session.id, isMax);
    if (rollError) {
      setError(formatError(rollError));
      return;
    }

    // Update local state
    setSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        climax_roll_count: (prev.climax_roll_count ?? 0) + 1,
        climax_fail_index: isMax ? (prev.climax_fail_index ?? 0) : (prev.climax_fail_index ?? 0) + 1,
      };
    });
  };

  /**
   * Handle victory in roll-until-success climax
   */
  const handleRollUntilSuccessVictory = async () => {
    if (!session || !currentScene) return;

    setError(null);
    setSubmitting(true);

    // Show victory cutscene/video
    if (currentScene.climaxVideoUrl) {
      const cutsceneData = {
        characterId: 'climax-victory',
        imageUrl: currentScene.climaxVideoUrl,
        outcomeText: currentScene.climaxInstructions?.successNarration || 'Victory!',
      };
      setSession((prev) => prev ? { ...prev, active_cutscene: cutsceneData } : null);
      await showCutscene(session.id, cutsceneData);
    }

    // Submit the climax "turn" as complete
    const climaxTurns = getActiveCharacterTurns(currentScene, players);
    if (climaxTurns.length > 0) {
      const turn = climaxTurns[0];
      await submitCharacterChoice(
        session.id,
        turn.characterId,
        'climax-victory',
        session.dice_type ?? DEFAULT_DICE_TYPE,
        1
      );
    }

    setSubmitting(false);
  };

  const handleShowEpilogue = async () => {
    if (!session || !adventure?.ending) return;
    setError(null);
    setShowingEpilogue(true);

    // Show the ending image on the player screen using the cutscene mechanism
    if (adventure.ending.endingImageUrl) {
      const { error: cutsceneError } = await showCutscene(session.id, {
        characterId: 'epilogue',
        imageUrl: adventure.ending.endingImageUrl,
        outcomeText: adventure.ending.title || 'The End',
      });
      if (cutsceneError) {
        console.error('Failed to show epilogue image:', cutsceneError);
      }
    }
  };

  const handleNextScene = async () => {
    if (!session || !currentScene || !adventure) return;

    setError(null);
    setAdvancing(true);

    const outcome = currentScene.outcome;

    // Check if this is a branching outcome (characters go to different scenes)
    if (outcome && isBranchingOutcome(outcome)) {
      // Initialize character scene states for parallel scenes
      const characterScenes = initializeCharacterScenes(currentScene, session.players || []);

      if (characterScenes.length > 0) {
        const { error: splitError } = await splitParty(session.id, characterScenes);
        setAdvancing(false);
        if (splitError) {
          setError(formatError(splitError));
          return;
        }
        // Update local state to reflect split
        setSession((prev) => prev ? {
          ...prev,
          is_split: true,
          character_scenes: characterScenes,
          current_scene_id: characterScenes[0]?.sceneId ?? null,
        } : null);
        return;
      }
    }

    // If in split mode, advance each character to their next scene
    if (isSplit && session.character_scenes && session.character_scenes.length > 0) {
      // Calculate the next scene for each character based on their current scene
      const updatedCharacterScenes: typeof session.character_scenes = [];
      const nextSceneIds = new Set<string>();

      for (const cs of session.character_scenes) {
        const charScene = getSceneById(adventure, cs.sceneId);
        const nextId = charScene?.outcome?.nextSceneId;

        if (typeof nextId === 'string') {
          nextSceneIds.add(nextId);
          updatedCharacterScenes.push({
            ...cs,
            sceneId: nextId,
            turnIndex: 0,
            choices: [],
          });
        }
      }

      // Check if all characters are going to the same scene (reunion)
      if (nextSceneIds.size === 1) {
        const reunionSceneId = [...nextSceneIds][0];
        const reunionScene = getSceneById(adventure, reunionSceneId);

        // If the reunion scene is NOT a parallel scene, reunite the party
        if (reunionScene && !reunionScene.isParallelScene) {
          const { error: reuniteError } = await reuniteParty(
            session.id,
            reunionSceneId,
            reunionScene.sceneNumber
          );
          setAdvancing(false);
          if (reuniteError) {
            setError(formatError(reuniteError));
            return;
          }
          setSession((prev) => prev ? {
            ...prev,
            is_split: false,
            character_scenes: null,
            current_scene: reunionScene.sceneNumber,
            current_scene_id: reunionSceneId,
            current_character_turn_index: 0,
            scene_choices: [],
          } : null);
          return;
        }
      }

      // Still in parallel mode - update character scenes to next level
      if (updatedCharacterScenes.length > 0) {
        const { error: splitError } = await splitParty(session.id, updatedCharacterScenes);
        setAdvancing(false);
        if (splitError) {
          setError(formatError(splitError));
          return;
        }
        setSession((prev) => prev ? {
          ...prev,
          character_scenes: updatedCharacterScenes,
          current_scene_id: updatedCharacterScenes[0]?.sceneId ?? null,
        } : null);
        return;
      }
    }

    // Standard scene transition (single nextSceneId or end of adventure)
    let nextSceneNumber: number | null = null;
    let nextSceneId: string | null = null;

    if (outcome?.nextSceneId && typeof outcome.nextSceneId === 'string') {
      const nextScene = getSceneById(adventure, outcome.nextSceneId);
      nextSceneNumber = nextScene?.sceneNumber ?? null;
      nextSceneId = outcome.nextSceneId;
    }

    // Use scene ID-based navigation if available, otherwise fall back to legacy
    if (nextSceneId && nextSceneNumber !== null) {
      // Reset puzzle state when advancing to a new scene
      await resetPuzzleState(session.id);

      const { error: advanceError } = await startSceneById(session.id, nextSceneId, nextSceneNumber);
      setAdvancing(false);
      if (advanceError) {
        setError(formatError(advanceError));
        return;
      }
      setSession((prev) => prev ? {
        ...prev,
        current_scene: nextSceneNumber!,
        current_scene_id: nextSceneId,
        current_character_turn_index: 0,
        scene_choices: [],
        is_split: false,
        character_scenes: undefined,
        puzzle_started: null,
        puzzle_completed: null,
        puzzle_outcome: null,
      } : null);
    } else {
      // End of adventure or legacy navigation
      const { error: advanceError } = await advanceToNextScene(session.id, nextSceneNumber);
      setAdvancing(false);
      if (advanceError) {
        setError(formatError(advanceError));
        return;
      }
      if (nextSceneNumber === null) {
        // End of adventure - dismiss any active cutscene and reset epilogue state
        if (session.active_cutscene) {
          await dismissCutscene(session.id);
        }
        setShowingEpilogue(false);
        setClimaxPlayMode(null);
        setSession((prev) => prev ? { ...prev, phase: GAME_PHASES.COMPLETE, active_cutscene: null } : null);
      }
    }
  };

  const handleFeedbackSubmit = async (feedback: { rating: number; positive?: string; negative?: string; notes?: string }) => {
    if (!session) return;
    setError(null);
    const { error: feedbackError } = await submitSessionFeedback(session.id, feedback);
    if (feedbackError) {
      setError(formatError(feedbackError));
      throw feedbackError;
    }
    const { error: resetError } = await resetSessionForNewAdventure(session.id);
    if (resetError) {
      setError(formatError(resetError));
      throw resetError;
    }
    setSession((prev) => prev ? { ...prev, phase: GAME_PHASES.SETUP, adventure_id: null, players: [] } : null);
    setAssignmentStep('kids');
    setKidNames(['', '']);
    setPlayerAssignments([]);
    setCelebratedSceneIds([]);
    setCelebratedEnding(false);
    setClimaxPlayMode(null);
  };

  const handleRecoverSession = async () => {
    setError(null);
    const { session: recoveredSession, error: recoverError } = await recoverSession();
    if (recoverError) {
      setError(recoverError === 'No saved session found'
        ? recoverError
        : 'Could not recover session. Please create a new one.');
      return;
    }
    if (recoveredSession) {
      setSession(recoveredSession);
    }
  };

  // Render logic based on game state
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 text-center">DM Console</h1>
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <ConnectionStatus status={connectionStatus} pendingOps={pendingOpsCount} />
            {storedSession && storedSession.room_code && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
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
            <button
              onClick={handleCreateSession}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Create Session
            </button>
            {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          </div>
        </div>
      </div>
    );
  }

  // Feedback form (after adventure ends, phase complete)
  if (session.phase === GAME_PHASES.COMPLETE) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 text-center">DM Console</h1>
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <ConnectionStatus status={connectionStatus} pendingOps={pendingOpsCount} />
            <RoomCode code={session.room_code} />
            <FeedbackForm
              onSubmit={handleFeedbackSubmit}
            />
            {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          </div>
        </div>
      </div>
    );
  }

  // Session exists but no adventure loaded — adventure selection screen
  if (!adventure) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 text-center">DM Console</h1>
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <ConnectionStatus status={connectionStatus} pendingOps={pendingOpsCount} />
            <RoomCode code={session.room_code} />
            <AdventureSelectPage
              adventures={availableAdventures}
              onSelect={(id) => loadAdventureById(id)}
              loading={loadingAdventure}
            />
            {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          </div>
        </div>
      </div>
    );
  }

  // Adventure loaded but no players (Setup Players)
  const players = session.players || [];
  if (players.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 text-center">DM Console</h1>
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <ConnectionStatus status={connectionStatus} pendingOps={pendingOpsCount} />
            <RoomCode code={session.room_code} />
            <h2 className="text-lg font-semibold">Setup Players</h2>

            {assignmentStep === 'kids' ? (
              <div className="space-y-4">
                {/* Solo adventures (1 character) only allow 1 player */}
                {adventure.characters.length === 1 ? (
                  <>
                    <p className="text-sm text-gray-600">Enter player name.</p>
                    <input
                      type="text"
                      value={kidNames[0] || ''}
                      onChange={(e) => setKidNames([e.target.value])}
                      placeholder="Player name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">Enter kid names (1–{adventure.characters.length} players).</p>
                    {kidNames.map((name, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => {
                            const next = [...kidNames];
                            next[i] = e.target.value;
                            setKidNames(next);
                          }}
                          placeholder={`Kid ${i + 1}`}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {kidNames.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setKidNames(kidNames.filter((_, j) => j !== i))}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    {kidNames.length < adventure.characters.length && (
                      <button
                        type="button"
                        onClick={() => setKidNames([...kidNames, ''])}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        + Add kid
                      </button>
                    )}
                  </>
                )}

                {/* Dice type selector */}
                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dice Type
                  </label>
                  <div className="flex gap-2">
                    {DICE_TYPES.map((dt) => (
                      <button
                        key={dt}
                        type="button"
                        onClick={() => setSelectedDiceType(dt)}
                        className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                          selectedDiceType === dt
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        d{dt}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose the dice your family will use for rolls.
                  </p>
                </div>

                <button
                  onClick={handleKidsNext}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Next
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-gray-900">Choose Your Hero</h2>
                  <p className="text-sm text-gray-600">Assign each player to a unique character role.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {adventure.characters.map((char) => {
                    const getIntro = () =>
                      adventure.prologue?.characterIntros?.find(c => c.characterId === char.id)?.introText
                      ?? char.description
                      ?? '';

                    const assignedPlayer = playerAssignments.find(p => p.characterId === char.id);
                    const assignedKidName = assignedPlayer?.kidName || null;
                    const colors = getCharacterColorClasses(char);
                    const isAssigned = !!assignedKidName;

                    // Helper to check if a player is already assigned to a DIFFERENT character
                    const isPlayerTaken = (kidName: string) => {
                      return playerAssignments.some(
                        (pa) => pa.kidName === kidName && pa.characterId !== '' && pa.characterId !== char.id
                      );
                    };

                    return (
                      <div
                        key={char.id}
                        className={`
                          relative flex flex-col h-full rounded-2xl border-2 transition-all duration-200
                          ${isAssigned
                            ? 'ring-4 ring-offset-2 ring-indigo-500/20 border-indigo-500 shadow-lg'
                            : 'border-slate-200 hover:border-slate-300 shadow-sm'
                          }
                          bg-white overflow-hidden
                        `}
                      >
                        {/* Card Header & Content */}
                        <div className={`p-6 flex-1 space-y-4 ${colors.bg} bg-opacity-40`}>
                          <div className="flex items-start justify-between">
                            <div className={`p-3 bg-white rounded-xl shadow-sm ${colors.accent}`}>
                              {getCharacterIcon(char)}
                            </div>
                            {isAssigned && (
                              <div className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                SELECTED
                              </div>
                            )}
                          </div>

                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{char.name}</h3>
                            <p className="text-gray-600 text-sm mt-2 leading-relaxed">
                              {getIntro()}
                            </p>
                          </div>
                        </div>

                        {/* Selection Area */}
                        <div className="p-4 bg-white border-t border-slate-100">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                            Played By
                          </p>
                          <div className="space-y-2">
                            {playerAssignments.map((player) => {
                              const isTaken = isPlayerTaken(player.kidName);
                              const isSelected = assignedKidName === player.kidName;

                              return (
                                <button
                                  key={player.kidName}
                                  type="button"
                                  onClick={() => !isTaken && handleCharacterSelect(char.id, player.kidName)}
                                  disabled={isTaken}
                                  className={`
                                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                                    ${isSelected
                                      ? 'bg-indigo-600 text-white shadow-md'
                                      : isTaken
                                        ? 'bg-slate-50 text-slate-300 cursor-not-allowed decoration-slate-300'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                    }
                                  `}
                                >
                                  <User className={`w-4 h-4 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`} />
                                  <span className={isTaken ? 'line-through' : ''}>
                                    {player.kidName}
                                  </span>
                                  {isTaken && <span className="ml-auto text-xs text-slate-400">(Taken)</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Action Footer */}
                <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={handleStartAdventure}
                    disabled={!playerAssignments.every(p => p.characterId)}
                    className={`
                      w-full px-8 py-3 rounded-xl font-bold text-lg transition-all
                      ${playerAssignments.every(p => p.characterId)
                        ? 'bg-slate-900 text-white shadow-xl hover:translate-y-[-2px]'
                        : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      }
                    `}
                  >
                    Start Adventure
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAssignmentStep('kids'); setPlayerAssignments([]); }}
                    className="w-full text-gray-600 hover:underline text-sm"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          </div>
        </div>
      </div>
    );
  }

  // Prologue: phase prologue, before Scene 1
  if (session.phase === GAME_PHASES.PROLOGUE && adventure) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex justify-between items-center">
            <ConnectionStatus status={connectionStatus} pendingOps={pendingOpsCount} />
            <RoomCode code={session.room_code} />
          </div>
          <ProloguePage
            adventure={adventure}
            onStart={handlePrologueStart}
            disabled={advancing}
          />
          {advancing && (
            <div className="text-center text-gray-600 flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-500" />
              Starting...
            </div>
          )}
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
        </div>
      </div>
    );
  }

  // Game is playing - show current state
  // For parallel scenes, check if all characters in THIS branch have acted
  const allActed = computeAllActed(session, currentScene, isSplit, activeCharacterScene);

  // Find all parallel scenes at the current level and check their completion status
  const parallelSceneStatus = computeParallelSceneStatus(adventure, session, isSplit);

  // Handler to switch to next incomplete parallel scene
  const handleSwitchToNextParallelScene = async () => {
    if (!session || !parallelSceneStatus.nextIncompleteSceneId) return;

    // Find the character for the next incomplete scene
    const nextCharScene = session.character_scenes?.find(
      cs => cs.sceneId === parallelSceneStatus.nextIncompleteSceneId
    );

    if (nextCharScene) {
      setSelectedParallelCharacterId(nextCharScene.characterId);
      await setActiveParallelScene(session.id, parallelSceneStatus.nextIncompleteSceneId);
    }
  };
  const sceneRewards = allActed && currentScene?.outcome?.rewards;
  const showSceneCelebration = !!(
    sceneRewards &&
    sceneRewards.length > 0 &&
    currentScene &&
    !celebratedSceneIds.includes(currentScene.id)
  );
  const isLastScene = !!currentScene && !currentScene.outcome?.nextSceneId;
  const ending = adventure ? calculateEnding(adventure, session.success_count ?? 0) : null;
  const endingRewards = ending?.rewards;
  const showEndingCelebration = !!(
    allActed &&
    isLastScene &&
    endingRewards &&
    endingRewards.length > 0 &&
    !celebratedEnding &&
    !showSceneCelebration
  );

  // Debug logging for rewards (only when playing)
  debugLog('rewards', 'DMPage reward state', {
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

  return (
    <>
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
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 text-center">DM Console</h1>
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <ConnectionStatus status={connectionStatus} pendingOps={pendingOpsCount} />
              <RoomCode code={session.room_code} />
            </div>
            <span className="text-xs text-gray-500 tabular-nums" title="Cumulative successful rolls (parent-only)">
              Successes: {session.success_count ?? 0}
            </span>
          </div>

          {/* Parallel Scene Selector - shown when party is split */}
          {isSplit && session.character_scenes && session.character_scenes.length > 1 && (() => {
            // Group characters by scene
            const uniqueScenes = Array.from(groupCharacterScenesBySceneId(session.character_scenes).entries());

            return (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-purple-900 mb-3">Party Split - Select Path</p>
                <div className="flex flex-wrap gap-2">
                  {uniqueScenes.map(([sceneId, charactersInScene]) => {
                    const scene = getSceneById(adventure, sceneId);
                    const isActive = activeCharacterScene?.sceneId === sceneId;
                    const isComplete = isParallelSceneComplete(adventure, session, sceneId);

                    // Get kid names for all characters in this scene
                    const characterNames = charactersInScene.map(cs => {
                      const character = adventure.characters.find(c => c.id === cs.characterId);
                      return getKidDisplayName(players, cs.characterId, character?.name);
                    });

                    return (
                      <button
                        key={sceneId}
                        onClick={async () => {
                          // Select the first character in this scene
                          const firstChar = charactersInScene[0];
                          if (firstChar) {
                            setSelectedParallelCharacterId(firstChar.characterId);
                            await setActiveParallelScene(session.id, sceneId);
                          }
                        }}
                        className={`
                          flex-1 min-w-[120px] px-3 py-2 rounded-lg text-sm font-medium transition-colors
                          ${isActive
                            ? 'bg-purple-600 text-white shadow-md'
                            : isComplete
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-white text-purple-700 border border-purple-300 hover:bg-purple-100'
                          }
                        `}
                      >
                        <div className="text-center">
                          <div className="font-semibold flex items-center justify-center gap-1">
                            {isComplete && <CheckCircle2 className="w-4 h-4" />}
                            {characterNames.join(' & ')}
                          </div>
                          {scene?.title && (
                            <div className={`text-xs mt-0.5 ${isActive ? 'text-purple-200' : isComplete ? 'text-green-600' : 'text-purple-500'}`}>
                              {scene.title}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Scene Narration */}
          {currentScene && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h2 className="text-sm font-semibold text-blue-900 mb-2">Narration</h2>
              <p className="text-base text-blue-800 leading-relaxed">{currentScene.narrationText || 'No narration text'}</p>
            </div>
          )}

          {/* BUG-2 fix: Outcomes shown progressively (immediate per-kid). No batched Reveal. */}
          {currentScene && session.scene_choices && session.scene_choices.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Outcomes</h2>
              {session.scene_choices?.map((sceneChoice, index) => {
                const character = adventure.characters.find(c => c.id === sceneChoice.characterId);
                const characterTurn = currentScene.characterTurns.find(ct => ct.characterId === sceneChoice.characterId);
                if (!character || !characterTurn) return null;

                // Handle alwaysSucceed (climax) turns differently
                const isClimaxTurn = isAlwaysSucceedTurn(characterTurn);
                const choice = !isClimaxTurn && characterTurn.choices
                  ? characterTurn.choices.find(c => c.id === sceneChoice.choiceId) ?? null
                  : null;

                // For regular turns, require a valid choice
                if (!isClimaxTurn && !choice) return null;
                if (!isClimaxTurn && !sceneChoice.roll) return null;

                // Get outcome - climax turns use turn.outcome directly, others check success/fail
                const outcome = resolveSceneChoiceOutcome(
                  characterTurn,
                  sceneChoice,
                  session.dice_type || 20,
                  choice,
                  isClimaxTurn
                );
                const kidName = getKidDisplayName(players, sceneChoice.characterId, character.name);

                return (
                  <div key={index} className={`p-3 rounded-lg ${isClimaxTurn ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <PlaceholderImage
                        variant="character"
                        label={character.name}
                        className="w-10 h-10 flex-shrink-0"
                      />
                      <p className="font-semibold">{kidName} ({character.name})</p>
                      {isClimaxTurn && (
                        <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">CLIMAX</span>
                      )}
                    </div>
                    {!isClimaxTurn && choice && (
                      <>
                        <p className="text-sm text-gray-600">Chose: {choice.label}</p>
                        <p className="text-sm text-gray-600">Rolled: {sceneChoice.roll}</p>
                      </>
                    )}
                    <p className="mt-2 flex items-start gap-2">
                      <AnimationIndicator animationKey={outcome?.animationKey} className="mt-0.5 flex-shrink-0" />
                      <span>{outcome?.text ?? 'Outcome pending...'}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cutscene Active Indicator - shown regardless of scene choices */}
          {(() => {
            if (session.active_cutscene) {
              console.log('%c[DISMISS] Cutscene IS active - button should show', 'color: lime; font-weight: bold; font-size: 14px', {
                currentSceneId: currentScene?.id,
                cutsceneCharacter: session.active_cutscene.characterId,
                imageUrl: session.active_cutscene.imageUrl,
              });
            } else {
              console.log('[DISMISS] No active cutscene', { currentSceneId: currentScene?.id });
            }
            return null;
          })()}
          {currentScene && session.active_cutscene && (() => {
            const isClimaxScene = currentScene.isClimax;
            const allClimaxTurns = isClimaxScene ? getActiveCharacterTurns(currentScene, players).filter(t => isAlwaysSucceedTurn(t)) : [];
            const isVideoMode = climaxPlayMode === 'video';
            const showingClimaxCutscene = isClimaxScene && !isVideoMode && allClimaxTurns.length > 1;
            const cutsceneNumber = showingClimaxCutscene ? climaxCutsceneIndex + 1 : 0;
            const totalCutscenes = showingClimaxCutscene ? allClimaxTurns.length : 0;
            const isSoloAdventure = players.length === 1;

            // For solo adventures, button says "Next Scene" since it auto-advances
            const buttonText = showingClimaxCutscene && cutsceneNumber < totalCutscenes
              ? 'Next Cutscene'
              : isSoloAdventure
                ? 'Next Scene'
                : 'Dismiss';

            return (
              <div className="bg-purple-50 border-2 border-purple-300 p-4 rounded-lg space-y-3 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
                  <p className="font-semibold text-purple-900">
                    {isVideoMode ? 'Video playing on kids\' screen' : 'Cutscene showing on kids\' screen'}
                    {showingClimaxCutscene && ` (${cutsceneNumber}/${totalCutscenes})`}
                  </p>
                </div>
                <p className="text-sm text-purple-800">{session.active_cutscene.outcomeText}</p>
                {session.active_cutscene.reward && (
                  <p className="text-sm text-purple-700">
                    Reward: <span className="font-medium">{session.active_cutscene.reward.name}</span>
                  </p>
                )}
                <button
                  onClick={isClimaxScene ? handleDismissClimaxCutscene : handleDismissCutscene}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                >
                  {buttonText}
                </button>
              </div>
            );
          })()}

          {/* Scene outcome + Next/End only when all have acted */}
          {/* For solo adventures, hide this when cutscene is showing (cutscene button handles advance) */}
          {currentScene && allActed && !showingEpilogue && !(players.length === 1 && session.active_cutscene) && (
            <>
              {currentScene.outcome && renderSceneOutcome(currentScene.outcome)}
              {isLastScene ? (
                // Last scene - show "End Adventure" button to go to epilogue
                <button
                  onClick={handleShowEpilogue}
                  className="w-full mt-4 bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  End Adventure
                </button>
              ) : isSplit && !parallelSceneStatus.allComplete ? (
                // Still have incomplete parallel scenes - switch to next one
                <button
                  onClick={handleSwitchToNextParallelScene}
                  disabled={advancing}
                  className="w-full mt-4 bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Next Path
                </button>
              ) : (
                // All parallel scenes complete (or not split) - proceed to next scene
                <button
                  onClick={handleNextScene}
                  disabled={advancing}
                  className="w-full mt-4 bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {advancing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Advancing...
                    </span>
                  ) : (
                    'Next Scene'
                  )}
                </button>
              )}
            </>
          )}

          {/* Epilogue display - shown after DM clicks "End Adventure" */}
          {currentScene && showingEpilogue && (
            <EndingPage
              adventure={adventure}
              session={session}
              hideImage={true}
              actions={
                <div className="mt-4">
                  <button
                    onClick={handleNextScene}
                    disabled={advancing}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {advancing ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Ending...
                      </span>
                    ) : (
                      'End Adventure'
                    )}
                  </button>
                </div>
              }
            />
          )}

          {/* Puzzle Scene UI - Start Button (shown before puzzle_started) */}
          {currentScene && isPuzzleScene(currentScene) && (() => {
            console.log('[PUZZLE DEBUG]', {
              sceneType: currentScene.sceneType,
              puzzle_started: session.puzzle_started,
              puzzle_completed: session.puzzle_completed,
              active_cutscene: session.active_cutscene?.characterId,
            });
            return null;
          })()}
          {currentScene && isPuzzleScene(currentScene) && !session.puzzle_started && !session.puzzle_completed && !session.active_cutscene && (
            <div className="space-y-4">
              <div className="bg-purple-50 border-2 border-purple-300 p-4 rounded-lg">
                <p className="text-sm text-purple-600 mb-2">Read the narration above, then start the challenge:</p>
                <button
                  onClick={handleStartPuzzle}
                  disabled={submitting}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white py-4 px-4 rounded-lg font-bold text-lg transition-colors"
                >
                  {submitting ? 'Starting...' : 'Start Challenge'}
                </button>
              </div>
            </div>
          )}

          {/* Puzzle Scene UI - Physical (shown after puzzle_started) */}
          {currentScene && isPuzzleScene(currentScene) && isPhysicalPuzzle(currentScene) && session.puzzle_started && !session.puzzle_completed && !session.active_cutscene && (() => {
            const instructions = getPhysicalPuzzleInstructions(currentScene);
            if (!instructions) return null;

            // For solo adventures, get the first character; for multiplayer, get current turn character
            const character = adventure.characters[0];
            const kidName = players[0]?.kidName || character?.name || 'Player';

            return (
              <PhysicalPuzzleDMControls
                instructions={instructions}
                kidName={kidName}
                characterName={character?.name || 'Unknown'}
                onSuccess={handlePuzzleSuccess}
                onFail={handlePuzzleFail}
                disabled={submitting}
              />
            );
          })()}

          {/* Puzzle Scene UI - Drag (shown after puzzle_started) */}
          {currentScene && isPuzzleScene(currentScene) && isDragPuzzle(currentScene) && session.puzzle_started && !session.active_cutscene && (() => {
            const instructions = getDragPuzzleInstructions(currentScene);
            if (!instructions) return null;

            const character = adventure.characters[0];
            const kidName = players[0]?.kidName || character?.name || 'Player';

            return (
              <DragPuzzleDMControls
                instructions={instructions}
                kidName={kidName}
                characterName={character?.name || 'Unknown'}
                session={session}
                onOverrideComplete={handlePuzzleOverride}
                disabled={submitting}
              />
            );
          })()}

          {/* Puzzle Scene UI - Seeker's Lens (shown after puzzle_started) */}
          {currentScene && isPuzzleScene(currentScene) && isSeekerLensPuzzle(currentScene) && session.puzzle_started && !session.active_cutscene && (() => {
            const instructions = getSeekerLensInstructions(currentScene);
            if (!instructions) return null;

            const character = adventure.characters[0];
            const kidName = players[0]?.kidName || character?.name || 'Player';

            return (
              <SeekerLensDMControls
                instructions={instructions}
                kidName={kidName}
                characterName={character?.name || 'Unknown'}
                session={session}
                onOverrideComplete={handlePuzzleOverride}
                disabled={submitting}
              />
            );
          })()}

          {/* Puzzle Scene - Next Scene button after completion */}
          {currentScene && isPuzzleScene(currentScene) && session.puzzle_completed && !session.active_cutscene && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${session.puzzle_outcome === 'success' ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                <p className="font-semibold" style={{ color: session.puzzle_outcome === 'success' ? '#166534' : '#c2410c' }}>
                  {session.puzzle_outcome === 'success' ? 'Challenge Complete!' : 'Nice effort!'}
                </p>
              </div>
              <button
                onClick={handleNextScene}
                disabled={advancing}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {advancing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Advancing...
                  </span>
                ) : (
                  'Next Scene'
                )}
              </button>
            </div>
          )}

          {/* Roll-Until-Success Climax UI */}
          {currentScene && isRollUntilSuccessClimax(currentScene) && currentScene.climaxInstructions && !session.active_cutscene && (() => {
            const character = adventure.characters[0];
            const kidName = players[0]?.kidName || character?.name || 'Player';
            const diceType = (session.dice_type ?? DEFAULT_DICE_TYPE) as DiceType;

            return (
              <RollUntilSuccessControls
                instructions={currentScene.climaxInstructions}
                kidName={kidName}
                characterName={character?.name || 'Unknown'}
                diceType={diceType}
                session={session}
                onRollSubmit={handleRollUntilSuccessRoll}
                onVictory={handleRollUntilSuccessVictory}
                disabled={submitting}
              />
            );
          })()}

          {/* Character Turn UI - Standard scenes only */}
          {!allActed && currentCharacterTurn && currentScene && !session.active_cutscene && !isPuzzleScene(currentScene) && !isRollUntilSuccessClimax(currentScene) && (
            <div className="space-y-4">
              {(() => {
                const character = adventure.characters.find(c => c.id === currentCharacterTurn.characterId);
                const kidName = getKidDisplayName(players, currentCharacterTurn.characterId, character?.name);
                const turnIndex = isSplit && activeCharacterScene
                  ? activeCharacterScene.turnIndex || 0
                  : session.current_character_turn_index || 0;
                const activeTurns = getActiveCharacterTurns(currentScene, players);
                const totalTurns = activeTurns.length;
                const prompt = `${kidName} (${character?.name ?? 'Unknown'}), ${currentCharacterTurn.promptText}`;
                const isClimaxTurn = isAlwaysSucceedTurn(currentCharacterTurn);

                // For climax turns, show unified UI with all character prompts and single GO button
                if (isClimaxTurn) {
                  const hasVideoOption = !!currentScene.climaxVideoUrl;
                  const allClimaxTurns = activeTurns.filter(t => isAlwaysSucceedTurn(t));

                  // Mode selector - show first if we haven't chosen yet
                  if (hasVideoOption && climaxPlayMode === null) {
                    return (
                      <>
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-3 rounded-lg text-center">
                          <p className="font-bold text-lg">⚡ CLIMAX ⚡</p>
                        </div>

                        <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-lg space-y-4">
                          <p className="text-lg font-bold text-amber-900 text-center">How do you want to show the finale?</p>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => setClimaxPlayMode('cutscenes')}
                              className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-amber-200 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-colors"
                            >
                              <span className="text-3xl">🖼️</span>
                              <span className="font-semibold text-amber-900">Play Cutscenes</span>
                              <span className="text-xs text-amber-700 text-center">Show 3 images one at a time</span>
                            </button>
                            <button
                              onClick={() => setClimaxPlayMode('video')}
                              className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-amber-200 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-colors"
                            >
                              <span className="text-3xl">🎬</span>
                              <span className="font-semibold text-amber-900">Play Video</span>
                              <span className="text-xs text-amber-700 text-center">Play animated sequence</span>
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  }

                  // Unified climax UI - show all character prompts at once
                  return (
                    <>
                      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-3 rounded-lg text-center">
                        <p className="font-bold text-lg">⚡ CLIMAX ⚡</p>
                      </div>

                      {/* Instructions */}
                      <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                        <p className="text-sm text-purple-800 font-medium text-center">
                          Have ALL players roll together! Wait for someone to roll a 6, then press GO!
                        </p>
                      </div>

                      {/* All character prompts */}
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-gray-700">Read aloud to players:</p>
                        {allClimaxTurns.map((climaxTurn) => {
                          const char = adventure.characters.find(c => c.id === climaxTurn.characterId);
                          const kid = getKidDisplayName(players, climaxTurn.characterId, char?.name);
                          return (
                            <div key={climaxTurn.characterId} className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                              <p className="font-bold text-amber-900">{kid} ({char?.name}):</p>
                              <p className="text-amber-800 mt-1">{climaxTurn.promptText}</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Single GO button */}
                      <button
                        onClick={handleSubmitClimaxAll}
                        disabled={submitting}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 px-4 rounded-lg font-bold text-xl hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                      >
                        {submitting ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                            GO!
                          </span>
                        ) : (
                          '⚡ GO! ⚡'
                        )}
                      </button>

                      {climaxPlayMode && (
                        <p className="text-xs text-center text-gray-500">
                          Mode: {climaxPlayMode === 'video' ? '🎬 Video' : '🖼️ Cutscenes'}
                        </p>
                      )}
                    </>
                  );
                }

                // Standard turn with choices and dice roll
                // Get threshold - either from turn level or will be shown per-choice
                // Scale threshold based on dice type (thresholds are written for d20)
                const diceType = session.dice_type ?? DEFAULT_DICE_TYPE;
                const { scaleThreshold, label: diceLabel, rollPrompt } = getDiceScaleHelpers(diceType);
                const turnLevelThreshold = currentCharacterTurn.successThreshold;
                const scaledTurnThreshold = turnLevelThreshold !== undefined ? scaleThreshold(turnLevelThreshold) : undefined;

                // Debug logging for threshold display
                console.log('[THRESHOLD DEBUG]', {
                  turnLevelThreshold,
                  scaledTurnThreshold,
                  diceType,
                  turnHasChoices: currentCharacterTurn.choices?.length,
                  characterId: currentCharacterTurn.characterId,
                  fullTurn: currentCharacterTurn,
                });

                return (
                  <>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <p className="text-sm text-yellow-800 mb-1">Turn {turnIndex + 1} of {totalTurns}</p>
                      <p className="text-base font-medium text-yellow-900 mt-2">{prompt}</p>
                    </div>

                    {currentCharacterTurn.choices && currentCharacterTurn.choices.length > 0 && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Choose an action:</label>
                        {scaledTurnThreshold !== undefined && (
                          <p className="text-xs text-gray-500">Success on {scaledTurnThreshold}+</p>
                        )}
                        {currentCharacterTurn.choices.map((choice) => {
                          const choiceThreshold = choice.successThreshold;
                          const scaledChoiceThreshold = choiceThreshold !== undefined ? scaleThreshold(choiceThreshold) : undefined;
                          return (
                            <button
                              key={choice.id}
                              onClick={() => setSelectedChoice(choice)}
                              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                                selectedChoice?.id === choice.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <p className="font-medium">{choice.label}</p>
                              {scaledChoiceThreshold !== undefined && scaledTurnThreshold === undefined && (
                                <p className="text-xs text-gray-500 mt-1">Success on {scaledChoiceThreshold}+</p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex flex-wrap items-end gap-4">
                      <div className="flex-1 min-w-[140px]">
                        <label htmlFor="diceRoll" className="block text-sm font-medium text-gray-700 mb-2">
                          {diceLabel}
                        </label>
                        <input
                          id="diceRoll"
                          type="number"
                          min="1"
                          max={session.dice_type ?? DEFAULT_DICE_TYPE}
                          value={diceRoll}
                          onChange={(e) => setDiceRoll(e.target.value)}
                          placeholder="Enter roll"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-500">{rollPrompt}</span>
                        <DiceRoller
                          onRoll={(v) => setDiceRoll(String(v))}
                          disabled={submitting}
                          min={1}
                          max={session.dice_type ?? DEFAULT_DICE_TYPE}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSubmitChoice}
                      disabled={!selectedChoice || !diceRoll.trim() || submitting}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                          Submitting...
                        </span>
                      ) : (
                        'Submit Choice'
                      )}
                    </button>
                  </>
                );
              })()}
            </div>
          )}

          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
        </div>
      </div>
    </div>
    </>
  );
}
