-- ==============================================================================
-- INVENTORYX AI: ADD BILLING COLUMNS TO ORDERS TABLE
-- ==============================================================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/uygxkddglyrwrdsnbeid/sql

-- 1. Add billing status columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_billed BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS bill_number TEXT;

-- 2. Update permissions to allow anon & authenticated to insert and select is_billed
GRANT ALL ON public.orders TO anon, authenticated, service_role;

-- 3. Reload Supabase Schema Cache
NOTIFY pgrst, 'reload schema';
