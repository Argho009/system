-- Helper to sync an existing public user to auth.users if missing
CREATE OR REPLACE FUNCTION public.sync_user_to_auth(target_id uuid)
RETURNS void AS $$
DECLARE
    p_user record;
BEGIN
    SELECT * INTO p_user FROM public.users WHERE id = target_id;
    
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_id) THEN
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password, 
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
            created_at, updated_at, confirmation_token, 
            email_change_token_current, email_change_token_new, recovery_token
        )
        VALUES (
            target_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 
            'authenticated', p_user.college_id || '@college.edu', 
            crypt(COALESCE(p_user.initial_password, '123'), gen_salt('bf')),
            now(), 
            jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', p_user.role),
            jsonb_build_object('name', p_user.name),
            now(), now(), '', '', '', ''
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
