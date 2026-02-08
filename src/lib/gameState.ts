import { supabase } from './supabase';
import { retryWithBackoff } from './errorRecovery';
import { isOnline, saveOperationToQueue, getPendingOperations, removeOperationFromQueue } from './offlineStorage';
import { GAME_PHASES, OPERATION_TYPES } from '../constants/game';
import type { GameSession, Player, SceneChoice, ActiveCutscene, CollectedReward, CharacterSceneState } from '../types/game';

/**
 * Generates a random 4-letter uppercase room code
 */
export function generateRoomCode(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return code;
}

/**
 * Generate unique operation ID
 */
function generateOperationId(): string {
  return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates a new game session with a unique room code.
 * Optionally associates a family_slug for personalized images.
 */
export async function createSession(familySlug?: string | null): Promise<{ data: GameSession | null; error: Error | null }> {
  return retryWithBackoff(async () => {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const roomCode = generateRoomCode();

      const insertData: Record<string, unknown> = {
        room_code: roomCode,
        current_scene: 0,
        phase: GAME_PHASES.SETUP,
      };
      if (familySlug) {
        insertData.family_slug = familySlug;
      }

      const { data, error } = await supabase
        .from('sessions')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        // If it's a unique constraint violation, try again with a new code
        if (error.code === '23505') {
          attempts++;
          continue;
        }
        return { data: null, error };
      }

      return { data: data as GameSession, error: null };
    }

    return { data: null, error: new Error('Failed to generate unique room code after multiple attempts') };
  });
}

/**
 * Finds a session by room code
 */
export async function findSessionByCode(roomCode: string): Promise<{ data: GameSession | null; error: Error | null }> {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (error) {
      // PGRST116 = no rows returned (room code not found)
      if (error.code === 'PGRST116') {
        return { data: null, error: new Error('Room not found. Check the code and try again.') };
      }
      return { data: null, error: new Error(error.message || 'Failed to find room') };
    }

    return { data: data as GameSession, error: null };
  });
}

/**
 * Updates the current scene number for a session
 */
