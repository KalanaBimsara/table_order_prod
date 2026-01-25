-- Add whatsapp_number column to orders table
ALTER TABLE public.orders 
ADD COLUMN whatsapp_number text;