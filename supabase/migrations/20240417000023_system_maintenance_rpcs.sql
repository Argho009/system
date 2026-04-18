-- RPC to fix users who exist in auth.users but are missing records in auth.identities
-- This is a common issue that prevents login on the latest Supabase versions
CREATE OR REPLACE FUNCTION repair_missing_identities()
RETURNS TABLE (fixed_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    affected INT;
BEGIN
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
    SELECT id, id, jsonb_build_object('sub', id, 'email', email), 'email', id, now(), now()
    FROM auth.users
    WHERE NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = auth.users.id)
    ON CONFLICT (provider, provider_id) DO NOTHING;
    
    GET DIAGNOSTICS affected = ROW_COUNT;
    RETURN QUERY SELECT affected;
END;
$$;

-- RPC to get a health overview of the system
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS TABLE (
    user_count BIGINT,
    auth_user_count BIGINT,
    missing_identities BIGINT,
    total_attendance BIGINT,
    database_size_text TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY SELECT 
        (SELECT COUNT(*) FROM public.users WHERE deleted_at IS NULL),
        (SELECT COUNT(*) FROM auth.users),
        (SELECT COUNT(*) FROM auth.users u LEFT JOIN auth.identities i ON i.user_id = u.id WHERE i.id IS NULL),
        (SELECT COUNT(*) FROM public.attendance),
        pg_size_pretty(pg_database_size(current_database()));
END;
$$;
