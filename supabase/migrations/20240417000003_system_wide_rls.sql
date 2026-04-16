-- ===========================================================================
-- COMPREHENSIVE PERMISSIONS AND ACCESS CONTROL (RLS)
-- Based on SPECIFICATION: ADMIN > HOD > TEACHER > STUDENT
-- ===========================================================================

-- 1. CLEANUP: Drop all existing policies to avoid conflicts
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP; 
END $$;

-- 2. HELPER FUNCTIONS (for readability)
CREATE OR REPLACE FUNCTION auth_role() RETURNS text AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role')::text;
$$ LANGUAGE sql STABLE;

-- ───────────────────────────────────────────────────────────────────────────
-- USERS TABLE
-- ───────────────────────────────────────────────────────────────────────────
CREATE POLICY "Admin: full access" ON users FOR ALL TO authenticated USING (auth_role() = 'admin') WITH CHECK (auth_role() = 'admin');
CREATE POLICY "All: select own row" ON users FOR SELECT TO authenticated USING (id = auth.uid());

-- ───────────────────────────────────────────────────────────────────────────
-- BRANCHES TABLE
-- ───────────────────────────────────────────────────────────────────────────
CREATE POLICY "All: select branches" ON branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin: full access" ON branches FOR ALL TO authenticated USING (auth_role() = 'admin');

-- ───────────────────────────────────────────────────────────────────────────
-- STUDENTS TABLE
-- ───────────────────────────────────────────────────────────────────────────
CREATE POLICY "Admin: full access" ON students FOR ALL TO authenticated USING (auth_role() = 'admin');
CREATE POLICY "Teacher/HOD: select students" ON students FOR SELECT TO authenticated USING (auth_role() IN ('teacher', 'hod'));
CREATE POLICY "Student: select own row" ON students FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ───────────────────────────────────────────────────────────────────────────
-- SUBJECTS TABLE
-- ───────────────────────────────────────────────────────────────────────────
CREATE POLICY "All: select subjects" ON subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/HOD: manage subjects" ON subjects FOR ALL TO authenticated USING (auth_role() IN ('admin', 'hod'));

-- ───────────────────────────────────────────────────────────────────────────
-- SUBJECT_ASSIGNMENTS TABLE
-- ───────────────────────────────────────────────────────────────────────────
CREATE POLICY "All: select assignments" ON subject_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/HOD: manage assignments" ON subject_assignments FOR ALL TO authenticated USING (auth_role() IN ('admin', 'hod'));

-- ───────────────────────────────────────────────────────────────────────────
-- LECTURES TABLE
-- ───────────────────────────────────────────────────────────────────────────
CREATE POLICY "All: select lectures" ON lectures FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin: manage lectures" ON lectures FOR ALL TO authenticated USING (auth_role() = 'admin');
CREATE POLICY "Teacher: insert own lectures" ON lectures FOR INSERT TO authenticated 
  WITH CHECK (auth_role() = 'teacher' AND teacher_id = auth.uid());

-- ───────────────────────────────────────────────────────────────────────────
-- ATTENDANCE TABLE
-- ───────────────────────────────────────────────────────────────────────────
CREATE POLICY "Admin/HOD: select all attendance" ON attendance FOR SELECT TO authenticated USING (auth_role() IN ('admin', 'hod'));
CREATE POLICY "Teacher: select all attendance" ON attendance FOR SELECT TO authenticated USING (auth_role() = 'teacher');
CREATE POLICY "Student: select own attendance" ON attendance FOR SELECT TO authenticated 
  USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Admin: manage attendance" ON attendance FOR ALL TO authenticated USING (auth_role() = 'admin');
CREATE POLICY "HOD: update any attendance" ON attendance FOR UPDATE TO authenticated 
  USING (auth_role() = 'hod')
  WITH CHECK (auth_role() = 'hod' AND edited_by = auth.uid());

CREATE POLICY "Teacher: insert own lecture attendance" ON attendance FOR INSERT TO authenticated 
  WITH CHECK (
    auth_role() = 'teacher' AND marked_by = auth.uid()
    AND EXISTS (SELECT 1 FROM lectures WHERE id = lecture_id AND teacher_id = auth.uid())
  );

CREATE POLICY "Teacher: update own attendance within 3 days" ON attendance FOR UPDATE TO authenticated 
  USING (
    auth_role() = 'teacher' AND marked_by = auth.uid()
    AND EXISTS (SELECT 1 FROM lectures WHERE id = lecture_id AND date >= current_date - interval '3 days')
  );

