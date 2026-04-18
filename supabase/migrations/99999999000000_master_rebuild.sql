-- ╔══════════════════════════════════════════════════════════════════╗
-- ║     COLLEGE ATTENDANCE MANAGEMENT SYSTEM (CAMS)                ║
-- ║     MASTER DATABASE SETUP SCRIPT                               ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- 1. DROP EXISTING IF NEEDED (Use with caution in production)
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres;
-- GRANT ALL ON SCHEMA public TO anon;
-- GRANT ALL ON SCHEMA public TO authenticated;
-- GRANT ALL ON SCHEMA public TO service_role;

-- 2. CREATE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 3. CREATE TABLES
CREATE TABLE IF NOT EXISTS branches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT UNIQUE NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id       TEXT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  role             TEXT CHECK (role IN ('admin','hod','teacher','student')) NOT NULL,
  initial_password TEXT,
  is_active        BOOLEAN DEFAULT true,
  deleted_at       TIMESTAMPTZ DEFAULT NULL,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ADD FK AFTER USERS TABLE CREATED
ALTER TABLE branches ADD CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id);

CREATE TABLE IF NOT EXISTS students (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  roll_no TEXT UNIQUE NOT NULL,
  branch  TEXT NOT NULL,
  sem     INTEGER CHECK (sem BETWEEN 1 AND 8) NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  code       TEXT UNIQUE NOT NULL,
  sem        INTEGER NOT NULL,
  branch     TEXT NOT NULL,
  credits    INTEGER DEFAULT 3,
  type       TEXT CHECK (LOWER(type) IN ('theory','lab','seminar','project','elective')) DEFAULT 'theory',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subject_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id    UUID REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id    UUID REFERENCES users(id),
  academic_year TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subject_id, academic_year)
);

CREATE TABLE IF NOT EXISTS lectures (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id    UUID REFERENCES subjects(id),
  teacher_id    UUID REFERENCES users(id),
  date          DATE NOT NULL,
  lecture_no    INTEGER CHECK (lecture_no BETWEEN 1 AND 8) NOT NULL,
  is_skipped    BOOLEAN DEFAULT false,
  skip_reason   TEXT,
  academic_year TEXT NOT NULL,
  sem           INTEGER NOT NULL,
  blank_means   TEXT CHECK (blank_means IN ('present','absent')) DEFAULT 'absent',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id      UUID REFERENCES lectures(id) ON DELETE CASCADE,
  student_id      UUID REFERENCES students(id),
  status          TEXT CHECK (status IN ('present','absent')) NOT NULL,
  remarks         TEXT,
  marked_by       UUID REFERENCES users(id),
  edited_by       UUID REFERENCES users(id),
  original_status TEXT,
  edited_at       TIMESTAMPTZ,
  academic_year   TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance_change_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id       UUID REFERENCES lectures(id),
  requested_by     UUID REFERENCES users(id),
  student_id       UUID REFERENCES students(id),
  requested_status TEXT CHECK (requested_status IN ('present','absent')),
  reason           TEXT,
  status           TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  reviewed_by      UUID REFERENCES users(id),
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance_condonation (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id           UUID REFERENCES students(id),
  subject_id           UUID REFERENCES subjects(id) ON DELETE CASCADE,
  lectures_condoned    INTEGER NOT NULL,
  reason               TEXT NOT NULL,
  document_url         TEXT,
  requested_by         UUID REFERENCES users(id),
  teacher_confirmed_by UUID REFERENCES users(id),
  approved_by          UUID REFERENCES users(id),
  status               TEXT CHECK (status IN ('pending','teacher_review','approved','rejected')) DEFAULT 'pending',
  academic_year        TEXT NOT NULL,
  sem                  INTEGER NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ct_marks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID REFERENCES students(id),
  subject_id     UUID REFERENCES subjects(id) ON DELETE CASCADE,
  test_name      TEXT NOT NULL,
  marks_obtained NUMERIC,
  max_marks      NUMERIC NOT NULL,
  uploaded_by    UUID REFERENCES users(id),
  academic_year  TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, subject_id, test_name, academic_year)
);

