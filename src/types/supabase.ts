export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * Supabase schema for the sessions table.
 * Used for reference and migration docs. The client is untyped to avoid
 * generated-type mismatches; use GameSession from game.ts when casting.
 */
export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string
          room_code: string
          current_scene: number
          phase: "waiting" | "playing" | "paused"
          created_at: string
          updated_at: string
          adventure_id: string | null
          character_assignments: Json
          current_character_turn_index: number
          scene_choices: Json
        }
        Insert: {
          id?: string
          room_code: string
          current_scene?: number
          phase?: "waiting" | "playing" | "paused"
          created_at?: string
          updated_at?: string
          adventure_id?: string | null
          character_assignments?: Json
          current_character_turn_index?: number
          scene_choices?: Json
        }
        Update: {
          id?: string
          room_code?: string
          current_scene?: number
          phase?: "waiting" | "playing" | "paused"
          created_at?: string
          updated_at?: string
          adventure_id?: string | null
          character_assignments?: Json
          current_character_turn_index?: number
          scene_choices?: Json
        }
      }
    }
  }
}
