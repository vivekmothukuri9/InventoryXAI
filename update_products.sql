-- Run this in Supabase SQL Editor to link products directly to specific shops

-- 1. Add missing columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS dealer_id UUID REFERENCES public.dealers(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS cost_price NUMERIC,
ADD COLUMN IF NOT EXISTS supplier_id UUID,
ADD COLUMN IF NOT EXISTS supplier TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- 2. Drop the old generic policy
DROP POLICY IF EXISTS "Public can view products" ON public.products;

-- 3. Create strict security policies so shopkeepers only see their own products
CREATE POLICY "Dealers can view own products" ON public.products 
FOR SELECT USING (dealer_id = (SELECT id FROM public.dealers WHERE user_id = auth.uid()));

CREATE POLICY "Dealers can insert own products" ON public.products 
FOR INSERT WITH CHECK (dealer_id = (SELECT id FROM public.dealers WHERE user_id = auth.uid()));

CREATE POLICY "Dealers can update own products" ON public.products 
FOR UPDATE USING (dealer_id = (SELECT id FROM public.dealers WHERE user_id = auth.uid()));

CREATE POLICY "Dealers can delete own products" ON public.products 
FOR DELETE USING (dealer_id = (SELECT id FROM public.dealers WHERE user_id = auth.uid()));

-- Note: If you already have old dummy products, you can delete them by running:
-- TRUNCATE TABLE public.products CASCADE;
