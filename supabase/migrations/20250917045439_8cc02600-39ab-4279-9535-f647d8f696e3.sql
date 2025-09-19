-- Add customization columns to order_tables
ALTER TABLE public.order_tables 
ADD COLUMN leg_size TEXT,
ADD COLUMN leg_height TEXT,
ADD COLUMN wire_holes TEXT,
ADD COLUMN wire_holes_comment TEXT;