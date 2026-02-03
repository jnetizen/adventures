-- Add dice_mode column to sessions table
-- 'physical' = DM enters roll (default, current behavior)
-- 'digital' = Player taps dice on their screen to roll

alter table sessions add column if not exists dice_mode text default 'physical';

-- Add constraint for valid values
alter table sessions add constraint sessions_dice_mode_check
  check (dice_mode in ('physical', 'digital'));
