export type GamePhase = "waiting" | "playing" | "paused";

/** Choices made this scene, for batched reveal. */
export interface SceneChoice {
  characterId: string;
  choiceId: string;
  roll?: number;
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
  /** characterId -> player name (which kid plays which character). */
  character_assignments?: Record<string, string>;
  /** Which character's turn it is in the current scene. */
  current_character_turn_index?: number;
  /** Rolls/choices made this scene, for batched reveal. */
  scene_choices?: SceneChoice[];
}

export interface GameState {
  session: GameSession | null;
  connectionStatus: "connected" | "connecting" | "disconnected" | "error";
  error: string | null;
}