CREATE TABLE IF NOT EXISTS endsem_marks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID REFERENCES students(id),
  subject_id    UUID REFERENCES subjects(id) ON DELETE CASCADE,
  sem           INTEGER NOT NULL,
  marks         NUMERIC,
  submitted_by  UUID REFERENCES users(id),
  verified_by   UUID REFERENCES users(id),
  is_locked     BOOLEAN DEFAULT false,
  poll_open     BOOLEAN DEFAULT false,
  academic_year TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS holidays (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date       DATE UNIQUE NOT NULL,
  reason     TEXT NOT NULL,
  added_by   UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS timetable (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch      TEXT NOT NULL,
  sem         INTEGER NOT NULL,
  day_of_week TEXT CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')) NOT NULL,
  lecture_no  INTEGER CHECK (lecture_no BETWEEN 1 AND 8) NOT NULL,
  subject_id  UUID REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id  UUID REFERENCES users(id),
  room        TEXT,
  edited_by   UUID REFERENCES users(id),
  edited_at   TIMESTAMPTZ,
  UNIQUE(branch, sem, day_of_week, lecture_no)
);

CREATE TABLE IF NOT EXISTS timetable_change_log (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timetable_id       UUID REFERENCES timetable(id),
  changed_by         UUID REFERENCES users(id),
  old_subject_id     UUID,
  new_subject_id     UUID,
  old_room           TEXT,
  new_room           TEXT,
  branch             TEXT,
  sem                INTEGER,
  day_of_week        TEXT,
  lecture_no         INTEGER,
  change_description TEXT,
  changed_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS substitute_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timetable_id          UUID REFERENCES timetable(id),
  date                  DATE NOT NULL,
  original_teacher_id   UUID REFERENCES users(id),
  substitute_teacher_id UUID REFERENCES users(id),
  note                  TEXT,
  accepted_by           UUID REFERENCES users(id),
  status                TEXT CHECK (status IN ('pending','accepted','rejected')) DEFAULT 'pending',
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id           UUID REFERENCES users(id),
  date                 DATE NOT NULL,
  type                 TEXT CHECK (type IN ('planned','emergency')) NOT NULL,
  reason               TEXT,
  suggested_substitute UUID REFERENCES users(id),
  status               TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  reviewed_by      UUID REFERENCES users(id),
  reviewed_at      TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notices (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  body       TEXT,
  type       TEXT CHECK (LOWER(type) IN ('assignment','lab','library','general','event','holiday','exam')) NOT NULL,
  created_by UUID REFERENCES users(id),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  branch     TEXT,
  sem        INTEGER,
  due_date   TIMESTAMPTZ,
  is_active  BOOLEAN DEFAULT true,
  is_pinned  BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id    UUID REFERENCES notices(id) ON DELETE CASCADE,
  student_id   UUID REFERENCES students(id),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  file_url     TEXT,
  remarks      TEXT,
  status       TEXT CHECK (status IN ('submitted','late','missing')) DEFAULT 'missing'
);

CREATE TABLE IF NOT EXISTS bulk_upload_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID REFERENCES users(id),
  file_name   TEXT,
  type        TEXT CHECK (type IN ('roles','marks','attendance')),
  status      TEXT CHECK (status IN ('success','partial','failed')),
  errors_json JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS semester_transitions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by      UUID REFERENCES users(id),
  branch            TEXT,
  old_sem           INTEGER,
  new_sem           INTEGER,
  affected_students INTEGER,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO system_config (key, value) VALUES
  ('lectures_per_day', '8'),
  ('working_days_per_week', '6'),
  ('current_academic_year', '2024-25')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS semester_summary (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID REFERENCES students(id),
  subject_id       UUID REFERENCES subjects(id),
  sem              INTEGER NOT NULL,
  academic_year    TEXT NOT NULL,
  total_lectures   INTEGER NOT NULL,
  present          INTEGER NOT NULL,
  absent           INTEGER NOT NULL,
  condoned         INTEGER DEFAULT 0,
  raw_percent      NUMERIC NOT NULL,
  final_percent    NUMERIC NOT NULL,
  archived_at      TIMESTAMPTZ DEFAULT now(),
  archive_file_url TEXT,
  UNIQUE(student_id, subject_id, sem, academic_year)
);

CREATE TABLE IF NOT EXISTS archive_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archived_by    UUID REFERENCES users(id),
  branch         TEXT NOT NULL,
  sem            INTEGER NOT NULL,
  academic_year  TEXT NOT NULL,
  students_count INTEGER NOT NULL,
  subjects_count INTEGER NOT NULL,
  rows_archived  INTEGER NOT NULL,
  rows_deleted   INTEGER NOT NULL,
  file_name      TEXT,
  file_url       TEXT,
  status         TEXT CHECK (status IN ('completed','failed','partial')) DEFAULT 'completed',
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_attendance_lecture    ON attendance(lecture_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student    ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_year       ON attendance(academic_year);
CREATE INDEX IF NOT EXISTS idx_lectures_subject_date ON lectures(subject_id, date);
CREATE INDEX IF NOT EXISTS idx_lectures_year         ON lectures(academic_year);
CREATE INDEX IF NOT EXISTS idx_ct_marks_student_sub  ON ct_marks(student_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_students_branch_sem   ON students(branch, sem);
CREATE INDEX IF NOT EXISTS idx_leave_teacher_status  ON leave_requests(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_cond_student_subject  ON attendance_condonation(student_id, subject_id);

-- 5. RPC FUNCTIONS
CREATE OR REPLACE FUNCTION public.create_system_user(
  u_college_id TEXT,
  u_password   TEXT,
  u_name       TEXT,
  u_role       TEXT,
  u_branch     TEXT    DEFAULT NULL,
  u_sem        INTEGER DEFAULT NULL,
  u_roll_no    TEXT    DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_user_id  UUID := gen_random_uuid();
  encrypted_pw TEXT;
  final_email  TEXT;
BEGIN
  encrypted_pw := crypt(u_password, gen_salt('bf'));
  IF u_college_id LIKE '%@%' THEN
    final_email := u_college_id;
  ELSE
    final_email := u_college_id || '@college.edu';
  END IF;

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change_token_current,
    email_change_token_new, recovery_token
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    final_email, encrypted_pw, now(),
    jsonb_build_object('provider','email','providers',array['email'],'role',u_role),
    jsonb_build_object('name', u_name),
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    new_user_id, new_user_id,
    jsonb_build_object('sub', new_user_id, 'email', final_email),
    'email', final_email, now(), now(), now()
  );

  INSERT INTO public.users (id, college_id, name, role, initial_password)
  VALUES (new_user_id, u_college_id, u_name, u_role, u_password);

  IF u_role = 'student' AND u_roll_no IS NOT NULL THEN
    INSERT INTO public.students (user_id, roll_no, branch, sem)
    VALUES (new_user_id, u_roll_no, u_branch, u_sem);
  END IF;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_user_to_auth(target_id UUID)
RETURNS VOID AS $$
DECLARE
  p_user      RECORD;
  final_email TEXT;
BEGIN
  SELECT * INTO p_user FROM public.users WHERE id = target_id;
  IF p_user.college_id LIKE '%@%' THEN
    final_email := p_user.college_id;
  ELSE
    final_email := p_user.college_id || '@college.edu';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_id) THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change_token_current,
      email_change_token_new, recovery_token
    ) VALUES (
      target_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      final_email,
      crypt(COALESCE(p_user.initial_password, '123'), gen_salt('bf')),
      now(),
      jsonb_build_object('provider','email','providers',array['email'],'role',p_user.role),
      jsonb_build_object('name', p_user.name),
      now(), now(), '', '', '', ''
    );
  ELSE
    UPDATE auth.users
    SET email = final_email,
        raw_app_meta_data = jsonb_build_object(
          'provider','email','providers',array['email'],'role',p_user.role
        )
    WHERE id = target_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = target_id) THEN
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      target_id, target_id,
      jsonb_build_object('sub', target_id, 'email', final_email),
      'email', final_email, now(), now(), now()
    );
  ELSE
    UPDATE auth.identities
    SET identity_data = jsonb_build_object('sub', target_id, 'email', final_email),
        provider_id   = final_email
    WHERE user_id = target_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_all_users_to_auth()
RETURNS VOID AS $$
DECLARE u RECORD;
BEGIN
  FOR u IN (SELECT id FROM public.users WHERE deleted_at IS NULL) LOOP
    PERFORM public.sync_user_to_auth(u.id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(NEW.role)
  ) WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_role_change ON public.users;
CREATE TRIGGER on_user_role_change
  AFTER INSERT OR UPDATE OF role ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_role();

CREATE OR REPLACE FUNCTION public.get_system_health()
RETURNS JSONB AS $$
DECLARE result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_users',        (SELECT COUNT(*) FROM public.users WHERE deleted_at IS NULL),
    'auth_users',         (SELECT COUNT(*) FROM auth.users),
    'missing_from_auth',  (SELECT COUNT(*) FROM public.users u
                           WHERE deleted_at IS NULL
                           AND NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id = u.id)),
    'missing_identities', (SELECT COUNT(*) FROM auth.users a
                           WHERE NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = a.id)),
    'total_students',     (SELECT COUNT(*) FROM public.students),
    'total_branches',     (SELECT COUNT(*) FROM public.branches),
    'db_size_mb',         (SELECT ROUND(pg_database_size('postgres')/1024.0/1024.0, 2))
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_reset_password(
  target_id    UUID,
  new_password TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at         = now()
  WHERE id = target_id;

  UPDATE public.users
  SET initial_password = new_password
  WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS POLICIES
-- USERS TABLE
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_admin_all" ON users;
CREATE POLICY "users_admin_all"    ON users FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own"   ON users FOR SELECT TO authenticated
  USING (id = auth.uid() AND deleted_at IS NULL);

-- BRANCHES TABLE
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branches_select_all" ON branches;
CREATE POLICY "branches_select_all" ON branches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "branches_admin_all" ON branches;
CREATE POLICY "branches_admin_all"  ON branches FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- STUDENTS TABLE
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "students_student_own" ON students;
CREATE POLICY "students_student_own"   ON students FOR SELECT TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'student' AND user_id = auth.uid());
DROP POLICY IF EXISTS "students_staff_select" ON students;
CREATE POLICY "students_staff_select"  ON students FOR SELECT TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('teacher','hod','admin'));
DROP POLICY IF EXISTS "students_admin_all" ON students;
CREATE POLICY "students_admin_all"     ON students FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- SUBJECTS TABLE
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subjects_select_all" ON subjects;
CREATE POLICY "subjects_select_all" ON subjects FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "subjects_admin_all" ON subjects;
CREATE POLICY "subjects_admin_all"  ON subjects FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- SUBJECT ASSIGNMENTS TABLE
ALTER TABLE subject_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subj_assign_select_all" ON subject_assignments;
CREATE POLICY "subj_assign_select_all" ON subject_assignments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "subj_assign_admin_all" ON subject_assignments;
CREATE POLICY "subj_assign_admin_all"  ON subject_assignments FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');
DROP POLICY IF EXISTS "subj_assign_hod_all" ON subject_assignments;
CREATE POLICY "subj_assign_hod_all"    ON subject_assignments FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'hod');

