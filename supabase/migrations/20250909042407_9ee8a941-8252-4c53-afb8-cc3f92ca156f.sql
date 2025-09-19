-- Create a new super admin user with username "admin" and password "Kalana1812@"
INSERT INTO public.super_admin_users (username, email, password_hash, is_active)
VALUES (
  'admin',
  'admin@tableflow.com',
  crypt('Kalana1812@', gen_salt('bf')),
  true
);