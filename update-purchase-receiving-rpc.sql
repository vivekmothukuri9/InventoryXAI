-- Secure RPC to receive a purchase atomically
CREATE OR REPLACE FUNCTION public.receive_purchase(
    p_purchase_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_authenticated_dealer_id UUID;
    v_purchase_status TEXT;
    r_item RECORD;
    v_current_stock INTEGER;
    v_new_stock INTEGER;
    v_now TIMESTAMPTZ := now();
BEGIN
    -- Securely resolve dealer ID from auth.uid()
    SELECT id INTO v_authenticated_dealer_id 
    FROM public.dealers 
    WHERE user_id = auth.uid();

    IF v_authenticated_dealer_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Dealer profile not found for current user';
    END IF;

    -- Lock purchase row and verify ownership
    SELECT status INTO v_purchase_status
    FROM public.purchases
    WHERE id = p_purchase_id AND dealer_id = v_authenticated_dealer_id
    FOR UPDATE;

    IF v_purchase_status IS NULL THEN
        RAISE EXCEPTION 'Purchase not found or you do not have permission';
    END IF;

    -- Prevent duplicate receiving
    IF v_purchase_status = 'Received' THEN
        RAISE EXCEPTION 'Purchase has already been received';
    END IF;

    -- Loop through purchase items (ORDER BY product_id to prevent deadlocks)
    FOR r_item IN (
        SELECT pi.product_id, pi.quantity
        FROM public.purchase_items pi
        WHERE pi.purchase_id = p_purchase_id
        ORDER BY pi.product_id
    ) LOOP
        -- Attempt to lock specific inventory row
        SELECT stock_quantity INTO v_current_stock
        FROM public.inventory
        WHERE dealer_id = v_authenticated_dealer_id AND product_id = r_item.product_id
        FOR UPDATE;

        IF v_current_stock IS NULL THEN
            -- Inventory record does not exist for this product and dealer, create it
            v_current_stock := 0;
            v_new_stock := r_item.quantity;
            
            INSERT INTO public.inventory (
                dealer_id, product_id, stock_quantity, last_updated
            ) VALUES (
                v_authenticated_dealer_id, r_item.product_id, v_new_stock, v_now
            );
        ELSE
            -- Increment existing stock
            v_new_stock := v_current_stock + r_item.quantity;
            
            UPDATE public.inventory
            SET stock_quantity = v_new_stock, last_updated = v_now
            WHERE dealer_id = v_authenticated_dealer_id AND product_id = r_item.product_id;
        END IF;

        -- Create Stock Transaction
        INSERT INTO public.stock_transactions (
            dealer_id, product_id, action, quantity, reason, previous_stock, updated_stock, date
        ) VALUES (
            v_authenticated_dealer_id, 
            r_item.product_id, 
            'Purchase', 
            r_item.quantity, 
            'Received Purchase #' || left(p_purchase_id::text, 8) || ' from Supplier', 
            v_current_stock, 
            v_new_stock, 
            v_now
        );
    END LOOP;

    -- Mark purchase as received
    UPDATE public.purchases
    SET status = 'Received', updated_at = v_now
    WHERE id = p_purchase_id;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
