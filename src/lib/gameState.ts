import { supabase } from './supabase';
import { retryWithBackoff } from './errorRecovery';
import { isOnline, saveOperationToQueue, getPendingOperations, removeOperationFromQueue } from './offlineStorage';
import { GAME_PHASES, OPERATION_TYPES } from '../constants/game';
import type { GameSession, Player, SceneChoice, ActiveCutscene, CollectedReward } from '../types/game';

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
 * Creates a new game session with a unique room code
 */
export async function createSession(): Promise<{ data: GameSession | null; error: Error | null }> {
  return retryWithBackoff(async () => {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const roomCode = generateRoomCode();

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          room_code: roomCode,
          current_scene: 0,
          phase: GAME_PHASES.SETUP,
        })
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
      return { data: null, error };
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
 * Starts an adventure for a session
 */
export async function startAdventure(
  sessionId: string,
  adventureId: string,
  players: Player[],
  diceType?: number
): Promise<{ error: Error | null }> {
  if (!isOnline()) {
    await saveOperationToQueue({
      id: generateOperationId(),
      type: OPERATION_TYPES.START_ADVENTURE,
      sessionId,
      data: { adventureId, players, diceType },
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
  if (!isOnline()) {
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
    const { error } = await supabase
      .from('sessions')
      .update({
        active_cutscene: cutscene,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

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
