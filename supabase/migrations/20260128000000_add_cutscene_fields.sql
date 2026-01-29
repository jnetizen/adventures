-- Add cutscene overlay and collected rewards support
-- active_cutscene: JSONB for the current cutscene being shown on kids' screen
-- collected_rewards: JSONB array of rewards earned during the adventure

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS active_cutscene JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS collected_rewards JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN sessions.active_cutscene IS 'Active cutscene overlay state (characterId, imageUrl, outcomeText, reward)';
COMMENT ON COLUMN sessions.collected_rewards IS 'Array of rewards collected during the adventure';
