-- Migration: Add adventure_id column to sessions table
-- Run this in your Supabase SQL Editor

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS adventure_id TEXT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sessions' AND column_name = 'adventure_id';
