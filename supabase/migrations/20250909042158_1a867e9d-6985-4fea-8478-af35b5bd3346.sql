-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Reset password for SuperAdmin user to "Kalana1812@" with proper hashing
UPDATE public.super_admin_users 
SET password_hash = crypt('Kalana1812@', gen_salt('bf'))
WHERE username = 'SuperAdmin';