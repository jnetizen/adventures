-- Add family_slug to sessions table for multi-family image support.
-- Nullable for backward compatibility: existing sessions without a family_slug
-- continue to use the default bundled images from /public.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS family_slug TEXT DEFAULT NULL;
