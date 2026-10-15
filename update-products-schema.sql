-- 1. Create Products table (with all the new columns)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dealer_id UUID REFERENCES public.dealers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category TEXT,
    base_price NUMERIC,
    cost_price NUMERIC DEFAULT 0,
    supplier TEXT,
    image_url TEXT,
    description TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dealers can view own products" ON public.products;
DROP POLICY IF EXISTS "Dealers can insert own products" ON public.products;
DROP POLICY IF EXISTS "Dealers can update own products" ON public.products;

CREATE POLICY "Dealers can view own products" ON public.products FOR SELECT USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can insert own products" ON public.products FOR INSERT WITH CHECK (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can update own products" ON public.products FOR UPDATE USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;


-- 2. Create Inventory table (in case it is also missing)
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dealer_id UUID REFERENCES public.dealers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    stock_quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 5,
    sales_velocity NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'In Stock',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(dealer_id, product_id)
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view inventory" ON public.inventory;
DROP POLICY IF EXISTS "Dealers can insert own inventory" ON public.inventory;
DROP POLICY IF EXISTS "Dealers can update own inventory" ON public.inventory;

CREATE POLICY "Anyone can view inventory" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Dealers can insert own inventory" ON public.inventory FOR INSERT WITH CHECK (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can update own inventory" ON public.inventory FOR UPDATE USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO authenticated;


-- 3. Create Product Categories table
CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dealer_id UUID REFERENCES public.dealers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(dealer_id, name)
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dealers can view own categories" ON public.product_categories;
DROP POLICY IF EXISTS "Dealers can insert own categories" ON public.product_categories;
DROP POLICY IF EXISTS "Dealers can update own categories" ON public.product_categories;
DROP POLICY IF EXISTS "Dealers can delete own categories" ON public.product_categories;

CREATE POLICY "Dealers can view own categories" ON public.product_categories FOR SELECT USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can insert own categories" ON public.product_categories FOR INSERT WITH CHECK (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can update own categories" ON public.product_categories FOR UPDATE USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can delete own categories" ON public.product_categories FOR DELETE USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
