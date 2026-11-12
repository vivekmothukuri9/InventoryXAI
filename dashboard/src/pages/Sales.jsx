import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../services/supabase';
import { generateMockSales } from '../services/mockSalesService';
import { 
  TrendingUp, ShoppingCart, IndianRupee, AlertCircle, Plus, 
  Search, Eye, Trash2, X, Calendar, Activity, ArrowUpRight, ArrowDownRight, Package
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const StatCard = ({ title, value, subtitle, icon: Icon, colorClass, isLoading }) => {
  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="flex justify-between items-start mb-4">
          <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
        </div>
        <div>
          <div className="w-24 h-4 bg-slate-200 rounded mb-2"></div>
          <div className="w-32 h-8 bg-slate-200 rounded"></div>
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
        {subtitle && <p className="text-xs font-medium mt-2">{subtitle}</p>}
      </div>
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-full my-8">
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

const Sales = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dealerId, setDealerId] = useState(null);
  
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState('history'); // 'history', 'analytics'
  const [activeModal, setActiveModal] = useState(null); // 'add', 'view', 'cancel'
  const [selectedSale, setSelectedSale] = useState(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('This Month');
  const [chartFilter, setChartFilter] = useState('Last 7 Days');
  
  // Form State
  const [formData, setFormData] = useState({
    product_id: '', quantity: 1, custom_price: '', 
    customer_name: '', customer_phone: '', sale_date: new Date().toISOString().slice(0, 16)
  });
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

      // Fetch Products & Inventory for Dropdown
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select(`
          id, name, sku, base_price,
          inventory ( id, stock_quantity )
        `)
        .eq('dealer_id', dId)
        .eq('is_deleted', false);
      if (prodError) throw prodError;
      
      const formattedProducts = (prodData || []).map(p => ({
        ...p,
        stock_quantity: p.inventory?.[0]?.stock_quantity || 0,
        inventory_id: p.inventory?.[0]?.id || null
      }));
      setProducts(formattedProducts);

      // Fetch Sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          products (name, sku)
        `)
        .eq('dealer_id', dId)
        .order('sale_date', { ascending: false });
        
      if (salesError) throw salesError;
      
      const effectiveSales = (salesData && salesData.length > 0)
        ? salesData
        : generateMockSales(formattedProducts, dId, 30);

      setSales(effectiveSales);

    } catch (err) {
      console.error("Sales fetch error:", err);
      if (err.message?.includes('column "customer_name" does not exist') || err.message?.includes('relation "public.sales" does not exist')) {
        setError("Database schema needs to be updated. Please run the SQL migration script (update-sales-schema.sql) in your Supabase dashboard.");
      } else {
        setError(err.message || "Failed to load sales data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Selected Product Info for Form
  const selectedProductInfo = useMemo(() => {
    if (!formData.product_id) return null;
    return products.find(p => p.id === formData.product_id) || null;
  }, [formData.product_id, products]);

  const formTotalAmount = useMemo(() => {
    if (!selectedProductInfo) return 0;
    const price = formData.custom_price !== '' ? parseFloat(formData.custom_price) : parseFloat(selectedProductInfo.base_price);
    const qty = parseInt(formData.quantity) || 0;
    return price * qty;
  }, [selectedProductInfo, formData.custom_price, formData.quantity]);

  // Derived Statistics
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    
    let todaySales = 0, todayRev = 0, monthRev = 0;
    let totalSales = 0, totalRev = 0;
    
    // Only count completed sales for revenue
    const completedSales = sales.filter(s => s.status !== 'cancelled');

    completedSales.forEach(s => {
      const date = new Date(s.sale_date).getTime();
      const amount = s.quantity * parseFloat(s.sale_price);
      
      totalSales++;
      totalRev += amount;
      
      if (date >= today) {
        todaySales++;
        todayRev += amount;
      }
      if (date >= startOfMonth) {
        monthRev += amount;
      }
    });

    const avgSale = totalSales > 0 ? (totalRev / totalSales) : 0;

    return { todaySales, todayRev, monthRev, totalSales, avgSale, totalRev };
  }, [sales]);

  // Product Rankings (Top & Low Sellers)
  const productRankings = useMemo(() => {
    const completedSales = sales.filter(s => s.status !== 'cancelled');
    const prodStats = {};
    
    completedSales.forEach(s => {
      if (!prodStats[s.product_id]) {
        prodStats[s.product_id] = {
          id: s.product_id,
          name: s.products?.name || 'Unknown',
          sku: s.products?.sku || '-',
          totalQty: 0,
          totalRev: 0,
          lastSale: null
        };
      }
      prodStats[s.product_id].totalQty += s.quantity;
      prodStats[s.product_id].totalRev += (s.quantity * parseFloat(s.sale_price));
      
      const saleDate = new Date(s.sale_date).getTime();
      if (!prodStats[s.product_id].lastSale || saleDate > prodStats[s.product_id].lastSale) {
        prodStats[s.product_id].lastSale = saleDate;
      }
    });
    
    const sorted = Object.values(prodStats).sort((a, b) => b.totalQty - a.totalQty);
    
    // Also include active products with 0 sales for low sellers
    products.forEach(p => {
      if (!prodStats[p.id]) {
        sorted.push({
          id: p.id,
          name: p.name,
          sku: p.sku,
          totalQty: 0,
          totalRev: 0,
          lastSale: null,
          currentStock: p.stock_quantity
        });
      } else {
        const found = sorted.find(s => s.id === p.id);
        if (found) found.currentStock = p.stock_quantity;
      }
    });

    return {
      top: sorted.filter(s => s.totalQty > 0).slice(0, 5),
      low: [...sorted].reverse().slice(0, 5) // Products with 0 or lowest sales
    };
  }, [sales, products]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    const completedSales = sales.filter(s => s.status !== 'cancelled');
    const dataMap = {};
    const now = new Date();
    
    let daysToLookBack = 7;
    if (chartFilter === 'Last 30 Days') daysToLookBack = 30;
    else if (chartFilter === 'This Month') daysToLookBack = now.getDate();
    
    // Initialize dates
    for (let i = daysToLookBack - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dataMap[dateStr] = { date: dateStr, revenue: 0, orders: 0 };
    }

    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - daysToLookBack);
    cutoffTime.setHours(0,0,0,0);

    completedSales.forEach(s => {
      const sDate = new Date(s.sale_date);
      if (sDate.getTime() >= cutoffTime.getTime()) {
        const dateStr = sDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (dataMap[dateStr]) {
          dataMap[dateStr].revenue += (s.quantity * parseFloat(s.sale_price));
          dataMap[dateStr].orders += 1;
        }
      }
    });

    return Object.values(dataMap);
  }, [sales, chartFilter]);

  // Filtering for History Table
  const filteredSales = useMemo(() => {
    let result = sales;
    
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.products?.name?.toLowerCase().includes(q) ||
        s.products?.sku?.toLowerCase().includes(q) ||
        s.customer_name?.toLowerCase().includes(q)
      );
    }
    
    // Date Filter
    const now = new Date();
    let cutoff = null;
    if (dateFilter === 'Today') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    } else if (dateFilter === 'Last 7 Days') {
      cutoff = now.getTime() - (7 * 24 * 60 * 60 * 1000);
    } else if (dateFilter === 'This Month') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    }
    
    if (cutoff) {
      result = result.filter(s => new Date(s.sale_date).getTime() >= cutoff);
    }
    
    return result;
  }, [sales, searchQuery, dateFilter]);

  // Handlers
  const handleRecordSale = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    try {
      if (!selectedProductInfo) throw new Error("Please select a product.");
      const qty = parseInt(formData.quantity);
      if (isNaN(qty) || qty <= 0) throw new Error("Quantity must be greater than 0.");
      
      const salePrice = formData.custom_price !== '' ? parseFloat(formData.custom_price) : parseFloat(selectedProductInfo.base_price);
      if (isNaN(salePrice) || salePrice < 0) throw new Error("Invalid selling price.");

      const saleDateStr = new Date(formData.sale_date).toISOString();

      // Call Atomic RPC
      const { data, error } = await supabase.rpc('record_sale', {
        p_product_id: formData.product_id,
        p_quantity: qty,
        p_sale_price: salePrice,
        p_customer_name: formData.customer_name || null,
        p_customer_phone: formData.customer_phone || null,
        p_sale_date: saleDateStr
      });

      if (error) throw error;

      await fetchData();
      closeModal();
    } catch (err) {
      setFormError(err.message || 'Failed to record sale');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleCancelSale = async () => {
    setFormSubmitting(true);
    setFormError(null);
    try {
      if (!selectedSale || selectedSale.status === 'cancelled') return;

      const { data, error } = await supabase.rpc('cancel_sale', {
        p_sale_id: selectedSale.id
      });

      if (error) throw error;

      await fetchData();
      closeModal();
    } catch (err) {
      setFormError(err.message || 'Failed to cancel sale');
    } finally {
      setFormSubmitting(false);
    }
  };

  const openAddModal = () => {
    setFormData({
      product_id: '', quantity: 1, custom_price: '', 
      customer_name: '', customer_phone: '', sale_date: new Date().toISOString().slice(0, 16)
    });
    setFormError(null);
    setActiveModal('add');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedSale(null);
  };

  if (error) {
    return (
      <Layout title="Sales & Revenue">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-8">
          <AlertCircle className="text-red-500 mx-auto mb-3" size={40} />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Sales Data</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Sales & Revenue">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard 
          title="Today's Sales" 
          value={stats.todaySales} 
          subtitle="Orders today"
          icon={ShoppingCart} 
          colorClass="bg-blue-50 text-blue-600"
          isLoading={loading}
        />
        <StatCard 
          title="Today's Revenue" 
          value={`₹${stats.todayRev.toLocaleString('en-IN')}`} 
          icon={IndianRupee} 
          colorClass="bg-green-50 text-green-600"
          isLoading={loading}
        />
        <StatCard 
          title="This Month's Rev" 
          value={`₹${stats.monthRev.toLocaleString('en-IN')}`} 
          icon={TrendingUp} 
          colorClass="bg-purple-50 text-purple-600"
          isLoading={loading}
        />
        <StatCard 
          title="Total Sales" 
          value={stats.totalSales} 
          subtitle="Lifetime orders"
          icon={Package} 
          colorClass="bg-indigo-50 text-indigo-600"
          isLoading={loading}
        />
        <StatCard 
          title="Avg Sale Value" 
          value={`₹${Math.round(stats.avgSale).toLocaleString('en-IN')}`} 
          icon={Activity} 
          colorClass="bg-amber-50 text-amber-600"
          isLoading={loading}
        />
      </div>

      <div data-tour="sales" className="flex justify-between items-center mb-6">
        <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white">
          <button 
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('history')}
          >
            Sales History
          </button>
          <button 
            className={`px-4 py-2 text-sm font-medium transition-colors border-l border-slate-200 ${activeTab === 'analytics' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
        </div>
        <button onClick={openAddModal} className="btn btn-primary flex items-center gap-2">
          <Plus size={18} /> Record Sale
        </button>
      </div>

      {activeTab === 'history' && (
        <div className="card !p-0 overflow-hidden flex flex-col h-[calc(100vh-320px)] min-h-[400px]">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search product, customer..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer hidden md:block"
              >
                <option value="All Time">All Time</option>
                <option value="Today">Today</option>
                <option value="Last 7 Days">Last 7 Days</option>
                <option value="This Month">This Month</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            {loading ? (
              <div className="p-12 flex justify-center">
                <div className="spinner"></div>
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
                  <ShoppingCart size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">No sales found</h3>
                <p className="text-slate-500 max-w-sm mx-auto mb-6">
                  {searchQuery || dateFilter !== 'All Time' 
                    ? "No sales match your current search and filters."
                    : "You haven't recorded any sales yet."}
                </p>
                {(!searchQuery && dateFilter === 'All Time') && (
                  <button onClick={openAddModal} className="btn btn-primary flex items-center gap-2">
                    <Plus size={18} /> Record Your First Sale
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 font-medium">Date & Time</th>
                    <th className="px-6 py-4 font-medium">Product</th>
                    <th className="px-6 py-4 font-medium text-center">Qty</th>
                    <th className="px-6 py-4 font-medium text-right">Total Amount</th>
                    <th className="px-6 py-4 font-medium">Customer</th>
                    <th className="px-6 py-4 font-medium text-center">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className={`hover:bg-slate-50 transition-colors group ${sale.status === 'cancelled' ? 'bg-red-50/30' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                        {new Date(sale.sale_date).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 line-clamp-1" title={sale.products?.name}>{sale.products?.name || 'Deleted Product'}</div>
                        <div className="text-xs text-slate-500">{sale.products?.sku || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center font-medium">
                        {sale.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-slate-900">
                        ₹{(sale.quantity * parseFloat(sale.sale_price)).toLocaleString('en-IN')}
                        <div className="text-xs text-slate-500 font-normal">@ ₹{parseFloat(sale.sale_price).toLocaleString('en-IN')}/ea</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-slate-900">{sale.customer_name || <span className="text-slate-400 italic">Walk-in</span>}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {sale.status === 'cancelled' ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-medium border border-red-200">Cancelled</span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium border border-green-200">Completed</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setSelectedSale(sale); setActiveModal('view'); }} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg" title="View Details">
                            <Eye size={18} />
                          </button>
                          {sale.status !== 'cancelled' && (
                            <button onClick={() => { setSelectedSale(sale); setActiveModal('cancel'); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Cancel Sale">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="card h-96 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Sales Performance</h3>
              <select 
                value={chartFilter}
                onChange={(e) => setChartFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none"
              >
                <option value="Last 7 Days">Last 7 Days</option>
                <option value="Last 30 Days">Last 30 Days</option>
                <option value="This Month">This Month</option>
              </select>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} />
                  <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value, name) => [name === 'revenue' ? `₹${value}` : value, name === 'revenue' ? 'Revenue' : 'Orders']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                  <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#f59e0b" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card !p-0 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <ArrowUpRight className="text-green-500" size={18} /> Top Selling Products
                </h3>
              </div>
              <ul className="divide-y divide-slate-100 p-2">
                {productRankings.top.length === 0 ? (
                  <li className="p-4 text-center text-sm text-slate-500">No sales data available.</li>
                ) : (
                  productRankings.top.map((p, i) => (
                    <li key={p.id} className="p-3 flex justify-between items-center hover:bg-slate-50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">{i+1}</span>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.totalQty} units sold</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 text-sm">₹{p.totalRev.toLocaleString('en-IN')}</p>
                        <p className={`text-xs ${p.currentStock > 0 ? 'text-green-600' : 'text-red-600'}`}>{p.currentStock} in stock</p>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
            
            <div className="card !p-0 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <ArrowDownRight className="text-amber-500" size={18} /> Slow Moving Products
                </h3>
              </div>
              <ul className="divide-y divide-slate-100 p-2">
                {productRankings.low.length === 0 ? (
                  <li className="p-4 text-center text-sm text-slate-500">No data available.</li>
                ) : (
                  productRankings.low.map((p, i) => (
                    <li key={p.id} className="p-3 flex justify-between items-center hover:bg-slate-50 rounded-lg transition-colors">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.totalQty === 0 ? 'Never sold' : `${p.totalQty} units sold total`}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-700 text-sm">{p.currentStock} in stock</p>
                        {p.lastSale && <p className="text-xs text-slate-400">Last: {new Date(p.lastSale).toLocaleDateString()}</p>}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Record Sale Modal */}
      <Modal isOpen={activeModal === 'add'} onClose={closeModal} title="Record Sale">
        <form onSubmit={handleRecordSale} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Product *</label>
            <select 
              required 
              value={formData.product_id} 
              onChange={e => setFormData({...formData, product_id: e.target.value, custom_price: ''})} 
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">-- Choose Product --</option>
              {products.map(p => (
                <option key={p.id} value={p.id} disabled={p.stock_quantity === 0}>
                  {p.name} (Stock: {p.stock_quantity}) {p.stock_quantity === 0 ? '- OUT OF STOCK' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
              <input 
                type="number" 
                min="1" 
                max={selectedProductInfo?.stock_quantity || 1}
                required 
                value={formData.quantity} 
                onChange={e => setFormData({...formData, quantity: e.target.value})} 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" 
              />
              {selectedProductInfo && (
                <p className="text-xs text-slate-500 mt-1">Available: <span className="font-medium text-slate-900">{selectedProductInfo.stock_quantity}</span></p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price (per unit) *</label>
              <input 
                type="number" 
                min="0" step="0.01" 
                required 
                value={formData.custom_price !== '' ? formData.custom_price : (selectedProductInfo?.base_price || '')} 
                onChange={e => setFormData({...formData, custom_price: e.target.value})} 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" 
                disabled={!selectedProductInfo}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name (Optional)</label>
              <input 
                type="text" 
                value={formData.customer_name} 
                onChange={e => setFormData({...formData, customer_name: e.target.value})} 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" 
                placeholder="Walk-in customer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number (Optional)</label>
              <input 
                type="tel" 
                value={formData.customer_phone} 
                onChange={e => setFormData({...formData, customer_phone: e.target.value})} 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" 
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sale Date & Time</label>
            <input 
              type="datetime-local" 
              required
              value={formData.sale_date} 
              onChange={e => setFormData({...formData, sale_date: e.target.value})} 
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" 
            />
          </div>

          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-500 text-sm">Product</span>
              <span className="font-medium text-slate-900">{selectedProductInfo?.name || '-'}</span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-500 text-sm">Quantity x Price</span>
              <span className="font-medium text-slate-900">
                {formData.quantity || 0} x ₹{formData.custom_price !== '' ? formData.custom_price : (selectedProductInfo?.base_price || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
              <span className="font-bold text-slate-800">Total Amount</span>
              <span className="text-xl font-bold text-primary-600">₹{formTotalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={closeModal} className="btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={formSubmitting || !selectedProductInfo} className="btn btn-primary min-w-[120px]">
              {formSubmitting ? <span className="spinner"></span> : 'Confirm Sale'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Sale Details Modal */}
      <Modal isOpen={activeModal === 'view'} onClose={closeModal} title="Sale Details">
        {selectedSale && (
          <div className="space-y-6">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">{selectedSale.products?.name || 'Deleted Product'}</h2>
                <p className="text-sm font-medium text-slate-500">Sale ID: <span className="font-mono text-xs">{selectedSale.id}</span></p>
              </div>
              {selectedSale.status === 'cancelled' ? (
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold border border-red-200">CANCELLED</span>
              ) : (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold border border-green-200">COMPLETED</span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Calendar size={16}/> Date & Time</p>
                <p className="text-slate-900">{new Date(selectedSale.sale_date).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Eye size={16}/> Customer Info</p>
                <p className="text-slate-900 font-medium">{selectedSale.customer_name || 'Walk-in Customer'}</p>
                <p className="text-slate-500 text-sm mt-1">{selectedSale.customer_phone || 'No phone provided'}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 border-b border-slate-200 pb-2">Financial Breakdown</h3>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600">Unit Price</span>
                <span className="font-medium text-slate-900">₹{parseFloat(selectedSale.sale_price).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600">Quantity Sold</span>
                <span className="font-medium text-slate-900">{selectedSale.quantity} units</span>
              </div>
              <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-200">
                <span className="font-bold text-slate-800 text-lg">Total Amount</span>
                <span className="text-2xl font-bold text-primary-600">₹{(selectedSale.quantity * parseFloat(selectedSale.sale_price)).toLocaleString('en-IN')}</span>
              </div>
            </div>
            
            <div className="pt-2 flex justify-end">
               <button onClick={closeModal} className="btn bg-white border border-slate-200 text-slate-700">Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Sale Modal */}
      <Modal isOpen={activeModal === 'cancel'} onClose={closeModal} title="Cancel Sale">
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Cancel this sale?</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Are you sure you want to cancel this sale? This action will mark the sale as cancelled, and <strong>{selectedSale?.quantity} units</strong> will be safely restored back to your inventory.
          </p>
          
          {formError && <p className="text-red-500 mb-4 text-sm">{formError}</p>}
          
          <div className="flex gap-3 w-full">
            <button onClick={closeModal} className="flex-1 btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">Keep Sale</button>
            <button onClick={handleCancelSale} disabled={formSubmitting} className="flex-1 btn bg-red-600 hover:bg-red-700 text-white border-none shadow-sm flex justify-center">
              {formSubmitting ? <span className="spinner"></span> : 'Yes, Cancel Sale'}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default Sales;
