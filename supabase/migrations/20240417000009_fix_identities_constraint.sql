-- Fix for identities table not-null constraint error
-- Adding provider_id to the manual insertions.

CREATE OR REPLACE FUNCTION public.create_system_user(
    u_college_id text,
    u_password text,
    u_name text,
    u_role text,
    u_branch text DEFAULT NULL,
    u_sem integer DEFAULT NULL,
    u_roll_no text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    new_user_id uuid := gen_random_uuid();
    encrypted_pw text;
BEGIN
    encrypted_pw := crypt(u_password, gen_salt('bf'));

    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, 
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
        created_at, updated_at, confirmation_token, 
        email_change_token_current, email_change_token_new, recovery_token
    )
    VALUES (
        new_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 
        'authenticated', u_college_id || '@college', encrypted_pw,
        now(), 
        jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', u_role),
        jsonb_build_object('name', u_name),
        now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    )
    VALUES (
        new_user_id,
        new_user_id,
        jsonb_build_object('sub', new_user_id, 'email', u_college_id || '@college'),
        'email',
        new_user_id, -- provider_id is the user ID for email provider in this context
        now(),
        now(),
        now()
    );

    INSERT INTO public.users (id, college_id, name, role, initial_password)
    VALUES (new_user_id, u_college_id, u_name, u_role, u_password);

    IF u_role = 'student' AND u_roll_no IS NOT NULL THEN
        INSERT INTO public.students (user_id, roll_no, branch, sem)
        VALUES (new_user_id, u_roll_no, u_branch, u_sem);
    END IF;

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
            'authenticated', p_user.college_id || '@college', 
            crypt(COALESCE(p_user.initial_password, '123'), gen_salt('bf')),
            now(), 
            jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', p_user.role),
            jsonb_build_object('name', p_user.name),
            now(), now(), '', '', '', ''
        );
    ELSE
        UPDATE auth.users SET email = p_user.college_id || '@college' WHERE id = target_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = target_id) THEN
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
        )
        VALUES (
            target_id,
            target_id,
            jsonb_build_object('sub', target_id, 'email', p_user.college_id || '@college'),
            'email',
            target_id,
            now(),
            now(),
            now()
        );
    ELSE
        UPDATE auth.identities SET 
            identity_data = jsonb_build_object('sub', target_id, 'email', p_user.college_id || '@college'),
            provider_id = target_id
        WHERE user_id = target_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
