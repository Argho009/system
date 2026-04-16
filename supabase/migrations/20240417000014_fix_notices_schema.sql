-- Renaming column in notices table to match frontend code
ALTER TABLE public.notices RENAME COLUMN posted_by TO created_by;
