-- Add l_shape_orientation column to order_tables
ALTER TABLE public.order_tables
ADD COLUMN l_shape_orientation text;

COMMENT ON COLUMN public.order_tables.l_shape_orientation IS 'Orientation for L-shaped tables: normal or reverse';