-- ───────────────────────────────────────────────────────────────────────────
-- ATTENDANCE_CHANGE_REQUESTS TABLE
-- ───────────────────────────────────────────────────────────────────────────
CREATE POLICY "All staff: select requests" ON attendance_change_requests FOR SELECT TO authenticated 
  USING (auth_role() IN ('admin', 'hod', 'teacher'));

CREATE POLICY "Admin: manage requests" ON attendance_change_requests FOR ALL TO authenticated USING (auth_role() = 'admin');
CREATE POLICY "Teacher: submit request" ON attendance_change_requests FOR INSERT TO authenticated 
  WITH CHECK (auth_role() = 'teacher' AND requested_by = auth.uid());

CREATE POLICY "HOD: approve requests" ON attendance_change_requests FOR UPDATE TO authenticated 
  USING (auth_role() = 'hod');

CREATE POLICY "Teacher: approve own slot requests" ON attendance_change_requests FOR UPDATE TO authenticated 
  USING (auth_role() = 'teacher' AND EXISTS (
    SELECT 1 FROM lectures WHERE id = lecture_id AND teacher_id = auth.uid()
  ));

-- ───────────────────────────────────────────────────────────────────────────
-- ATTENDANCE_CONDONATION TABLE
-- ───────────────────────────────────────────────────────────────────────────
CREATE POLICY "Staff: select condonation" ON attendance_condonation FOR SELECT TO authenticated 
  USING (auth_role() IN ('admin', 'hod', 'teacher'));
CREATE POLICY "Student: select own condonation" ON attendance_condonation FOR SELECT TO authenticated 
  USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Admin: full access" ON attendance_condonation FOR ALL TO authenticated USING (auth_role() = 'admin');
CREATE POLICY "Teacher/Student: insert condonation" ON attendance_condonation FOR INSERT TO authenticated 
  WITH CHECK (auth_role() IN ('teacher', 'student'));

CREATE POLICY "Teacher: confirm condonation" ON attendance_condonation FOR UPDATE TO authenticated 
  USING (auth_role() = 'teacher');

CREATE POLICY "HOD: approve condonation" ON attendance_condonation FOR UPDATE TO authenticated 
  USING (auth_role() = 'hod');

-- ───────────────────────────────────────────────────────────────────────────
-- HOLIDAYS TABLE
-- ───────────────────────────────────────────────────────────────────────────
CREATE POLICY "All: select holidays" ON holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin: manage holidays" ON holidays FOR ALL TO authenticated USING (auth_role() = 'admin');
CREATE POLICY "HOD: insert only" ON holidays FOR INSERT TO authenticated WITH CHECK (auth_role() = 'hod');

-- ───────────────────────────────────────────────────────────────────────────
-- TIMETABLE TABLE
-- ───────────────────────────────────────────────────────────────────────────
CREATE POLICY "All: select timetable" ON timetable FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/HOD: manage timetable" ON timetable FOR ALL TO authenticated USING (auth_role() IN ('admin', 'hod'));
CREATE POLICY "Teacher: update own rooms" ON timetable FOR UPDATE TO authenticated 
  USING (auth_role() = 'teacher' AND EXISTS (
    SELECT 1 FROM subject_assignments sa WHERE sa.subject_id = timetable.subject_id AND sa.teacher_id = auth.uid()
  ));

-- ───────────────────────────────────────────────────────────────────────────
-- LEAVE_REQUESTS TABLE
-- ───────────────────────────────────────────────────────────────────────────
CREATE POLICY "Admin/HOD: select all leave" ON leave_requests FOR SELECT TO authenticated USING (auth_role() IN ('admin', 'hod'));
CREATE POLICY "Teacher: select own leave" ON leave_requests FOR SELECT TO authenticated USING (teacher_id = auth.uid());

CREATE POLICY "Admin: full access" ON leave_requests FOR ALL TO authenticated USING (auth_role() = 'admin');
CREATE POLICY "Teacher: insert own leave" ON leave_requests FOR INSERT TO authenticated 
  WITH CHECK (auth_role() = 'teacher' AND teacher_id = auth.uid());
CREATE POLICY "HOD: update leave status" ON leave_requests FOR UPDATE TO authenticated 
  USING (auth_role() = 'hod');

-- ───────────────────────────────────────────────────────────────────────────
-- NOTICES TABLE
-- ───────────────────────────────────────────────────────────────────────────
CREATE POLICY "All: select active notices" ON notices FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admin/HOD: manage notices" ON notices FOR ALL TO authenticated USING (auth_role() IN ('admin', 'hod'));
CREATE POLICY "Teacher: manage own notices" ON notices FOR ALL TO authenticated 
  USING (auth_role() = 'teacher' AND posted_by = auth.uid());
