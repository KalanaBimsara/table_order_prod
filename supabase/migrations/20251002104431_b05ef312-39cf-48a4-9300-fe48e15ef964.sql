-- Add front panel columns to order_tables
ALTER TABLE public.order_tables 
ADD COLUMN IF NOT EXISTS front_panel_size text,
ADD COLUMN IF NOT EXISTS front_panel_length numeric;