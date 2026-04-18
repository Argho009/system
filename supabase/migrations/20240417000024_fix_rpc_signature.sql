-- ╔══════════════════════════════════════════════════════════════════╗
-- ║     REPAIR: create_system_user RPC SIGNATURE                     ║
-- ║     Unifies Frontend JS calls with Backend logic                 ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.create_system_user(
  p_college_id TEXT,
  p_name       TEXT,
  p_role       TEXT,
  p_additional_data JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  new_user_id  UUID := gen_random_uuid();
  encrypted_pw TEXT;
  final_email  TEXT;
  v_password   TEXT;
  v_roll_no    TEXT;
  v_branch     TEXT;
  v_sem        INTEGER;
BEGIN
  -- Extract password from additional_data or default to college_id
  v_password := COALESCE(p_additional_data->>'password', p_college_id);
  v_roll_no  := p_additional_data->>'roll_no';
  v_branch   := p_additional_data->>'branch';
  v_sem      := (p_additional_data->>'sem')::INTEGER;

  encrypted_pw := crypt(v_password, gen_salt('bf'));
  
  IF p_college_id LIKE '%@%' THEN
    final_email := p_college_id;
  ELSE
    final_email := p_college_id || '@college.edu';
  END IF;

  -- 1. Insert into auth.users (Security Definer allows this)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change_token_current,
    email_change_token_new, recovery_token
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    final_email, encrypted_pw, now(),
    jsonb_build_object('provider','email','providers',array['email'],'role',p_role),
    jsonb_build_object('name', p_name),
    now(), now(), '', '', '', ''
  );

  -- 2. Insert into auth.identities
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    new_user_id, new_user_id,
    jsonb_build_object('sub', new_user_id, 'email', final_email),
    'email', final_email, now(), now(), now()
  );

  -- 3. Insert into public.users
  INSERT INTO public.users (id, college_id, name, role, initial_password)
  VALUES (new_user_id, p_college_id, p_name, p_role, v_password);

  -- 4. Insert into public.students if role matches
  IF p_role = 'student' AND v_roll_no IS NOT NULL THEN
    INSERT INTO public.students (user_id, roll_no, branch, sem)
    VALUES (new_user_id, v_roll_no, v_branch, v_sem);
  END IF;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ALSO: Sync existing function signature if needed for backward compatibility
-- But the JSONB version is strictly better for JS objects.
