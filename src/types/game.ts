export type GamePhase = "setup" | "prologue" | "playing" | "complete" | "paused";

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

export interface GameSession {
  id: string;
  room_code: string;
  current_scene: number;
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
  /** Post-session feedback */
  feedback_rating?: number | null;
  feedback_positive?: string | null;
  feedback_negative?: string | null;
  feedback_notes?: string | null;
  feedback_submitted_at?: string | null;
}

export interface GameState {
  session: GameSession | null;
  connectionStatus: "connected" | "connecting" | "disconnected" | "error";
  error: string | null;
}
