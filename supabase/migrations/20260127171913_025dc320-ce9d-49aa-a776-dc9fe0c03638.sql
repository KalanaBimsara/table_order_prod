-- Create bill_items table to store individual bill line items
CREATE TABLE public.bill_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  item text NOT NULL,
  order_number text NOT NULL,
  delivery_city text NOT NULL DEFAULT '',
  rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  is_extra_fee boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view bill items"
  ON public.bill_items FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert bill items"
  ON public.bill_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update bill items"
  ON public.bill_items FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete bill items"
  ON public.bill_items FOR DELETE
  USING (true);