DO $$
DECLARE
    v_dealer_id UUID;
    v_products UUID[];
    v_product_id UUID;
    v_order_id UUID;
    i INT;
    sale_date TIMESTAMP WITH TIME ZONE;
    qty INT;
    price NUMERIC;
    base_prices NUMERIC[] := ARRAY[499, 899, 1499, 1999, 2999, 99, 250, 750, 1100, 4500];
    cost_prices NUMERIC[] := ARRAY[300, 600, 1000, 1400, 2000, 50, 150, 500, 800, 3200];
    prod_names TEXT[] := ARRAY['Wireless Earbuds', 'Smart Watch Band', 'Power Bank 20000mAh', 'Bluetooth Speaker', 'Mechanical Keyboard', 'USB-C Cable', 'Phone Case', 'Fast Charger 65W', 'Laptop Stand', '24-inch Monitor'];
    prod_skus TEXT[] := ARRAY['WE-01', 'SWB-02', 'PB-20K', 'BS-04', 'MK-05', 'UC-06', 'PC-07', 'FC-65', 'LS-09', 'MON-24'];
    prod_categories TEXT[] := ARRAY['Audio', 'Wearables', 'Power', 'Audio', 'Accessories', 'Cables', 'Accessories', 'Power', 'Accessories', 'Displays'];
BEGIN
    -- Get the first dealer's ID (this will be 'vivek' in your case)
    SELECT id INTO v_dealer_id FROM public.dealers LIMIT 1;
    
    IF v_dealer_id IS NULL THEN
        RAISE EXCEPTION 'No dealer found. Please create a dealer account first.';
    END IF;

    -- Clean up existing mock data to avoid duplicates if run multiple times
    DELETE FROM public.products WHERE dealer_id = v_dealer_id AND name = ANY(prod_names);

    -- Insert Products and capture their IDs
    FOR i IN 1..10 LOOP
        INSERT INTO public.products (dealer_id, name, sku, category, base_price, cost_price, is_deleted)
        VALUES (v_dealer_id, prod_names[i], prod_skus[i], prod_categories[i], base_prices[i], cost_prices[i], false)
        RETURNING id INTO v_product_id;
        
        v_products := array_append(v_products, v_product_id);
        
        -- Insert Inventory
        INSERT INTO public.inventory (dealer_id, product_id, stock_quantity, min_stock_level, status)
        VALUES (v_dealer_id, v_product_id, floor(random() * 150 + 10)::INT, 20, 'In Stock');
    END LOOP;

    -- Generate Sales over the last 30 days
    FOR i IN 1..80 LOOP
        v_product_id := v_products[floor(random() * 10 + 1)::INT];
        -- Random date within last 30 days
        sale_date := timezone('utc', now()) - (random() * 30 || ' days')::INTERVAL;
        qty := floor(random() * 5 + 1)::INT;
        
        -- Get price for the product
        SELECT base_price INTO price FROM public.products WHERE id = v_product_id;
        
        -- Insert Sale
        INSERT INTO public.sales (dealer_id, product_id, quantity, sale_price, customer_name, status, sale_date)
        VALUES (v_dealer_id, v_product_id, qty, price, 'Customer ' || floor(random() * 100)::TEXT, 'completed', sale_date);
        
        -- Insert Stock Transaction (Sale reduces stock)
        INSERT INTO public.stock_transactions (dealer_id, product_id, action, quantity, reason, previous_stock, updated_stock, date)
        VALUES (v_dealer_id, v_product_id, 'sale', -qty, 'Store sale', 100, 100 - qty, sale_date);
    END LOOP;

    -- Generate Orders over the last 30 days
    FOR i IN 1..30 LOOP
        sale_date := timezone('utc', now()) - (random() * 30 || ' days')::INTERVAL;
        
        -- Pick a random product for the order to calculate total
        v_product_id := v_products[floor(random() * 10 + 1)::INT];
        SELECT base_price INTO price FROM public.products WHERE id = v_product_id;
        qty := floor(random() * 3 + 1)::INT;
        
        INSERT INTO public.orders (dealer_id, customer_name, customer_phone, subtotal, total_amount, status, created_at, updated_at)
        VALUES (v_dealer_id, 'Order Cust ' || floor(random() * 100)::TEXT, '9999999999', price * qty, price * qty, 'Completed', sale_date, sale_date)
        RETURNING id INTO v_order_id;
        
        INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, total_price, created_at)
        VALUES (v_order_id, v_product_id, qty, price, price * qty, sale_date);
    END LOOP;
    
END $$;
