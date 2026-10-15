-- 1. Add CHECK constraint for positive stock
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS check_stock_positive;
ALTER TABLE public.inventory ADD CONSTRAINT check_stock_positive CHECK (stock_quantity >= 0);

-- 2. RPC: Record Sale
CREATE OR REPLACE FUNCTION public.record_sale(
    p_dealer_id UUID,
    p_product_id UUID,
    p_quantity INTEGER,
    p_sale_price NUMERIC,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_sale_date TIMESTAMPTZ
)
RETURNS JSON AS $$
DECLARE
    v_current_stock INTEGER;
    v_new_stock INTEGER;
    v_sale_id UUID;
BEGIN
    -- Verify product exists and lock the row for update
    SELECT stock_quantity INTO v_current_stock
    FROM public.inventory
    WHERE dealer_id = p_dealer_id AND product_id = p_product_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
        RAISE EXCEPTION 'Product not found in inventory for this dealer';
    END IF;

    IF v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock. Only % available.', v_current_stock;
    END IF;

    v_new_stock := v_current_stock - p_quantity;

    -- Update Inventory
    UPDATE public.inventory
    SET stock_quantity = v_new_stock,
        last_updated = p_sale_date
    WHERE dealer_id = p_dealer_id AND product_id = p_product_id;

    -- Insert Sale
    INSERT INTO public.sales (
        dealer_id, product_id, quantity, sale_price, customer_name, customer_phone, sale_date, status
    ) VALUES (
        p_dealer_id, p_product_id, p_quantity, p_sale_price, p_customer_name, p_customer_phone, p_sale_date, 'completed'
    ) RETURNING id INTO v_sale_id;

    -- Create Stock Transaction
    INSERT INTO public.stock_transactions (
        dealer_id, product_id, action, quantity, reason, previous_stock, updated_stock, date
    ) VALUES (
        p_dealer_id, p_product_id, 'Sale', p_quantity, 'Sale recorded' || COALESCE(' to ' || p_customer_name, ''), v_current_stock, v_new_stock, p_sale_date
    );

    RETURN json_build_object('success', true, 'sale_id', v_sale_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. RPC: Complete Order
CREATE OR REPLACE FUNCTION public.complete_order(
    p_dealer_id UUID,
    p_order_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_order_status TEXT;
    v_customer_name TEXT;
    v_customer_phone TEXT;
    r_item RECORD;
    v_current_stock INTEGER;
    v_new_stock INTEGER;
    v_now TIMESTAMPTZ := now();
BEGIN
    -- Lock order row and verify
    SELECT status, customer_name, customer_phone INTO v_order_status, v_customer_name, v_customer_phone
    FROM public.orders
    WHERE id = p_order_id AND dealer_id = p_dealer_id
    FOR UPDATE;

    IF v_order_status IS NULL THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_order_status = 'Completed' THEN
        RAISE EXCEPTION 'Order is already completed';
    END IF;

    -- Loop through items and lock inventory rows (ORDER BY to prevent deadlocks)
    FOR r_item IN (
        SELECT oi.product_id, oi.quantity, oi.unit_price, p.name
        FROM public.order_items oi
        JOIN public.products p ON p.id = oi.product_id
        WHERE oi.order_id = p_order_id
        ORDER BY oi.product_id
    ) LOOP
        -- Lock specific inventory row
        SELECT stock_quantity INTO v_current_stock
        FROM public.inventory
        WHERE dealer_id = p_dealer_id AND product_id = r_item.product_id
        FOR UPDATE;

        IF v_current_stock IS NULL THEN
            RAISE EXCEPTION 'Inventory record missing for %', r_item.name;
        END IF;

        IF v_current_stock < r_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for %. Needed: %, Available: %', r_item.name, r_item.quantity, v_current_stock;
        END IF;

        v_new_stock := v_current_stock - r_item.quantity;

        -- Update Inventory
        UPDATE public.inventory
        SET stock_quantity = v_new_stock, last_updated = v_now
        WHERE dealer_id = p_dealer_id AND product_id = r_item.product_id;

        -- Create Sale
        INSERT INTO public.sales (
            dealer_id, product_id, quantity, sale_price, customer_name, customer_phone, sale_date, status
        ) VALUES (
            p_dealer_id, r_item.product_id, r_item.quantity, r_item.unit_price, v_customer_name, v_customer_phone, v_now, 'completed'
        );

        -- Create Stock Transaction
        INSERT INTO public.stock_transactions (
            dealer_id, product_id, action, quantity, reason, previous_stock, updated_stock, date
        ) VALUES (
            p_dealer_id, r_item.product_id, 'Order Completed', r_item.quantity, 'Order #' || left(p_order_id::text, 8), v_current_stock, v_new_stock, v_now
        );
    END LOOP;

    -- Mark order as completed
    UPDATE public.orders
    SET status = 'Completed', updated_at = v_now
    WHERE id = p_order_id;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. RPC: Cancel Sale
CREATE OR REPLACE FUNCTION public.cancel_sale(
    p_dealer_id UUID,
    p_sale_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_sale_status TEXT;
    v_product_id UUID;
    v_quantity INTEGER;
    v_current_stock INTEGER;
    v_new_stock INTEGER;
    v_now TIMESTAMPTZ := now();
BEGIN
    -- Lock sale row
    SELECT status, product_id, quantity INTO v_sale_status, v_product_id, v_quantity
    FROM public.sales
    WHERE id = p_sale_id AND dealer_id = p_dealer_id
    FOR UPDATE;

    IF v_sale_status IS NULL THEN
        RAISE EXCEPTION 'Sale not found';
    END IF;

    IF v_sale_status = 'cancelled' THEN
        RAISE EXCEPTION 'Sale is already cancelled';
    END IF;

    -- Update Sale
    UPDATE public.sales SET status = 'cancelled' WHERE id = p_sale_id;

    -- Lock and Update Inventory
    SELECT stock_quantity INTO v_current_stock
    FROM public.inventory
    WHERE dealer_id = p_dealer_id AND product_id = v_product_id
    FOR UPDATE;

    IF v_current_stock IS NOT NULL THEN
        v_new_stock := v_current_stock + v_quantity;
        
        UPDATE public.inventory
        SET stock_quantity = v_new_stock, last_updated = v_now
        WHERE dealer_id = p_dealer_id AND product_id = v_product_id;

        -- Create Stock Transaction
        INSERT INTO public.stock_transactions (
            dealer_id, product_id, action, quantity, reason, previous_stock, updated_stock, date
        ) VALUES (
            p_dealer_id, v_product_id, 'Sale Cancelled', v_quantity, 'Sale cancellation / Return', v_current_stock, v_new_stock, v_now
        );
    END IF;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. RPC: Adjust Inventory (Add/Remove)
CREATE OR REPLACE FUNCTION public.adjust_inventory(
    p_dealer_id UUID,
    p_product_id UUID,
    p_quantity_change INTEGER,
    p_action TEXT,
    p_reason TEXT,
    p_sale_price NUMERIC DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_current_stock INTEGER;
    v_new_stock INTEGER;
    v_now TIMESTAMPTZ := now();
BEGIN
    IF p_quantity_change = 0 THEN
        RAISE EXCEPTION 'Quantity change cannot be zero';
    END IF;

    -- Lock Inventory
    SELECT stock_quantity INTO v_current_stock
    FROM public.inventory
    WHERE dealer_id = p_dealer_id AND product_id = p_product_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
        RAISE EXCEPTION 'Product not found in inventory';
    END IF;

    v_new_stock := v_current_stock + p_quantity_change;

    IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Cannot remove %. Only % available.', abs(p_quantity_change), v_current_stock;
    END IF;

    -- Update Inventory
    UPDATE public.inventory
    SET stock_quantity = v_new_stock, last_updated = v_now
    WHERE dealer_id = p_dealer_id AND product_id = p_product_id;

    -- Record Transaction
    INSERT INTO public.stock_transactions (
        dealer_id, product_id, action, quantity, reason, previous_stock, updated_stock, date
    ) VALUES (
        p_dealer_id, p_product_id, p_action, abs(p_quantity_change), p_reason, v_current_stock, v_new_stock, v_now
    );

    -- If reason is Sale, also insert into sales table
    IF p_reason = 'Sale' AND p_action = 'Removed' THEN
        INSERT INTO public.sales (
            dealer_id, product_id, quantity, sale_price, sale_date, status
        ) VALUES (
            p_dealer_id, p_product_id, abs(p_quantity_change), COALESCE(p_sale_price, 0), v_now, 'completed'
        );
    END IF;

    RETURN json_build_object('success', true, 'new_stock', v_new_stock);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
