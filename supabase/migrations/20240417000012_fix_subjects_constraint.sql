-- Aligning check constraint with UI values
-- Dropping old constraint and adding more inclusive one
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_type_check;

-- Standardizing to lowercase types to match UI values
ALTER TABLE public.subjects ADD CONSTRAINT subjects_type_check 
CHECK (LOWER(type) IN ('theory', 'lab', 'seminar', 'project', 'elective'));
