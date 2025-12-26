-- Create transport table to store delivery/transport information
CREATE TABLE public.transport (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  transport_mode TEXT NOT NULL,
  loaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  loaded_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.transport ENABLE ROW LEVEL SECURITY;

-- Create policies for transport table
CREATE POLICY "Authenticated users can view transport" 
ON public.transport 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert transport" 
ON public.transport 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update transport" 
ON public.transport 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete transport" 
ON public.transport 
FOR DELETE 
USING (true);