-- LECTURES TABLE
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lectures_select_all" ON lectures;
CREATE POLICY "lectures_select_all"       ON lectures FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "lectures_teacher_insert" ON lectures;
CREATE POLICY "lectures_teacher_insert"   ON lectures FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'teacher' AND teacher_id = auth.uid());
DROP POLICY IF EXISTS "lectures_teacher_update" ON lectures;
CREATE POLICY "lectures_teacher_update"   ON lectures FOR UPDATE TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'teacher'
    AND teacher_id = auth.uid()
    AND date >= current_date - interval '3 days');
DROP POLICY IF EXISTS "lectures_hod_admin_all" ON lectures;
CREATE POLICY "lectures_hod_admin_all"    ON lectures FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('hod','admin'));

-- ATTENDANCE TABLE
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "att_student_own" ON attendance;
CREATE POLICY "att_student_own"          ON attendance FOR SELECT TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'student'
    AND student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "att_teacher_select" ON attendance;
CREATE POLICY "att_teacher_select"       ON attendance FOR SELECT TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'teacher');
DROP POLICY IF EXISTS "att_teacher_insert" ON attendance;
CREATE POLICY "att_teacher_insert"       ON attendance FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'teacher' AND marked_by = auth.uid());
DROP POLICY IF EXISTS "att_teacher_update" ON attendance;
CREATE POLICY "att_teacher_update"       ON attendance FOR UPDATE TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'teacher'
    AND marked_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = attendance.lecture_id
        AND lectures.date >= current_date - interval '3 days'
    ));
