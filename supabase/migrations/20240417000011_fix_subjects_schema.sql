-- Adding missing columns to subjects table
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 3;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('Theory', 'Lab', 'Seminar', 'Project')) DEFAULT 'Theory';
