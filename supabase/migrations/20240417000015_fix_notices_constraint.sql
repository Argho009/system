-- Aligning check constraint for notices with UI values
ALTER TABLE public.notices DROP CONSTRAINT IF EXISTS notices_type_check;

-- Supporting lowercase normalization and adding 'event' type
ALTER TABLE public.notices ADD CONSTRAINT notices_type_check 
CHECK (LOWER(type) IN ('assignment', 'lab', 'library', 'general', 'event', 'holiday', 'exam'));
