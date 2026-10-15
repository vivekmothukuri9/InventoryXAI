-- 1. Create Suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dealer_id UUID REFERENCES public.dealers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    gst_number TEXT,
    status TEXT DEFAULT 'Active',
    notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dealers can view own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Dealers can insert own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Dealers can update own suppliers" ON public.suppliers;

CREATE POLICY "Dealers can view own suppliers" ON public.suppliers FOR SELECT USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can insert own suppliers" ON public.suppliers FOR INSERT WITH CHECK (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can update own suppliers" ON public.suppliers FOR UPDATE USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;


-- 2. Modify Products table to link to supplier
-- Add supplier_id column. We use IF NOT EXISTS workaround by checking information_schema if possible,
-- but standard ADD COLUMN IF NOT EXISTS is supported in modern PostgreSQL.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;


-- 3. Create Purchases table
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dealer_id UUID REFERENCES public.dealers(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'Draft', -- Draft, Ordered, Received, Cancelled
    subtotal NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    notes TEXT,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Purchases
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dealers can view own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Dealers can insert own purchases" ON public.purchases;
DROP POLICY IF EXISTS "Dealers can update own purchases" ON public.purchases;

CREATE POLICY "Dealers can view own purchases" ON public.purchases FOR SELECT USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can insert own purchases" ON public.purchases FOR INSERT WITH CHECK (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can update own purchases" ON public.purchases FOR UPDATE USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;


-- 4. Create Purchase Items table
CREATE TABLE IF NOT EXISTS public.purchase_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC NOT NULL,
    total_price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: We don't necessarily need RLS on purchase_items if we always query through purchases,
-- but it's good practice. We can link to purchases for RLS.
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dealers can view own purchase items" ON public.purchase_items;
DROP POLICY IF EXISTS "Dealers can insert own purchase items" ON public.purchase_items;
DROP POLICY IF EXISTS "Dealers can update own purchase items" ON public.purchase_items;

CREATE POLICY "Dealers can view own purchase items" ON public.purchase_items FOR SELECT USING (
    purchase_id IN (SELECT id FROM public.purchases WHERE dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid()))
);
CREATE POLICY "Dealers can insert own purchase items" ON public.purchase_items FOR INSERT WITH CHECK (
    purchase_id IN (SELECT id FROM public.purchases WHERE dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid()))
);
CREATE POLICY "Dealers can update own purchase items" ON public.purchase_items FOR UPDATE USING (
    purchase_id IN (SELECT id FROM public.purchases WHERE dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid()))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_items TO authenticated;
