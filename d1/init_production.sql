-- ============================================================
-- init_production.sql — Unified Production Schema & Seed
-- ============================================================

DROP TABLE IF EXISTS semester_summary;
DROP TABLE IF EXISTS archive_log;
DROP TABLE IF EXISTS assignment_submissions;
DROP TABLE IF EXISTS notices;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS substitute_log;
DROP TABLE IF EXISTS holidays;
DROP TABLE IF EXISTS endsem_marks;
DROP TABLE IF EXISTS ct_marks;
DROP TABLE IF EXISTS manual_student_attendance_init;
DROP TABLE IF EXISTS manual_attendance_init;
DROP TABLE IF EXISTS attendance_condonation;
DROP TABLE IF EXISTS attendance_change_requests;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS lectures;
DROP TABLE IF EXISTS timetable_change_log;
DROP TABLE IF EXISTS timetable;
DROP TABLE IF EXISTS time_slots;
DROP TABLE IF EXISTS subject_assignments;
DROP TABLE IF EXISTS subject_branches;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS semester_transitions;
DROP TABLE IF EXISTS system_config;
DROP TABLE IF EXISTS bulk_upload_logs;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id                   TEXT PRIMARY KEY,
  college_id           TEXT UNIQUE NOT NULL,
  name                 TEXT NOT NULL,
  role                 TEXT NOT NULL CHECK (role IN ('admin','hod','teacher','student')),
  password_hash        TEXT NOT NULL,
  must_change_password INTEGER NOT NULL DEFAULT 1,
  is_active            INTEGER NOT NULL DEFAULT 1,
  deleted_at           TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- BRANCHES
