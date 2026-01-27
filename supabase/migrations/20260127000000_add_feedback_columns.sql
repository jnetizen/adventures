-- Post-session feedback (playtest-requested)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS feedback_rating INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS feedback_positive TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS feedback_negative TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS feedback_notes TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS feedback_submitted_at TIMESTAMPTZ;
