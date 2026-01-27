-- Phase cleanup: drop old check, migrate values, add new check
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_phase_check;
UPDATE sessions SET phase = 'setup' WHERE phase = 'waiting';
UPDATE sessions SET phase = 'playing' WHERE phase = 'results_revealed';
ALTER TABLE sessions ADD CONSTRAINT sessions_phase_check
  CHECK (phase IN ('setup', 'prologue', 'playing', 'complete', 'paused'));