export async function updateScene(sessionId: string, sceneNumber: number): Promise<{ error: Error | null }> {
  if (sceneNumber < 0) {
    return { error: new Error('Scene number cannot be negative') };
  }

  const { error } = await supabase
    .from('sessions')
    .update({
      current_scene: sceneNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  return { error: error || null };
}

/**
 * Increments the scene number for a session
 */
export async function incrementScene(sessionId: string): Promise<{ error: Error | null }> {
  // First get the current scene
  const { data, error: fetchError } = await supabase
    .from('sessions')
    .select('current_scene')
    .eq('id', sessionId)
    .single();

  if (fetchError || !data) {
    return { error: fetchError || new Error('Session not found') };
  }

  return updateScene(sessionId, data.current_scene + 1);
}

/**
 * Selects an adventure for a session (without starting it).
 * Used by player screen to choose which adventure to play.
 */
export async function selectAdventure(
  sessionId: string,
  adventureId: string
): Promise<{ error: Error | null }> {
  if (!isOnline()) {
    // For offline, we'll just return success - the selection will sync when back online
    return { error: null };
  }

  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('sessions')
      .update({
        adventure_id: adventureId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}

/**
 * Starts an adventure for a session
 */
export async function startAdventure(
  sessionId: string,
  adventureId: string,
  players: Player[],
  diceType?: number,
  diceMode?: 'physical' | 'digital'
): Promise<{ error: Error | null }> {
  if (!isOnline()) {
    await saveOperationToQueue({
      id: generateOperationId(),
      type: OPERATION_TYPES.START_ADVENTURE,
      sessionId,
      data: { adventureId, players, diceType, diceMode },
      timestamp: new Date().toISOString(),
    });
    return { error: null };
  }

  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('sessions')
      .update({
        adventure_id: adventureId,
        players,
        phase: GAME_PHASES.PROLOGUE,
        success_count: 0,
        dice_type: diceType ?? 20,
        dice_mode: diceMode ?? 'physical',
        active_cutscene: null,
        collected_rewards: [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}

/**
 * Starts a new scene (resets turn index and clears choices)
 */
export async function startScene(sessionId: string, sceneNumber: number): Promise<{ error: Error | null }> {
  if (sceneNumber < 0) {
    return { error: new Error('Scene number cannot be negative') };
  }

  if (!isOnline()) {
    await saveOperationToQueue({
      id: generateOperationId(),
      type: OPERATION_TYPES.START_SCENE,
      sessionId,
      data: { sceneNumber },
      timestamp: new Date().toISOString(),
    });
    return { error: null };
  }

  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('sessions')
      .update({
        current_scene: sceneNumber,
        current_scene_id: null,
        current_character_turn_index: 0,
        scene_choices: [],
        phase: GAME_PHASES.PLAYING,
        // Reset puzzle state when entering a new scene (legacy navigation).
        puzzle_started: null,
        puzzle_completed: null,
        puzzle_outcome: null,
        // Clear any active cutscene to prevent stale overlays on scene transitions.
        active_cutscene: null,
        // Clear digital dice state for fresh turn.
        pending_choice_id: null,
        pending_player_roll: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}

/**
 * Submits a player's dice roll (for digital dice mode).
 * This stores the roll for the DM to use when submitting the choice.
 */
export async function submitPlayerRoll(
  sessionId: string,
  roll: number
): Promise<{ error: Error | null }> {
  if (roll < 1 || roll > 20) {
    return { error: new Error('Dice roll must be between 1 and 20') };
  }

  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('sessions')
      .update({
        pending_player_roll: roll,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}

/**
 * Sets the DM's pending choice (for digital dice mode).
 * This enables the player's dice roller on their screen.
 */
export async function setPendingChoice(
  sessionId: string,
  choiceId: string
): Promise<{ error: Error | null }> {
  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('sessions')
      .update({
        pending_choice_id: choiceId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}

/**
 * Clears the pending player roll (after DM uses it).
 */
export async function clearPlayerRoll(
  sessionId: string
): Promise<{ error: Error | null }> {
  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('sessions')
      .update({
        pending_player_roll: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}

/**
 * Submits a character's choice and dice roll for the current turn.
 * If roll >= successThreshold, increments success_count (v2 cumulative scoring).
 */
export async function submitCharacterChoice(
  sessionId: string,
  characterId: string,
  choiceId: string,
  roll: number,
  successThreshold: number
): Promise<{ error: Error | null }> {
  if (roll < 1 || roll > 20) {
    return { error: new Error('Dice roll must be between 1 and 20') };
  }

  if (!isOnline()) {
    await saveOperationToQueue({
      id: generateOperationId(),
      type: OPERATION_TYPES.SUBMIT_CHOICE,
      sessionId,
      data: { characterId, choiceId, roll, successThreshold },
      timestamp: new Date().toISOString(),
    });
    return { error: null };
  }

  return retryWithBackoff(async () => {
    // Get current session state
    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select('current_character_turn_index, scene_choices, success_count')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      return { error: fetchError || new Error('Session not found') };
    }

    const currentTurnIndex = session.current_character_turn_index || 0;
    const existingChoices = (session.scene_choices as SceneChoice[] | null) ?? [];
    const currentSuccessCount = (session.success_count as number | null) ?? 0;
    const isSuccess = roll >= successThreshold;
    const nextSuccessCount = isSuccess ? currentSuccessCount + 1 : currentSuccessCount;

    // Add the new choice
    const newChoice = { characterId, choiceId, roll };
    const updatedChoices = [...existingChoices, newChoice];
    const nextTurnIndex = currentTurnIndex + 1;

    const { error } = await supabase
      .from('sessions')
      .update({
        current_character_turn_index: nextTurnIndex,
        scene_choices: updatedChoices,
        success_count: nextSuccessCount,
        pending_choice_id: null,
        pending_player_roll: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}

/**
 * Reveals the results of all character choices (batched reveal)
 */
export async function revealSceneResults(sessionId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('sessions')
    .update({
      phase: 'results_revealed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  return { error: error || null };
}

/**
 * Advances to the next scene or ends the adventure
 */
export async function advanceToNextScene(sessionId: string, nextSceneNumber: number | null): Promise<{ error: Error | null }> {
  if (!isOnline()) {
    await saveOperationToQueue({
      id: generateOperationId(),
      type: OPERATION_TYPES.ADVANCE_SCENE,
      sessionId,
      data: { nextSceneNumber },
      timestamp: new Date().toISOString(),
    });
    return { error: null };
  }

  if (nextSceneNumber === null) {
    // Adventure ended
    return retryWithBackoff(async () => {
      const { error } = await supabase
        .from('sessions')
        .update({
          phase: GAME_PHASES.COMPLETE,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      return { error: error || null };
    });
  }

  // Start next scene
  return startScene(sessionId, nextSceneNumber);
}

export interface SessionFeedback {
  rating: number;
  positive?: string;
  negative?: string;
  notes?: string;
}

/**
 * Saves post-session feedback to the session record.
 */
export async function submitSessionFeedback(
  sessionId: string,
  feedback: SessionFeedback
): Promise<{ error: Error | null }> {
  return retryWithBackoff(async () => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('sessions')
      .update({
        feedback_rating: feedback.rating,
        feedback_positive: feedback.positive || null,
        feedback_negative: feedback.negative || null,
        feedback_notes: feedback.notes || null,
        feedback_submitted_at: now,
        updated_at: now,
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}

/**
 * Resets session for "Start New Adventure" (phase setup, clear adventure and players).
 */
export async function resetSessionForNewAdventure(sessionId: string): Promise<{ error: Error | null }> {
  if (!isOnline()) {
    await saveOperationToQueue({
      id: generateOperationId(),
      type: OPERATION_TYPES.RESET_SESSION,
      sessionId,
      data: {},
      timestamp: new Date().toISOString(),
    });
    return { error: null };
  }

  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('sessions')
      .update({
        phase: GAME_PHASES.SETUP,
        adventure_id: null,
        players: [],
        current_scene: 0,
        current_character_turn_index: 0,
        scene_choices: [],
        success_count: 0,
        active_cutscene: null,
        collected_rewards: [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}

// ============================================
// Cutscene Overlay Functions
// ============================================

/**
 * Shows a cutscene overlay on the kids' screen.
 * Called by DM after submitting a choice with a cutscene image.
 */
export async function showCutscene(
  sessionId: string,
  cutscene: ActiveCutscene
): Promise<{ error: Error | null }> {
  console.log('[CUTSCENE DB] showCutscene called', {
    sessionId,
    characterId: cutscene.characterId,
    imageUrl: cutscene.imageUrl,
    isOnline: isOnline(),
  });

  if (!isOnline()) {
    console.log('[CUTSCENE DB] Offline - queueing operation');
    await saveOperationToQueue({
      id: generateOperationId(),
      type: OPERATION_TYPES.SHOW_CUTSCENE,
      sessionId,
      data: { cutscene },
      timestamp: new Date().toISOString(),
    });
    return { error: null };
  }

  return retryWithBackoff(async () => {
    console.log('[CUTSCENE DB] Updating session with cutscene');
    const { error } = await supabase
      .from('sessions')
      .update({
        active_cutscene: cutscene,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      console.error('[CUTSCENE DB] Failed to update session:', error);
    } else {
      console.log('[CUTSCENE DB] Cutscene saved successfully');
    }

    return { error: error || null };
  });
}

/**
 * Dismisses the cutscene overlay on the kids' screen.
 * Called by DM when ready to proceed.
 */
export async function dismissCutscene(sessionId: string): Promise<{ error: Error | null }> {
  if (!isOnline()) {
    await saveOperationToQueue({
      id: generateOperationId(),
      type: OPERATION_TYPES.DISMISS_CUTSCENE,
      sessionId,
      data: {},
      timestamp: new Date().toISOString(),
    });
    return { error: null };
  }

  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('sessions')
      .update({
        active_cutscene: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}

/**
 * Adds a reward to the session's collected rewards.
 * Called after a turn outcome awards a reward.
 */
export async function collectReward(
  sessionId: string,
  reward: CollectedReward
): Promise<{ error: Error | null }> {
  if (!isOnline()) {
    await saveOperationToQueue({
      id: generateOperationId(),
      type: OPERATION_TYPES.COLLECT_REWARD,
      sessionId,
      data: { reward },
      timestamp: new Date().toISOString(),
    });
    return { error: null };
  }

  return retryWithBackoff(async () => {
    // Get current collected rewards
    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select('collected_rewards')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      return { error: fetchError || new Error('Session not found') };
    }

    const existingRewards = (session.collected_rewards as CollectedReward[] | null) ?? [];
    const updatedRewards = [...existingRewards, reward];

    const { error } = await supabase
      .from('sessions')
      .update({
        collected_rewards: updatedRewards,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}

// ============================================
// Branching/Parallel Scene Functions
// ============================================

/**
 * Starts a scene by ID (supports branching where sceneNumber isn't unique).
 * Used when transitioning to scenes in branching adventures.
 */
export async function startSceneById(
  sessionId: string,
  sceneId: string,
  sceneNumber: number
): Promise<{ error: Error | null }> {
  if (!isOnline()) {
    await saveOperationToQueue({
      id: generateOperationId(),
      type: OPERATION_TYPES.START_SCENE_BY_ID,
      sessionId,
      data: { sceneId, sceneNumber },
      timestamp: new Date().toISOString(),
    });
    return { error: null };
  }

  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('sessions')
      .update({
        current_scene: sceneNumber,
        current_scene_id: sceneId,
        current_character_turn_index: 0,
        scene_choices: [],
        phase: GAME_PHASES.PLAYING,
        is_split: false,
        character_scenes: null,
        // Reset puzzle state when entering a new scene
        puzzle_started: null,
        puzzle_completed: null,
        puzzle_outcome: null,
        // Clear any active cutscene to prevent race conditions on scene transitions
        active_cutscene: null,
        // Clear digital dice state for fresh turn.
        pending_choice_id: null,
        pending_player_roll: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}

/**
 * Splits the party into parallel scenes.
 * Each character goes to their designated scene.
 */
export async function splitParty(
  sessionId: string,
  characterScenes: CharacterSceneState[]
): Promise<{ error: Error | null }> {
  if (!isOnline()) {
    await saveOperationToQueue({
      id: generateOperationId(),
      type: OPERATION_TYPES.SPLIT_PARTY,
      sessionId,
      data: { characterScenes },
      timestamp: new Date().toISOString(),
    });
    return { error: null };
  }

  return retryWithBackoff(async () => {
    // Set the first character's scene as the "current" scene for display purposes
    const firstScene = characterScenes[0];

    const { error } = await supabase
      .from('sessions')
      .update({
        is_split: true,
        character_scenes: characterScenes,
        current_scene_id: firstScene?.sceneId ?? null,
        current_character_turn_index: 0,
        scene_choices: [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}

/**
 * Reunites the party after parallel scenes.
 * All characters move to the same scene.
 */
export async function reuniteParty(
  sessionId: string,
  sceneId: string,
  sceneNumber: number
): Promise<{ error: Error | null }> {
  if (!isOnline()) {
    await saveOperationToQueue({
      id: generateOperationId(),
      type: OPERATION_TYPES.REUNITE_PARTY,
      sessionId,
      data: { sceneId, sceneNumber },
      timestamp: new Date().toISOString(),
    });
    return { error: null };
  }

  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('sessions')
      .update({
        is_split: false,
        character_scenes: null,
        current_scene: sceneNumber,
        current_scene_id: sceneId,
        current_character_turn_index: 0,
        scene_choices: [],
        phase: GAME_PHASES.PLAYING,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}

/**
 * Updates a character's state in parallel scene tracking.
 * Used to advance turns or record choices for a specific character.
 */
export async function updateCharacterSceneState(
  sessionId: string,
  characterId: string,
  updates: Partial<CharacterSceneState>
): Promise<{ error: Error | null }> {
  return retryWithBackoff(async () => {
    // Get current character scenes
    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select('character_scenes')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      return { error: fetchError || new Error('Session not found') };
    }

    const characterScenes = (session.character_scenes as CharacterSceneState[] | null) ?? [];
    const updatedScenes = characterScenes.map(cs =>
      cs.characterId === characterId
        ? { ...cs, ...updates }
        : cs
    );

    const { error } = await supabase
      .from('sessions')
      .update({
        character_scenes: updatedScenes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}

/**
 * Sets the active parallel scene (which branch the DM is currently viewing/managing).
 */
export async function setActiveParallelScene(
  sessionId: string,
  sceneId: string
): Promise<{ error: Error | null }> {
  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('sessions')
      .update({
        current_scene_id: sceneId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}

/**
 * Helper for exhaustive switch - ensures all operation types are handled.
 */
function assertNever(x: never): never {
  throw new Error(`Unhandled operation type: ${x}`);
}

/**
 * Sync pending operations from offline queue when connection restored.
 * Uses exhaustive switch with never check to ensure all operation types are handled.
 */
export async function syncPendingOperations(): Promise<{ synced: number; errors: number }> {
  if (!isOnline()) return { synced: 0, errors: 0 };

  const operations = await getPendingOperations();
  let synced = 0;
  let errors = 0;

  for (const op of operations) {
    try {
      let result: { error: Error | null } | { data: GameSession | null; error: Error | null } = { error: null };

      // Exhaustive switch with typed operation data
      switch (op.type) {
        case OPERATION_TYPES.CREATE_SESSION:
          // createSession operations don't need sync (session created on DM device)
          break;
        case OPERATION_TYPES.START_ADVENTURE:
          result = await startAdventure(
            op.sessionId,
            op.data.adventureId,
            op.data.players,
            op.data.diceType
          );
          break;
        case OPERATION_TYPES.START_SCENE:
          result = await startScene(op.sessionId, op.data.sceneNumber);
          break;
        case OPERATION_TYPES.SUBMIT_CHOICE:
          result = await submitCharacterChoice(
            op.sessionId,
            op.data.characterId,
            op.data.choiceId,
            op.data.roll,
            op.data.successThreshold
          );
          break;
        case OPERATION_TYPES.ADVANCE_SCENE:
          result = await advanceToNextScene(op.sessionId, op.data.nextSceneNumber);
          break;
        case OPERATION_TYPES.SUBMIT_FEEDBACK:
          result = await submitSessionFeedback(op.sessionId, op.data);
          break;
        case OPERATION_TYPES.RESET_SESSION:
          result = await resetSessionForNewAdventure(op.sessionId);
          break;
        case OPERATION_TYPES.SHOW_CUTSCENE:
          result = await showCutscene(op.sessionId, op.data.cutscene);
          break;
        case OPERATION_TYPES.DISMISS_CUTSCENE:
          result = await dismissCutscene(op.sessionId);
          break;
        case OPERATION_TYPES.COLLECT_REWARD:
          result = await collectReward(op.sessionId, op.data.reward);
          break;
        case OPERATION_TYPES.START_SCENE_BY_ID:
          result = await startSceneById(op.sessionId, op.data.sceneId, op.data.sceneNumber);
          break;
        case OPERATION_TYPES.SPLIT_PARTY:
          result = await splitParty(op.sessionId, op.data.characterScenes);
          break;
        case OPERATION_TYPES.REUNITE_PARTY:
          result = await reuniteParty(op.sessionId, op.data.sceneId, op.data.sceneNumber);
          break;
        default:
          // Exhaustive check - if this errors, we're missing a case
          assertNever(op);
      }

      if ('error' in result && result.error) {
        errors++;
        continue;
      }

      await removeOperationFromQueue(op.id);
      synced++;
    } catch (e) {
      console.error('Failed to sync operation:', op.id, e);
      errors++;
    }
  }

  return { synced, errors };
}

// ============================================
// Puzzle Scene Functions
// ============================================

/**
 * Marks a puzzle as completed with the given outcome.
 * Called by player screen (for in-game puzzles) or DM (for physical puzzles).
 */
export async function completePuzzle(
  sessionId: string,
  outcome: 'success' | 'fail'
): Promise<{ error: Error | null }> {
  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('sessions')
      .update({
        puzzle_completed: true,
        puzzle_outcome: outcome,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}

/**
 * Resets puzzle state for a new puzzle scene.
 * Called when entering a puzzle scene.
 */
export async function resetPuzzleState(sessionId: string): Promise<{ error: Error | null }> {
  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('sessions')
      .update({
        puzzle_started: null,
        puzzle_completed: null,
        puzzle_outcome: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}

/**
 * Starts a puzzle scene after DM has read the narration.
 * Shows puzzle controls on both screens.
 */
export async function startPuzzle(sessionId: string): Promise<{ error: Error | null }> {
  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('sessions')
      .update({
        puzzle_started: true,
        active_cutscene: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}

// ============================================
// Roll-Until-Success Climax Functions
// ============================================

/**
 * Records a roll in the roll-until-success climax sequence.
 * Updates the roll count and fail index.
 */
export async function recordClimaxRoll(
  sessionId: string,
  isMax: boolean
): Promise<{ error: Error | null }> {
  return retryWithBackoff(async () => {
    // Get current climax state
    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select('climax_roll_count, climax_fail_index')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      return { error: fetchError || new Error('Session not found') };
    }

    const currentCount = (session.climax_roll_count as number | null) ?? 0;
    const currentFailIndex = (session.climax_fail_index as number | null) ?? 0;

    const { error } = await supabase
      .from('sessions')
      .update({
        climax_roll_count: currentCount + 1,
        // Only increment fail index on non-max rolls
        climax_fail_index: isMax ? currentFailIndex : currentFailIndex + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}

/**
 * Resets climax state for a new roll-until-success sequence.
 * Called when entering a roll-until-success climax scene.
 */
export async function resetClimaxState(sessionId: string): Promise<{ error: Error | null }> {
  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('sessions')
      .update({
        climax_roll_count: 0,
        climax_fail_index: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}
