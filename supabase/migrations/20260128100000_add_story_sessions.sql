-- Story sessions table for Story Mode (read-along without dice)
-- Lightweight: just tracks room code and current beat position

create table if not exists story_sessions (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  adventure_id text not null,
  current_beat_index integer not null default 0,
  created_at timestamptz not null default now()
);

-- Index for room code lookups
create index if not exists story_sessions_room_code_idx on story_sessions (room_code);

-- Enable realtime for player sync
alter publication supabase_realtime add table story_sessions;

-- Auto-cleanup old sessions (older than 24 hours)
-- This can be run periodically or via a cron job
comment on table story_sessions is 'Lightweight sessions for Story Mode read-along. Auto-cleanup recommended for sessions older than 24h.';
