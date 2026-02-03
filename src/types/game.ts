// Import and re-export GamePhase and ConnectionStatusType from constants for backward compatibility
import { GAME_PHASES, CONNECTION_STATUS, type GamePhase as GamePhaseType, type ConnectionStatusType as ConnectionStatusTypeAlias } from '../constants/game';

export { GAME_PHASES, CONNECTION_STATUS };
export type GamePhase = GamePhaseType;
export type ConnectionStatusType = ConnectionStatusTypeAlias;

/** Supported dice types (max value). */
export type DiceType = 6 | 10 | 12 | 20;
export const DICE_TYPES: DiceType[] = [6, 10, 12, 20];
export const DEFAULT_DICE_TYPE: DiceType = 6;

/** Dice mode: physical (DM enters roll) or digital (player taps to roll). */
export type DiceMode = 'physical' | 'digital';
export const DEFAULT_DICE_MODE: DiceMode = 'physical';

/** Choices made this scene, for batched reveal. */
export interface SceneChoice {
  characterId: string;
  choiceId: string;
  roll?: number;
}

/** A kid assigned to a character. */
export interface Player {
  kidName: string;
  characterId: string;
}

/** Reward collected during adventure (matches adventure Reward type). */
export interface CollectedReward {
  id: string;
  name: string;
  imageUrl?: string;
  type?: string;
}

/** Active cutscene overlay state. */
export interface ActiveCutscene {
  /** Character who performed the action. */
  characterId: string;
  /** Cutscene image URL to display. */
  imageUrl: string;
  /** Outcome text for the parent to read. */
  outcomeText: string;
  /** Reward earned (if any). */
  reward?: CollectedReward;
}

/** Per-character scene tracking for parallel/branching scenes */
export interface CharacterSceneState {
  characterId: string;
  sceneId: string;
  turnIndex: number;
  choices: SceneChoice[];
}

export interface GameSession {
  id: string;
  room_code: string;
  /** @deprecated Use current_scene_id for branching support. Kept for backward compatibility. */
  current_scene: number;
  /** Current scene ID (supports branching). Falls back to current_scene lookup if not set. */
  current_scene_id?: string | null;
  phase: GamePhase;
  created_at: string;
  updated_at: string;
  /** Which adventure is being played. Optional for backward compatibility. */
  adventure_id?: string | null;
  /** Players: kid name + character assignment. Only turns for these characters are shown. */
  players?: Player[];
  /** Which character's turn it is in the current scene. */
  current_character_turn_index?: number;
  /** Rolls/choices made this scene, for batched reveal. */
  scene_choices?: SceneChoice[];
  /** Cumulative successful rolls across all scenes (v2 scoring). */
  success_count?: number;
  /** Dice type (max value): 6, 10, 12, or 20. Defaults to 20. */
  dice_type?: DiceType;
  /** Dice mode: 'physical' (DM enters roll) or 'digital' (player taps to roll). */
  dice_mode?: DiceMode;
  /** Player's pending roll (for digital dice mode). */
  pending_player_roll?: number | null;
  /** Post-session feedback */
  feedback_rating?: number | null;
  feedback_positive?: string | null;
  feedback_negative?: string | null;
  feedback_notes?: string | null;
  feedback_submitted_at?: string | null;
  /** Active cutscene overlay (null = no cutscene showing). */
  active_cutscene?: ActiveCutscene | null;
  /** Rewards collected during the adventure. */
  collected_rewards?: CollectedReward[];
  /** Per-character scene state for parallel/branching scenes */
  character_scenes?: CharacterSceneState[] | null;
  /** True when party is split across parallel scenes */
  is_split?: boolean | null;

  // Puzzle scene state
  /** True when DM has started the puzzle (after reading narration). */
  puzzle_started?: boolean | null;
  /** True when current puzzle scene has been completed. */
  puzzle_completed?: boolean | null;
  /** Outcome of the puzzle ('success' or 'fail'). */
  puzzle_outcome?: 'success' | 'fail' | null;

  // Roll-until-success climax state
  /** Number of rolls in the current climax sequence. */
  climax_roll_count?: number | null;
  /** Index into failNarrations array (which dodge narration to show). */
  climax_fail_index?: number | null;
}

export interface GameState {
  session: GameSession | null;
  connectionStatus: "connected" | "connecting" | "disconnected" | "error";
  error: string | null;
}
