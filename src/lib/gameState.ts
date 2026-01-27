import { supabase } from './supabase';
import { retryWithBackoff } from './errorRecovery';
import { isOnline, saveOperationToQueue, getPendingOperations, removeOperationFromQueue } from './offlineStorage';
import type { GameSession, Player, SceneChoice } from '../types/game';

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
          phase: 'setup',
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
  players: Player[]
): Promise<{ error: Error | null }> {
  if (!isOnline()) {
    await saveOperationToQueue({
      id: generateOperationId(),
      type: 'startAdventure',
      sessionId,
      data: { adventureId, players },
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
        phase: 'prologue',
        success_count: 0,
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
      type: 'startScene',
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
        phase: 'playing',
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
      type: 'submitChoice',
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
      type: 'advanceScene',
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
          phase: 'complete',
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
      type: 'resetSession',
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
        phase: 'setup',
        adventure_id: null,
        players: [],
        current_scene: 0,
        current_character_turn_index: 0,
        scene_choices: [],
        success_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error || null };
  });
}

/**
 * Sync pending operations from offline queue when connection restored
 */
export async function syncPendingOperations(): Promise<{ synced: number; errors: number }> {
  if (!isOnline()) return { synced: 0, errors: 0 };

  const operations = await getPendingOperations();
  let synced = 0;
  let errors = 0;

  for (const op of operations) {
    try {
      let result: { error: Error | null } | { data: GameSession | null; error: Error | null } = { error: null };
      const data = op.data as Record<string, unknown>;

      switch (op.type) {
        case 'startAdventure':
          result = await startAdventure(op.sessionId, data.adventureId as string, data.players as Player[]);
          break;
        case 'startScene':
          result = await startScene(op.sessionId, data.sceneNumber as number);
          break;
        case 'submitChoice':
          result = await submitCharacterChoice(
            op.sessionId,
            data.characterId as string,
            data.choiceId as string,
            data.roll as number,
            data.successThreshold as number
          );
          break;
        case 'advanceScene':
          result = await advanceToNextScene(op.sessionId, data.nextSceneNumber as number | null);
          break;
        case 'submitFeedback':
          result = await submitSessionFeedback(op.sessionId, data as unknown as SessionFeedback);
          break;
        case 'resetSession':
          result = await resetSessionForNewAdventure(op.sessionId);
          break;
        default:
          console.warn('Unknown operation type:', op.type);
          errors++;
          continue;
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
