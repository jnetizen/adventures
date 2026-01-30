-- Add branching/parallel scene support to sessions table

-- Current scene by ID (supports branching where sceneNumber isn't unique)
alter table sessions add column if not exists current_scene_id text;

-- Per-character scene state for parallel scenes
-- Structure: [{ characterId, sceneId, turnIndex, choices: [] }]
alter table sessions add column if not exists character_scenes jsonb;

-- Flag for when party is split across parallel scenes
alter table sessions add column if not exists is_split boolean default false;

-- Comment explaining the branching feature
comment on column sessions.current_scene_id is 'Scene ID for branching support. When null, falls back to current_scene number lookup.';
comment on column sessions.character_scenes is 'Per-character scene state during parallel scenes. Each entry tracks characterId, sceneId, turnIndex, and choices.';
comment on column sessions.is_split is 'True when party is split across parallel scenes.';
