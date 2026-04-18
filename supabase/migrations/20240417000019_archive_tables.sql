-- ─────────────────────────────────────────
-- SEMESTER SUMMARY TABLE
-- Stores permanent summary after raw data is archived
-- This stays in Supabase forever — it is tiny
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS semester_summary (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid references students(id),
  subject_id       uuid references subjects(id),
  sem              integer not null,
  academic_year    text not null,
  total_lectures   integer not null,
  present          integer not null,
  absent           integer not null,
  condoned         integer default 0,
  raw_percent      numeric not null,
  final_percent    numeric not null,
  archived_at      timestamptz default now(),
  archive_file_url text,
  unique(student_id, subject_id, sem, academic_year)
);

-- ─────────────────────────────────────────
-- ARCHIVE LOG TABLE
-- Tracks every archive action ever performed
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS archive_log (
  id             uuid primary key default gen_random_uuid(),
  archived_by    uuid references users(id),
  branch         text not null,
  sem            integer not null,
  academic_year  text not null,
  students_count integer not null,
  subjects_count integer not null,
  rows_archived  integer not null,
  rows_deleted   integer not null,
  file_name      text,
  file_url       text,
  status         text check (status in (
                   'completed', 'failed', 'partial'))
                   default 'completed',
  created_at     timestamptz default now()
);

-- ─────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────
ALTER TABLE semester_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_log ENABLE ROW LEVEL SECURITY;

-- semester_summary: all authenticated roles can read
CREATE POLICY "All roles read summary"
  ON semester_summary FOR SELECT
  USING (auth.role() = 'authenticated');

-- semester_summary: service role can write
CREATE POLICY "Service role insert summary"
  ON semester_summary FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role update summary"
  ON semester_summary FOR UPDATE
  USING (true);

-- archive_log: admin and hod can read
CREATE POLICY "Admin and HOD read archive log"
  ON archive_log FOR SELECT
  USING (auth.jwt()->>'role' in ('admin', 'hod'));

CREATE POLICY "Admin insert archive log"
  ON archive_log FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'admin');
