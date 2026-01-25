-- Create bills table to store generated bill history
CREATE TABLE public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number text NOT NULL UNIQUE,
  bill_to text NOT NULL,
  driver_name text,
  vehicle_number text,
  order_numbers text[] NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  total_quantity integer NOT NULL DEFAULT 0,
  bill_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Authenticated users can view bills"
ON public.bills
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert bills"
ON public.bills
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update their own bills"
ON public.bills
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can delete their own bills"
ON public.bills
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);