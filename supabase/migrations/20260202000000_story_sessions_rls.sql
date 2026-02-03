-- Add RLS policies for story_sessions table
-- Allow public access for read/write (similar to sessions table)

-- Enable RLS
alter table story_sessions enable row level security;

-- Allow anyone to read story sessions (for joining via room code)
create policy "Anyone can read story sessions"
  on story_sessions for select
  using (true);

-- Allow anyone to create story sessions
create policy "Anyone can create story sessions"
  on story_sessions for insert
  with check (true);

-- Allow anyone to update story sessions (for advancing beats)
create policy "Anyone can update story sessions"
  on story_sessions for update
  using (true);

-- Allow anyone to delete story sessions
create policy "Anyone can delete story sessions"
  on story_sessions for delete
  using (true);
