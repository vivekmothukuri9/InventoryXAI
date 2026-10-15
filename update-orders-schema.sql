-- 1. Create Orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dealer_id UUID REFERENCES public.dealers(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    customer_address TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Processing', 'Completed', 'Cancelled')),
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dealers can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Dealers can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Dealers can update own orders" ON public.orders;
DROP POLICY IF EXISTS "Dealers can delete own orders" ON public.orders;

CREATE POLICY "Dealers can view own orders" ON public.orders FOR SELECT USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can insert own orders" ON public.orders FOR INSERT WITH CHECK (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can update own orders" ON public.orders FOR UPDATE USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can delete own orders" ON public.orders FOR DELETE USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;


-- 2. Create Order Items table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL,
    total_price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Order Items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dealers can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Dealers can insert own order items" ON public.order_items;
DROP POLICY IF EXISTS "Dealers can update own order items" ON public.order_items;
DROP POLICY IF EXISTS "Dealers can delete own order items" ON public.order_items;

-- Order items are accessed through their parent order, but we can verify via orders table
CREATE POLICY "Dealers can view own order items" ON public.order_items FOR SELECT USING (
    order_id IN (SELECT id FROM public.orders WHERE dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid()))
);
CREATE POLICY "Dealers can insert own order items" ON public.order_items FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM public.orders WHERE dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid()))
);
CREATE POLICY "Dealers can update own order items" ON public.order_items FOR UPDATE USING (
    order_id IN (SELECT id FROM public.orders WHERE dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid()))
);
CREATE POLICY "Dealers can delete own order items" ON public.order_items FOR DELETE USING (
    order_id IN (SELECT id FROM public.orders WHERE dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid()))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
