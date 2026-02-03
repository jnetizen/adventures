-- Add pending_player_roll column for digital dice mode
-- Player rolls on their screen, result is stored here for DM to use

alter table sessions add column if not exists pending_player_roll integer default null;
