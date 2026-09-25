ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_view_all_orders boolean NOT NULL DEFAULT false;

UPDATE public.profiles SET can_view_all_orders = true WHERE role IN ('admin','manager');

CREATE OR REPLACE FUNCTION public.current_user_can_view_all_orders()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT can_view_all_orders OR role IN ('admin','manager') FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_can_view_all_orders() TO authenticated;