DROP POLICY IF EXISTS "att_hod_select" ON attendance;
CREATE POLICY "att_hod_select"           ON attendance FOR SELECT TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'hod');
DROP POLICY IF EXISTS "att_hod_update" ON attendance;
CREATE POLICY "att_hod_update"           ON attendance FOR UPDATE TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'hod');
DROP POLICY IF EXISTS "att_admin_all" ON attendance;
CREATE POLICY "att_admin_all"            ON attendance FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- ATTENDANCE CHANGE REQUESTS TABLE
ALTER TABLE attendance_change_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "acr_select_all" ON attendance_change_requests;
CREATE POLICY "acr_select_all"   ON attendance_change_requests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "acr_teacher_insert" ON attendance_change_requests;
CREATE POLICY "acr_teacher_insert" ON attendance_change_requests FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'teacher');
DROP POLICY IF EXISTS "acr_hod_update" ON attendance_change_requests;
CREATE POLICY "acr_hod_update"   ON attendance_change_requests FOR UPDATE TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'hod');

-- ATTENDANCE CONDONATION TABLE
ALTER TABLE attendance_condonation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cond_select_all" ON attendance_condonation;
CREATE POLICY "cond_select_all"       ON attendance_condonation FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "cond_student_insert" ON attendance_condonation;
CREATE POLICY "cond_student_insert"   ON attendance_condonation FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') IN ('student','teacher'));
DROP POLICY IF EXISTS "cond_teacher_update" ON attendance_condonation;
CREATE POLICY "cond_teacher_update"   ON attendance_condonation FOR UPDATE TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'teacher');
DROP POLICY IF EXISTS "cond_hod_update" ON attendance_condonation;
CREATE POLICY "cond_hod_update"       ON attendance_condonation FOR UPDATE TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'hod');
DROP POLICY IF EXISTS "cond_admin_all" ON attendance_condonation;
CREATE POLICY "cond_admin_all"        ON attendance_condonation FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- CT MARKS TABLE
ALTER TABLE ct_marks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ct_student_own" ON ct_marks;
CREATE POLICY "ct_student_own"        ON ct_marks FOR SELECT TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'student'
    AND student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "ct_teacher_select" ON ct_marks;
