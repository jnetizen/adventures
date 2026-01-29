import type { Reward } from './adventure';

/**
 * A single "page" in story mode that the user taps through.
 * Simplified flow: prologue → scenes → ending (no character turns)
 */
export type StoryBeat =
  | {
      type: 'prologue-world';
      image?: string;
      text: string;
    }
  | {
      type: 'prologue-character';
      characterId: string;
      characterName: string;
      text: string;
      image?: string;
    }
  | {
      type: 'prologue-mission';
      text: string;
    }
  | {
      type: 'scene';
      sceneId: string;
      sceneIndex: number;
      sceneCount: number;
      image: string;
      narration: string;
      outcomeText?: string; // Shown after tap, before next scene
    }
  | {
      type: 'ending';
      title: string;
      text: string;
      image?: string;
      rewards: Reward[];
    };

/**
 * Lightweight session for story mode.
 * Just tracks room code and current beat position.
 */
export interface StorySession {
  id: string;
  room_code: string;
  adventure_id: string;
  current_beat_index: number;
  created_at: string;
}
