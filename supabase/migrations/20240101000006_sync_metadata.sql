-- Migration to sync all users from public.users to auth.users app_metadata
-- This ensures RLS policies based on auth.jwt() -> 'app_metadata' ->> 'role' work correctly.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id, role FROM public.users LOOP
        UPDATE auth.users
        SET raw_app_meta_data = 
            jsonb_set(
                COALESCE(raw_app_meta_data, '{}'::jsonb),
                '{role}',
                to_jsonb(r.role)
            )
        WHERE id = r.id;
    END LOOP;
END $$;
