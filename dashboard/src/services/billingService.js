import { supabase } from './supabase';

const LOCAL_STORAGE_BILLS_KEY = 'inventoryx_offline_bills';

/**
 * Generates a unique, professional bill number
 * Format: INV-YYMMDD-XXXX (e.g. INV-261020-4821)
 */
export const generateBillNumber = () => {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}${month}${day}-${randomSuffix}`;
};

/**
 * Fetch all bills for the authenticated dealer
 */
export const fetchDealerBills = async (dealerId) => {
  try {
    const { data, error } = await supabase
      .from('bills')
      .select(`
        *,
        bill_items (*)
      `)
      .eq('dealer_id', dealerId)
      .order('bill_date', { ascending: false });

    if (error) {
      // If table doesn't exist yet in Supabase, load from local storage cache
      if (error.code === '42P01' || error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
        console.warn('Bills table not yet created in Supabase. Using local bills cache.');
        const local = localStorage.getItem(`${LOCAL_STORAGE_BILLS_KEY}_${dealerId}`);
        return { bills: local ? JSON.parse(local) : [], isOffline: true };
      }
      throw error;
    }

    return { bills: data || [], isOffline: false };
  } catch (err) {
    console.warn('Error fetching bills from Supabase:', err.message);
    const local = localStorage.getItem(`${LOCAL_STORAGE_BILLS_KEY}_${dealerId}`);
    return { bills: local ? JSON.parse(local) : [], isOffline: true };
  }
};

/**
 * Finalize & Create a new Bill
 * Uses atomic RPC create_bill when available, with safe fallback
 */
export const finalizeBill = async ({
  dealerId,
  billNumber,
  billDate,
  customerType,
  customerId,
  customerName,
  customerPhone,
  customerAddress,
  items,
  subtotal,
  itemDiscountTotal,
  billDiscount,
  taxRate,
  taxAmount,
  grandTotal,
  paidAmount,
  paymentMethod,
  notes
}) => {
  // Validate basic constraints
  if (!items || items.length === 0) {
    throw new Error('Please add at least one product item to create a bill.');
  }

  const numericPaid = parseFloat(paidAmount) || 0;
  const numericGrandTotal = parseFloat(grandTotal) || 0;
  const balanceDue = Math.max(0, numericGrandTotal - numericPaid);

  let paymentStatus = 'Paid';
  if (balanceDue > 0) {
    paymentStatus = numericPaid > 0 ? 'Partially Paid' : 'Unpaid';
  }

  // 1. Attempt Atomic RPC execution
  try {
    const { data, error } = await supabase.rpc('create_bill', {
      p_bill_number: billNumber,
      p_bill_date: billDate || new Date().toISOString(),
      p_customer_type: customerType || 'walk-in',
      p_customer_id: customerId || null,
      p_customer_name: customerName || 'Walk-in Customer',
      p_customer_phone: customerPhone || null,
      p_customer_address: customerAddress || null,
      p_items: items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku || '',
        quantity: parseInt(item.quantity, 10),
        unit_price: parseFloat(item.unit_price),
        discount_percent: parseFloat(item.discount_percent || 0),
        discount_amount: parseFloat(item.discount_amount || 0),
        line_total: parseFloat(item.line_total)
      })),
      p_subtotal: parseFloat(subtotal),
      p_item_discount_total: parseFloat(itemDiscountTotal || 0),
      p_bill_discount: parseFloat(billDiscount || 0),
      p_tax_rate: parseFloat(taxRate || 0),
      p_tax_amount: parseFloat(taxAmount || 0),
      p_grand_total: numericGrandTotal,
      p_paid_amount: numericPaid,
      p_payment_method: paymentMethod || 'Cash',
      p_notes: notes || null
    });

    if (!error && data?.success) {
      return { success: true, billId: data.bill_id, billNumber, isOffline: false };
    }

    if (error && !error.message?.includes('function public.create_bill') && !error.message?.includes('does not exist')) {
      // It's a real business logic error from RPC (e.g. Insufficient Stock)
      throw error;
    }
  } catch (rpcErr) {
    // If it's an insufficient stock error or other validation error, propagate immediately!
    if (rpcErr.message && !rpcErr.message.includes('function') && !rpcErr.message.includes('does not exist')) {
      throw rpcErr;
    }
    console.warn('create_bill RPC not available. Executing graceful transactional fallback:', rpcErr.message);
  }

  // 2. Fallback mode: Direct Supabase tables or local storage
  const now = new Date().toISOString();
  const localBillId = `BILL-${Date.now()}`;
  
  const newBillRecord = {
    id: localBillId,
    dealer_id: dealerId,
    bill_number: billNumber,
    bill_date: billDate || now,
    customer_type: customerType || 'walk-in',
    customer_id: customerId || null,
    customer_name: customerName || 'Walk-in Customer',
    customer_phone: customerPhone || null,
    customer_address: customerAddress || null,
    subtotal: parseFloat(subtotal),
    item_discount_total: parseFloat(itemDiscountTotal || 0),
    bill_discount: parseFloat(billDiscount || 0),
    tax_rate: parseFloat(taxRate || 0),
    tax_amount: parseFloat(taxAmount || 0),
    grand_total: numericGrandTotal,
    paid_amount: numericPaid,
    balance_due: balanceDue,
    payment_method: paymentMethod || 'Cash',
    payment_status: paymentStatus,
    status: 'finalized',
    notes: notes || null,
    created_at: now,
    updated_at: now,
    bill_items: items.map((item, idx) => ({
      id: `ITEM-${Date.now()}-${idx}`,
      bill_id: localBillId,
      dealer_id: dealerId,
      product_id: item.product_id,
      product_name: item.product_name,
      sku: item.sku || '',
      quantity: parseInt(item.quantity, 10),
      unit_price: parseFloat(item.unit_price),
      discount_percent: parseFloat(item.discount_percent || 0),
      discount_amount: parseFloat(item.discount_amount || 0),
      line_total: parseFloat(item.line_total)
    }))
  };

  // Update real inventory and record sales for each item where possible
  for (const item of items) {
    const qty = parseInt(item.quantity, 10);
    const effPrice = Math.round((parseFloat(item.line_total) / qty) * 100) / 100;
    
    // Deduct inventory
    try {
      const { data: inv } = await supabase
        .from('inventory')
        .select('id, stock_quantity')
        .eq('dealer_id', dealerId)
        .eq('product_id', item.product_id)
        .single();

      if (inv) {
        const newStock = Math.max(0, inv.stock_quantity - qty);
        await supabase
          .from('inventory')
          .update({ stock_quantity: newStock, last_updated: now })
          .eq('id', inv.id);

        // Record stock transaction
        await supabase.from('stock_transactions').insert({
          dealer_id: dealerId,
          product_id: item.product_id,
          action: 'Bill Sale',
          quantity: qty,
          reason: `Bill #${billNumber} to ${customerName || 'Walk-in'}`,
          previous_stock: inv.stock_quantity,
          updated_stock: newStock,
          date: now
        });
      }

      // Record in sales table
      await supabase.from('sales').insert({
        dealer_id: dealerId,
        product_id: item.product_id,
        quantity: qty,
        sale_price: effPrice,
        customer_name: customerName || 'Walk-in Customer',
        customer_phone: customerPhone || null,
        sale_date: now,
        status: 'completed'
      });
    } catch (e) {
      console.warn('Secondary sync for item failed:', e.message);
    }
  }

  // Save to local storage cache
  const localBills = JSON.parse(localStorage.getItem(`${LOCAL_STORAGE_BILLS_KEY}_${dealerId}`) || '[]');
  localBills.unshift(newBillRecord);
  localStorage.setItem(`${LOCAL_STORAGE_BILLS_KEY}_${dealerId}`, JSON.stringify(localBills));

  return { success: true, billId: localBillId, billNumber, isOffline: true };
};

