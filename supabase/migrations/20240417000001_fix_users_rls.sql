-- Drop existing policies on users table
DROP POLICY IF EXISTS "All roles: SELECT own row" ON users;
DROP POLICY IF EXISTS "Admin: full access to all rows" ON users;

-- Create more robust policies
CREATE POLICY "Admin: full access" ON users
  FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "User: select own profile" ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());
