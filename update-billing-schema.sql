-- ==============================================================================
-- INVENTORYX AI: COMPREHENSIVE BILLING MODULE SCHEMA & ATOMIC RPC TRANSACTIONS
-- ==============================================================================
-- Run this complete script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/uygxkddglyrwrdsnbeid/sql

-- 1. Create Bills Table
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
    bill_number TEXT NOT NULL,
    bill_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_type TEXT DEFAULT 'walk-in' CHECK (customer_type IN ('walk-in', 'shopkeeper', 'regular')),
    customer_id UUID REFERENCES public.dealers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL DEFAULT 'Walk-in Customer',
    customer_phone TEXT,
    customer_address TEXT,
    subtotal NUMERIC NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    item_discount_total NUMERIC NOT NULL DEFAULT 0 CHECK (item_discount_total >= 0),
    bill_discount NUMERIC NOT NULL DEFAULT 0 CHECK (bill_discount >= 0),
    tax_rate NUMERIC NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
    tax_amount NUMERIC NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    grand_total NUMERIC NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
    paid_amount NUMERIC NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    balance_due NUMERIC NOT NULL DEFAULT 0 CHECK (balance_due >= 0),
    payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'UPI', 'Card', 'Credit', 'Bank Transfer')),
    payment_status TEXT NOT NULL DEFAULT 'Paid' CHECK (payment_status IN ('Paid', 'Partially Paid', 'Unpaid')),
    status TEXT NOT NULL DEFAULT 'finalized' CHECK (status IN ('finalized', 'voided')),
    notes TEXT,
    void_reason TEXT,
    voided_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_dealer_bill_number UNIQUE (dealer_id, bill_number)
);

-- Ensure all columns exist in case table was partially created
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'walk-in';
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS customer_name TEXT DEFAULT 'Walk-in Customer';
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS item_discount_total NUMERIC DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS bill_discount NUMERIC DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS grand_total NUMERIC DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS balance_due NUMERIC DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Cash';
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Paid';
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'finalized';
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS void_reason TEXT;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS voided_at TIMESTAMP WITH TIME ZONE;


-- 2. Create Bill Items Table
CREATE TABLE IF NOT EXISTS public.bill_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL,
    sku TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
    discount_percent NUMERIC NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    discount_amount NUMERIC NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    line_total NUMERIC NOT NULL CHECK (line_total >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 3. Add bill_id reference to existing Sales table to link sales items with bills
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.sales ADD COLUMN bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE;
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;


-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dealers can view own bills" ON public.bills;
DROP POLICY IF EXISTS "Dealers can insert own bills" ON public.bills;
DROP POLICY IF EXISTS "Dealers can update own bills" ON public.bills;

CREATE POLICY "Dealers can view own bills" ON public.bills FOR SELECT USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can insert own bills" ON public.bills FOR INSERT WITH CHECK (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can update own bills" ON public.bills FOR UPDATE USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);

ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dealers can view own bill items" ON public.bill_items;
DROP POLICY IF EXISTS "Dealers can insert own bill items" ON public.bill_items;
DROP POLICY IF EXISTS "Dealers can update own bill items" ON public.bill_items;

