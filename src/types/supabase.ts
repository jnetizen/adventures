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
          phase: "setup" | "prologue" | "playing" | "complete" | "paused"
          created_at: string
          updated_at: string
          adventure_id: string | null
          players: Json
          current_character_turn_index: number
          scene_choices: Json
          success_count: number
          dice_type: number
          feedback_rating: number | null
          feedback_positive: string | null
          feedback_negative: string | null
          feedback_notes: string | null
          feedback_submitted_at: string | null
        }
        Insert: {
          id?: string
          room_code: string
          current_scene?: number
          phase?: "setup" | "prologue" | "playing" | "complete" | "paused"
          created_at?: string
          updated_at?: string
          adventure_id?: string | null
          players?: Json
          current_character_turn_index?: number
          scene_choices?: Json
          success_count?: number
          dice_type?: number
          feedback_rating?: number | null
          feedback_positive?: string | null
          feedback_negative?: string | null
          feedback_notes?: string | null
          feedback_submitted_at?: string | null
        }
        Update: {
          id?: string
          room_code?: string
          current_scene?: number
          phase?: "setup" | "prologue" | "playing" | "complete" | "paused"
          created_at?: string
          updated_at?: string
          adventure_id?: string | null
          players?: Json
          current_character_turn_index?: number
          scene_choices?: Json
          success_count?: number
          dice_type?: number
          feedback_rating?: number | null
          feedback_positive?: string | null
          feedback_negative?: string | null
          feedback_notes?: string | null
          feedback_submitted_at?: string | null
        }
      }
    }
  }
}
