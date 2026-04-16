-- Comprehensive Admin RLS Fix
-- This migration ensures Admins have explicit INSERT/UPDATE permissions with WITH CHECK clauses
-- and adds missing policies for administrative tables.

-- 1. USERS (already fixed in previous step, but reinforcing)
DROP POLICY IF EXISTS "Admin: full access" ON users;
CREATE POLICY "Admin: full access" ON users FOR ALL TO authenticated 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 2. BRANCHES
DROP POLICY IF EXISTS "Admin: INSERT, UPDATE, DELETE" ON branches;
CREATE POLICY "Admin: full access" ON branches FOR ALL TO authenticated 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 3. STUDENTS
DROP POLICY IF EXISTS "Admin: INSERT, UPDATE, DELETE" ON students;
CREATE POLICY "Admin: full access" ON students FOR ALL TO authenticated 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 4. ATTENDANCE
DROP POLICY IF EXISTS "Admin: full access" ON attendance;
CREATE POLICY "Admin: full access" ON attendance FOR ALL TO authenticated 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 5. ADMINISTRATIVE LOGS (Missing policies)
DROP POLICY IF EXISTS "Admin: full access" ON bulk_upload_logs;
CREATE POLICY "Admin: full access" ON bulk_upload_logs FOR ALL TO authenticated 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admin: full access" ON semester_transitions;
CREATE POLICY "Admin: full access" ON semester_transitions FOR ALL TO authenticated 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 6. SUBJECTS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "All: SELECT" ON subjects;
CREATE POLICY "All: SELECT" ON subjects FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin: full access" ON subjects;
CREATE POLICY "Admin: full access" ON subjects FOR ALL TO authenticated 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 7. NOTICES
DROP POLICY IF EXISTS "Admin: full access" ON notices;
CREATE POLICY "Admin: full access" ON notices FOR ALL TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 8. SYSTEM CONFIG
DROP POLICY IF EXISTS "Admin: full access" ON system_config;
CREATE POLICY "Admin: full access" ON system_config FOR ALL TO authenticated
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
