-- Support for Soft Delete and Recovery
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create an archive table for permanent record keeping if needed, 
-- but we will use the deleted_at flag for recovery.

-- Update RLS for normal users to skip deleted ones
-- We need to update existing SELECT policies on 'users'
DROP POLICY IF EXISTS "All: select own row" ON users;
CREATE POLICY "All: select own row" ON users FOR SELECT TO authenticated 
USING (id = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Admin: full access" ON users;
CREATE POLICY "Admin: full access" ON users FOR ALL TO authenticated 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Note: Admin can see deleted rows because the policy above is permissive.
-- But we will use filters in the UI to separate them.
