-- Create security definer function to get current user role (avoiding RLS recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path TO 'public';

-- Drop existing overly permissive analytics policies
DROP POLICY IF EXISTS "Analytics read access" ON public.daily_analytics;
DROP POLICY IF EXISTS "Analytics read access monthly" ON public.monthly_analytics;

-- Create restrictive policies for daily_analytics (admin access only)
CREATE POLICY "Admin can view daily analytics" 
ON public.daily_analytics 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

-- Create restrictive policies for monthly_analytics (admin access only)
CREATE POLICY "Admin can view monthly analytics" 
ON public.monthly_analytics 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');