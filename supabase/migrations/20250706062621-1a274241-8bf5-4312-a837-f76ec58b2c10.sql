-- Add RLS policy to allow users to update their own orders (only pending orders)
CREATE POLICY "Users can update their own pending orders" 
ON public.orders 
FOR UPDATE 
USING (auth.uid() = created_by AND status = 'pending');

-- Add RLS policy to allow updating order tables for orders owned by the user
CREATE POLICY "Users can update their own order tables" 
ON public.order_tables 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_tables.order_id 
    AND orders.created_by = auth.uid() 
    AND orders.status = 'pending'
  )
);

-- Add RLS policy to allow deleting order tables for orders owned by the user  
CREATE POLICY "Users can delete their own order tables" 
ON public.order_tables 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_tables.order_id 
    AND orders.created_by = auth.uid() 
    AND orders.status = 'pending'
  )
);