CREATE POLICY "Teacher: insert notice" ON notices FOR INSERT TO authenticated WITH CHECK (auth_role() = 'teacher');

-- ───────────────────────────────────────────────────────────────────────────
-- MARKS (CT_MARKS / ENDSEM_MARKS)
-- ───────────────────────────────────────────────────────────────────────────
-- CT_MARKS
CREATE POLICY "All staff: select ct_marks" ON ct_marks FOR SELECT TO authenticated 
  USING (auth_role() IN ('admin', 'hod', 'teacher'));
CREATE POLICY "Student: select own ct_marks" ON ct_marks FOR SELECT TO authenticated 
  USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Admin/HOD: manage ct_marks" ON ct_marks FOR ALL TO authenticated USING (auth_role() IN ('admin', 'hod'));
CREATE POLICY "Teacher: insert own ct_marks" ON ct_marks FOR INSERT TO authenticated 
  WITH CHECK (auth_role() = 'teacher' AND EXISTS (
    SELECT 1 FROM subject_assignments WHERE subject_id = ct_marks.subject_id AND teacher_id = auth.uid()
  ));

-- ENDSEM_MARKS
CREATE POLICY "All staff: select endsem" ON endsem_marks FOR SELECT TO authenticated 
  USING (auth_role() IN ('admin', 'hod', 'teacher'));
CREATE POLICY "Student: select own endsem" ON endsem_marks FOR SELECT TO authenticated 
  USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Admin: manage endsem" ON endsem_marks FOR ALL TO authenticated USING (auth_role() = 'admin');
CREATE POLICY "HOD: update poll state" ON endsem_marks FOR UPDATE TO authenticated USING (auth_role() = 'hod');
CREATE POLICY "Student: insert own marks when open" ON endsem_marks FOR INSERT TO authenticated 
  WITH CHECK (
    auth_role() = 'student' 
    AND poll_open = true AND is_locked = false
    AND student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- ───────────────────────────────────────────────────────────────────────────
-- SYSTEM_CONFIG TABLE
-- ───────────────────────────────────────────────────────────────────────────
CREATE POLICY "All: select config" ON system_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin: manage config" ON system_config FOR ALL TO authenticated USING (auth_role() = 'admin');
CREATE POLICY "HOD: update lectures_per_day only" ON system_config FOR UPDATE TO authenticated 
  USING (auth_role() = 'hod' AND key = 'lectures_per_day')
  WITH CHECK (auth_role() = 'hod' AND key = 'lectures_per_day');

-- ───────────────────────────────────────────────────────────────────────────
-- LOGS (BULK_UPLOAD_LOGS / SEMESTER_TRANSITIONS / TIMETABLE_CHANGE_LOG)
-- ───────────────────────────────────────────────────────────────────────────
CREATE POLICY "Admin: select logs" ON bulk_upload_logs FOR SELECT TO authenticated USING (auth_role() = 'admin');
CREATE POLICY "Admin: insert logs" ON bulk_upload_logs FOR INSERT TO authenticated WITH CHECK (auth_role() = 'admin');

CREATE POLICY "Admin: select transitions" ON semester_transitions FOR SELECT TO authenticated USING (auth_role() = 'admin');
CREATE POLICY "Admin: insert transitions" ON semester_transitions FOR INSERT TO authenticated WITH CHECK (auth_role() = 'admin');

CREATE POLICY "Staff: select timetable log" ON timetable_change_log FOR SELECT TO authenticated USING (auth_role() IN ('admin', 'hod', 'teacher'));
CREATE POLICY "Staff: insert timetable log" ON timetable_change_log FOR INSERT TO authenticated WITH CHECK (true);

-- ───────────────────────────────────────────────────────────────────────────
-- SUBSTITUTE_LOG TABLE
-- ───────────────────────────────────────────────────────────────────────────
CREATE POLICY "All staff: select substitutes" ON substitute_log FOR SELECT TO authenticated USING (auth_role() IN ('admin', 'hod', 'teacher'));
CREATE POLICY "Admin/HOD: manage substitutes" ON substitute_log FOR ALL TO authenticated USING (auth_role() IN ('admin', 'hod'));
CREATE POLICY "Teacher: update own substitute status" ON substitute_log FOR UPDATE TO authenticated 
  USING (auth_role() = 'teacher' AND substitute_teacher_id = auth.uid());
