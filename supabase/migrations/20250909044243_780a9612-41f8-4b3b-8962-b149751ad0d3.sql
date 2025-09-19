-- Fix the super_admin_sign_in function - correct record variable assignment
CREATE OR REPLACE FUNCTION public.super_admin_sign_in(
  p_username text, 
  p_password text
) RETURNS TABLE(
  session_id uuid,
  session_token text,
  expires_at timestamptz,
  user_id uuid,
  username text,
  email text,
  last_login timestamptz,
  is_active boolean
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
DECLARE
  user_record record;
  v_token text;
  v_expires_at timestamptz;
  s record;
BEGIN
  -- Fetch active user - fix the variable assignment
  SELECT id, username, email, password_hash, is_active, last_login
  INTO user_record
  FROM public.super_admin_users
  WHERE username = p_username AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid username or password' USING ERRCODE = '28000';
  END IF;

  -- Validate password using bcrypt (pgcrypto's crypt())
  IF crypt(p_password, user_record.password_hash) <> user_record.password_hash THEN
    RAISE EXCEPTION 'Invalid username or password' USING ERRCODE = '28000';
  END IF;

  -- Create session
  v_token := gen_random_uuid()::text;
  v_expires_at := now() + interval '24 hours';

  INSERT INTO public.super_admin_sessions(user_id, session_token, expires_at)
  VALUES (user_record.id, v_token, v_expires_at)
  RETURNING id, session_token, expires_at, user_id INTO s;

  -- Update last login
  UPDATE public.super_admin_users SET last_login = now() WHERE id = user_record.id;

  -- Return the session and user data
  RETURN QUERY SELECT s.id, s.session_token, s.expires_at, user_record.id, user_record.username, user_record.email, now(), user_record.is_active;
END;
$$;