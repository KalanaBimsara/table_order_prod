-- Enable the pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Delete any existing super admin user
DELETE FROM public.super_admin_users WHERE username = 'admin';

-- Create the first super admin user with proper password hashing
INSERT INTO public.super_admin_users (username, email, password_hash, is_active)
VALUES (
  'admin',
  'admin@example.com',
  crypt('Kalana1812@', gen_salt('bf')),
  true
);