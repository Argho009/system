-- Function to create a complete user (Auth + Public) in one go
-- This allows the Admin to create accounts that are immediately loggable.

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
    -- 1. Encrypt password using pgcrypto (standard in Supabase)
    encrypted_pw := crypt(u_password, gen_salt('bf'));

    -- 2. Insert into auth.users
    INSERT INTO auth.users (
        id, 
        instance_id, 
        aud, 
        role, 
        email, 
        encrypted_password, 
        email_confirmed_at, 
        raw_app_meta_data, 
        raw_user_meta_data, 
        created_at, 
        updated_at,
        confirmation_token,
        email_change_token_current,
        email_change_token_new,
        recovery_token
    )
    VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        u_college_id || '@college.edu', -- Dummy email for auth
        encrypted_pw,
        now(),
        jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', u_role),
        jsonb_build_object('name', u_name),
        now(),
        now(),
        '', '', '', ''
    );

    -- 3. Insert into public.users
    INSERT INTO public.users (id, college_id, name, role, initial_password)
    VALUES (new_user_id, u_college_id, u_name, u_role, u_password);

    -- 4. If student, insert into public.students
    IF u_role = 'student' AND u_roll_no IS NOT NULL THEN
        INSERT INTO public.students (user_id, roll_no, branch, sem)
        VALUES (new_user_id, u_roll_no, u_branch, u_sem);
    END IF;

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
