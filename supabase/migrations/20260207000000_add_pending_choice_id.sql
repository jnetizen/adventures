-- Add pending_choice_id column for digital dice mode
-- DM selects a choice, its ID is stored here to enable the player's dice roller

alter table sessions add column if not exists pending_choice_id text default null;