-- ============================================================
CREATE TABLE branches (
  id         TEXT PRIMARY KEY,
  name       TEXT UNIQUE NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- STUDENTS
-- ============================================================
CREATE TABLE students (
  id         TEXT PRIMARY KEY,
  user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
  roll_no    TEXT UNIQUE NOT NULL,
  branch     TEXT NOT NULL REFERENCES branches(name) ON UPDATE CASCADE,
  sem        INTEGER NOT NULL CHECK (sem BETWEEN 1 AND 8),
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- SUBJECTS
-- ============================================================
CREATE TABLE subjects (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  code       TEXT UNIQUE NOT NULL,
  sem        INTEGER NOT NULL CHECK (sem BETWEEN 1 AND 8),
  type       TEXT NOT NULL DEFAULT 'theory' CHECK (type IN ('theory','lab','elective')),
  credits    INTEGER,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE subject_branches (
  subject_id  TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  branch_name TEXT NOT NULL REFERENCES branches(name) ON UPDATE CASCADE,
  PRIMARY KEY (subject_id, branch_name)
);

-- ============================================================
-- SUBJECT ASSIGNMENTS
-- ============================================================
CREATE TABLE subject_assignments (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  branch_name   TEXT NOT NULL REFERENCES branches(name) ON UPDATE CASCADE,
  teacher_id    TEXT NOT NULL REFERENCES users(id),
  academic_year TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(subject_id, branch_name, teacher_id, academic_year)
);

-- ============================================================
-- TIME SLOTS
-- ============================================================
CREATE TABLE time_slots (
  id          TEXT PRIMARY KEY,
  lecture_no  INTEGER UNIQUE NOT NULL CHECK (lecture_no BETWEEN 1 AND 8),
  label       TEXT NOT NULL,
  start_time  TEXT NOT NULL,
  end_time    TEXT NOT NULL,
  is_break    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO time_slots (id, lecture_no, label, start_time, end_time, is_break) VALUES
  ('ts-1', 1, 'Period 1',    '09:00', '09:50', 0),
  ('ts-2', 2, 'Period 2',    '09:50', '10:40', 0),
  ('ts-3', 3, 'Period 3',    '10:40', '11:30', 0),
  ('ts-4', 4, 'Lunch Break', '11:30', '12:10', 1),
  ('ts-5', 5, 'Period 4',    '12:10', '13:00', 0),
  ('ts-6', 6, 'Period 5',    '13:00', '13:50', 0),
  ('ts-7', 7, 'Period 6',    '13:50', '14:40', 0),
  ('ts-8', 8, 'Period 7',    '14:40', '15:30', 0);

-- ============================================================
-- TIMETABLE
-- ============================================================
CREATE TABLE timetable (
  id             TEXT PRIMARY KEY,
  branch         TEXT NOT NULL REFERENCES branches(name) ON UPDATE CASCADE,
  sem            INTEGER NOT NULL CHECK (sem BETWEEN 1 AND 8),
  day_of_week    TEXT NOT NULL CHECK (day_of_week IN (
                   'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
  lecture_no     INTEGER NOT NULL REFERENCES time_slots(lecture_no),
  subject_id     TEXT REFERENCES subjects(id),
  teacher_id     TEXT REFERENCES users(id),
  room           TEXT,
  effective_from TEXT NOT NULL DEFAULT (date('now')),
  effective_to   TEXT,
  edited_by      TEXT REFERENCES users(id),
  edited_at      TEXT,
  UNIQUE(branch, sem, day_of_week, lecture_no)
);

CREATE TABLE timetable_change_log (
  id                 TEXT PRIMARY KEY,
  timetable_id       TEXT REFERENCES timetable(id),
  changed_by         TEXT REFERENCES users(id),
  old_subject_id     TEXT,
  new_subject_id     TEXT,
  old_teacher_id     TEXT,
  new_teacher_id     TEXT,
  old_room           TEXT,
  new_room           TEXT,
  changed_at         TEXT NOT NULL DEFAULT (datetime('now')),
  branch             TEXT,
  sem                INTEGER,
  day_of_week        TEXT,
  lecture_no         INTEGER,
  change_description TEXT
);

-- ============================================================
-- LECTURES
-- ============================================================
CREATE TABLE lectures (
  id              TEXT PRIMARY KEY,
  subject_id      TEXT NOT NULL REFERENCES subjects(id),
  teacher_id      TEXT REFERENCES users(id),
  branch          TEXT NOT NULL REFERENCES branches(name) ON UPDATE CASCADE,
  sem             INTEGER NOT NULL CHECK (sem BETWEEN 1 AND 8),
  date            TEXT NOT NULL,
  lecture_no      INTEGER NOT NULL CHECK (lecture_no BETWEEN 1 AND 8),
  is_skipped      INTEGER NOT NULL DEFAULT 0,
  skip_reason     TEXT,
  is_proxy        INTEGER NOT NULL DEFAULT 0,
  proxy_marked_by TEXT REFERENCES users(id),
  proxy_status    TEXT CHECK (proxy_status IN ('pending','approved','rejected')) DEFAULT 'approved',
  academic_year   TEXT NOT NULL,
  blank_means     TEXT NOT NULL DEFAULT 'absent' CHECK (blank_means IN ('present','absent')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE TABLE attendance (
  id              TEXT PRIMARY KEY,
  lecture_id      TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  student_id      TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status          TEXT NOT NULL CHECK (status IN ('present','absent','late','excused')),
  remarks         TEXT,
  marked_by       TEXT REFERENCES users(id),
  edited_by       TEXT REFERENCES users(id),
  original_status TEXT CHECK (original_status IN ('present','absent','late','excused')),
  edited_at       TEXT,
  academic_year   TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(lecture_id, student_id)
);

CREATE TABLE attendance_change_requests (
  id               TEXT PRIMARY KEY,
  lecture_id       TEXT NOT NULL REFERENCES lectures(id),
  requested_by     TEXT NOT NULL REFERENCES users(id),
  student_id       TEXT NOT NULL REFERENCES students(id),
  requested_status TEXT NOT NULL CHECK (requested_status IN ('present','absent','late','excused')),
  reason           TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by      TEXT REFERENCES users(id),
  reviewed_at      TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE attendance_condonation (
  id                   TEXT PRIMARY KEY,
  student_id           TEXT NOT NULL REFERENCES students(id),
  subject_id           TEXT NOT NULL REFERENCES subjects(id),
  branch_name          TEXT NOT NULL REFERENCES branches(name) ON UPDATE CASCADE,
  sem                  INTEGER NOT NULL CHECK (sem BETWEEN 1 AND 8),
  lectures_condoned    INTEGER NOT NULL,
  reason               TEXT NOT NULL,
  document_url         TEXT,
  requested_by         TEXT REFERENCES users(id),
  teacher_confirmed_by TEXT REFERENCES users(id),
  approved_by          TEXT REFERENCES users(id),
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                         'pending','teacher_review','approved','rejected')),
  academic_year        TEXT NOT NULL,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- MANUAL ATTENDANCE INIT
-- ============================================================
CREATE TABLE manual_attendance_init (
  id                   TEXT PRIMARY KEY,
  teacher_id           TEXT NOT NULL REFERENCES users(id),
  subject_id           TEXT NOT NULL REFERENCES subjects(id),
  branch_name          TEXT NOT NULL REFERENCES branches(name) ON UPDATE CASCADE,
  sem                  INTEGER NOT NULL CHECK (sem BETWEEN 1 AND 8),
  academic_year        TEXT NOT NULL,
  total_lectures_init  INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(teacher_id, subject_id, branch_name, sem, academic_year)
);

CREATE TABLE manual_student_attendance_init (
  init_id            TEXT NOT NULL REFERENCES manual_attendance_init(id) ON DELETE CASCADE,
  student_id         TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  present_count_init INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (init_id, student_id)
);

-- ============================================================
-- MARKS
-- ============================================================
CREATE TABLE ct_marks (
  id             TEXT PRIMARY KEY,
  student_id     TEXT NOT NULL REFERENCES students(id),
  subject_id     TEXT NOT NULL REFERENCES subjects(id),
  test_name      TEXT NOT NULL,
  marks_obtained REAL,
  max_marks      REAL NOT NULL,
  uploaded_by    TEXT REFERENCES users(id),
  academic_year  TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, subject_id, test_name, academic_year)
);

CREATE TABLE endsem_marks (
  id            TEXT PRIMARY KEY,
  student_id    TEXT NOT NULL REFERENCES students(id),
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  sem           INTEGER NOT NULL CHECK (sem BETWEEN 1 AND 8),
  marks         REAL,
  submitted_by  TEXT REFERENCES users(id),
  verified_by   TEXT REFERENCES users(id),
  is_locked     INTEGER NOT NULL DEFAULT 0,
  poll_open     INTEGER NOT NULL DEFAULT 0,
  academic_year TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, subject_id, academic_year)
);

-- ============================================================
-- HOLIDAYS
-- ============================================================
CREATE TABLE holidays (
  id         TEXT PRIMARY KEY,
  date       TEXT UNIQUE NOT NULL,
  reason     TEXT NOT NULL,
  added_by   TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- LOGS & OTHERS
-- ============================================================
CREATE TABLE substitute_log (
  id                    TEXT PRIMARY KEY,
  timetable_id          TEXT REFERENCES timetable(id),
  lecture_id            TEXT REFERENCES lectures(id),
  date                  TEXT NOT NULL,
  original_teacher_id   TEXT NOT NULL REFERENCES users(id),
  substitute_teacher_id TEXT REFERENCES users(id),
  note                  TEXT,
  accepted_by           TEXT REFERENCES users(id),
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE leave_requests (
  id                   TEXT PRIMARY KEY,
  teacher_id           TEXT NOT NULL REFERENCES users(id),
  date                 TEXT NOT NULL,
  type                 TEXT NOT NULL CHECK (type IN ('planned','emergency')),
  reason               TEXT,
  suggested_substitute TEXT REFERENCES users(id),
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by          TEXT REFERENCES users(id),
  reviewed_at          TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE notices (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT,
  type       TEXT NOT NULL CHECK (type IN ('assignment','lab','library','general')),
  created_by TEXT REFERENCES users(id),
  subject_id TEXT REFERENCES subjects(id),
  branch     TEXT REFERENCES branches(name) ON UPDATE CASCADE,
  sem        INTEGER CHECK (sem BETWEEN 1 AND 8),
  due_date   TEXT,
  is_active  INTEGER NOT NULL DEFAULT 1,
  is_pinned  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE assignment_submissions (
  id           TEXT PRIMARY KEY,
  notice_id    TEXT NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  student_id   TEXT NOT NULL REFERENCES students(id),
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  file_url     TEXT,
  remarks      TEXT,
  status       TEXT NOT NULL DEFAULT 'missing' CHECK (status IN ('submitted','late','missing'))
);

CREATE TABLE bulk_upload_logs (
  id          TEXT PRIMARY KEY,
  uploaded_by TEXT REFERENCES users(id),
  file_name   TEXT,
  type        TEXT CHECK (type IN ('roles','marks','attendance','timetable')),
  status      TEXT CHECK (status IN ('success','partial','failed')),
  errors_json TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE semester_transitions (
  id                TEXT PRIMARY KEY,
  triggered_by      TEXT REFERENCES users(id),
  branch            TEXT REFERENCES branches(name) ON UPDATE CASCADE,
  old_sem           INTEGER,
  new_sem           INTEGER,
  affected_students INTEGER,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE system_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO system_config (key, value) VALUES
  ('lectures_per_day',        '8'),
  ('working_days_per_week',   '6'),
  ('current_academic_year',   '2024-25'),
  ('min_attendance_percent',  '75'),
  ('late_threshold_minutes',  '10'),
  ('proxy_auto_approve',      '1');

CREATE TABLE semester_summary (
  id               TEXT PRIMARY KEY,
  student_id       TEXT NOT NULL REFERENCES students(id),
  subject_id       TEXT NOT NULL REFERENCES subjects(id),
  sem              INTEGER NOT NULL CHECK (sem BETWEEN 1 AND 8),
  academic_year    TEXT NOT NULL,
  total_lectures   INTEGER NOT NULL,
  present          INTEGER NOT NULL,
  absent           INTEGER NOT NULL,
  late             INTEGER NOT NULL DEFAULT 0,
  excused          INTEGER NOT NULL DEFAULT 0,
  condoned         INTEGER NOT NULL DEFAULT 0,
  raw_percent      REAL NOT NULL,
  final_percent    REAL NOT NULL,
  archived_at      TEXT NOT NULL DEFAULT (datetime('now')),
  archive_file_url TEXT,
  UNIQUE(student_id, subject_id, sem, academic_year)
);

CREATE TABLE archive_log (
  id              TEXT PRIMARY KEY,
  archived_by     TEXT REFERENCES users(id),
  branch          TEXT NOT NULL REFERENCES branches(name),
  sem             INTEGER NOT NULL,
  academic_year   TEXT NOT NULL,
  students_count  INTEGER NOT NULL,
  subjects_count  INTEGER NOT NULL,
  rows_archived   INTEGER NOT NULL,
  rows_deleted    INTEGER NOT NULL,
  file_name       TEXT,
  file_url        TEXT,
  status          TEXT DEFAULT 'completed' CHECK (status IN ('completed','failed','partial')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_att_lecture      ON attendance(lecture_id);
CREATE INDEX idx_att_student      ON attendance(student_id);
CREATE INDEX idx_att_year         ON attendance(academic_year);
CREATE INDEX idx_att_status       ON attendance(status);
CREATE UNIQUE INDEX idx_lectures_unique ON lectures(subject_id, branch, date, lecture_no, teacher_id);
CREATE INDEX idx_students_branch_sem ON students(branch, sem);
CREATE INDEX idx_subjects_sem      ON subjects(sem);
CREATE INDEX idx_sub_branches_branch ON subject_branches(branch_name);
CREATE INDEX idx_subj_assign_subject ON subject_assignments(subject_id, academic_year);
CREATE INDEX idx_subj_assign_teacher ON subject_assignments(teacher_id, academic_year);
CREATE INDEX idx_subj_assign_branch  ON subject_assignments(branch_name, academic_year);
CREATE INDEX idx_timetable_branch_sem ON timetable(branch, sem);
CREATE INDEX idx_timetable_teacher    ON timetable(teacher_id);
CREATE INDEX idx_ct_marks_stu_sub ON ct_marks(student_id, subject_id);
CREATE UNIQUE INDEX idx_endsem_unique ON endsem_marks(student_id, subject_id, academic_year);
CREATE INDEX idx_leave_teacher       ON leave_requests(teacher_id, status);
CREATE INDEX idx_cond_stu_sub        ON attendance_condonation(student_id, subject_id);
CREATE INDEX idx_cond_branch_sem     ON attendance_condonation(branch_name, sem);
CREATE INDEX idx_att_req_lecture     ON attendance_change_requests(lecture_id, status);
CREATE INDEX idx_substitute_date     ON substitute_log(date, status);
CREATE INDEX idx_substitute_lecture  ON substitute_log(lecture_id);
CREATE INDEX idx_assign_submissions  ON assignment_submissions(notice_id, student_id);
CREATE INDEX idx_notices_branch_sem    ON notices(branch, sem);
CREATE INDEX idx_notices_active_pinned ON notices(is_active, is_pinned, created_at);
CREATE INDEX idx_manual_init_teacher ON manual_attendance_init(teacher_id, academic_year);
CREATE INDEX idx_manual_init_subject ON manual_attendance_init(subject_id, branch_name);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER trg_users_updated_at AFTER UPDATE ON users FOR EACH ROW
BEGIN UPDATE users SET updated_at = datetime('now') WHERE id = OLD.id; END;

CREATE TRIGGER trg_notices_updated_at AFTER UPDATE ON notices FOR EACH ROW
BEGIN UPDATE notices SET updated_at = datetime('now') WHERE id = OLD.id; END;

CREATE TRIGGER trg_system_config_updated_at AFTER UPDATE ON system_config FOR EACH ROW
BEGIN UPDATE system_config SET updated_at = datetime('now') WHERE key = OLD.key; END;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Initial Admin User
-- College ID: admin
-- Password: 123
INSERT INTO users (id, college_id, name, role, password_hash, must_change_password)
VALUES (
  'u-admin-root', 
  'admin', 
  'System Administrator', 
  'admin', 
  '$2a$10$ve74WiJc9k5VL4jFZrXBH.0nePAk1p3gpAJTDAPj6PjvWKfND0aOe', -- verified bcrypt for '123'
  1
) ON CONFLICT(college_id) DO NOTHING;

-- Initial Branches
INSERT INTO branches (id, name, created_by) VALUES
  ('b-cse', 'Computer Science & Engineering', 'u-admin-root'),
  ('b-ece', 'Electronics & Communication Engineering', 'u-admin-root'),
  ('b-me', 'Mechanical Engineering', 'u-admin-root'),
  ('b-ee', 'Electrical Engineering', 'u-admin-root')
ON CONFLICT(name) DO NOTHING;