CREATE POLICY "Dealers can view own bill items" ON public.bill_items FOR SELECT USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can insert own bill items" ON public.bill_items FOR INSERT WITH CHECK (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);
CREATE POLICY "Dealers can update own bill items" ON public.bill_items FOR UPDATE USING (
    dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bill_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bill_items TO anon;

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_bills_dealer_date ON public.bills(dealer_id, bill_date DESC);
CREATE INDEX IF NOT EXISTS idx_bills_dealer_status ON public.bills(dealer_id, status);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON public.bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_sales_bill_id ON public.sales(bill_id);


-- ==============================================================================
-- 5. ATOMIC RPC FUNCTION: CREATE BILL
-- Validates stock, calculates balances, records bill, items, sales, and deducts inventory
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_bill(
    p_bill_number TEXT,
    p_bill_date TIMESTAMPTZ,
    p_customer_type TEXT,
    p_customer_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_address TEXT,
    p_items JSONB,
    p_subtotal NUMERIC,
    p_item_discount_total NUMERIC,
    p_bill_discount NUMERIC,
    p_tax_rate NUMERIC,
    p_tax_amount NUMERIC,
    p_grand_total NUMERIC,
    p_paid_amount NUMERIC,
    p_payment_method TEXT,
    p_notes TEXT
)
RETURNS JSON AS $$
DECLARE
    v_dealer_id UUID;
    v_bill_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_quantity INTEGER;
    v_unit_price NUMERIC;
    v_disc_pct NUMERIC;
    v_disc_amt NUMERIC;
    v_line_total NUMERIC;
    v_prod_name TEXT;
    v_sku TEXT;
    v_current_stock INTEGER;
    v_new_stock INTEGER;
    v_balance_due NUMERIC;
    v_payment_status TEXT;
    v_calc_subtotal NUMERIC := 0;
    v_effective_unit_price NUMERIC;
BEGIN
    -- 1. Securely resolve dealer ID from authenticated user
    SELECT id INTO v_dealer_id 
    FROM public.dealers 
    WHERE user_id = auth.uid();

    IF v_dealer_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Dealer profile not found for authenticated user';
    END IF;

    -- 2. Validate input items
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Cannot create bill with empty product items';
    END IF;

    -- 3. Calculate Balance and Payment Status accurately
    IF p_paid_amount < 0 THEN
        RAISE EXCEPTION 'Paid amount cannot be negative';
    END IF;

    v_balance_due := GREATEST(0, p_grand_total - p_paid_amount);

    IF v_balance_due = 0 THEN
        v_payment_status := 'Paid';
    ELSIF p_paid_amount > 0 THEN
        v_payment_status := 'Partially Paid';
    ELSE
        v_payment_status := 'Unpaid';
    END IF;

    -- Strictly ensure a bill cannot be marked paid when money is outstanding
    IF v_balance_due > 0 AND v_payment_status = 'Paid' THEN
        RAISE EXCEPTION 'Bill cannot be marked as Paid when an outstanding balance of % remains', v_balance_due;
    END IF;

    -- 4. Verify stock availability and lock inventory rows
    -- Iterate through each item, verify available stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::INTEGER;
        v_prod_name := COALESCE(v_item->>'product_name', 'Item');

        IF v_quantity <= 0 THEN
            RAISE EXCEPTION 'Invalid quantity % for product %', v_quantity, v_prod_name;
        END IF;

        -- Lock inventory row for update
        SELECT stock_quantity INTO v_current_stock
        FROM public.inventory
        WHERE dealer_id = v_dealer_id AND product_id = v_product_id
        FOR UPDATE;

        IF v_current_stock IS NULL THEN
            RAISE EXCEPTION 'Product % is not present in dealer inventory', v_prod_name;
        END IF;

        IF v_current_stock < v_quantity THEN
            RAISE EXCEPTION 'Insufficient stock for %. Requested: %, Available: %', v_prod_name, v_quantity, v_current_stock;
        END IF;
    END LOOP;

    -- 5. Insert Bill Record
    INSERT INTO public.bills (
        dealer_id, bill_number, bill_date, customer_type, customer_id, customer_name,
        customer_phone, customer_address, subtotal, item_discount_total, bill_discount,
        tax_rate, tax_amount, grand_total, paid_amount, balance_due, payment_method,
        payment_status, status, notes
    ) VALUES (
        v_dealer_id, p_bill_number, COALESCE(p_bill_date, now()), COALESCE(p_customer_type, 'walk-in'),
        p_customer_id, COALESCE(p_customer_name, 'Walk-in Customer'), p_customer_phone, p_customer_address,
        p_subtotal, p_item_discount_total, p_bill_discount, p_tax_rate, p_tax_amount,
        p_grand_total, p_paid_amount, v_balance_due, COALESCE(p_payment_method, 'Cash'),
        v_payment_status, 'finalized', p_notes
    ) RETURNING id INTO v_bill_id;

    -- 6. Insert Bill Items, Deduct Stock, and Record Sales/Transactions
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::INTEGER;
        v_unit_price := (v_item->>'unit_price')::NUMERIC;
        v_disc_pct := COALESCE((v_item->>'discount_percent')::NUMERIC, 0);
        v_disc_amt := COALESCE((v_item->>'discount_amount')::NUMERIC, 0);
        v_line_total := (v_item->>'line_total')::NUMERIC;
        v_prod_name := COALESCE(v_item->>'product_name', 'Item');
        v_sku := v_item->>'sku';

        -- Effective unit price for accurate sales analytics
        IF v_quantity > 0 THEN
            v_effective_unit_price := ROUND(v_line_total / v_quantity, 2);
        ELSE
            v_effective_unit_price := v_unit_price;
        END IF;

        -- Insert Bill Item
        INSERT INTO public.bill_items (
            bill_id, dealer_id, product_id, product_name, sku,
            quantity, unit_price, discount_percent, discount_amount, line_total
        ) VALUES (
            v_bill_id, v_dealer_id, v_product_id, v_prod_name, v_sku,
            v_quantity, v_unit_price, v_disc_pct, v_disc_amt, v_line_total
        );

        -- Get current stock again and update
        SELECT stock_quantity INTO v_current_stock
        FROM public.inventory
        WHERE dealer_id = v_dealer_id AND product_id = v_product_id;

        v_new_stock := v_current_stock - v_quantity;

        UPDATE public.inventory
        SET stock_quantity = v_new_stock,
            last_updated = COALESCE(p_bill_date, now())
        WHERE dealer_id = v_dealer_id AND product_id = v_product_id;

        -- Record Sale in existing sales table (unified with existing reports and analytics)
        INSERT INTO public.sales (
            dealer_id, product_id, quantity, sale_price, customer_name, customer_phone,
            sale_date, status, bill_id
        ) VALUES (
            v_dealer_id, v_product_id, v_quantity, v_effective_unit_price,
            COALESCE(p_customer_name, 'Walk-in Customer'), p_customer_phone,
            COALESCE(p_bill_date, now()), 'completed', v_bill_id
        );

        -- Record Stock Transaction Audit History
        INSERT INTO public.stock_transactions (
            dealer_id, product_id, action, quantity, reason,
            previous_stock, updated_stock, date
        ) VALUES (
            v_dealer_id, v_product_id, 'Bill Sale', v_quantity,
            'Billed under Bill #' || p_bill_number || COALESCE(' to ' || p_customer_name, ''),
            v_current_stock, v_new_stock, COALESCE(p_bill_date, now())
        );
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'bill_id', v_bill_id,
        'bill_number', p_bill_number,
        'grand_total', p_grand_total,
        'balance_due', v_balance_due,
        'payment_status', v_payment_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ==============================================================================
-- 6. ATOMIC RPC FUNCTION: VOID / CANCEL BILL
-- Safely voids a bill, restores deducted inventory, and marks sales as cancelled
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.void_bill(
    p_bill_id UUID,
    p_void_reason TEXT
)
RETURNS JSON AS $$
DECLARE
    v_dealer_id UUID;
    v_bill_status TEXT;
    v_bill_number TEXT;
    r_item RECORD;
    v_current_stock INTEGER;
    v_new_stock INTEGER;
    v_now TIMESTAMPTZ := now();
BEGIN
    -- 1. Securely resolve dealer ID from authenticated user
    SELECT id INTO v_dealer_id 
    FROM public.dealers 
    WHERE user_id = auth.uid();

    IF v_dealer_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Dealer profile not found for authenticated user';
    END IF;

    -- 2. Lock bill record
    SELECT status, bill_number INTO v_bill_status, v_bill_number
    FROM public.bills
    WHERE id = p_bill_id AND dealer_id = v_dealer_id
    FOR UPDATE;

    IF v_bill_status IS NULL THEN
        RAISE EXCEPTION 'Bill not found or you do not have permission to modify it';
    END IF;

    IF v_bill_status = 'voided' THEN
        RAISE EXCEPTION 'Bill % is already voided', v_bill_number;
    END IF;

    -- 3. Mark bill as voided with reason and audit timestamp
    UPDATE public.bills
    SET status = 'voided',
        void_reason = COALESCE(p_void_reason, 'Cancelled by dealer'),
        voided_at = v_now,
        updated_at = v_now
    WHERE id = p_bill_id;

    -- 4. Mark linked sales records as cancelled so Reports & AI Insights ignore them
    UPDATE public.sales
    SET status = 'cancelled'
    WHERE bill_id = p_bill_id AND dealer_id = v_dealer_id;

    -- 5. Restore stock in inventory and record audit transaction
    FOR r_item IN (
        SELECT product_id, quantity, product_name
        FROM public.bill_items
        WHERE bill_id = p_bill_id
    ) LOOP
        -- Lock inventory row
        SELECT stock_quantity INTO v_current_stock
        FROM public.inventory
        WHERE dealer_id = v_dealer_id AND product_id = r_item.product_id
        FOR UPDATE;

        IF v_current_stock IS NOT NULL THEN
            v_new_stock := v_current_stock + r_item.quantity;

            UPDATE public.inventory
            SET stock_quantity = v_new_stock,
                last_updated = v_now
            WHERE dealer_id = v_dealer_id AND product_id = r_item.product_id;

            -- Stock transaction record
            INSERT INTO public.stock_transactions (
                dealer_id, product_id, action, quantity, reason,
                previous_stock, updated_stock, date
            ) VALUES (
                v_dealer_id, r_item.product_id, 'Bill Voided', r_item.quantity,
                'Stock restored from Voided Bill #' || v_bill_number || COALESCE(': ' || p_void_reason, ''),
                v_current_stock, v_new_stock, v_now
            );
        END IF;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'bill_id', p_bill_id,
        'bill_number', v_bill_number,
        'status', 'voided'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
