-- Fix for timetable and logging schema mismatches
-- 1. Add teacher_id to timetable for status indicator tracking
ALTER TABLE public.timetable ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.users(id);

-- 2. Update timetable_change_log to support the descriptive logging used in the UI
ALTER TABLE public.timetable_change_log ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE public.timetable_change_log ADD COLUMN IF NOT EXISTS sem INTEGER;
ALTER TABLE public.timetable_change_log ADD COLUMN IF NOT EXISTS day_of_week TEXT;
ALTER TABLE public.timetable_change_log ADD COLUMN IF NOT EXISTS lecture_no INTEGER;
ALTER TABLE public.timetable_change_log ADD COLUMN IF NOT EXISTS change_description TEXT;