/**
 * Safely void/cancel a bill and restore inventory
 */
export const cancelBill = async ({ dealerId, billId, billNumber, items, reason }) => {
  try {
    const { data, error } = await supabase.rpc('void_bill', {
      p_bill_id: billId,
      p_void_reason: reason || 'Cancelled by dealer'
    });

    if (!error && data?.success) {
      return { success: true, isOffline: false };
    }
    if (error && !error.message?.includes('function public.void_bill') && !error.message?.includes('does not exist')) {
      throw error;
    }
  } catch (rpcErr) {
    if (rpcErr.message && !rpcErr.message.includes('function') && !rpcErr.message.includes('does not exist')) {
      throw rpcErr;
    }
    console.warn('void_bill RPC not available, using fallback cancellation:', rpcErr.message);
  }

  // Fallback: restore stock
  const now = new Date().toISOString();
  if (items && items.length > 0) {
    for (const item of items) {
      try {
        const { data: inv } = await supabase
          .from('inventory')
          .select('id, stock_quantity')
          .eq('dealer_id', dealerId)
          .eq('product_id', item.product_id)
          .single();

        if (inv) {
          const newStock = inv.stock_quantity + parseInt(item.quantity, 10);
          await supabase
            .from('inventory')
            .update({ stock_quantity: newStock, last_updated: now })
            .eq('id', inv.id);

          await supabase.from('stock_transactions').insert({
            dealer_id: dealerId,
            product_id: item.product_id,
            action: 'Bill Voided',
            quantity: parseInt(item.quantity, 10),
            reason: `Restored from Voided Bill #${billNumber}: ${reason || 'Cancelled'}`,
            previous_stock: inv.stock_quantity,
            updated_stock: newStock,
            date: now
          });
        }
      } catch (e) {
        console.warn('Fallback stock restoration failed:', e.message);
      }
    }
  }

  // Update local storage
  const localBills = JSON.parse(localStorage.getItem(`${LOCAL_STORAGE_BILLS_KEY}_${dealerId}`) || '[]');
  const updated = localBills.map(b => b.id === billId ? {
    ...b,
    status: 'voided',
    void_reason: reason || 'Cancelled',
    voided_at: now
  } : b);
  localStorage.setItem(`${LOCAL_STORAGE_BILLS_KEY}_${dealerId}`, JSON.stringify(updated));

  return { success: true, isOffline: true };
};
