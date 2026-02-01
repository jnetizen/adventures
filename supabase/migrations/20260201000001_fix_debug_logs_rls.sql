-- Allow anon users to read debug logs (for debugging purposes)
DROP POLICY IF EXISTS "Authenticated users can read logs" ON debug_logs;
CREATE POLICY "Anyone can read logs" ON debug_logs FOR SELECT USING (true);
