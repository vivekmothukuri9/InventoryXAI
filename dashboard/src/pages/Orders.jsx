import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../services/supabase';
import { 
  ShoppingCart, Search, Plus, Eye, Trash2, X, ChevronRight,
  Clock, CheckCircle, Package, Truck, AlertCircle, IndianRupee, MapPin
} from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, colorClass, isLoading }) => {
  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="flex justify-between items-start mb-4">
          <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
        </div>
        <div>
          <div className="w-24 h-4 bg-slate-200 rounded mb-2"></div>
          <div className="w-16 h-8 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg ${colorClass}`}>
          <Icon size={24} />
        </div>
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      </div>
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl max-h-full my-8">
        <div className="relative bg-white rounded-xl shadow-xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-100 shrink-0">
            <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-lg text-sm w-8 h-8 flex justify-center items-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-4 md:p-5 overflow-y-auto flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const Orders = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dealerId, setDealerId] = useState(null);
  
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  
  // UI State
  const [activeModal, setActiveModal] = useState(null); // 'create', 'view'
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Create Order Form State
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', email: '', address: '' });
  const [orderItems, setOrderItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session?.user) throw new Error("Authentication required.");

      const { data: dealerData, error: dealerError } = await supabase
        .from('dealers')
        .select('id')
        .eq('user_id', session.user.id)
        .single();
        
      if (dealerError || !dealerData) throw new Error("Dealer profile not found.");
      const dId = dealerData.id;
      setDealerId(dId);

      // Fetch Products with Stock
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select(`id, name, sku, base_price, inventory (stock_quantity)`)
        .eq('dealer_id', dId)
        .eq('is_deleted', false);
      
      if (prodError) throw prodError;
      
      setProducts((prodData || []).map(p => ({
        ...p,
        stock_quantity: p.inventory?.[0]?.stock_quantity || 0
      })));

      // Fetch Orders with Items
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id, product_id, quantity, unit_price, total_price,
            products (name, sku)
          )
        `)
        .eq('dealer_id', dId)
        .order('created_at', { ascending: false });
        
      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

    } catch (err) {
      console.error("Orders fetch error:", err);
      if (err.message?.includes('relation "public.orders" does not exist')) {
        setError("Database schema missing. Please run update-orders-schema.sql");
      } else {
        setError(err.message || "Failed to load orders");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Stats
  const stats = useMemo(() => {
    let total = orders.length;
    let pending = 0, processing = 0, completed = 0, cancelled = 0;
    let totalValue = 0;
    
    orders.forEach(o => {
      if (o.status === 'Pending') pending++;
      else if (o.status === 'Confirmed' || o.status === 'Processing') processing++;
      else if (o.status === 'Completed') completed++;
      else if (o.status === 'Cancelled') cancelled++;
      
      if (o.status !== 'Cancelled') totalValue += parseFloat(o.total_amount);
    });

    return { total, pending, processing, completed, cancelled, totalValue };
  }, [orders]);

  // Filtering
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = 
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer_phone?.includes(searchQuery) ||
        o.order_items?.some(i => i.products?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
        
      const matchesStatus = statusFilter === 'All' || o.status === statusFilter || 
                            (statusFilter === 'Processing' && o.status === 'Confirmed');
                            
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  // Form Calculations
  const calculateTotals = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const finalTotal = subtotal - parseFloat(discount || 0);
    return { subtotal, finalTotal: finalTotal > 0 ? finalTotal : 0 };
  };

  const handleAddProductRow = () => {
    setOrderItems([...orderItems, { product_id: '', quantity: 1, unit_price: 0 }]);
  };

  const handleUpdateRow = (index, field, value) => {
    const newItems = [...orderItems];
    newItems[index][field] = value;
    
    // Auto-fill price if product selected
    if (field === 'product_id') {
      const prod = products.find(p => p.id === value);
      if (prod) newItems[index].unit_price = parseFloat(prod.base_price || 0);
    }
    
    setOrderItems(newItems);
  };

  const handleRemoveRow = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    try {
      if (!customerInfo.name.trim()) throw new Error("Customer name is required.");
      if (orderItems.length === 0) throw new Error("Please add at least one product.");
      
      const cleanItems = [];
      for (let i = 0; i < orderItems.length; i++) {
        const item = orderItems[i];
        if (!item.product_id) throw new Error(`Row ${i+1}: Please select a product.`);
        
        const qty = parseInt(item.quantity);
        if (isNaN(qty) || qty <= 0) throw new Error(`Row ${i+1}: Quantity must be greater than 0.`);
        
        const prod = products.find(p => p.id === item.product_id);
        if (qty > prod.stock_quantity) throw new Error(`Row ${i+1}: Exceeds available stock (${prod.stock_quantity}).`);
        
        cleanItems.push({
          product_id: item.product_id,
          quantity: qty,
          unit_price: parseFloat(item.unit_price),
          total_price: qty * parseFloat(item.unit_price)
        });
      }

      const { subtotal, finalTotal } = calculateTotals();

      // 1. Insert Order
      const { data: newOrder, error: orderErr } = await supabase
        .from('orders')
        .insert([{
          dealer_id: dealerId,
          customer_name: customerInfo.name,
          customer_phone: customerInfo.phone,
          customer_email: customerInfo.email,
          customer_address: customerInfo.address,
          status: 'Pending',
          subtotal: subtotal,
          discount: parseFloat(discount || 0),
          total_amount: finalTotal
        }])
        .select()
        .single();
        
      if (orderErr) throw orderErr;

      // 2. Insert Order Items
      const itemsToInsert = cleanItems.map(item => ({
        order_id: newOrder.id,
        ...item
      }));

      const { error: itemsErr } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsErr) {
        // Rollback order if items fail
        await supabase.from('orders').delete().eq('id', newOrder.id);
        throw itemsErr;
      }

      await fetchData();
      closeModal();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedOrder) return;
    setFormSubmitting(true);
    setFormError(null);
    try {
      if (newStatus === 'Completed' && selectedOrder.status !== 'Completed') {
        // Atomic Operation: Complete Order, deduct stock, create sales
        const { data, error } = await supabase.rpc('complete_order', {
          p_order_id: selectedOrder.id
        });
        
        if (error) throw error;
      } else {
        // Simple status update for other statuses
        const { error } = await supabase
          .from('orders')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', selectedOrder.id);
          
        if (error) throw error;
      }
      
      await fetchData();
      closeModal();
    } catch (err) {
      setFormError(err.message || 'Failed to update order status');
    } finally {
      setFormSubmitting(false);
    }
  };

  const openAddModal = () => {
    setCustomerInfo({ name: '', phone: '', email: '', address: '' });
    setOrderItems([{ product_id: '', quantity: 1, unit_price: 0 }]);
    setDiscount(0);
    setFormError(null);
    setActiveModal('create');
  };

  const closeModal = () => {
    if (formSubmitting) return;
    setActiveModal(null);
    setSelectedOrder(null);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Pending': return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold border border-amber-200">Pending</span>;
      case 'Confirmed': return <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold border border-blue-200">Confirmed</span>;
      case 'Processing': return <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-200">Processing</span>;
      case 'Completed': return <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold border border-green-200">Completed</span>;
      case 'Cancelled': return <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold border border-red-200">Cancelled</span>;
      default: return null;
    }
  };

  if (error) {
    return (
      <Layout title="Orders Management">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-8">
          <AlertCircle className="text-red-500 mx-auto mb-3" size={40} />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Orders</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Orders Management">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <StatCard title="Total Orders" value={stats.total} icon={ShoppingCart} colorClass="bg-blue-50 text-blue-600" isLoading={loading} />
        <StatCard title="Pending" value={stats.pending} icon={Clock} colorClass="bg-amber-50 text-amber-600" isLoading={loading} />
        <StatCard title="Processing" value={stats.processing} icon={Truck} colorClass="bg-indigo-50 text-indigo-600" isLoading={loading} />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle} colorClass="bg-green-50 text-green-600" isLoading={loading} />
        <StatCard title="Cancelled" value={stats.cancelled} icon={X} colorClass="bg-red-50 text-red-600" isLoading={loading} />
        <StatCard title="Total Value" value={`₹${stats.totalValue.toLocaleString('en-IN')}`} icon={IndianRupee} colorClass="bg-slate-100 text-slate-700" isLoading={loading} />
      </div>

      <div className="card !p-0 overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
        {/* Header & Controls */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search orders, customers..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 hidden md:block"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <button onClick={openAddModal} className="btn btn-primary flex items-center gap-2">
            <Plus size={18} /> Create Order
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          {loading ? (
            <div className="p-12 flex justify-center"><div className="spinner"></div></div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
                <ShoppingCart size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">No orders found</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-6">Create an order to manage fulfillment and shipments.</p>
              {!searchQuery && <button onClick={openAddModal} className="btn btn-primary">Create Your First Order</button>}
            </div>
          ) : (
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 font-medium">Order ID & Date</th>
                  <th className="px-6 py-4 font-medium">Customer</th>
                  <th className="px-6 py-4 font-medium text-center">Items</th>
                  <th className="px-6 py-4 font-medium text-right">Total Amount</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const totalQty = order.order_items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
                  return (
                    <tr key={order.id} className={`hover:bg-slate-50/50 transition-colors group ${order.status==='Cancelled'?'bg-red-50/30':''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono font-medium text-slate-900">#{order.id.split('-')[0].toUpperCase()}</div>
                        <div className="text-xs text-slate-500 mt-1">{new Date(order.created_at).toLocaleDateString('en-GB')}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{order.customer_name}</div>
                        {order.customer_phone && <div className="text-xs text-slate-500">{order.customer_phone}</div>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="font-medium text-slate-900">{order.order_items?.length || 0} prod.</div>
                        <div className="text-xs text-slate-500">{totalQty} qty</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-slate-900 text-base">₹{parseFloat(order.total_amount).toLocaleString('en-IN')}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => { setSelectedOrder(order); setActiveModal('view'); }} className="btn bg-white border border-slate-200 text-slate-700 text-xs px-3 py-1.5 hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
                          Manage
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Create Order Modal */}
      <Modal isOpen={activeModal === 'create'} onClose={closeModal} title="Create New Order">
        <form onSubmit={handleCreateOrder} className="space-y-6">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Customer Info Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Customer Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                <input required type="text" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                <input type="tel" value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Delivery Address</label>
                <textarea rows="2" value={customerInfo.address} onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"></textarea>
              </div>
            </div>
          </div>

          {/* Order Items Section */}
          <div>
            <div className="flex justify-between items-end mb-3">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Order Items</h4>
            </div>
            
            <div className="space-y-3">
              {orderItems.map((item, index) => (
                <div key={index} className="flex flex-col md:flex-row gap-3 items-end bg-white p-3 border border-slate-200 rounded-lg">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Product</label>
                    <select required value={item.product_id} onChange={e => handleUpdateRow(index, 'product_id', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-500">
                      <option value="">-- Select Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id} disabled={p.stock_quantity === 0}>
                          {p.name} (Available: {p.stock_quantity})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full md:w-24">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Quantity</label>
                    <input required type="number" min="1" value={item.quantity} onChange={e => handleUpdateRow(index, 'quantity', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 text-center" />
                  </div>
                  <div className="w-full md:w-32">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Unit Price (₹)</label>
                    <input required type="number" min="0" step="0.01" value={item.unit_price} onChange={e => handleUpdateRow(index, 'unit_price', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 text-right" />
                  </div>
                  <div className="w-full md:w-32 hidden md:block">
                    <label className="block text-xs font-medium text-slate-500 mb-1 text-right">Total (₹)</label>
                    <div className="px-3 py-2 bg-slate-100 border border-slate-100 rounded-lg text-sm font-semibold text-right text-slate-700">
                      {((parseInt(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toLocaleString('en-IN')}
                    </div>
                  </div>
                  {orderItems.length > 1 && (
                    <button type="button" onClick={() => handleRemoveRow(index)} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 rounded-lg border border-slate-200">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <button type="button" onClick={handleAddProductRow} className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
              <Plus size={16} /> Add Another Product
            </button>
          </div>

          {/* Summary Section */}
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <div className="w-full md:w-64 space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium">₹{calculateTotals().subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 items-center">
                <span>Discount (₹)</span>
                <input type="number" min="0" value={discount} onChange={e => setDiscount(e.target.value)} className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-right focus:outline-none" />
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-800">Final Total</span>
                <span className="text-xl font-bold text-primary-600">₹{calculateTotals().finalTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={closeModal} className="btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={formSubmitting} className="btn btn-primary min-w-[120px]">
              {formSubmitting ? <span className="spinner"></span> : 'Create Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View & Manage Order Modal */}
      <Modal isOpen={activeModal === 'view'} onClose={closeModal} title={`Order #${selectedOrder?.id.split('-')[0].toUpperCase()}`}>
        {selectedOrder && (
          <div className="space-y-6">
            {formError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Workflow Control */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Status</p>
                {getStatusBadge(selectedOrder.status)}
                {selectedOrder.status === 'Completed' && <p className="text-xs text-green-600 mt-2 font-medium">✓ Inventory updated & sales recorded.</p>}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {selectedOrder.status === 'Pending' && (
                  <>
                    <button onClick={() => handleUpdateStatus('Confirmed')} disabled={formSubmitting} className="btn bg-blue-600 hover:bg-blue-700 text-white border-none text-sm px-4">Mark Confirmed</button>
                    <button onClick={() => handleUpdateStatus('Cancelled')} disabled={formSubmitting} className="btn bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm px-4">Cancel Order</button>
                  </>
                )}
                {selectedOrder.status === 'Confirmed' && (
                  <>
                    <button onClick={() => handleUpdateStatus('Processing')} disabled={formSubmitting} className="btn bg-indigo-600 hover:bg-indigo-700 text-white border-none text-sm px-4">Mark Processing</button>
                    <button onClick={() => handleUpdateStatus('Cancelled')} disabled={formSubmitting} className="btn bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm px-4">Cancel Order</button>
                  </>
                )}
                {selectedOrder.status === 'Processing' && (
                  <>
                    <button onClick={() => handleUpdateStatus('Completed')} disabled={formSubmitting} className="btn bg-green-600 hover:bg-green-700 text-white border-none text-sm px-4 shadow-md flex items-center gap-1">
                      <CheckCircle size={16}/> Complete Order
                    </button>
                    <button onClick={() => handleUpdateStatus('Cancelled')} disabled={formSubmitting} className="btn bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm px-4">Cancel Order</button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2"><ShoppingCart size={16}/> Customer</h4>
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                  <p className="font-semibold text-slate-900 text-lg">{selectedOrder.customer_name}</p>
                  {selectedOrder.customer_phone && <p className="text-sm text-slate-600 flex items-center gap-2">📞 {selectedOrder.customer_phone}</p>}
                  {selectedOrder.customer_email && <p className="text-sm text-slate-600 flex items-center gap-2">✉️ {selectedOrder.customer_email}</p>}
                  {selectedOrder.customer_address && <p className="text-sm text-slate-600 flex items-start gap-2 mt-2 pt-2 border-t border-slate-100"><MapPin size={16} className="shrink-0 mt-0.5 text-slate-400"/> {selectedOrder.customer_address}</p>}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2"><Clock size={16}/> Timeline</h4>
                <div className="p-4 bg-white border border-slate-200 rounded-xl">
                  <div className="relative border-l-2 border-slate-200 pl-4 ml-2 space-y-4">
                    <div className="relative">
                      <div className="absolute w-3 h-3 bg-slate-300 rounded-full -left-[23px] top-1"></div>
                      <p className="text-sm font-medium text-slate-900">Order Created</p>
                      <p className="text-xs text-slate-500">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                    </div>
                    {selectedOrder.updated_at !== selectedOrder.created_at && (
                      <div className="relative">
                        <div className={`absolute w-3 h-3 rounded-full -left-[23px] top-1 ${selectedOrder.status === 'Completed' ? 'bg-green-500' : selectedOrder.status === 'Cancelled' ? 'bg-red-500' : 'bg-primary-500'}`}></div>
                        <p className="text-sm font-medium text-slate-900">Status: {selectedOrder.status}</p>
                        <p className="text-xs text-slate-500">{new Date(selectedOrder.updated_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2"><Package size={16}/> Order Items</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium text-center">Qty</th>
                      <th className="px-4 py-3 font-medium text-right">Price</th>
                      <th className="px-4 py-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.order_items.map(item => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{item.products?.name || 'Deleted Product'}</p>
                          <p className="text-xs text-slate-500">{item.products?.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-center font-medium">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-slate-600">₹{parseFloat(item.unit_price).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">₹{parseFloat(item.total_price).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col items-end space-y-1">
                  <div className="flex justify-between w-48 text-sm text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-medium">₹{parseFloat(selectedOrder.subtotal).toLocaleString('en-IN')}</span>
                  </div>
                  {parseFloat(selectedOrder.discount) > 0 && (
                    <div className="flex justify-between w-48 text-sm text-slate-600">
                      <span>Discount</span>
                      <span className="font-medium text-green-600">-₹{parseFloat(selectedOrder.discount).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between w-48 pt-2 border-t border-slate-200 mt-2">
                    <span className="font-bold text-slate-800">Total</span>
                    <span className="font-bold text-primary-600">₹{parseFloat(selectedOrder.total_amount).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-2 flex justify-end border-t border-slate-100">
               <button onClick={closeModal} className="btn bg-white border border-slate-200 text-slate-700">Close</button>
            </div>
          </div>
        )}
      </Modal>

    </Layout>
  );
};

export default Orders;
