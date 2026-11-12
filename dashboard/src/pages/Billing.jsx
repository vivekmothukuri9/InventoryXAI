import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import InvoiceModal from '../components/InvoiceModal';
import { supabase } from '../services/supabase';
import { 
  generateBillNumber, 
  fetchDealerBills, 
  finalizeBill, 
  cancelBill 
} from '../services/billingService';
import { 
  Receipt, Plus, Search, Eye, Printer, Download, Trash2, X, 
  Calendar, IndianRupee, CheckCircle2, AlertCircle, Filter, 
  ArrowUpRight, CreditCard, User, Phone, MapPin, RotateCcw, 
  FileText, Check, ChevronRight, Sparkles, Building2,
  TrendingUp, Mic, MicOff, Smartphone, Zap, ShoppingBag, RefreshCw
} from 'lucide-react';
import VoiceBillingAssistant from '../components/VoiceBillingAssistant';
import UpiPaymentSection from '../components/UpiPaymentSection';
import { useVoiceInput, parseSpokenDigits } from '../hooks/useVoiceInput';

const StatCard = ({ title, value, subtitle, icon: Icon, colorClass, isLoading }) => {
  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
        </div>
        <div className="w-24 h-4 bg-slate-200 rounded mb-2"></div>
        <div className="w-32 h-7 bg-slate-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className={`p-2.5 rounded-xl ${colorClass}`}>
          <Icon size={22} />
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {subtitle && <p className="text-xs font-medium text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

const formatInr = (val) => {
  const num = parseFloat(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(num);
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const Billing = () => {
  // Voice Input controller
  const voiceInput = useVoiceInput();

  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'create', 'history', 'online-orders'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Online App Orders & Continuous Auto-Billing Engine State
  const [onlineOrders, setOnlineOrders] = useState([]);
  const processingOrdersRef = React.useRef(new Set());
  const [processingOrderIds, setProcessingOrderIds] = useState([]);
  const [onlineOrdersFilter, setOnlineOrdersFilter] = useState('all'); // 'all', 'unbilled', 'billed'
  const [onlineOrdersSearch, setOnlineOrdersSearch] = useState('');

  // Authenticated Profile & Data
  const [dealer, setDealer] = useState(null);
  const [dealerId, setDealerId] = useState(null);
  const [products, setProducts] = useState([]);
  const [shopkeepers, setShopkeepers] = useState([]);
  const [bills, setBills] = useState([]);

  // Preview & Void Modals
  const [previewBill, setPreviewBill] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [voidBillTarget, setVoidBillTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // Filters for History
  const [searchQuery, setSearchQuery] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');
  const [billStatusFilter, setBillStatusFilter] = useState('All');

  // -------------------------------------------------------------------------
  // CREATE BILL FORM STATE
  // -------------------------------------------------------------------------
  const [billNumber, setBillNumber] = useState(generateBillNumber());
  const [billDate, setBillDate] = useState(() => new Date().toISOString().slice(0, 16));
  
  // Customer details
  const [customerType, setCustomerType] = useState('walk-in'); // 'walk-in', 'shopkeeper', 'regular'
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Product Search & Line Items
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [lineItems, setLineItems] = useState([]);

  // Financial calculations
  const [billDiscountType, setBillDiscountType] = useState('amount'); // 'amount' or 'percent'
  const [billDiscountValue, setBillDiscountValue] = useState(0);
  const [taxRate, setTaxRate] = useState(0); // 0, 5, 12, 18, 28
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // Cash, UPI, Card, Credit
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccessMessage, setFormSuccessMessage] = useState(null);

  // -------------------------------------------------------------------------
  // LOAD ALL REQUISITE DATA
  // -------------------------------------------------------------------------
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session?.user) throw new Error("Authentication required. Please login.");

      // Fetch Dealer profile
      const { data: dealerData, error: dealerErr } = await supabase
        .from('dealers')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (dealerErr || !dealerData) throw new Error("Dealer profile not found.");
      setDealer(dealerData);
      setDealerId(dealerData.id);

      // Fetch Products with available inventory stock
      const { data: prods, error: prodErr } = await supabase
        .from('products')
        .select(`
          id, name, sku, category, base_price, cost_price,
          inventory ( id, stock_quantity )
        `)
        .eq('dealer_id', dealerData.id)
        .eq('is_deleted', false)
        .order('name');

      if (prodErr) throw prodErr;

      const formattedProducts = (prods || []).map(p => ({
        ...p,
        stock_quantity: p.inventory?.[0]?.stock_quantity ?? 0,
        inventory_id: p.inventory?.[0]?.id || null
      }));
      setProducts(formattedProducts);

      // Fetch registered shopkeepers / dealers network for customer auto-selection
      const { data: networkDealers } = await supabase
        .from('dealers')
        .select('id, full_name, shop_name, phone, address, city')
        .neq('id', dealerData.id)
        .limit(50);
      setShopkeepers(networkDealers || []);

      // Fetch Bills
      const { bills: fetchedBills, isOffline } = await fetchDealerBills(dealerData.id);
      setBills(fetchedBills);
      setIsOfflineMode(isOffline);

      // Fetch Online App Orders
      try {
        let ordersQuery = supabase
          .from('orders')
          .select(`
            id, order_number, shop_name, total_amount, status, payment_method, 
            delivery_address, customer_phone, customer_name, created_at,
            is_billed, bill_id, bill_number,
            order_items (id, product_name, quantity, price, unit_price, total_price, product_id)
          `)
          .order('created_at', { ascending: false })
          .limit(100);

        if (dealerData.shop_name) {
          ordersQuery = ordersQuery.eq('shop_name', dealerData.shop_name);
        }

        let rawOrders = [];
        const { data: appOrders, error: ordErr } = await ordersQuery;
        if (!ordErr && appOrders) {
          rawOrders = appOrders;
        } else {
          // Fallback if specific columns like is_billed aren't there yet in Supabase orders table
          const { data: fallbackOrders } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
          rawOrders = fallbackOrders || [];
        }

        // Cross-reference with bills to ensure persistent billed status
        const enrichedOrders = rawOrders.map(order => {
          if (order.is_billed && order.bill_number) return order;

          const matchedBill = fetchedBills.find(b => 
            (order.order_number && b.notes && b.notes.includes(order.order_number)) ||
            (order.id && b.notes && b.notes.includes(order.id.slice(0, 8))) ||
            (order.bill_id && b.id === order.bill_id) ||
            (order.bill_number && b.bill_number === order.bill_number)
          );

          if (matchedBill) {
            return {
              ...order,
              is_billed: true,
              bill_id: matchedBill.id,
              bill_number: matchedBill.bill_number
            };
          }
          return order;
        });

        setOnlineOrders(enrichedOrders);
      } catch (ordFetchErr) {
        console.warn("Could not load online orders:", ordFetchErr);
      }

    } catch (err) {
      console.error("Billing module loading error:", err);
      setError(err.message || "Failed to load billing data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle direct navigation via URL search params (e.g. ?tab=online-orders)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['dashboard', 'create', 'history', 'online-orders'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  // -------------------------------------------------------------------------
  // CONTINUOUS REAL-TIME ZERO-CLICK AUTO-BILLING ENGINE
  // Automatically invoices all pending & incoming online app orders continuously
  // -------------------------------------------------------------------------

  // Auto-bill single order silently in the background
  const autoBillSingleOrder = async (order) => {
    if (!order || !order.id) return;
    if (order.is_billed || order.bill_number) return;
    if (processingOrdersRef.current.has(order.id)) return;

    processingOrdersRef.current.add(order.id);
    setProcessingOrderIds(Array.from(processingOrdersRef.current));

    try {
      // 1. Try server-side RPC if available
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('convert_order_to_bill', {
          target_order_id: order.id
        });

        if (!rpcErr && rpcRes && rpcRes.success) {
          console.log("Order converted to bill via Supabase RPC:", rpcRes);
          await loadData();
          return;
        }
      } catch (rpcEx) {
        // Proceed with client-side fallback conversion
      }

      // 2. Client-side conversion
      let itemsToBill = [];
      const rawItems = order.order_items || [];
      const fallbackProductId = products[0]?.id || null;

      if (rawItems.length > 0) {
        itemsToBill = rawItems.map((item, idx) => {
          const matchedProd = products.find(p => 
            (item.product_id && p.id === item.product_id) ||
            p.name?.toLowerCase() === item.product_name?.toLowerCase()
          );
          const price = parseFloat(item.unit_price || item.price) || (matchedProd ? parseFloat(matchedProd.base_price) : 0);
          const qty = parseInt(item.quantity) || 1;
          const lineTotal = Math.round(price * qty * 100) / 100;
          return {
            product_id: matchedProd?.id || item.product_id || fallbackProductId,
            product_name: item.product_name || matchedProd?.name || `Product #${idx + 1}`,
            sku: matchedProd?.sku || 'APP-ORD',
            quantity: qty,
            unit_price: price,
            discount_percent: 0,
            discount_amount: 0,
            line_total: lineTotal
          };
        });
      } else {
        const orderAmt = parseFloat(order.total_amount) || 0;
        itemsToBill = [{
          product_id: fallbackProductId,
          product_name: `App Order #${order.order_number || order.id?.slice(0, 6)} Items`,
          sku: 'APP-ORD',
          quantity: 1,
          unit_price: orderAmt,
          discount_percent: 0,
          discount_amount: 0,
          line_total: orderAmt
        }];
      }

      const totalAmt = parseFloat(order.total_amount) || itemsToBill.reduce((sum, it) => sum + it.line_total, 0);
      const newBillNumber = generateBillNumber();

      // Normalize payment method to fit SQL CHECK constraint ('Cash', 'UPI', 'Card', 'Credit')
      let normalizedPaymentMethod = 'Cash';
      const rawMethod = (order.payment_method || '').toLowerCase();
      if (rawMethod.includes('upi') || rawMethod.includes('online')) {
        normalizedPaymentMethod = 'UPI';
      } else if (rawMethod.includes('card')) {
        normalizedPaymentMethod = 'Card';
      } else if (rawMethod.includes('credit')) {
        normalizedPaymentMethod = 'Credit';
      } else {
        normalizedPaymentMethod = 'Cash';
      }

      const activeDealerId = dealerId || dealer?.id || products[0]?.dealer_id || null;

      const finalizeResult = await finalizeBill({
        dealerId: activeDealerId,
        billNumber: newBillNumber,
        billDate: new Date(order.created_at || Date.now()).toISOString(),
        customerType: 'walk-in',
        customerId: null,
        customerName: order.customer_name || 'Online App Customer',
        customerPhone: order.customer_phone || null,
        customerAddress: order.delivery_address || null,
        items: itemsToBill,
        subtotal: totalAmt,
        itemDiscountTotal: 0,
        billDiscount: 0,
        taxRate: 0,
        taxAmount: 0,
        grandTotal: totalAmt,
        paidAmount: totalAmt,
        paymentMethod: normalizedPaymentMethod,
        notes: `Auto-billed from App Order #${order.order_number || order.id?.slice(0, 8)} (${order.payment_method || 'Online'})`
      });

      // Update orders table with bill reference
      try {
        await supabase
          .from('orders')
          .update({
            is_billed: true,
            bill_id: finalizeResult.billId,
            bill_number: finalizeResult.billNumber,
            status: 'Confirmed'
          })
          .eq('id', order.id);
      } catch (updErr) {
        console.warn("Could not set is_billed on orders table:", updErr);
      }

      // Update local state immediately so UI updates in real-time
      setOnlineOrders(prev => prev.map(o => o.id === order.id ? {
        ...o,
        is_billed: true,
        bill_id: finalizeResult.billId,
        bill_number: finalizeResult.billNumber,
        status: 'Confirmed'
      } : o));

      // Refresh bills list quietly
      loadData();
    } catch (err) {
      console.error("Auto-bill failed for order:", order.id, err);
    } finally {
      processingOrdersRef.current.delete(order.id);
      setProcessingOrderIds(Array.from(processingOrdersRef.current));
    }
  };

  // Continuous background auto-billing: automatically processes any unbilled order
  useEffect(() => {
    if (onlineOrders.length === 0) return;

    const unbilledOrders = onlineOrders.filter(
      o => !o.is_billed && !o.bill_number && !processingOrdersRef.current.has(o.id)
    );

    if (unbilledOrders.length > 0) {
      unbilledOrders.forEach((ord, index) => {
        setTimeout(() => {
          autoBillSingleOrder(ord);
        }, index * 300);
      });
    }
  }, [onlineOrders]);

  // Periodic heartbeat timer every 8 seconds to continuously guarantee zero unbilled orders
  useEffect(() => {
    const timer = setInterval(() => {
      setOnlineOrders(current => {
        const unbilled = current.filter(
          o => !o.is_billed && !o.bill_number && !processingOrdersRef.current.has(o.id)
        );
        if (unbilled.length > 0) {
          unbilled.forEach((ord, idx) => {
            setTimeout(() => autoBillSingleOrder(ord), idx * 300);
          });
        }
        return current;
      });
    }, 8000);

    return () => clearInterval(timer);
  }, [dealerId, products]);

  // Real-time Supabase postgres_changes channel
  useEffect(() => {
    const ordersChannel = supabase
      .channel('billing_online_orders_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async (payload) => {
          console.log("Realtime event on orders table in Billing:", payload.eventType, payload.new);
          await loadData();

          if (payload.eventType === 'INSERT' && payload.new?.id) {
            setTimeout(async () => {
              const { data: fullOrder } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('id', payload.new.id)
                .maybeSingle();

              if (fullOrder && !fullOrder.is_billed && !fullOrder.bill_number) {
                await autoBillSingleOrder(fullOrder);
              }
            }, 500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [dealerId, products]);

  const handleViewOrderBill = (order) => {
    let matchedBill = bills.find(b => 
      b.id === order.bill_id || 
      b.bill_number === order.bill_number ||
      (b.notes && order.order_number && b.notes.includes(order.order_number))
    );

    if (matchedBill) {
      setPreviewBill(matchedBill);
      setIsPreviewOpen(true);
    } else {
      const items = (order.order_items || []).map(item => ({
        product_name: item.product_name || 'Item',
        quantity: item.quantity || 1,
        unit_price: parseFloat(item.price || item.unit_price) || 0,
        line_total: parseFloat(item.total_price) || ((parseFloat(item.price || item.unit_price) || 0) * (item.quantity || 1))
      }));

      const syntheticBill = {
        id: order.bill_id || order.id,
        dealer_id: dealerId,
        bill_number: order.bill_number || `INV-${order.order_number || 'ONLINE'}`,
        bill_date: order.created_at,
        customer_type: 'online-app',
        customer_name: order.customer_name || 'Online App Customer',
        customer_phone: order.customer_phone,
        customer_address: order.delivery_address,
        grand_total: parseFloat(order.total_amount) || 0,
        paid_amount: parseFloat(order.total_amount) || 0,
        balance_due: 0,
        payment_method: order.payment_method || 'Online',
        payment_status: 'Paid',
        status: 'finalized',
        notes: `Online App Order #${order.order_number || order.id?.slice(0, 8)}`,
        bill_items: items
      };
      setPreviewBill(syntheticBill);
      setIsPreviewOpen(true);
    }
  };

  // Memos for online orders
  const unbilledOnlineOrders = useMemo(() => {
    return onlineOrders.filter(o => !o.is_billed && !o.bill_number);
  }, [onlineOrders]);

  const billedOnlineOrders = useMemo(() => {
    return onlineOrders.filter(o => o.is_billed || o.bill_number);
  }, [onlineOrders]);

  const filteredOnlineOrders = useMemo(() => {
    return onlineOrders.filter(o => {
      if (onlineOrdersFilter === 'unbilled' && (o.is_billed || o.bill_number)) return false;
      if (onlineOrdersFilter === 'billed' && !o.is_billed && !o.bill_number) return false;

      if (onlineOrdersSearch.trim()) {
        const query = onlineOrdersSearch.toLowerCase();
        const numMatch = o.order_number?.toLowerCase().includes(query) || o.bill_number?.toLowerCase().includes(query);
        const nameMatch = o.customer_name?.toLowerCase().includes(query);
        const phoneMatch = o.customer_phone?.toLowerCase().includes(query);
        if (!numMatch && !nameMatch && !phoneMatch) return false;
      }
      return true;
    });
  }, [onlineOrders, onlineOrdersFilter, onlineOrdersSearch]);

  // -------------------------------------------------------------------------
  // FILTERED PRODUCTS FOR SEARCH
  // -------------------------------------------------------------------------
  const filteredProducts = useMemo(() => {
    if (!productSearchTerm.trim()) return [];
    const term = productSearchTerm.toLowerCase();
    return products.filter(p => 
      p.name?.toLowerCase().includes(term) || 
      p.sku?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term)
    ).slice(0, 8);
  }, [products, productSearchTerm]);

  // -------------------------------------------------------------------------
  // LINE ITEM MANAGEMENT & AUTOMATIC CALCULATIONS
  // -------------------------------------------------------------------------
  const handleAddProductToBill = (product) => {
    // Check if available stock > 0
    if (product.stock_quantity <= 0) {
      alert(`"${product.name}" is currently out of stock (Available: 0).`);
      return;
    }

    setLineItems(prev => {
      const existingIndex = prev.findIndex(item => item.product_id === product.id);
      if (existingIndex >= 0) {
        // Increment quantity if under available stock
        const currentItem = prev[existingIndex];
        if (currentItem.quantity >= product.stock_quantity) {
          alert(`Cannot add more. Available stock for "${product.name}" is ${product.stock_quantity}.`);
          return prev;
        }
        const updated = [...prev];
        const newQty = currentItem.quantity + 1;
        const discountAmt = currentItem.discount_percent > 0 
          ? (currentItem.unit_price * newQty * (currentItem.discount_percent / 100))
          : currentItem.discount_amount;
        const lineTotal = Math.max(0, (currentItem.unit_price * newQty) - discountAmt);

        updated[existingIndex] = {
          ...currentItem,
          quantity: newQty,
          discount_amount: Math.round(discountAmt * 100) / 100,
          line_total: Math.round(lineTotal * 100) / 100
        };
        return updated;
      }

      // Add new item
      const unitPrice = parseFloat(product.base_price) || 0;
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          sku: product.sku || '',
          available_stock: product.stock_quantity,
          unit_price: unitPrice,
          quantity: 1,
          discount_percent: 0,
          discount_amount: 0,
          line_total: unitPrice
        }
      ];
    });

    setProductSearchTerm('');
    setShowProductDropdown(false);
  };

  const handleUpdateItemQuantity = (index, newQuantity) => {
    const qty = parseInt(newQuantity, 10);
    setLineItems(prev => {
      const updated = [...prev];
      const item = updated[index];
      
      if (isNaN(qty) || qty <= 0) {
        return prev;
      }
      
      // Enforce available stock constraint
      if (qty > item.available_stock) {
        alert(`Quantity cannot exceed available stock (${item.available_stock}).`);
        return prev;
      }

      const discountAmt = item.discount_percent > 0 
        ? (item.unit_price * qty * (item.discount_percent / 100))
        : item.discount_amount;
      const lineTotal = Math.max(0, (item.unit_price * qty) - discountAmt);

      updated[index] = {
        ...item,
        quantity: qty,
        discount_amount: Math.round(discountAmt * 100) / 100,
        line_total: Math.round(lineTotal * 100) / 100
      };
      return updated;
    });
  };

  const handleUpdateItemPrice = (index, newPrice) => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) return;

    setLineItems(prev => {
      const updated = [...prev];
      const item = updated[index];
      const discountAmt = item.discount_percent > 0 
        ? (price * item.quantity * (item.discount_percent / 100))
        : item.discount_amount;
      const lineTotal = Math.max(0, (price * item.quantity) - discountAmt);

      updated[index] = {
        ...item,
        unit_price: price,
        discount_amount: Math.round(discountAmt * 100) / 100,
        line_total: Math.round(lineTotal * 100) / 100
      };
      return updated;
    });
  };

  const handleUpdateItemDiscount = (index, value, isPercent) => {
    const val = parseFloat(value) || 0;
    if (val < 0) return;

    setLineItems(prev => {
      const updated = [...prev];
      const item = updated[index];
      const gross = item.unit_price * item.quantity;
      
      let discAmt = 0;
      let discPct = 0;

      if (isPercent) {
        discPct = Math.min(100, val);
        discAmt = gross * (discPct / 100);
      } else {
        discAmt = Math.min(gross, val);
        discPct = gross > 0 ? (discAmt / gross) * 100 : 0;
      }

      const lineTotal = Math.max(0, gross - discAmt);

      updated[index] = {
        ...item,
        discount_percent: Math.round(discPct * 10) / 10,
        discount_amount: Math.round(discAmt * 100) / 100,
        line_total: Math.round(lineTotal * 100) / 100
      };
      return updated;
    });
  };

  const handleRemoveLineItem = (index) => {
    setLineItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // -------------------------------------------------------------------------
  // FINANCIAL TOTALS DERIVATION
  // -------------------------------------------------------------------------
  const financialTotals = useMemo(() => {
    const subtotal = lineItems.reduce((acc, item) => acc + (parseFloat(item.line_total) || 0), 0);
    const itemDiscountTotal = lineItems.reduce((acc, item) => acc + (parseFloat(item.discount_amount) || 0), 0);

    const calculatedTax = subtotal * ((parseFloat(taxRate) || 0) / 100);
    const grandTotal = Math.round((subtotal + calculatedTax) * 100) / 100;

    const numPaid = paidAmount === '' ? grandTotal : (parseFloat(paidAmount) || 0);
    const balanceDue = Math.max(0, Math.round((grandTotal - numPaid) * 100) / 100);

    let paymentStatus = 'Paid';
    if (balanceDue > 0) {
      paymentStatus = numPaid > 0 ? 'Partially Paid' : 'Unpaid';
    }

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      itemDiscountTotal: Math.round(itemDiscountTotal * 100) / 100,
      billDiscount: 0,
      taxAmount: Math.round(calculatedTax * 100) / 100,
      grandTotal,
      balanceDue,
      paymentStatus,
      effectivePaid: numPaid
    };
  }, [lineItems, taxRate, paidAmount]);

  // Keep paid amount synced if user chooses full paid
  const handleQuickPaidOption = (option) => {
    if (option === 'full') {
      setPaidAmount(financialTotals.grandTotal.toString());
      setPaymentMethod(prev => prev === 'Credit' ? 'Cash' : prev);
    }
  };

  // -------------------------------------------------------------------------
  // HANDLE CUSTOMER SELECTION
  // -------------------------------------------------------------------------
  const handleSelectShopkeeper = (shopkeeperId) => {
    setSelectedCustomerId(shopkeeperId);
    if (!shopkeeperId) {
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setCustomerAddress('');
      return;
    }
    const found = shopkeepers.find(s => s.id === shopkeeperId);
    if (found) {
      setCustomerName(found.shop_name || found.full_name);
      setCustomerPhone(found.phone || '');
      setCustomerAddress([found.address, found.city].filter(Boolean).join(', ') || '');
    }
  };

  const handleCustomerTypeChange = (type) => {
    setCustomerType(type);
    if (type === 'walk-in') {
      setSelectedCustomerId('');
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setCustomerAddress('');
    } else if (type === 'shopkeeper') {
      if (shopkeepers.length > 0) {
        handleSelectShopkeeper(shopkeepers[0].id);
      } else {
        setCustomerName('');
        setCustomerPhone('');
      }
    } else {
      setSelectedCustomerId('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
    }
  };

  // -------------------------------------------------------------------------
  // RESET CREATE BILL FORM
  // -------------------------------------------------------------------------
  const resetCreateForm = () => {
    setBillNumber(generateBillNumber());
    setBillDate(new Date().toISOString().slice(0, 16));
    setCustomerType('walk-in');
    setSelectedCustomerId('');
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setCustomerAddress('');
    setLineItems([]);
    setBillDiscountValue(0);
    setTaxRate(0);
    setPaidAmount('');
    setPaymentMethod('Cash');
    setNotes('');
    setFormError(null);
    setFormSuccessMessage(null);
  };

  // -------------------------------------------------------------------------
  // SUBMIT / FINALIZE BILL
  // -------------------------------------------------------------------------
  const handleFinalizeBill = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccessMessage(null);

    // Validation
    if (lineItems.length === 0) {
      setFormError("Please add at least one product to the bill before finalizing.");
      return;
    }

    if (!customerName.trim()) {
      setFormError("Customer name is required.");
      return;
    }

    // Verify stock constraints on all items
    for (const item of lineItems) {
      const prod = products.find(p => p.id === item.product_id);
      if (prod && item.quantity > prod.stock_quantity) {
        setFormError(`Insufficient stock for "${item.product_name}". Only ${prod.stock_quantity} available.`);
        return;
      }
    }

    const numericPaid = paidAmount === '' ? financialTotals.grandTotal : parseFloat(paidAmount);
    if (isNaN(numericPaid) || numericPaid < 0) {
      setFormError("Invalid amount paid.");
      return;
    }

    // Validate payment status constraint: A bill must not be marked fully paid when money is outstanding
    if (financialTotals.balanceDue > 0 && financialTotals.paymentStatus === 'Paid') {
      setFormError("A bill cannot be marked as Paid while a balance is still outstanding.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await finalizeBill({
        dealerId,
        billNumber,
        billDate: new Date(billDate).toISOString(),
        customerType,
        customerId: selectedCustomerId || null,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || null,
        customerAddress: customerAddress.trim() || null,
        items: lineItems,
        subtotal: financialTotals.subtotal,
        itemDiscountTotal: financialTotals.itemDiscountTotal,
        billDiscount: financialTotals.billDiscount,
        taxRate: parseFloat(taxRate) || 0,
        taxAmount: financialTotals.taxAmount,
        grandTotal: financialTotals.grandTotal,
        paidAmount: numericPaid,
        paymentMethod,
        notes: notes.trim() || null
      });

      // Construct complete object for instant preview
      const createdBillObj = {
        id: result.billId,
        dealer_id: dealerId,
        bill_number: billNumber,
        bill_date: new Date(billDate).toISOString(),
        customer_type: customerType,
        customer_id: selectedCustomerId || null,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        customer_address: customerAddress.trim() || null,
        subtotal: financialTotals.subtotal,
        item_discount_total: financialTotals.itemDiscountTotal,
        bill_discount: financialTotals.billDiscount,
        tax_rate: parseFloat(taxRate) || 0,
        tax_amount: financialTotals.taxAmount,
        grandTotal: financialTotals.grandTotal,
        grand_total: financialTotals.grandTotal,
        paid_amount: numericPaid,
        balance_due: financialTotals.balanceDue,
        payment_method: paymentMethod,
        payment_status: financialTotals.paymentStatus,
        status: 'finalized',
        notes: notes.trim() || null,
        created_at: new Date().toISOString(),
        bill_items: lineItems.map((item, idx) => ({
          id: `item-${idx}`,
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          discount_amount: item.discount_amount,
          line_total: item.line_total
        }))
      };

      // Open Preview Modal immediately
      setPreviewBill(createdBillObj);
      setIsPreviewOpen(true);
      setFormSuccessMessage(`Bill #${billNumber} successfully finalized!`);

      // Refresh database records in background
      await loadData();
      resetCreateForm();
      setActiveTab('history');

    } catch (err) {
      console.error("Bill creation error:", err);
      setFormError(err.message || "Failed to finalize bill.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // HANDLE VOID / CANCEL BILL
  // -------------------------------------------------------------------------
  const handleConfirmVoid = async () => {
    if (!voidBillTarget) return;
    setIsVoiding(true);
    try {
      await cancelBill({
        dealerId,
        billId: voidBillTarget.id,
        billNumber: voidBillTarget.bill_number,
        items: voidBillTarget.bill_items || [],
        reason: voidReason.trim() || 'Voided by dealer'
      });

      setVoidBillTarget(null);
      setVoidReason('');
      await loadData();
    } catch (err) {
      alert("Failed to void bill: " + err.message);
    } finally {
      setIsVoiding(false);
    }
  };

  // -------------------------------------------------------------------------
  // DERIVED BILLING DASHBOARD KPIS
  // -------------------------------------------------------------------------
  const dashboardStats = useMemo(() => {
    const finalizedBills = bills.filter(b => b.status !== 'voided');
    
    // Today's cutoff
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayBills = finalizedBills.filter(b => new Date(b.bill_date) >= today);
    const todayBilledAmount = todayBills.reduce((sum, b) => sum + (parseFloat(b.grand_total) || 0), 0);
    const totalPaidAmount = finalizedBills.reduce((sum, b) => sum + (parseFloat(b.paid_amount) || 0), 0);
    const totalOutstanding = finalizedBills.reduce((sum, b) => sum + (parseFloat(b.balance_due) || 0), 0);

    return {
      totalBillsCount: finalizedBills.length,
      todayBillsCount: todayBills.length,
      todayBilledAmount,
      totalPaidAmount,
      totalOutstanding,
      recentBills: bills.slice(0, 6)
    };
  }, [bills]);

  // -------------------------------------------------------------------------
  // FILTERED BILLING HISTORY
  // -------------------------------------------------------------------------
  const filteredHistoryBills = useMemo(() => {
    return bills.filter(bill => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchNumber = bill.bill_number?.toLowerCase().includes(query);
        const matchName = bill.customer_name?.toLowerCase().includes(query);
        const matchPhone = bill.customer_phone?.toLowerCase().includes(query);
        if (!matchNumber && !matchName && !matchPhone) return false;
      }

      // Date filter
      if (historyDateFilter !== 'All') {
        const bDate = new Date(bill.bill_date);
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (historyDateFilter === 'Today') {
          if (bDate < todayStart) return false;
        } else if (historyDateFilter === 'Last 7 Days') {
          const sevenDaysAgo = new Date(todayStart.getTime() - (7 * 24 * 60 * 60 * 1000));
          if (bDate < sevenDaysAgo) return false;
        } else if (historyDateFilter === 'This Month') {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          if (bDate < monthStart) return false;
        }
      }

      // Payment Status filter
      if (paymentStatusFilter !== 'All' && bill.payment_status !== paymentStatusFilter) {
        return false;
      }

      // Bill Status filter
      if (billStatusFilter !== 'All' && bill.status !== billStatusFilter) {
        return false;
      }

      return true;
    });
  }, [bills, searchQuery, historyDateFilter, paymentStatusFilter, billStatusFilter]);

  return (
    <Layout title="Billing & Invoicing">
      <div className="space-y-6">

        {/* TOP HEADER & TABS NAVIGATION */}
        <div data-tour="billing" className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-100 text-primary-700 rounded-xl">
                <Receipt size={24} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900">Billing Management</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Point-of-sale invoicing, stock deduction, payment reconciliation & GST invoices
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Billing Overview
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'create'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plus size={14} />
                Create New Bill
              </button>
              <button
                onClick={() => setActiveTab('online-orders')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'online-orders'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone size={14} />
                <span>Online Orders</span>
                {unbilledOnlineOrders.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    activeTab === 'online-orders' ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'
                  }`}>
                    {unbilledOnlineOrders.length} New
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'history'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Billing History ({bills.length})
              </button>
            </div>
          </div>
        </div>

        {/* OFFLINE/PREVIEW MODE BANNER */}
        {isOfflineMode && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start justify-between gap-3 text-amber-900 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Database Setup Notice: Ready for Cloud Sync</p>
                <p className="text-amber-800 mt-0.5 leading-relaxed">
                  Bills and inventory work in local reactive mode. Run <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold text-amber-950">update-billing-schema.sql</code> in your Supabase SQL editor to enable multi-device persistent cloud storage and atomic server-side RPC functions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 1: BILLING DASHBOARD                                          */}
        {/* ================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI STAT CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                title="Today's Bills"
                value={dashboardStats.todayBillsCount}
                subtitle="Issued today"
                icon={Calendar}
                colorClass="bg-indigo-50 text-indigo-600"
                isLoading={loading}
              />
              <StatCard
                title="Today's Billed"
                value={formatInr(dashboardStats.todayBilledAmount)}
                subtitle="Gross volume today"
                icon={TrendingUp}
                colorClass="bg-emerald-50 text-emerald-600"
                isLoading={loading}
              />
              <StatCard
                title="Total Paid"
                value={formatInr(dashboardStats.totalPaidAmount)}
                subtitle="Amount collected"
                icon={CheckCircle2}
                colorClass="bg-teal-50 text-teal-600"
                isLoading={loading}
              />
            </div>

            {/* ONLINE APP ORDERS & AUTO-BILLING INTEGRATION WIDGET */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 md:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`p-3 rounded-xl shadow-xs shrink-0 ${
                  unbilledOnlineOrders.length > 0 
                    ? 'bg-amber-500 text-white animate-pulse' 
                    : 'bg-blue-600 text-white'
                }`}>
                  <Smartphone size={22} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm md:text-base">Online App Orders</h3>
                    <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      ⚡ Continuous Auto-Billing Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {unbilledOnlineOrders.length > 0 
                      ? `${unbilledOnlineOrders.length} customer order${unbilledOnlineOrders.length > 1 ? 's' : ''} being automatically invoiced in real-time.`
                      : 'All customer mobile app orders are continuously auto-billed and synced with inventory.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab('online-orders')}
                  className="w-full sm:w-auto bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 py-2 px-3.5 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 shadow-2xs"
                >
                  <span>View Online Orders ({onlineOrders.length})</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* ACTION BANNER & QUICK OVERVIEW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-gradient-to-r from-primary-700 to-indigo-800 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg flex flex-col justify-between">
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold mb-4 text-primary-100">
                    <Sparkles size={14} />
                    <span>Real-time Retail & Wholesale POS</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
                    Create Instant GST & Retail Invoices
                  </h2>
                  <p className="text-primary-100 text-sm max-w-xl leading-relaxed">
                    Auto-generate unique bill numbers, verify stock levels, apply itemized discounts, compute applicable taxes, and print clean professional invoices with single-click stock sync.
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3 relative z-10">
                  <button
                    onClick={() => setActiveTab('create')}
                    className="bg-white hover:bg-slate-100 text-slate-900 hover:text-primary-800 font-extrabold px-6 py-3 rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95 flex items-center gap-2 text-sm"
                  >
                    <Plus size={18} className="text-primary-700" />
                    <span>Create New Bill Now</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="bg-primary-600/60 hover:bg-primary-600 text-white font-semibold px-4 py-3 rounded-xl border border-white/20 transition-colors text-sm"
                  >
                    View All Bills ({bills.length})
                  </button>
                </div>

                {/* Decorative background circle */}
                <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              </div>

              {/* DEALER OUTLET PROFILE SUMMARY */}
              <div className="card flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="text-primary-600" size={18} />
                      <h3 className="font-bold text-slate-800 text-sm">Dealer Billing Profile</h3>
                    </div>
                    <span className="text-[11px] font-semibold bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400">Business Name:</span>
                      <p className="font-bold text-slate-800 text-sm">{dealer?.shop_name || 'Dealer Outlet'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Authorized Name:</span>
                      <p className="font-semibold text-slate-700">{dealer?.full_name}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Location:</span>
                      <p className="text-slate-600 truncate">{[dealer?.address, dealer?.city, dealer?.state].filter(Boolean).join(', ') || 'Not configured'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">GST Registration:</span>
                      <p className="font-mono text-slate-700">{dealer?.gst_number || 'Unregistered / Exempt'}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Available Products:</span>
                  <span className="font-bold text-slate-800">{products.length} Products</span>
                </div>
              </div>
            </div>

            {/* RECENT BILLS TABLE */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Recent Transactions</h3>
                  <p className="text-xs text-slate-500">Most recent customer bills issued</p>
                </div>
                <button
                  onClick={() => setActiveTab('history')}
                  className="text-xs text-primary-600 hover:text-primary-700 font-bold flex items-center gap-1"
                >
                  View All <ChevronRight size={14} />
                </button>
              </div>

              {dashboardStats.recentBills.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Receipt className="mx-auto text-slate-300 mb-2" size={36} />
                  <p className="text-slate-600 text-sm font-medium">No bills generated yet.</p>
                  <p className="text-slate-400 text-xs mt-0.5">Click "Create New Bill" to generate your first invoice.</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-3 btn-primary text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Plus size={14} /> New Bill
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                        <th className="py-2.5 px-3">Bill #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3 text-right">Grand Total</th>
                        <th className="py-2.5 px-3 text-right">Balance Due</th>
                        <th className="py-2.5 px-3 text-center">Payment</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dashboardStats.recentBills.map(b => (
                        <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-slate-800">{b.bill_number}</td>
                          <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{formatDate(b.bill_date)}</td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800">{b.customer_name}</span>
                            {b.customer_phone && <span className="block text-[11px] text-slate-400">{b.customer_phone}</span>}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">{formatInr(b.grand_total)}</td>
                          <td className="py-3 px-3 text-right">
                            <span className={parseFloat(b.balance_due) > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                              {formatInr(b.balance_due)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              b.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              b.payment_status === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {b.payment_status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              b.status === 'voided' ? 'bg-rose-100 text-rose-700 line-through' : 'bg-blue-50 text-blue-700'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                setPreviewBill(b);
                                setIsPreviewOpen(true);
                              }}
                              className="text-primary-600 hover:text-primary-800 font-semibold inline-flex items-center gap-1 hover:underline"
                            >
                              <Eye size={13} /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: CREATE BILL SCREEN                                         */}
        {/* ================================================================= */}
        {activeTab === 'create' && (
          <form onSubmit={handleFinalizeBill} className="space-y-6">
            
            {/* AI VOICE BILLING ASSISTANT BAR */}
            <VoiceBillingAssistant
              products={products}
              onAddProduct={handleAddProductToBill}
              onSearchProduct={(term) => {
                setProductSearchTerm(term);
                setShowProductDropdown(true);
              }}
              onSetCustomerName={(name) => setCustomerName(name)}
              onSetCustomerPhone={(phone) => setCustomerPhone(phone)}
              onSetPaymentMethod={(method) => setPaymentMethod(method)}
              onSetPaidOption={handleQuickPaidOption}
              onSetNotes={(noteText) => setNotes(prev => prev ? `${prev} | ${noteText}` : noteText)}
              voiceInput={voiceInput}
            />

            {/* Feedback Messages */}
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span className="font-semibold">{formError}</span>
                </div>
                <button type="button" onClick={() => setFormError(null)}>
                  <X size={14} />
                </button>
              </div>
            )}

            {formSuccessMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span className="font-semibold">{formSuccessMessage}</span>
                </div>
                <button type="button" onClick={() => setFormSuccessMessage(null)}>
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* LEFT & CENTER PANEL: CUSTOMER & PRODUCTS */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* 1. BILL META & CUSTOMER SECTION */}
                <div className="card">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Generated Bill No.</span>
                      <h2 className="text-lg font-bold font-mono text-slate-800">{billNumber}</h2>
                    </div>

                    <div className="flex items-center gap-3">
                      <div>
                        <span className="block text-[11px] font-semibold text-slate-500 mb-0.5">Bill Date & Time</span>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
                          <Calendar size={14} className="text-primary-600" />
                          <span>{formatDate(billDate || new Date().toISOString())}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={resetCreateForm}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors mt-3 sm:mt-0"
                        title="Reset Form"
                      >
                        <RotateCcw size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-600">Customer Name *</label>
                        <button
                          type="button"
                          onClick={() => {
                            if (voiceInput.isListening && voiceInput.activeField === 'customerName') {
                              voiceInput.stopListening();
                            } else {
                              voiceInput.startListening('customerName', (text) => setCustomerName(text));
                            }
                          }}
                          className={`text-[11px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
                            voiceInput.isListening && voiceInput.activeField === 'customerName'
                              ? 'bg-rose-100 text-rose-700 animate-pulse font-bold'
                              : 'text-primary-600 hover:text-primary-800 hover:bg-primary-50'
                          }`}
                          title="Speak Customer Name"
                        >
                          <Mic size={12} className={voiceInput.isListening && voiceInput.activeField === 'customerName' ? 'text-rose-600 animate-pulse' : ''} />
                          <span>{voiceInput.isListening && voiceInput.activeField === 'customerName' ? 'Listening...' : 'Voice'}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="e.g. Ramesh Kumar / Walk-in"
                          className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (voiceInput.isListening && voiceInput.activeField === 'customerName') {
                              voiceInput.stopListening();
                            } else {
                              voiceInput.startListening('customerName', (text) => setCustomerName(text));
                            }
                          }}
                          className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition-all ${
                            voiceInput.isListening && voiceInput.activeField === 'customerName'
                              ? 'text-rose-600 bg-rose-50 animate-pulse'
                              : 'text-slate-400 hover:text-primary-600'
                          }`}
                          title="Voice input for Customer Name"
                        >
                          <Mic size={14} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-600">Mobile Number</label>
                        <button
                          type="button"
                          onClick={() => {
                            if (voiceInput.isListening && voiceInput.activeField === 'customerPhone') {
                              voiceInput.stopListening();
                            } else {
                              voiceInput.startListening('customerPhone', (text) => {
                                const digits = parseSpokenDigits(text);
                                setCustomerPhone(digits);
                              });
                            }
                          }}
                          className={`text-[11px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
                            voiceInput.isListening && voiceInput.activeField === 'customerPhone'
                              ? 'bg-rose-100 text-rose-700 animate-pulse font-bold'
                              : 'text-primary-600 hover:text-primary-800 hover:bg-primary-50'
                          }`}
                          title="Speak Mobile Number"
                        >
                          <Mic size={12} className={voiceInput.isListening && voiceInput.activeField === 'customerPhone' ? 'text-rose-600 animate-pulse' : ''} />
                          <span>{voiceInput.isListening && voiceInput.activeField === 'customerPhone' ? 'Listening...' : 'Voice'}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="10-digit mobile number"
                          maxLength={15}
                          className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (voiceInput.isListening && voiceInput.activeField === 'customerPhone') {
                              voiceInput.stopListening();
                            } else {
                              voiceInput.startListening('customerPhone', (text) => {
                                const digits = parseSpokenDigits(text);
                                setCustomerPhone(digits);
                              });
                            }
                          }}
                          className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition-all ${
                            voiceInput.isListening && voiceInput.activeField === 'customerPhone'
                              ? 'text-rose-600 bg-rose-50 animate-pulse'
                              : 'text-slate-400 hover:text-primary-600'
                          }`}
                          title="Voice input for Customer Mobile"
                        >
                          <Mic size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. PRODUCT SEARCH & ADDITION */}
                <div className="card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-800">Add Products to Bill</h3>
                    <span className="text-xs text-slate-500">{products.length} Products Available in Inventory</span>
                  </div>

                  {/* Search Bar with Autocomplete Dropdown */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={productSearchTerm}
                      onChange={(e) => {
                        setProductSearchTerm(e.target.value);
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      placeholder="Search product by name, SKU or category (or tap Voice Search)..."
                      className="w-full pl-11 pr-32 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white shadow-inner"
                    />

                    {/* Voice Input Button inside Search */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (voiceInput.isListening && voiceInput.activeField === 'productSearch') {
                            voiceInput.stopListening();
                          } else {
                            voiceInput.startListening('productSearch', (text) => {
                              setProductSearchTerm(text);
                              setShowProductDropdown(true);
                            });
                          }
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                          voiceInput.isListening && voiceInput.activeField === 'productSearch'
                            ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-300'
                            : 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200'
                        }`}
                        title="Voice search products"
                      >
                        <Mic size={14} className={voiceInput.isListening && voiceInput.activeField === 'productSearch' ? 'text-white' : 'text-primary-600'} />
                        <span>{voiceInput.isListening && voiceInput.activeField === 'productSearch' ? 'Listening...' : 'Voice Search'}</span>
                      </button>
                    </div>

                    {/* Results Dropdown */}
                    {showProductDropdown && productSearchTerm.trim().length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto divide-y divide-slate-100 animate-fade-in-up">
                        {filteredProducts.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400">
                            No matching products found for "{productSearchTerm}"
                          </div>
                        ) : (
                          filteredProducts.map(p => {
                            const isOutOfStock = p.stock_quantity <= 0;
                            return (
                              <div
                                key={p.id}
                                onClick={() => !isOutOfStock && handleAddProductToBill(p)}
                                className={`p-3 flex items-center justify-between transition-colors ${
                                  isOutOfStock 
                                    ? 'opacity-50 cursor-not-allowed bg-slate-50' 
                                    : 'hover:bg-primary-50/50 cursor-pointer'
                                }`}
                              >
                                <div>
                                  <p className="text-xs font-bold text-slate-800">{p.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                                    <span>SKU: {p.sku || '-'}</span>
                                    <span>•</span>
                                    <span>{p.category || 'General'}</span>
                                  </div>
                                </div>

                                <div className="text-right flex items-center gap-4">
                                  <div>
                                    <p className="text-xs font-bold text-slate-900">{formatInr(p.base_price)}</p>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      isOutOfStock ? 'bg-red-100 text-red-600' :
                                      p.stock_quantity < 5 ? 'bg-amber-100 text-amber-700' :
                                      'bg-emerald-100 text-emerald-700'
                                    }`}>
                                      Stock: {p.stock_quantity}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={isOutOfStock}
                                    className={`p-1.5 rounded-lg text-xs font-bold ${
                                      isOutOfStock 
                                        ? 'bg-slate-200 text-slate-400' 
                                        : 'bg-primary-600 text-white hover:bg-primary-700'
                                    }`}
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Line Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                          <th className="py-2 px-2">Product</th>
                          <th className="py-2 px-2 text-right">Unit Price</th>
                          <th className="py-2 px-2 text-center">Qty</th>
                          <th className="py-2 px-2 text-right">Discount</th>
                          <th className="py-2 px-2 text-right">Total</th>
                          <th className="py-2 px-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lineItems.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                              <Receipt size={28} className="mx-auto mb-1 opacity-40" />
                              No items added yet. Search and select products above.
                            </td>
                          </tr>
                        ) : (
                          lineItems.map((item, idx) => (
                            <tr key={item.product_id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-2 max-w-[180px]">
                                <p className="font-bold text-slate-800 truncate" title={item.product_name}>
                                  {item.product_name}
                                </p>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {item.sku} • Avail: {item.available_stock}
                                </span>
                              </td>

                              <td className="py-3 px-2 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(e) => handleUpdateItemPrice(idx, e.target.value)}
                                  className="w-20 text-right text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono font-bold"
                                />
                              </td>

                              <td className="py-3 px-2 text-center">
                                <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemQuantity(idx, item.quantity - 1)}
                                    disabled={item.quantity <= 1}
                                    className="px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-xs font-bold"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    max={item.available_stock}
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateItemQuantity(idx, e.target.value)}
                                    className="w-12 text-center text-xs font-bold text-slate-800 border-none focus:ring-0 p-0"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemQuantity(idx, item.quantity + 1)}
                                    disabled={item.quantity >= item.available_stock}
                                    className="px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-xs font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>

                              <td className="py-3 px-2 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.unit_price * item.quantity}
                                    value={item.discount_amount}
                                    onChange={(e) => handleUpdateItemDiscount(idx, e.target.value, false)}
                                    placeholder="₹0"
                                    className="w-16 text-right text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:bg-white font-mono"
                                  />
                                </div>
                              </td>

                              <td className="py-3 px-2 text-right font-bold text-slate-900 font-mono">
                                {formatInr(item.line_total)}
                              </td>

                              <td className="py-3 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLineItem(idx)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                                  title="Remove Item"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>

              </div>

              {/* RIGHT PANEL: FINANCIAL TOTALS & PAYMENT SETTLEMENT */}
              <div className="space-y-6">
                <div className="card sticky top-20 border-t-4 border-primary-600 shadow-lg">
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">
                    Bill Calculation & Settlement
                  </h3>

                  <div className="space-y-3 text-xs">
                    {/* Subtotal */}
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Subtotal ({lineItems.length} items):</span>
                      <span className="font-bold text-slate-900 text-sm">{formatInr(financialTotals.subtotal)}</span>
                    </div>

                    {/* Item Discount Total */}
                    {financialTotals.itemDiscountTotal > 0 && (
                      <div className="flex justify-between items-center text-amber-600">
                        <span>Item Discounts:</span>
                        <span className="font-semibold">-{formatInr(financialTotals.itemDiscountTotal)}</span>
                      </div>
                    )}

                    {/* Applicable GST Tax Calculation */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-slate-700">Applicable Tax (GST):</span>
                        <select
                          value={taxRate}
                          onChange={(e) => setTaxRate(parseFloat(e.target.value))}
                          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800"
                        >
                          <option value="0">0% (Exempt/Nil)</option>
                          <option value="5">5% (CGST 2.5% + SGST 2.5%)</option>
                          <option value="12">12% (CGST 6% + SGST 6%)</option>
                          <option value="18">18% (CGST 9% + SGST 9%)</option>
                          <option value="28">28% (Luxury/Special)</option>
                        </select>
                      </div>
                      {financialTotals.taxAmount > 0 && (
                        <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                          <span>Tax Amount:</span>
                          <span className="font-semibold text-slate-800 font-mono">+{formatInr(financialTotals.taxAmount)}</span>
                        </div>
                      )}
                    </div>

                    {/* Grand Total */}
                    <div className="pt-3 border-t-2 border-slate-200 flex justify-between items-baseline">
                      <span className="text-sm font-bold text-slate-900">Grand Total:</span>
                      <span className="text-xl font-extrabold text-primary-700 font-mono">
                        {formatInr(financialTotals.grandTotal)}
                      </span>
                    </div>

                    {/* Amount Paid & Settlement Options */}
                    <div className="pt-3 border-t border-slate-100">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Amount Paid by Customer *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        placeholder={financialTotals.grandTotal.toString()}
                        className="w-full text-sm font-mono font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-primary-500 text-emerald-700"
                      />

                      {/* Quick Full Paid Button */}
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => handleQuickPaidOption('full')}
                          className="w-full py-1.5 px-3 text-xs font-bold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          <span>Auto-Fill Full Paid ({formatInr(financialTotals.grandTotal)})</span>
                        </button>
                      </div>
                    </div>

                    {/* Balance Due & Status */}
                    <div className="pt-2 flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700">Balance Due:</span>
                      <span className={`font-mono text-sm font-bold ${financialTotals.balanceDue > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                        {formatInr(financialTotals.balanceDue)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="font-medium text-slate-500">Payment Status:</span>
                      <span className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] border ${
                        financialTotals.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        financialTotals.paymentStatus === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {financialTotals.paymentStatus}
                      </span>
                    </div>

                    {/* Payment Method Selector */}
                    <div className="pt-3 border-t border-slate-100">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Payment Method</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['Cash', 'UPI', 'Card'].map(method => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentMethod(method)}
                            className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all text-center ${
                              paymentMethod === method
                                ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>

                      {/* DYNAMIC UPI QR CODE SECTION */}
                      {paymentMethod === 'UPI' && (
                        <div className="mt-3">
                          <UpiPaymentSection
                            amount={financialTotals.grandTotal}
                            billNumber={billNumber}
                            dealer={dealer}
                            onPaymentConfirmed={() => handleQuickPaidOption('full')}
                          />
                        </div>
                      )}
                    </div>

                    {/* Notes Field */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-600">Invoice Notes / Terms</label>
                        <button
                          type="button"
                          onClick={() => {
                            if (voiceInput.isListening && voiceInput.activeField === 'notes') {
                              voiceInput.stopListening();
                            } else {
                              voiceInput.startListening('notes', (text) => {
                                setNotes(prev => prev ? `${prev} ${text}` : text);
                              });
                            }
                          }}
                          className={`text-[11px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
                            voiceInput.isListening && voiceInput.activeField === 'notes'
                              ? 'bg-rose-100 text-rose-700 animate-pulse font-bold'
                              : 'text-primary-600 hover:text-primary-800 hover:bg-primary-50'
                          }`}
                          title="Dictate Invoice Notes"
                        >
                          <Mic size={12} className={voiceInput.isListening && voiceInput.activeField === 'notes' ? 'text-rose-600' : ''} />
                          <span>{voiceInput.isListening && voiceInput.activeField === 'notes' ? 'Listening...' : 'Voice'}</span>
                        </button>
                      </div>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Warranty details, payment terms, or delivery notes"
                        rows={2}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  {/* Submit Action */}
                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={isSubmitting || lineItems.length === 0}
                      className="w-full btn-primary py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isSubmitting ? (
                        <>
                          <RotateCcw className="animate-spin" size={16} />
                          Finalizing Transaction...
                        </>
                      ) : (
                        <>
                          <Check size={18} />
                          Finalize & Issue Invoice
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </form>
        )}

        {/* ================================================================= */}
        {/* TAB 3: BILLING HISTORY                                            */}
        {/* ================================================================= */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            
            {/* Filters Header Bar */}
            <div className="card p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                
                {/* Search input */}
                <div className="relative md:col-span-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search bill#, customer, phone..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  />
                </div>

                {/* Date Filter */}
                <div>
                  <select
                    value={historyDateFilter}
                    onChange={(e) => setHistoryDateFilter(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                  >
                    <option value="All">All Time Dates</option>
                    <option value="Today">Today Only</option>
                    <option value="Last 7 Days">Last 7 Days</option>
                    <option value="This Month">This Month</option>
                  </select>
                </div>

                {/* Payment Status Filter */}
                <div>
                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                  >
                    <option value="All">All Payment Statuses</option>
                    <option value="Paid">Fully Paid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Unpaid">Unpaid / Due</option>
                  </select>
                </div>

                {/* Bill Status Filter */}
                <div>
                  <select
                    value={billStatusFilter}
                    onChange={(e) => setBillStatusFilter(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-2 px-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                  >
                    <option value="All">All Bill Statuses</option>
                    <option value="finalized">Finalized</option>
                    <option value="voided">Voided / Cancelled</option>
                  </select>
                </div>

              </div>
            </div>

            {/* Bills Data Table */}
            <div className="card overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-800">
                  Bills Audit Log ({filteredHistoryBills.length} records)
                </h3>
                <button
                  onClick={() => setActiveTab('create')}
                  className="btn-primary text-xs font-semibold inline-flex items-center gap-1.5 py-1.5 px-3"
                >
                  <Plus size={14} /> New Bill
                </button>
              </div>

              {filteredHistoryBills.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Receipt size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No matching bills found.</p>
                  <p className="text-xs text-slate-400 mt-1">Try resetting your search query or filter options.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                        <th className="py-2.5 px-3">Bill #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3 text-center">Items</th>
                        <th className="py-2.5 px-3 text-right">Grand Total</th>
                        <th className="py-2.5 px-3 text-right">Paid</th>
                        <th className="py-2.5 px-3 text-right">Balance Due</th>
                        <th className="py-2.5 px-3 text-center">Payment</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredHistoryBills.map(b => {
                        const isVoided = b.status === 'voided';
                        const itemsCount = b.bill_items?.length || 0;
                        return (
                          <tr key={b.id} className={`hover:bg-slate-50 transition-colors ${isVoided ? 'bg-slate-50/50' : ''}`}>
                            <td className="py-3 px-3 font-mono font-bold text-slate-800">
                              <span className={isVoided ? 'line-through text-slate-400' : ''}>
                                {b.bill_number}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{formatDate(b.bill_date)}</td>
                            <td className="py-3 px-3">
                              <span className="font-semibold text-slate-800">{b.customer_name}</span>
                              {b.customer_phone && <span className="block text-[11px] text-slate-400">{b.customer_phone}</span>}
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-slate-700">{itemsCount}</td>
                            <td className="py-3 px-3 text-right font-bold text-slate-900">{formatInr(b.grand_total)}</td>
                            <td className="py-3 px-3 text-right text-emerald-600 font-semibold">{formatInr(b.paid_amount)}</td>
                            <td className="py-3 px-3 text-right">
                              <span className={parseFloat(b.balance_due) > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                                {formatInr(b.balance_due)}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                b.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                b.payment_status === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {b.payment_status}
                              </span>
                              <span className="block text-[10px] text-slate-400 mt-0.5">{b.payment_method}</span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isVoided ? 'bg-rose-100 text-rose-700 line-through' : 'bg-blue-50 text-blue-700'
                              }`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewBill(b);
                                    setIsPreviewOpen(true);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-primary-700 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="View / Print Invoice"
                                >
                                  <Eye size={15} />
                                </button>
                                
                                {!isVoided && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setVoidBillTarget(b);
                                      setVoidReason('');
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Cancel / Void Bill & Restore Stock"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: ONLINE APP ORDERS STREAM & AUTO-BILLING ENGINE             */}
        {/* ================================================================= */}
        {activeTab === 'online-orders' && (
          <div className="space-y-6">

            {/* TOP HERO & MASTER AUTO-BILLING TOGGLE BANNER */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl border border-slate-800">
              <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-semibold mb-3">
                    <Smartphone size={14} className="text-blue-400" />
                    <span>Real-time Mobile App Invoicing Pipeline</span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    Online App Orders
                  </h2>
                  <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
                    Customer orders placed through your mobile application stream directly into this dashboard and are <strong>automatically converted into GST tax invoices in real-time</strong>, deducting stock from warehouse inventory continuously.
                  </p>
                </div>

                {/* Always-On Continuous Auto-Billing Status */}
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shrink-0 flex flex-col gap-2 min-w-[260px]">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-black tracking-wide uppercase">Always-On Auto-Billing</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Incoming app orders are automatically invoiced into GST bills in real-time with zero manual clicks.
                  </p>
                  <div className="text-[11px] text-slate-300 flex items-center justify-between border-t border-white/10 pt-2 font-medium">
                    <span>Engine Status:</span>
                    <span className="font-extrabold text-emerald-400">⚡ Active & Continuous</span>
                  </div>
                </div>
              </div>

              {/* Decorative background blur */}
              <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
            </div>

            {/* FILTER & STATS BAR */}
            <div className="card p-4">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={onlineOrdersSearch}
                    onChange={(e) => setOnlineOrdersSearch(e.target.value)}
                    placeholder="Search by order#, bill#, customer name, phone..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                {/* Status Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  <button
                    onClick={() => setOnlineOrdersFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      onlineOrdersFilter === 'all'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Orders ({onlineOrders.length})
                  </button>

                  <button
                    onClick={() => setOnlineOrdersFilter('unbilled')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                      onlineOrdersFilter === 'unbilled'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    <span>Pending Billing</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      onlineOrdersFilter === 'unbilled' ? 'bg-amber-800 text-white' : 'bg-amber-600 text-white'
                    }`}>
                      {unbilledOnlineOrders.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setOnlineOrdersFilter('billed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                      onlineOrdersFilter === 'billed'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <span>Billed & Synced</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      onlineOrdersFilter === 'billed' ? 'bg-emerald-800 text-white' : 'bg-emerald-600 text-white'
                    }`}>
                      {billedOnlineOrders.length}
                    </span>
                  </button>

                  <button
                    onClick={loadData}
                    disabled={loading}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors ml-1"
                    title="Refresh Orders Stream"
                  >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>
            </div>

            {/* ORDERS STREAM LIST */}
            {filteredOnlineOrders.length === 0 ? (
              <div className="card text-center py-16">
                <ShoppingBag className="mx-auto text-slate-300 mb-3" size={48} />
                <h4 className="text-base font-bold text-slate-800">No App Orders Found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  {onlineOrdersSearch || onlineOrdersFilter !== 'all' 
                    ? "No orders match the current filter or search criteria." 
                    : "No online orders have been placed from your customer mobile app yet. Once a customer places an order, it will appear here in real-time."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredOnlineOrders.map((order) => {
                  const isOrderBilled = Boolean(order.is_billed || order.bill_number);
                  const items = order.order_items || [];
                  const isProcessingThis = processingOrderIds.includes(order.id);

                  return (
                    <div
                      key={order.id}
                      className={`card transition-all border-l-4 ${
                        isOrderBilled 
                          ? 'border-l-emerald-500 hover:border-slate-300' 
                          : 'border-l-amber-500 border-amber-200/80 bg-amber-50/20 shadow-sm'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        
                        {/* Order & Customer Details */}
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-extrabold text-sm text-slate-900">
                              Order #{order.order_number || order.id.slice(0, 8)}
                            </span>
                            <span className="text-slate-400 text-xs">•</span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar size={13} className="text-slate-400" />
                              {formatDate(order.created_at)}
                            </span>
                            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              Store: {order.shop_name || 'My Store'}
                            </span>

                            {isOrderBilled ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                <CheckCircle2 size={13} className="text-emerald-600" />
                                <span>Billed: {order.bill_number || 'Finalized'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full text-xs font-extrabold animate-pulse">
                                <Zap size={12} className="text-amber-600 fill-amber-600 animate-spin" />
                                <span>Auto-Billing In Progress...</span>
                              </span>
                            )}
                          </div>

                          {/* Customer & Address Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-slate-400 shrink-0" />
                              <span className="font-bold text-slate-800">{order.customer_name || 'Online Customer'}</span>
                              {order.customer_phone && (
                                <>
                                  <span className="text-slate-400">({order.customer_phone})</span>
                                  <a 
                                    href={`tel:${order.customer_phone}`} 
                                    className="text-blue-600 hover:underline text-[11px] font-bold"
                                  >
                                    Call
                                  </a>
                                  <a 
                                    href={`https://wa.me/91${order.customer_phone.replace(/\D/g, '')}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-emerald-600 hover:underline text-[11px] font-bold"
                                  >
                                    WhatsApp
                                  </a>
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <MapPin size={14} className="text-slate-400 shrink-0" />
                              <span className="truncate text-slate-700" title={order.delivery_address}>
                                {order.delivery_address || 'Counter Pickup / Delivery'}
                              </span>
                            </div>
                          </div>

                          {/* Items Breakdown */}
                          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Items:</span>
                            {items.length === 0 ? (
                              <span className="text-xs text-slate-500 italic">No itemized list provided</span>
                            ) : (
                              items.map((it, idx) => (
                                <span
                                  key={it.id || idx}
                                  className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded-md"
                                >
                                  <span className="font-extrabold text-blue-600">{it.quantity}x</span>
                                  <span className="font-medium">{it.product_name || 'Item'}</span>
                                  <span className="text-slate-400 font-normal">₹{it.price || it.unit_price}</span>
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Amount & Status Action */}
                        <div className="flex lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 shrink-0 gap-3 min-w-[200px]">
                          <div className="text-left lg:text-right">
                            <span className="text-[11px] text-slate-400 font-semibold block uppercase tracking-wider">Total Amount</span>
                            <span className="text-xl font-black text-slate-900">
                              {formatInr(order.total_amount)}
                            </span>
                            <span className="block text-[11px] text-slate-500">
                              Method: {order.payment_method || 'Online'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isOrderBilled ? (
                              <button
                                type="button"
                                onClick={() => handleViewOrderBill(order)}
                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                              >
                                <Eye size={14} />
                                <span>View Bill / Print</span>
                              </button>
                            ) : (
                              <div className="px-3.5 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                                <Zap size={14} className="animate-spin text-amber-600" />
                                <span>Auto-Billing...</span>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </div>

      {/* =================================================================== */}
      {/* INVOICE PREVIEW MODAL                                               */}
      {/* =================================================================== */}
      <InvoiceModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        bill={previewBill}
        dealer={dealer}
      />

      {/* =================================================================== */}
      {/* CONFIRM VOID / CANCEL BILL MODAL                                    */}
      {/* =================================================================== */}
      {voidBillTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-fade-in-up">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2 bg-rose-50 rounded-xl">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Void Bill #{voidBillTarget.bill_number}?</h3>
                <p className="text-xs text-slate-500">Stock will be automatically returned to inventory</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Voiding this bill will mark its status as <strong>voided</strong>, safely restore all item quantities back to available stock, and cancel the associated sales transaction. Financial history will be preserved with an audit trail.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Voiding *</label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Customer returned items / Billing error"
                rows={2}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setVoidBillTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Keep Bill
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                disabled={isVoiding}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
              >
                {isVoiding ? 'Voiding...' : 'Confirm Void & Restore Stock'}
              </button>
            </div>
          </div>
        </div>
      )}



    </Layout>
  );
};

export default Billing;
