CREATE OR REPLACE FUNCTION public.super_admin_sign_in(p_username text, p_password text)
 RETURNS TABLE(session_id uuid, session_token text, expires_at timestamp with time zone, user_id uuid, username text, email text, last_login timestamp with time zone, is_active boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  user_record record;
  v_token text;
  v_expires_at timestamp with time zone;
  session_record record;
BEGIN
  SELECT u.id, u.username, u.email, u.password_hash, u.is_active, u.last_login
  INTO user_record
  FROM public.super_admin_users u
  WHERE u.username = p_username AND u.is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid username or password' USING ERRCODE = '28000';
  END IF;

  IF extensions.crypt(p_password, user_record.password_hash) <> user_record.password_hash THEN
    RAISE EXCEPTION 'Invalid username or password' USING ERRCODE = '28000';
  END IF;

  v_token := gen_random_uuid()::text;
  v_expires_at := now() + interval '24 hours';

  INSERT INTO public.super_admin_sessions(user_id, session_token, expires_at)
  VALUES (user_record.id, v_token, v_expires_at)
  RETURNING id, session_token, expires_at, user_id
  INTO session_record;

  UPDATE public.super_admin_users SET last_login = now() WHERE id = user_record.id;

  RETURN QUERY
  SELECT session_record.id, session_record.session_token, session_record.expires_at,
         user_record.id, user_record.username, user_record.email, now(), user_record.is_active;
END;
$function$;