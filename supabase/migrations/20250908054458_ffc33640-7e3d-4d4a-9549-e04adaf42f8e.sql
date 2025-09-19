-- Add manager role to user_role enum
ALTER TYPE user_role ADD VALUE 'manager';

-- Add delivery_status column to orders table to track if orders are ready for delivery
ALTER TABLE public.orders ADD COLUMN delivery_status text DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'ready'));

-- Create RLS policies for manager role
CREATE POLICY "Managers can view all orders" 
ON public.orders 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'manager'
  )
);

CREATE POLICY "Managers can update order delivery status" 
ON public.orders 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'manager'
  )
);

-- Allow delivery personnel to see orders that are ready for delivery
CREATE POLICY "Delivery can view ready orders" 
ON public.orders 
FOR SELECT 
USING (
  delivery_status = 'ready' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'delivery'
  )
);