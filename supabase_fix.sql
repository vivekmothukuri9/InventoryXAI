-- ==============================================================================
-- INVENTORYX AI: SUPABASE COMPLETE FIX SCRIPT
-- ==============================================================================
-- Clear your Supabase SQL Editor, paste this ENTIRE script, and click RUN:

-- STEP 1: ADD MISSING COLUMNS TO 'orders' TABLE
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shop_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Confirmed';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Cash on Delivery';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT DEFAULT 'Customer';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dealer_id UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Remove older restrictive NOT NULL constraints from 'orders'
ALTER TABLE public.orders ALTER COLUMN customer_name DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN customer_name SET DEFAULT 'Customer';
ALTER TABLE public.orders ALTER COLUMN dealer_id DROP NOT NULL;

-- Update status constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled', 'Pending', 'Completed', 'Processing'));


-- STEP 2: ADD MISSING COLUMNS TO 'order_items' TABLE & DROP NOT NULL CONSTRAINTS
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS shop_name TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS total_price NUMERIC;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_id UUID;

-- Drop older NOT NULL constraints so Android App items can insert smoothly
ALTER TABLE public.order_items ALTER COLUMN unit_price DROP NOT NULL;
ALTER TABLE public.order_items ALTER COLUMN total_price DROP NOT NULL;
ALTER TABLE public.order_items ALTER COLUMN product_id DROP NOT NULL;


-- STEP 3: AUTOMATIC PRICE SYNC TRIGGER (Syncs unit_price, price, and total_price)
CREATE OR REPLACE FUNCTION public.sync_order_items_pricing()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.price IS NULL AND NEW.unit_price IS NOT NULL THEN
        NEW.price := NEW.unit_price;
    ELSIF NEW.unit_price IS NULL AND NEW.price IS NOT NULL THEN
        NEW.unit_price := NEW.price;
    END IF;

    IF NEW.total_price IS NULL AND NEW.price IS NOT NULL AND NEW.quantity IS NOT NULL THEN
        NEW.total_price := NEW.price * NEW.quantity;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_order_items_pricing ON public.order_items;
CREATE TRIGGER trigger_sync_order_items_pricing
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_items_pricing();


-- STEP 4: ROW LEVEL SECURITY POLICIES (Allow Android App Anon Key & Shopkeepers)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all select orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all update orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all delete orders" ON public.orders;

CREATE POLICY "Allow anon insert orders" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow all select orders" ON public.orders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all update orders" ON public.orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete orders" ON public.orders FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon insert order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow all select order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow all update order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow all delete order_items" ON public.order_items;

CREATE POLICY "Allow anon insert order_items" ON public.order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow all select order_items" ON public.order_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow all update order_items" ON public.order_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete order_items" ON public.order_items FOR DELETE TO anon, authenticated USING (true);

GRANT ALL ON public.orders TO anon, authenticated, service_role;
GRANT ALL ON public.order_items TO anon, authenticated, service_role;


-- STEP 5: ENABLE SUPABASE REALTIME PUBLICATION
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
    END IF;
END $$;

ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;


-- STEP 6: RELOAD SUPABASE POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';


-- STEP 7: INSERT SAMPLE ORDERS (NOW GUARANTEED TO WORK)
INSERT INTO public.orders (
    order_number, shop_name, total_amount, status, payment_method, delivery_address, customer_phone, customer_name
) VALUES 
(
    'ORD-7821', 
    'Sri Lakshmi General Store', 
    499.00, 
    'Confirmed', 
    'UPI / Online', 
    'House #12-4/A, Road No. 3, KPHB Colony, Hyderabad', 
    '9876543210', 
    'Rahul Varma'
),
(
    'ORD-7822', 
    'Ramesh Electronics', 
    1450.00, 
    'Preparing', 
    'Cash on Delivery', 
    'Flat 302, Sai Residency, Ameerpet, Hyderabad', 
    '9123456780', 
    'Pooja Sharma'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.order_items (order_id, product_name, quantity, price, unit_price, total_price, shop_name)
SELECT id, 'Basmati Rice (5kg)', 1, 350.00, 350.00, 350.00, 'Sri Lakshmi General Store'
FROM public.orders WHERE order_number = 'ORD-7821' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.order_items (order_id, product_name, quantity, price, unit_price, total_price, shop_name)
SELECT id, 'Tata Salt (1kg)', 2, 74.50, 74.50, 149.00, 'Sri Lakshmi General Store'
FROM public.orders WHERE order_number = 'ORD-7821' LIMIT 1
ON CONFLICT DO NOTHING;
