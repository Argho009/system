-- ╔══════════════════════════════════════════════════════════════════╗
-- ║     REPAIR: GET BROKEN USERS FOR HEALTH AUDIT                    ║
-- ║     Identifies specific accounts with synchronization issues.    ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.get_broken_users()
RETURNS TABLE (
  id           UUID,
  college_id   TEXT,
  name         TEXT,
  role         TEXT,
  issue        TEXT
) AS $$
BEGIN
  RETURN QUERY
    -- Issue 1: Missing from Auth system
    SELECT 
      u.id, 
      u.college_id, 
      u.name, 
      u.role, 
      'Missing from Auth'::TEXT as issue
    FROM public.users u
    WHERE u.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id = u.id)
    
    UNION ALL

    -- Issue 2: Missing Identity (needed for token verification)
    SELECT 
      u.id, 
      u.college_id, 
      u.name, 
      u.role, 
      'Identity Mismatch'::TEXT as issue
    FROM public.users u
    JOIN auth.users a ON a.id = u.id
    WHERE u.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
