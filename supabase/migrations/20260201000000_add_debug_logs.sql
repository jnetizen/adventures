-- Create debug_logs table for remote logging
CREATE TABLE IF NOT EXISTS debug_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  level text NOT NULL,
  message text NOT NULL,
  context jsonb,
  url text,
  user_agent text,
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  device_id text,
  created_at timestamptz DEFAULT now()
);

-- Index for querying by session
CREATE INDEX IF NOT EXISTS idx_debug_logs_session ON debug_logs(session_id);

-- Index for querying by device
CREATE INDEX IF NOT EXISTS idx_debug_logs_device ON debug_logs(device_id);

-- Index for querying by time
CREATE INDEX IF NOT EXISTS idx_debug_logs_created ON debug_logs(created_at DESC);

-- Index for filtering by level
CREATE INDEX IF NOT EXISTS idx_debug_logs_level ON debug_logs(level);

-- Enable RLS but allow inserts from anyone (logs are write-only from client)
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert logs
CREATE POLICY "Anyone can insert logs" ON debug_logs FOR INSERT WITH CHECK (true);

-- Only allow reading logs if you're authenticated (for admin dashboard later)
CREATE POLICY "Authenticated users can read logs" ON debug_logs FOR SELECT USING (auth.role() = 'authenticated');
