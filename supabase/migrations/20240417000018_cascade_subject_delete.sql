-- Fix subject references to allow cascade deletion
ALTER TABLE public.lectures 
  DROP CONSTRAINT IF EXISTS lectures_subject_id_fkey, 
  ADD CONSTRAINT lectures_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;

ALTER TABLE public.attendance_condonation 
  DROP CONSTRAINT IF EXISTS attendance_condonation_subject_id_fkey, 
  ADD CONSTRAINT attendance_condonation_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;

ALTER TABLE public.ct_marks 
  DROP CONSTRAINT IF EXISTS ct_marks_subject_id_fkey, 
  ADD CONSTRAINT ct_marks_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;

ALTER TABLE public.endsem_marks 
  DROP CONSTRAINT IF EXISTS endsem_marks_subject_id_fkey, 
  ADD CONSTRAINT endsem_marks_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;

ALTER TABLE public.timetable 
  DROP CONSTRAINT IF EXISTS timetable_subject_id_fkey, 
  ADD CONSTRAINT timetable_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;

ALTER TABLE public.notices 
  DROP CONSTRAINT IF EXISTS notices_subject_id_fkey, 
  ADD CONSTRAINT notices_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;
