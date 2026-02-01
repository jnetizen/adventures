-- Add puzzle scene state columns to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS puzzle_started boolean DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS puzzle_completed boolean DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS puzzle_outcome text;
