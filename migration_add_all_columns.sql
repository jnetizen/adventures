-- Migration: Add all missing columns to sessions table
-- Run this in your Supabase SQL Editor

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

-- Verify all columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'sessions' 
  AND column_name IN ('adventure_id', 'players', 'current_character_turn_index', 'scene_choices')
ORDER BY column_name;
