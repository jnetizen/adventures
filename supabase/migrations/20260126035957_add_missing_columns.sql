-- Migration: Add all missing columns to sessions table
-- This migration adds the columns needed for the adventure game system

-- Add adventure_id column (if not already added)
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS adventure_id TEXT;

-- Add players column (JSONB array of { kidName, characterId } objects)
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS players JSONB DEFAULT '[]'::jsonb;

-- Add current_character_turn_index column
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS current_character_turn_index INTEGER DEFAULT 0;

-- Add scene_choices column (JSONB array of choice objects)
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS scene_choices JSONB DEFAULT '[]'::jsonb;
