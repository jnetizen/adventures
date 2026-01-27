-- Add dice_type column to sessions table
-- Stores the dice type (max value): 6, 10, 12, or 20
-- Defaults to 20 (d20)

ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS dice_type INTEGER DEFAULT 20;

-- Add check constraint to ensure valid dice types
ALTER TABLE sessions 
ADD CONSTRAINT sessions_dice_type_check 
CHECK (dice_type IN (6, 10, 12, 20));
