-- Add success_count column for v2 cumulative scoring
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS success_count INTEGER DEFAULT 0;
