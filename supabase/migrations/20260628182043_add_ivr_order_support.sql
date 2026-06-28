ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS source text DEFAULT 'app',
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS caller_phone text,
ADD COLUMN IF NOT EXISTS ivr_call_id text;

CREATE INDEX IF NOT EXISTS idx_orders_source ON public.orders(source);
CREATE INDEX IF NOT EXISTS idx_orders_caller_phone ON public.orders(caller_phone) WHERE caller_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_ivr_call_id ON public.orders(ivr_call_id) WHERE ivr_call_id IS NOT NULL;