CREATE POLICY "ct_teacher_select"     ON ct_marks FOR SELECT TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'teacher');
DROP POLICY IF EXISTS "ct_hod_admin_select" ON ct_marks;
CREATE POLICY "ct_hod_admin_select"   ON ct_marks FOR SELECT TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('hod','admin'));
DROP POLICY IF EXISTS "ct_teacher_insert" ON ct_marks;
CREATE POLICY "ct_teacher_insert"     ON ct_marks FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'teacher'
    AND EXISTS (SELECT 1 FROM subject_assignments
      WHERE subject_assignments.subject_id = ct_marks.subject_id
        AND subject_assignments.teacher_id = auth.uid()));
DROP POLICY IF EXISTS "ct_hod_admin_all" ON ct_marks;
CREATE POLICY "ct_hod_admin_all"      ON ct_marks FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('hod','admin'));

-- ENDSEM MARKS TABLE
ALTER TABLE endsem_marks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "es_student_own" ON endsem_marks;
CREATE POLICY "es_student_own"        ON endsem_marks FOR SELECT TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'student'
    AND student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "es_staff_select" ON endsem_marks;
CREATE POLICY "es_staff_select"       ON endsem_marks FOR SELECT TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('teacher','hod','admin'));
DROP POLICY IF EXISTS "es_hod_update" ON endsem_marks;
CREATE POLICY "es_hod_update"         ON endsem_marks FOR UPDATE TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'hod');
DROP POLICY IF EXISTS "es_admin_all" ON endsem_marks;
CREATE POLICY "es_admin_all"          ON endsem_marks FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- HOLIDAYS TABLE
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hol_select_all" ON holidays;
CREATE POLICY "hol_select_all"  ON holidays FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "hol_hod_insert" ON holidays;
CREATE POLICY "hol_hod_insert"  ON holidays FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'hod');
DROP POLICY IF EXISTS "hol_admin_all" ON holidays;
CREATE POLICY "hol_admin_all"   ON holidays FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- TIMETABLE TABLE
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tt_select_all" ON timetable;
CREATE POLICY "tt_select_all"      ON timetable FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "tt_admin_hod_all" ON timetable;
CREATE POLICY "tt_admin_hod_all"   ON timetable FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hod'));

-- TIMETABLE CHANGE LOG TABLE
ALTER TABLE timetable_change_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ttcl_select_all" ON timetable_change_log;
CREATE POLICY "ttcl_select_all"  ON timetable_change_log FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ttcl_staff_insert" ON timetable_change_log;
CREATE POLICY "ttcl_staff_insert" ON timetable_change_log FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hod','teacher'));

