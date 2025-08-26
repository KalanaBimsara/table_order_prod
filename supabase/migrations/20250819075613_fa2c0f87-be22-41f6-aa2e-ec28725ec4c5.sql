-- Enable Row Level Security on super_admin_sessions table
ALTER TABLE public.super_admin_sessions ENABLE ROW LEVEL SECURITY;

-- No policies are needed because this table should only be accessed through
-- the security definer RPC functions (super_admin_sign_in, super_admin_get_session, super_admin_sign_out)
-- This ensures that session tokens cannot be directly accessed by any client