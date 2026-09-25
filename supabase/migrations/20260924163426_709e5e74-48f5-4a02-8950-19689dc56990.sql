REVOKE EXECUTE ON FUNCTION public.current_user_can_view_all_orders() FROM authenticated, anon, public;
DROP FUNCTION IF EXISTS public.current_user_can_view_all_orders();