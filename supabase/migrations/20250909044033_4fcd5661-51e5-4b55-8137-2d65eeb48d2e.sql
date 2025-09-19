-- Fix the super_admin_sign_in function with proper column references
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
AS $$
DECLARE
  u record;
  v_token text;
  v_expires_at timestamptz;
  s record;
BEGIN
  -- Fetch active user with explicit table prefix to avoid ambiguity
  SELECT u.id, u.username, u.email, u.password_hash, u.is_active, u.last_login
  INTO u
  FROM public.super_admin_users u
  WHERE u.username = p_username AND u.is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid username or password' USING ERRCODE = '28000';
  END IF;

  -- Validate password using bcrypt (pgcrypto's crypt())
  IF crypt(p_password, u.password_hash) <> u.password_hash THEN
    RAISE EXCEPTION 'Invalid username or password' USING ERRCODE = '28000';
  END IF;

  -- Create session
  v_token := gen_random_uuid()::text;
  v_expires_at := now() + interval '24 hours';

  INSERT INTO public.super_admin_sessions(user_id, session_token, expires_at)
  VALUES (u.id, v_token, v_expires_at)
  RETURNING id, session_token, expires_at, user_id INTO s;

  -- Update last login
  UPDATE public.super_admin_users SET last_login = now() WHERE id = u.id;

  -- Return the session and user data
  RETURN QUERY SELECT s.id, s.session_token, s.expires_at, u.id, u.username, u.email, now(), u.is_active;
END;
$$;