-- SUBSTITUTE LOG TABLE
ALTER TABLE substitute_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sl_select_all" ON substitute_log;
CREATE POLICY "sl_select_all"     ON substitute_log FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "sl_staff_insert" ON substitute_log;
CREATE POLICY "sl_staff_insert"   ON substitute_log FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') IN ('hod','admin','teacher'));
DROP POLICY IF EXISTS "sl_teacher_update" ON substitute_log;
CREATE POLICY "sl_teacher_update" ON substitute_log FOR UPDATE TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'teacher'
    AND substitute_teacher_id = auth.uid());
DROP POLICY IF EXISTS "sl_hod_admin_all" ON substitute_log;
CREATE POLICY "sl_hod_admin_all"  ON substitute_log FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('hod','admin'));

-- LEAVE REQUESTS TABLE
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lr_select_all" ON leave_requests;
CREATE POLICY "lr_select_all"      ON leave_requests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "lr_teacher_insert" ON leave_requests;
CREATE POLICY "lr_teacher_insert"  ON leave_requests FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'teacher' AND teacher_id = auth.uid());
DROP POLICY IF EXISTS "lr_hod_update" ON leave_requests;
CREATE POLICY "lr_hod_update"      ON leave_requests FOR UPDATE TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'hod');
DROP POLICY IF EXISTS "lr_admin_all" ON leave_requests;
CREATE POLICY "lr_admin_all"       ON leave_requests FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- NOTICES TABLE
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "n_select_active" ON notices;
CREATE POLICY "n_select_active"    ON notices FOR SELECT TO authenticated
  USING (is_active = true);
DROP POLICY IF EXISTS "n_teacher_own" ON notices;
CREATE POLICY "n_teacher_own"      ON notices FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'teacher' AND created_by = auth.uid());
DROP POLICY IF EXISTS "n_hod_all" ON notices;
CREATE POLICY "n_hod_all"          ON notices FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'hod');
DROP POLICY IF EXISTS "n_admin_all" ON notices;
CREATE POLICY "n_admin_all"        ON notices FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- ASSIGNMENT SUBMISSIONS TABLE
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "as_select_all" ON assignment_submissions;
CREATE POLICY "as_select_all"      ON assignment_submissions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "as_student_insert" ON assignment_submissions;
CREATE POLICY "as_student_insert"  ON assignment_submissions FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'student');

-- BULK UPLOAD LOGS TABLE
ALTER TABLE bulk_upload_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bul_admin_all" ON bulk_upload_logs;
CREATE POLICY "bul_admin_all"      ON bulk_upload_logs FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- SEMESTER TRANSITIONS TABLE
ALTER TABLE semester_transitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "st_admin_all" ON semester_transitions;
CREATE POLICY "st_admin_all"       ON semester_transitions FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin')
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- SYSTEM CONFIG TABLE
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sc_select_all" ON system_config;
CREATE POLICY "sc_select_all"      ON system_config FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "sc_hod_update_lpd" ON system_config;
CREATE POLICY "sc_hod_update_lpd"  ON system_config FOR UPDATE TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'hod' AND key = 'lectures_per_day');
DROP POLICY IF EXISTS "sc_admin_all" ON system_config;
CREATE POLICY "sc_admin_all"       ON system_config FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- SEMESTER SUMMARY TABLE
ALTER TABLE semester_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ss_select_all" ON semester_summary;
CREATE POLICY "ss_select_all"   ON semester_summary FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ss_auth_insert" ON semester_summary;
CREATE POLICY "ss_auth_insert"  ON semester_summary FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ss_auth_update" ON semester_summary;
CREATE POLICY "ss_auth_update"  ON semester_summary FOR UPDATE TO authenticated USING (true);

-- ARCHIVE LOG TABLE
ALTER TABLE archive_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "al_hod_admin_select" ON archive_log;
CREATE POLICY "al_hod_admin_select" ON archive_log FOR SELECT TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('admin','hod'));
DROP POLICY IF EXISTS "al_admin_insert" ON archive_log;
CREATE POLICY "al_admin_insert"     ON archive_log FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- 7. GRANTS
GRANT USAGE  ON SCHEMA public TO anon, authenticated;
GRANT ALL    ON ALL TABLES    IN SCHEMA public TO anon, authenticated;
GRANT ALL    ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL    ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
