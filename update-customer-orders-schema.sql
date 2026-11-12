-- ==============================================================================
-- INVENTORYX AI: REAL-TIME CUSTOMER ORDERS SCHEMA (FIXED NOT NULL CONSTRAINTS)
-- ==============================================================================
-- Run this complete script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/uygxkddglyrwrdsnbeid/sql

-- 1. Create or Update 'orders' table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT,
    shop_name TEXT NOT NULL,
    total_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Confirmed',
    payment_method TEXT DEFAULT 'Cash on Delivery',
    delivery_address TEXT,
    customer_phone TEXT,
    customer_name TEXT DEFAULT 'Customer',
    dealer_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all required columns exist
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

-- Drop restrictive NOT NULL / foreign key constraints on older columns in orders
ALTER TABLE public.orders ALTER COLUMN customer_name DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN customer_name SET DEFAULT 'Customer';
ALTER TABLE public.orders ALTER COLUMN dealer_id DROP NOT NULL;

-- Relax status check constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled', 'Pending', 'Completed', 'Processing'));


-- 2. Create or Update 'order_items' table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    price NUMERIC DEFAULT 0,
    shop_name TEXT,
    product_id UUID,
    unit_price NUMERIC,
    total_price NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all required columns exist
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS shop_name TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS total_price NUMERIC;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- ⭐ FIX FOR ERROR 23502: Drop NOT NULL constraints from older schema columns
ALTER TABLE public.order_items ALTER COLUMN unit_price DROP NOT NULL;
ALTER TABLE public.order_items ALTER COLUMN total_price DROP NOT NULL;
ALTER TABLE public.order_items ALTER COLUMN product_id DROP NOT NULL;


-- 3. Automatic Price Synchronization Trigger (Backwards Compatibility)
-- Automatically calculates unit_price and total_price when Android app sends 'price'
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


-- 4. Row Level Security (RLS) Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Reset existing policies
DROP POLICY IF EXISTS "Allow anon insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all select orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all update orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all delete orders" ON public.orders;
DROP POLICY IF EXISTS "Dealers can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Dealers can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Dealers can update own orders" ON public.orders;
DROP POLICY IF EXISTS "Dealers can delete own orders" ON public.orders;

-- Allow Android app (anon) & logged-in shopkeepers to place orders
CREATE POLICY "Allow anon insert orders" 
ON public.orders FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Allow viewing orders
CREATE POLICY "Allow all select orders" 
ON public.orders FOR SELECT 
TO anon, authenticated 
USING (true);

-- Allow shopkeepers to update order status
CREATE POLICY "Allow all update orders" 
ON public.orders FOR UPDATE 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all delete orders" 
ON public.orders FOR DELETE 
TO anon, authenticated 
USING (true);

-- Order Items Policies
DROP POLICY IF EXISTS "Allow anon insert order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow all select order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow all update order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow all delete order_items" ON public.order_items;
DROP POLICY IF EXISTS "Dealers can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Dealers can insert own order items" ON public.order_items;
DROP POLICY IF EXISTS "Dealers can update own order items" ON public.order_items;
DROP POLICY IF EXISTS "Dealers can delete own order items" ON public.order_items;

CREATE POLICY "Allow anon insert order_items" 
ON public.order_items FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Allow all select order_items" 
ON public.order_items FOR SELECT 
TO anon, authenticated 
USING (true);

CREATE POLICY "Allow all update order_items" 
ON public.order_items FOR UPDATE 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all delete order_items" 
ON public.order_items FOR DELETE 
TO anon, authenticated 
USING (true);

-- Grant privileges to anon and authenticated roles
GRANT ALL ON public.orders TO anon, authenticated, service_role;
GRANT ALL ON public.order_items TO anon, authenticated, service_role;


-- 5. CRITICAL: Enable Supabase Realtime Publication
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


-- 6. Sample Initial Data for Testing
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

-- Sample Order Items (Providing unit_price and total_price so no constraint can fail)
INSERT INTO public.order_items (order_id, product_name, quantity, price, unit_price, total_price, shop_name)
SELECT id, 'Basmati Rice (5kg)', 1, 350.00, 350.00, 350.00, 'Sri Lakshmi General Store'
FROM public.orders WHERE order_number = 'ORD-7821' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.order_items (order_id, product_name, quantity, price, unit_price, total_price, shop_name)
SELECT id, 'Tata Salt (1kg)', 2, 74.50, 74.50, 149.00, 'Sri Lakshmi General Store'
FROM public.orders WHERE order_number = 'ORD-7821' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.order_items (order_id, product_name, quantity, price, unit_price, total_price, shop_name)
SELECT id, 'Samsung Fast Charger 65W', 1, 1450.00, 1450.00, 1450.00, 'Ramesh Electronics'
FROM public.orders WHERE order_number = 'ORD-7822' LIMIT 1
ON CONFLICT DO NOTHING;

-- Reload Supabase Schema Cache
NOTIFY pgrst, 'reload schema';
