-- Add manager role to the user_role enum if it doesn't exist
DO $$
BEGIN
    -- Check if manager role exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'manager' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'manager';
    END IF;
END $$;

-- Update delivery_status to support ready_for_delivery status
-- First, let's check the current values and add new ones if needed
DO $$
BEGIN
    -- Update any pending delivery status to be more explicit
    UPDATE public.orders 
    SET delivery_status = 'pending'
    WHERE delivery_status IS NULL OR delivery_status = '';
    
    -- We'll use text values for delivery_status: 'pending', 'ready_for_delivery', 'assigned', 'delivered'
    -- No need to create enum since it's already text field
END $$;

-- Create RLS policies for manager role to access orders
CREATE POLICY "Managers can view all orders" 
ON public.orders 
FOR SELECT 
USING (public.get_current_user_role() = 'manager' OR public.get_current_user_role() = 'admin');

CREATE POLICY "Managers can update order delivery status" 
ON public.orders 
FOR UPDATE 
USING (
    (public.get_current_user_role() = 'manager' OR public.get_current_user_role() = 'admin') 
    AND status = 'pending'
);

-- Allow managers to view order tables
CREATE POLICY "Managers can view order tables" 
ON public.order_tables 
FOR SELECT 
USING (
    EXISTS(
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_tables.order_id 
        AND (public.get_current_user_role() = 'manager' OR public.get_current_user_role() = 'admin')
    )
);