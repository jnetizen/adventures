import { useState, useCallback } from 'react';
import { Shield, Zap, Heart, User, CheckCircle2, Sparkles, Snowflake, Leaf } from 'lucide-react';
import { createSession, startAdventure, startScene, submitCharacterChoice, advanceToNextScene, submitSessionFeedback, resetSessionForNewAdventure, showCutscene, dismissCutscene, collectReward } from '../lib/gameState';
import { formatError } from '../lib/errorRecovery';
import { getCurrentScene, getCurrentCharacterTurn, getActiveCharacterTurns, getPlayerForCharacter, calculateChoiceOutcome, allCharactersActed, getAdventureList, calculateEnding, hasPerTurnOutcomes, getTurnOutcome, getSuccessThreshold } from '../lib/adventures';
import { debugLog } from '../lib/debugLog';
import { GAME_PHASES, CONNECTION_STATUS, type ConnectionStatusType } from '../constants/game';
import type { GameSession, Player, DiceType } from '../types/game';
import { DICE_TYPES, DEFAULT_DICE_TYPE } from '../types/game';
import type { Choice, Character } from '../types/adventure';
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
  const [advancing, setAdvancing] = useState(false);
  const [celebratedSceneIds, setCelebratedSceneIds] = useState<string[]>([]);
  const [celebratedEnding, setCelebratedEnding] = useState(false);

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

  // Debug logging for phase transitions (called on every render in dev only)
  debugLog('phase', 'DMPage render', {
    hasSession: !!session,
    phase: session?.phase,
    adventureId: session?.adventure_id,
    currentScene: session?.current_scene,
    successCount: session?.success_count,
    diceType: session?.dice_type,
  });

  // Compute derived state (currentScene and currentCharacterTurn) from session and adventure
  const currentScene = session && adventure 
    ? getCurrentScene(adventure, session.current_scene)
    : null;

  const currentCharacterTurn = (() => {
    if (!session || !adventure || !currentScene) return null;
    const players = session.players || [];
    if (session.phase === GAME_PHASES.PLAYING && players.length > 0) {
      const turnIndex = session.current_character_turn_index || 0;
      return getCurrentCharacterTurn(currentScene, turnIndex, players);
    }
    return null;
  })();

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
  };

  const loadAdventureById = (adventureId: string) => {
    if (!session) return;
    setError(null);
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
    if (!session || !currentCharacterTurn || !selectedChoice || !diceRoll.trim()) {
      setError('Please select a choice and enter a dice roll');
      return;
    }

    const roll = parseInt(diceRoll, 10);
    const maxRoll = session.dice_type ?? DEFAULT_DICE_TYPE;
    if (isNaN(roll) || roll < 1 || roll > maxRoll) {
      setError(`Dice roll must be between 1 and ${maxRoll}`);
      return;
    }

    // Get the success threshold (from turn or choice level)
    const threshold = getSuccessThreshold(currentCharacterTurn, selectedChoice);

    setError(null);
    setSubmitting(true);
    const { error: submitError } = await submitCharacterChoice(
      session.id,
      currentCharacterTurn.characterId,
      selectedChoice.id,
      roll,
      threshold
    );

    if (submitError) {
      setSubmitting(false);
      setError(formatError(submitError));
      return;
    }

    // Check if this turn has cutscene outcomes (new format)
    if (hasPerTurnOutcomes(currentCharacterTurn)) {
      const turnOutcome = getTurnOutcome(currentCharacterTurn, roll, maxRoll, selectedChoice);
      
      if (turnOutcome?.cutsceneImageUrl) {
        // Show cutscene on kids' screen
        const { error: cutsceneError } = await showCutscene(session.id, {
          characterId: currentCharacterTurn.characterId,
          imageUrl: turnOutcome.cutsceneImageUrl,
          outcomeText: turnOutcome.text,
          reward: turnOutcome.reward ? {
            id: turnOutcome.reward.id,
            name: turnOutcome.reward.name,
            imageUrl: turnOutcome.reward.imageUrl,
            type: turnOutcome.reward.type,
          } : undefined,
        });
        
        if (cutsceneError) {
          console.error('Failed to show cutscene:', cutsceneError);
        }
        
        // Collect reward if present
        if (turnOutcome.reward) {
          const { error: rewardError } = await collectReward(session.id, {
            id: turnOutcome.reward.id,
            name: turnOutcome.reward.name,
            imageUrl: turnOutcome.reward.imageUrl,
            type: turnOutcome.reward.type,
          });
          
          if (rewardError) {
            console.error('Failed to collect reward:', rewardError);
          }
        }
      }
    }

    setSubmitting(false);

    // Reset selection for next turn
    setSelectedChoice(null);
    setDiceRoll('');
  };

  const handleDismissCutscene = async () => {
    if (!session) return;
    setError(null);
    const { error: dismissError } = await dismissCutscene(session.id);
    if (dismissError) {
      setError(formatError(dismissError));
    }
  };

  const handleNextScene = async () => {
    if (!session || !currentScene || !adventure) return;

    setError(null);
    setAdvancing(true);
    let nextSceneNumber: number | null = null;
    
    if (currentScene.outcome?.nextSceneId) {
      const nextScene = adventure.scenes.find(s => s.id === currentScene.outcome!.nextSceneId);
      nextSceneNumber = nextScene?.sceneNumber ?? null;
    }

    const { error: advanceError } = await advanceToNextScene(session.id, nextSceneNumber);
    setAdvancing(false);
    if (advanceError) {
      setError(formatError(advanceError));
      return;
    }
    if (nextSceneNumber === null) {
      setSession((prev) => prev ? { ...prev, phase: GAME_PHASES.COMPLETE } : null);
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
                <p className="text-sm text-gray-600">Enter kid names (1–3 players).</p>
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
                {kidNames.length < 3 && (
                  <button
                    type="button"
                    onClick={() => setKidNames([...kidNames, ''])}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    + Add kid
                  </button>
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
  const allActed = currentScene && allCharactersActed(currentScene, session);
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
                const choice = characterTurn?.choices.find(c => c.id === sceneChoice.choiceId);
                if (!character || !choice || !sceneChoice.roll) return null;

                // Get outcome - check for turn-level outcomes first (new format), then choice-level (old format)
                const outcome = characterTurn && hasPerTurnOutcomes(characterTurn)
                  ? getTurnOutcome(characterTurn, sceneChoice.roll, session.dice_type || 20, choice)
                  : calculateChoiceOutcome(choice, sceneChoice.roll, session.dice_type || 20);
                const kidName = getPlayerForCharacter(players, sceneChoice.characterId) || character.name;

                return (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <PlaceholderImage
                        variant="character"
                        label={character.name}
                        className="w-10 h-10 flex-shrink-0"
                      />
                      <p className="font-semibold">{kidName} ({character.name})</p>
                    </div>
                    <p className="text-sm text-gray-600">Chose: {choice.label}</p>
                    <p className="text-sm text-gray-600">Rolled: {sceneChoice.roll}</p>
                    <p className="mt-2 flex items-start gap-2">
                      <AnimationIndicator animationKey={outcome?.animationKey} className="mt-0.5 flex-shrink-0" />
                      <span>{outcome?.text ?? 'Outcome pending...'}</span>
                    </p>
                  </div>
                );
              })}

              {/* Cutscene Active Indicator */}
              {session.active_cutscene && (
                <div className="bg-purple-50 border-2 border-purple-300 p-4 rounded-lg space-y-3 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
                    <p className="font-semibold text-purple-900">Cutscene showing on kids' screen</p>
                  </div>
                  <p className="text-sm text-purple-800">{session.active_cutscene.outcomeText}</p>
                  {session.active_cutscene.reward && (
                    <p className="text-sm text-purple-700">
                      Reward: <span className="font-medium">{session.active_cutscene.reward.name}</span>
                    </p>
                  )}
                  <button
                    onClick={handleDismissCutscene}
                    className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                  >
                    Dismiss Cutscene
                  </button>
                </div>
              )}

              {/* Scene outcome + Next/End only when all have acted */}
              {allActed && (
                <>
                  {currentScene.outcome && (
                    <div className="bg-green-50 p-4 rounded-lg mt-4">
                      <h3 className="font-semibold text-green-900 mb-2">Scene Outcome</h3>
                      <p className="text-green-800">{currentScene.outcome.resultText}</p>
                      {currentScene.outcome.rewards && currentScene.outcome.rewards.length > 0 && (
                        <div className="mt-3">
                          <p className="font-semibold text-green-900 mb-2">Rewards earned:</p>
                          <ul className="space-y-2">
                            {currentScene.outcome.rewards.map((reward) => (
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
                  )}
                  {!currentScene.outcome?.nextSceneId ? (
                    <EndingPage
                  adventure={adventure}
                  session={session}
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
                  ) : (
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
            </div>
          )}

          {/* Character Turn UI */}
          {!allActed && currentCharacterTurn && currentScene && !session.active_cutscene && (
            <div className="space-y-4">
              {(() => {
                const character = adventure.characters.find(c => c.id === currentCharacterTurn.characterId);
                const kidName = getPlayerForCharacter(players, currentCharacterTurn.characterId) || character?.name || 'Unknown';
                const turnIndex = session.current_character_turn_index || 0;
                const activeTurns = getActiveCharacterTurns(currentScene, players);
                const totalTurns = activeTurns.length;
                const prompt = `${kidName} (${character?.name ?? 'Unknown'}), ${currentCharacterTurn.promptText}`;
                // Get threshold - either from turn level or will be shown per-choice
                // Scale threshold based on dice type (thresholds are written for d20)
                const diceType = session.dice_type ?? DEFAULT_DICE_TYPE;
                const scaleThreshold = (t: number) => Math.ceil(t * (diceType / 20));
                const turnLevelThreshold = currentCharacterTurn.successThreshold;
                const scaledTurnThreshold = turnLevelThreshold !== undefined ? scaleThreshold(turnLevelThreshold) : undefined;

                return (
                  <>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <p className="text-sm text-yellow-800 mb-1">Turn {turnIndex + 1} of {totalTurns}</p>
                      <p className="text-base font-medium text-yellow-900 mt-2">{prompt}</p>
                    </div>

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

                    <div className="flex flex-wrap items-end gap-4">
                      <div className="flex-1 min-w-[140px]">
                        <label htmlFor="diceRoll" className="block text-sm font-medium text-gray-700 mb-2">
                          Dice Roll (1-{session.dice_type ?? DEFAULT_DICE_TYPE})
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
                        <span className="text-xs text-gray-500">or roll d{session.dice_type ?? DEFAULT_DICE_TYPE}</span>
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
