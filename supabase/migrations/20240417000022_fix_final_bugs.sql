-- Bug 7: notices RLS policy references a deleted column
DROP POLICY IF EXISTS "Teacher: UPDATE and DELETE own notices" ON notices;
CREATE POLICY "Teacher: UPDATE and DELETE own notices" ON notices 
FOR ALL USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher' 
  AND created_by = auth.uid()
);

-- Bug 8: archive_log RLS uses wrong JWT path (admin can't write logs)
DROP POLICY IF EXISTS "Admin insert archive log" ON archive_log;
CREATE POLICY "Admin insert archive log" ON archive_log FOR INSERT
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admin and HOD read archive log" ON archive_log;
CREATE POLICY "Admin and HOD read archive log" ON archive_log FOR SELECT
USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'hod'));

-- Bug 9: Demo seed users can't log in (missing auth.identities)
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
SELECT id, id, jsonb_build_object('sub', id, 'email', email), 'email', id, now(), now()
FROM auth.users
WHERE email IN ('admin111@college.edu','teacher111@college.edu','student111@college.edu')
AND NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = auth.users.id);

-- Bug 10: timetable, subject_assignments, assignment_submissions are completely locked
-- timetable
DROP POLICY IF EXISTS "All: SELECT" ON timetable;
CREATE POLICY "All: SELECT" ON timetable FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin/HOD: full access" ON timetable;
CREATE POLICY "Admin/HOD: full access" ON timetable FOR ALL TO authenticated
USING ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hod'));

-- subject_assignments
DROP POLICY IF EXISTS "All: SELECT" ON subject_assignments;
CREATE POLICY "All: SELECT" ON subject_assignments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin: full access" ON subject_assignments;
CREATE POLICY "Admin: full access" ON subject_assignments FOR ALL TO authenticated
USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- assignment_submissions
DROP POLICY IF EXISTS "All: SELECT" ON assignment_submissions;
CREATE POLICY "All: SELECT" ON assignment_submissions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Student: INSERT own" ON assignment_submissions;
CREATE POLICY "Student: INSERT own" ON assignment_submissions FOR INSERT TO authenticated
WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'student');

-- Bug 11: substitute_log has no INSERT policy
DROP POLICY IF EXISTS "HOD/Admin: INSERT" ON substitute_log;
CREATE POLICY "HOD/Admin: INSERT" ON substitute_log FOR INSERT TO authenticated
WITH CHECK ((auth.jwt()->'app_metadata'->>'role') IN ('hod','admin'));
