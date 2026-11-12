import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../services/supabase';
import { 
  ShoppingCart, Search, Eye, X,
  Clock, CheckCircle2, Truck, AlertCircle, 
  IndianRupee, MapPin, Phone, Bell,
  RefreshCw, ChefHat, Store, Receipt, Zap
} from 'lucide-react';

// ============================================================================
// AUDIO NOTIFICATION UTILITY (Web Audio API - 100% Reliable, No External File)
// ============================================================================
const playOrderChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // 3-tone cheerful order chime: E5 -> G#5 -> B5
    const notes = [
      { freq: 659.25, start: 0, duration: 0.15 },
      { freq: 830.61, start: 0.12, duration: 0.15 },
      { freq: 987.77, start: 0.24, duration: 0.35 }
    ];

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    });
  } catch (err) {
    console.warn("Audio notification chime error:", err);
  }
};

// ============================================================================
// STATUS CONFIGURATION
// ============================================================================
const STATUS_CONFIG = {
  'Confirmed': {
    label: 'Confirmed',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: CheckCircle2,
    next: 'Preparing',
    nextLabel: 'Start Preparing',
    nextIcon: ChefHat,
    nextBtn: 'bg-amber-600 hover:bg-amber-700 text-white'
  },
  'Preparing': {
    label: 'Preparing',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: ChefHat,
    next: 'Out for Delivery',
    nextLabel: 'Dispatch for Delivery',
    nextIcon: Truck,
    nextBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white'
  },
  'Out for Delivery': {
    label: 'Out for Delivery',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: Truck,
    next: 'Delivered',
    nextLabel: 'Mark as Delivered',
    nextIcon: CheckCircle2,
    nextBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white'
  },
  'Delivered': {
    label: 'Delivered',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
    next: null,
    nextLabel: null,
    nextIcon: null,
    nextBtn: ''
  },
  'Cancelled': {
    label: 'Cancelled',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: AlertCircle,
    next: null,
    nextLabel: null,
    nextIcon: null,
    nextBtn: ''
  }
};

