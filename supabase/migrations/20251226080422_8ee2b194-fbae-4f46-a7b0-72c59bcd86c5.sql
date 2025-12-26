-- Allow public/anonymous users to read orders by order form number for tracking
CREATE POLICY "Allow public to read orders by order form number"
ON public.orders
FOR SELECT
TO anon
USING (true);

-- Allow public/anonymous users to read order_tables for tracking
CREATE POLICY "Allow public to read order_tables"
ON public.order_tables
FOR SELECT
TO anon
USING (true);