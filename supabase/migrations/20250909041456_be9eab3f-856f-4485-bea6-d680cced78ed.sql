-- Reset password for SuperAdmin user to "Kalana1812@"
UPDATE public.super_admin_users 
SET password_hash = crypt('Kalana1812@', gen_salt('bf'))
WHERE username = 'SuperAdmin';