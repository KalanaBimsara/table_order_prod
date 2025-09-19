-- Create the first super admin user
INSERT INTO public.super_admin_users (username, email, password_hash, is_active)
VALUES (
  'admin',
  'admin@example.com',
  crypt('Kalana1812@', gen_salt('bf')),
  true
);