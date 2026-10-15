-- 1. Create Sales table
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dealer_id UUID REFERENCES public.dealers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    sale_price NUMERIC NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    status TEXT DEFAULT 'completed',
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_bulk BOOLEAN DEFAULT false
);

-- If the table already existed, add the new columns (ignores if they already exist, but Postgres doesn't support IF NOT EXISTS on ADD COLUMN easily unless we use DO block, so we will just try to add them and if it fails, it means they exist. A safer approach for users is just standard alter)
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.sales ADD COLUMN customer_name TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
    BEGIN
        ALTER TABLE public.sales ADD COLUMN customer_phone TEXT;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
    BEGIN
        ALTER TABLE public.sales ADD COLUMN status TEXT DEFAULT 'completed';
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;


-- Enable RLS for Sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dealers can view own sales" ON public.sales;
DROP POLICY IF EXISTS "Dealers can insert own sales" ON public.sales;
DROP POLICY IF EXISTS "Dealers can update own sales" ON public.sales;

CREATE POLICY "Dealers can view own sales" ON public.sales FOR SELECT USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can insert own sales" ON public.sales FOR INSERT WITH CHECK (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can update own sales" ON public.sales FOR UPDATE USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;


-- 2. Create Stock Transactions Table (History)
CREATE TABLE IF NOT EXISTS public.stock_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dealer_id UUID REFERENCES public.dealers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT,
    previous_stock INTEGER NOT NULL,
    updated_stock INTEGER NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Stock Transactions
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dealers can view own transactions" ON public.stock_transactions;
DROP POLICY IF EXISTS "Dealers can insert own transactions" ON public.stock_transactions;
DROP POLICY IF EXISTS "Dealers can update own transactions" ON public.stock_transactions;

CREATE POLICY "Dealers can view own transactions" ON public.stock_transactions FOR SELECT USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can insert own transactions" ON public.stock_transactions FOR INSERT WITH CHECK (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can update own transactions" ON public.stock_transactions FOR UPDATE USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_transactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_transactions TO authenticated;
