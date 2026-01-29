import { supabase } from './supabase';
import type { StorySession } from '../types/story';

/**
 * Generate a random 4-character room code.
 */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude I, O to avoid confusion
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Create a new story session for an adventure.
 */
export async function createStorySession(
  adventureId: string
): Promise<{ data: StorySession | null; error: string | null }> {
  const roomCode = generateRoomCode();

  const { data, error } = await supabase
    .from('story_sessions')
    .insert({
      room_code: roomCode,
      adventure_id: adventureId,
      current_beat_index: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create story session:', error);
    return { data: null, error: error.message };
  }

  return { data: data as StorySession, error: null };
}

/**
 * Find a story session by room code.
 */
export async function findStorySessionByCode(
  roomCode: string
): Promise<{ data: StorySession | null; error: string | null }> {
  const { data, error } = await supabase
    .from('story_sessions')
    .select('*')
    .eq('room_code', roomCode.toUpperCase())
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: 'Room not found' };
    }
    console.error('Failed to find story session:', error);
    return { data: null, error: error.message };
  }

  return { data: data as StorySession, error: null };
}

/**
 * Get a story session by ID.
 */
export async function getStorySession(
  sessionId: string
): Promise<{ data: StorySession | null; error: string | null }> {
  const { data, error } = await supabase
    .from('story_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    console.error('Failed to get story session:', error);
    return { data: null, error: error.message };
  }

  return { data: data as StorySession, error: null };
}

/**
 * Update the current beat index (DM advancing the story).
 */
export async function updateStoryBeatIndex(
  sessionId: string,
  beatIndex: number
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('story_sessions')
    .update({ current_beat_index: beatIndex })
    .eq('id', sessionId);

  if (error) {
    console.error('Failed to update beat index:', error);
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Delete a story session (cleanup).
 */
export async function deleteStorySession(
  sessionId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('story_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    console.error('Failed to delete story session:', error);
    return { error: error.message };
  }

  return { error: null };
}
