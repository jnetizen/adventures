import { supabase } from './supabase';
import type { GameSession } from '../types/game';

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
 * Creates a new game session with a unique room code
 */
export async function createSession(): Promise<{ data: GameSession | null; error: Error | null }> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const roomCode = generateRoomCode();

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        room_code: roomCode,
        current_scene: 0,
        phase: 'waiting',
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
}

/**
 * Finds a session by room code
 */
export async function findSessionByCode(roomCode: string): Promise<{ data: GameSession | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('room_code', roomCode.toUpperCase())
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as GameSession, error: null };
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
