-- Fix archive_log insert policy (USING → WITH CHECK)
DROP POLICY IF EXISTS "Admin insert archive log" ON archive_log;

CREATE POLICY "Admin insert archive log"
  ON archive_log FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'admin');

-- Also fix semester_summary insert policy
DROP POLICY IF EXISTS "Service role insert summary" ON semester_summary;
DROP POLICY IF EXISTS "Service role update summary" ON semester_summary;

CREATE POLICY "Authenticated insert summary"
  ON semester_summary FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update summary"
  ON semester_summary FOR UPDATE
  USING (auth.role() = 'authenticated');
