-- ==============================================================================
-- INVENTORYX AI: APP PUBLISH & SHOP NAME INTEGRATION
-- ==============================================================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/uygxkddglyrwrdsnbeid/sql

-- 1. Add shop_name and app publish flags to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shop_name TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS in_app BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Backfill existing products with their dealer's shop name if empty
UPDATE public.products p
SET shop_name = d.shop_name
FROM public.dealers d
WHERE p.dealer_id = d.id AND (p.shop_name IS NULL OR p.shop_name = '');

-- 3. Allow Customer Mobile App (anon & authenticated) to view published products with shop names
DROP POLICY IF EXISTS "Public can view published products" ON public.products;
CREATE POLICY "Public can view published products" ON public.products
FOR SELECT TO anon, authenticated
USING (is_published = true OR is_published IS NULL);

-- 4. Ensure permissions are granted
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