const Orders = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeShopName, setActiveShopName] = useState(() => localStorage.getItem('user_shop_name') || 'vivek');
  
  // Audio & Toast Notification
  const [incomingToast, setIncomingToast] = useState(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  
  // UI & Filters
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const activeShopNameRef = useRef(activeShopName);
  useEffect(() => {
    activeShopNameRef.current = activeShopName;
  }, [activeShopName]);

  // ============================================================================
  // 1. INITIALIZE DATA & SHOP PROFILE
  // ============================================================================
  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Check User Session
      const { data: { session } } = await supabase.auth.getSession();
      
      let shopName = '';
      if (session?.user) {
        const { data: dealerData } = await supabase
          .from('dealers')
          .select('id, full_name, shop_name, role')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (dealerData?.shop_name) {
          shopName = dealerData.shop_name;
        }
      }

      if (!shopName) {
        shopName = localStorage.getItem('user_shop_name') || 'vivek';
      }

      setActiveShopName(shopName);
      activeShopNameRef.current = shopName;

      // 2. Fetch orders strictly for this shop
      await loadOrders(shopName);

    } catch (err) {
      console.error("Orders init error:", err);
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // 2. LOAD ORDERS FROM SUPABASE (Strictly for this shopkeeper's shop)
  // ============================================================================
  const loadOrders = async (shopToFilter) => {
    try {
      let query = supabase
        .from('orders')
        .select(`
          id, order_number, shop_name, total_amount, status, payment_method, 
          delivery_address, customer_phone, customer_name, created_at,
          order_items (id, product_name, quantity, price, shop_name)
        `)
        .eq('shop_name', shopToFilter)
        .order('created_at', { ascending: false });

      let { data, error: ordersErr } = await query;
      
      // If columns like order_items.product_name or delivery_address don't exist yet in Supabase
      if (ordersErr && (ordersErr.code === '42703' || ordersErr.message?.includes('does not exist'))) {
        console.warn("Detected pending SQL schema update. Trying basic query...", ordersErr.message);
        
        let basicQuery = supabase
          .from('orders')
          .select('*')
          .eq('shop_name', shopToFilter)
          .order('created_at', { ascending: false });

        const basicRes = await basicQuery;
        if (!basicRes.error) {
          setOrders(basicRes.data || []);
          return;
        }
      }

      if (ordersErr) {
        throw ordersErr;
      }

      setError(null);
      setOrders(data || []);
    } catch (err) {
      console.error("Error loading orders:", err);
      setError(err.message || "Could not fetch orders");
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // ============================================================================
  // 3. SUPABASE REALTIME SUBSCRIPTION FOR CUSTOMER ANDROID APP ORDERS
  // ============================================================================
  useEffect(() => {
    console.log("Subscribing to realtime customer orders...");

    const channel = supabase
      .channel('realtime_orders_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        async (payload) => {
          console.log("🔔 Realtime Order Received:", payload.new);
          const newOrder = payload.new;
          const currentShop = activeShopNameRef.current;

          // Strictly filter by this shopkeeper's shop
          const matchesShop = newOrder.shop_name && 
            newOrder.shop_name.trim().toLowerCase() === currentShop?.trim().toLowerCase();

          if (matchesShop) {
            // Fetch associated order_items
            const { data: items } = await supabase
              .from('order_items')
              .select('*')
              .eq('order_id', newOrder.id);

            const completeOrder = {
              ...newOrder,
              order_items: items || []
            };

            // Play audio notification chime
            playOrderChime();

            // Show Toast Alert Banner
            setIncomingToast({
              id: Date.now(),
              orderNumber: newOrder.order_number || newOrder.id.substring(0, 8),
              shopName: newOrder.shop_name,
              totalAmount: newOrder.total_amount,
              phone: newOrder.customer_phone || 'Customer',
              address: newOrder.delivery_address || 'Online Order',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });

            // Prepend new order to list
            setOrders(prev => [completeOrder, ...prev.filter(o => o.id !== newOrder.id)]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          console.log("🔄 Realtime Order Update:", payload.new);
          const updated = payload.new;
          setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
          setSelectedOrder(prev => prev && prev.id === updated.id ? { ...prev, ...updated } : prev);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-dismiss toast after 8 seconds
  useEffect(() => {
    if (incomingToast) {
      const timer = setTimeout(() => {
        setIncomingToast(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [incomingToast]);

  // ============================================================================
  // 4. UPDATE ORDER STATUS (Confirmed -> Preparing -> Out for Delivery -> Delivered)
  // ============================================================================
  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (updateErr) throw updateErr;

      // Update state locally
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status: " + err.message);
    } finally {
      setUpdatingOrderId(null);
    }
  };



  // ============================================================================
  // 6. FILTERING & COMPUTED STATS
  // ============================================================================
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Status filter
      if (statusFilter !== 'All' && order.status !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNum = order.order_number?.toLowerCase().includes(query) || order.id?.toLowerCase().includes(query);
        const matchesPhone = order.customer_phone?.toLowerCase().includes(query);
        const matchesAddress = order.delivery_address?.toLowerCase().includes(query);
        const matchesItems = order.order_items?.some(it => it.product_name?.toLowerCase().includes(query));
        return matchesNum || matchesPhone || matchesAddress || matchesItems;
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const totalCount = orders.length;
    const pendingCount = orders.filter(o => o.status === 'Confirmed' || o.status === 'Preparing').length;
    const outForDeliveryCount = orders.filter(o => o.status === 'Out for Delivery').length;
    const deliveredCount = orders.filter(o => o.status === 'Delivered').length;
    const totalRevenue = orders
      .filter(o => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

    return { totalCount, pendingCount, outForDeliveryCount, deliveredCount, totalRevenue };
  }, [orders]);

  return (
    <Layout title="Customer App Orders (Real-Time)">
      
      {/* ====================================================================== */}
      {/* INCOMING ORDER TOAST NOTIFICATION (Visual Alert) */}
      {/* ====================================================================== */}
      {incomingToast && (
        <div className="fixed top-6 right-6 z-50 max-w-md w-full bg-slate-900 border-2 border-emerald-500 text-white p-4 rounded-2xl shadow-2xl animate-bounce-subtle flex items-start gap-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
            <Bell size={24} className="animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                ⚡ New Order Received!
              </span>
              <span className="text-[11px] text-slate-400">{incomingToast.time}</span>
            </div>
            <h4 className="text-base font-bold truncate">
              Order #{incomingToast.orderNumber}
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 truncate">
              📞 {incomingToast.phone} • ₹{Number(incomingToast.totalAmount).toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              📍 {incomingToast.address}
            </p>
          </div>
          <button 
            onClick={() => setIncomingToast(null)} 
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* ====================================================================== */}
      {/* HEADER: SHOPKEEPER STORE INFO & REFRESH */}
      {/* ====================================================================== */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        
        {/* Shop Info Display (No Dropdown, Strictly This Shopkeeper's Shop) */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary-50 text-primary-600 rounded-lg">
            <Store size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Shopkeeper Store:
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                realtimeConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  realtimeConnected ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
                }`} />
                {realtimeConnected ? 'Live Realtime Connected' : 'Connecting...'}
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2 mt-0.5">
              🏪 {activeShopName || 'My Store'}
            </h3>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <a
            href="/billing?tab=online-orders"
            className="px-3.5 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold shadow-sm"
            title="Auto-Bill Orders in POS"
          >
            <Receipt size={15} />
            <span>Billing POS Stream</span>
          </a>

          <button
            onClick={() => loadOrders(activeShopName)}
            disabled={loading}
            className="px-3.5 py-2 text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-2 text-xs font-semibold shadow-sm"
            title="Refresh Orders"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>Refresh Orders</span>
          </button>
        </div>

      </div>

      {/* ====================================================================== */}
      {/* STATS OVERVIEW CARDS */}
      {/* ====================================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Orders</span>
            <ShoppingCart size={18} className="text-primary-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{stats.totalCount}</h3>
          <p className="text-xs text-slate-400 mt-1">Live customer orders</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Kitchen / Preparing</span>
            <ChefHat size={18} className="text-amber-500" />
          </div>
          <h3 className="text-2xl font-bold text-amber-600">{stats.pendingCount}</h3>
          <p className="text-xs text-slate-400 mt-1">Needs attention</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Out for Delivery</span>
            <Truck size={18} className="text-indigo-500" />
          </div>
          <h3 className="text-2xl font-bold text-indigo-600">{stats.outForDeliveryCount}</h3>
          <p className="text-xs text-slate-400 mt-1">On the way</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Value</span>
            <IndianRupee size={18} className="text-emerald-500" />
          </div>
          <h3 className="text-2xl font-bold text-emerald-600">₹{stats.totalRevenue.toLocaleString('en-IN')}</h3>
          <p className="text-xs text-slate-400 mt-1">{stats.deliveredCount} delivered orders</p>
        </div>
      </div>

      {/* ====================================================================== */}
      {/* SEARCH AND STATUS FILTERS */}
      {/* ====================================================================== */}
      <div data-tour="orders" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {['All', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'].map((status) => {
            const count = status === 'All' 
              ? orders.length 
              : orders.filter(o => o.status === status).length;
            const isActive = statusFilter === status;

            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isActive 
                    ? 'bg-slate-900 text-white' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {status}
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search order #, phone, item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

      </div>

      {/* ====================================================================== */}
      {/* ORDERS LIST / TABLE */}
      {/* ====================================================================== */}
      {loading ? (
        <div className="card text-center py-16">
          <RefreshCw className="animate-spin text-primary-500 mx-auto mb-3" size={32} />
          <p className="text-slate-600 font-medium">Connecting to Supabase Realtime...</p>
        </div>
      ) : error ? (
        <div className="card bg-red-50 border-red-200 text-red-800 p-6 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle size={24} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-900">Database Setup Required</h4>
              <p className="text-sm mt-1">{error}</p>
              <div className="mt-4 p-3 bg-white rounded-lg border border-red-200 text-xs font-mono text-slate-700">
                Execute the script <strong>update-customer-orders-schema.sql</strong> in your Supabase SQL editor.
              </div>
            </div>
          </div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card text-center py-16 bg-white border border-dashed border-slate-300 rounded-2xl">
          <ShoppingCart size={48} className="text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No Orders Found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery 
              ? "No orders matched your search criteria." 
              : `Waiting for customer orders for "${activeShopName}". Incoming orders from the customer app will appear here live.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const config = STATUS_CONFIG[order.status] || STATUS_CONFIG['Confirmed'];
            const StatusIcon = config.icon;
            const items = order.order_items || [];
            const itemCount = items.reduce((sum, it) => sum + (it.quantity || 1), 0);

            return (
              <div 
                key={order.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm p-4 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left: Order Info & Customer Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1.5">
                      <span className="font-mono font-bold text-slate-900 text-base">
                        #{order.order_number || order.id.substring(0, 8)}
                      </span>
                      
                      {/* Shop Name Tag */}
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        <Store size={12} /> {order.shop_name}
                      </span>

                      {/* Status Badge */}
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${config.badge}`}>
                        <StatusIcon size={12} />
                        {order.status}
                      </span>

                      {/* Payment Method */}
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                        {order.payment_method || 'Cash on Delivery'}
                      </span>

                      {/* Time */}
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Customer & Address Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 mt-2">
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-900">{order.customer_phone || 'N/A'}</span>
                        {order.customer_phone && (
                          <a 
                            href={`tel:${order.customer_phone}`} 
                            className="text-primary-600 hover:underline text-[11px] font-semibold"
                          >
                            Call
                          </a>
                        )}
                        {order.customer_phone && (
                          <a 
                            href={`https://wa.me/91${order.customer_phone.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:underline text-[11px] font-semibold"
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-slate-400 shrink-0" />
                        <span className="truncate" title={order.delivery_address}>
                          {order.delivery_address || 'Customer pickup / Counter order'}
                        </span>
                      </div>
                    </div>

                    {/* Products Preview */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Items:</span>
                      {items.length === 0 ? (
                        <span className="text-xs text-slate-500 italic">No specific item details</span>
                      ) : (
                        items.map((it, idx) => (
                          <span 
                            key={it.id || idx}
                            className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 text-xs px-2 py-0.5 rounded-md"
                          >
                            <span className="font-bold text-primary-600">{it.quantity}x</span> {it.product_name}
                            <span className="text-slate-400 font-normal">₹{it.price}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right: Amount & Workflow Action Buttons */}
                  <div className="flex lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 shrink-0 gap-3">
                    <div className="text-left lg:text-right">
                      <p className="text-xs text-slate-400 font-medium">Total Amount</p>
                      <h4 className="text-xl font-extrabold text-slate-900">
                        ₹{Number(order.total_amount).toLocaleString('en-IN')}
                      </h4>
                      <p className="text-[11px] text-slate-500">{itemCount} items</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* View Details Modal Trigger */}
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <Eye size={14} /> Details
                      </button>

                      {/* Next Step Transition Button */}
                      {config.next && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, config.next)}
                          disabled={updatingOrderId === order.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${config.nextBtn}`}
                        >
                          {config.nextIcon && <config.nextIcon size={14} />}
                          {updatingOrderId === order.id ? 'Updating...' : config.nextLabel}
                        </button>
                      )}

                      {/* Cancel Button (Only if not delivered) */}
                      {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to cancel order #${order.order_number}?`)) {
                              handleUpdateStatus(order.id, 'Cancelled');
                            }
                          }}
                          className="px-2 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors"
                          title="Cancel Order"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ====================================================================== */}
      {/* ORDER DETAILS MODAL */}
      {/* ====================================================================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary-100 text-primary-700 rounded-xl">
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Order #{selectedOrder.order_number || selectedOrder.id.substring(0, 8)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Received on {new Date(selectedOrder.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-200/50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Status Timeline */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">
                  Order Status Progress
                </span>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  {['Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'].map((st, idx) => {
                    const statuses = ['Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];
                    const currentIdx = statuses.indexOf(selectedOrder.status);
                    const isPassed = currentIdx >= idx;
                    const isCurrent = selectedOrder.status === st;

                    return (
                      <div key={st} className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1 transition-colors ${
                          isCurrent 
                            ? 'bg-primary-600 text-white ring-4 ring-primary-100' 
                            : isPassed 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                          {isPassed ? '✓' : idx + 1}
                        </div>
                        <span className={`text-[11px] ${isCurrent ? 'font-bold text-primary-700' : 'text-slate-600'}`}>
                          {st}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Customer & Delivery Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Customer Information
                  </span>
                  <p className="text-sm font-bold text-slate-900">{selectedOrder.customer_name || 'Customer'}</p>
                  <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                    <Phone size={13} className="text-slate-400" />
                    {selectedOrder.customer_phone || 'Phone not provided'}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {selectedOrder.customer_phone && (
                      <a 
                        href={`tel:${selectedOrder.customer_phone}`}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Call Customer
                      </a>
                    )}
                    {selectedOrder.customer_phone && (
                      <a 
                        href={`https://wa.me/91${selectedOrder.customer_phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Delivery & Payment
                  </span>
                  <p className="text-xs text-slate-700 flex items-start gap-1.5">
                    <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                    <span>{selectedOrder.delivery_address || 'Local store pickup'}</span>
                  </p>
                  <div className="mt-3 text-xs text-slate-600">
                    <span className="font-semibold text-slate-900">Payment:</span> {selectedOrder.payment_method || 'Cash on Delivery'}
                  </div>
                </div>
              </div>

              {/* Order Items Table */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3">Order Items</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="p-3">Product Name</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Price</th>
                        <th className="p-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedOrder.order_items || []).map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="p-3 font-medium text-slate-900">{item.product_name}</td>
                          <td className="p-3 text-center font-bold text-primary-600">{item.quantity}</td>
                          <td className="p-3 text-right text-slate-600">₹{item.price}</td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            ₹{(Number(item.price) * Number(item.quantity)).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan="3" className="p-3 text-right text-slate-700">Total Amount:</td>
                        <td className="p-3 text-right text-base text-emerald-600">
                          ₹{Number(selectedOrder.total_amount).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer (Action Controls) */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Change Status:
              </span>
              <div className="flex items-center gap-2">
                {['Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(selectedOrder.id, st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedOrder.status === st 
                        ? 'bg-slate-900 text-white' 
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </Layout>
  );
};

export default Orders;
