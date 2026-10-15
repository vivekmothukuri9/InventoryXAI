import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../services/supabase';
import { 
  BarChart2, TrendingUp, Package, ShoppingCart, DollarSign, 
  AlertTriangle, Truck, Activity, Download, Calendar, ArrowUpRight, 
  ArrowDownRight, CheckCircle, Clock, IndianRupee
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

const StatCard = ({ title, value, subValue, icon: Icon, colorClass, isLoading }) => {
  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
        </div>
        <div className="w-24 h-4 bg-slate-200 rounded mb-2"></div>
        <div className="w-16 h-8 bg-slate-200 rounded"></div>
      </div>
    );
  }
  return (
    <div className="card">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg ${colorClass}`}>
          <Icon size={20} />
        </div>
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
      </div>
    </div>
  );
};

// --- Main Component ---
const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Raw Data
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [orders, setOrders] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [stockTx, setStockTx] = useState([]);
  
  // UI State
  const [dateFilter, setDateFilter] = useState('30D'); // Today, 7D, 30D, ThisMonth, 3M, ThisYear, All
  const [activeTab, setActiveTab] = useState('overview'); // overview, sales, inventory, profit, purchases
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session?.user) throw new Error("Authentication required.");

      const { data: dealerData } = await supabase.from('dealers').select('id').eq('user_id', session.user.id).single();
      if (!dealerData) throw new Error("Dealer not found.");
      const dId = dealerData.id;

      // Parallel fetching for performance
      const [
        { data: prodData }, 
        { data: invData },
        { data: salesData },
        { data: ordersData },
        { data: purData },
        { data: txData }
      ] = await Promise.all([
        supabase.from('products').select('id, name, sku, category, base_price, cost_price').eq('dealer_id', dId).eq('is_deleted', false),
        supabase.from('inventory').select('product_id, stock_quantity, min_stock_level, status').eq('dealer_id', dId),
        supabase.from('sales').select('*').eq('dealer_id', dId),
        supabase.from('orders').select('id, total_amount, status, created_at').eq('dealer_id', dId),
        // Purchases (safely fetch in case schema missing)
        supabase.from('purchases').select('id, supplier_id, status, total_amount, purchase_date').eq('dealer_id', dId).then(res => res.error ? {data: []} : res),
        supabase.from('stock_transactions').select('*').eq('dealer_id', dId)
      ]);

      setProducts(prodData || []);
      setInventory(invData || []);
      setSales(salesData || []);
      setOrders(ordersData || []);
      setPurchases(purData || []);
      setStockTx(txData || []);
      
    } catch (err) {
      console.error(err);
      setError("Failed to load report data. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Filtering Logic ---
  const filterByDate = (dateString, filterType) => {
    if (filterType === 'All') return true;
    const date = new Date(dateString);
    const now = new Date();
    
    // Normalize to midnight for accurate day calculations
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (filterType === 'Today') {
      return itemDate.getTime() === today.getTime();
    }
    
    const diffTime = Math.abs(today - itemDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (filterType === '7D') return diffDays <= 7;
    if (filterType === '30D') return diffDays <= 30;
    if (filterType === '3M') return diffDays <= 90;
    
    if (filterType === 'ThisMonth') {
      return itemDate.getMonth() === today.getMonth() && itemDate.getFullYear() === today.getFullYear();
    }
    if (filterType === 'ThisYear') {
      return itemDate.getFullYear() === today.getFullYear();
    }
    return true;
  };

  // --- Derived Calculations ---
  
  // 1. Data filtered by Date
  const filteredSales = useMemo(() => sales.filter(s => filterByDate(s.sale_date, dateFilter)), [sales, dateFilter]);
  const filteredOrders = useMemo(() => orders.filter(o => filterByDate(o.created_at, dateFilter)), [orders, dateFilter]);
  const filteredPurchases = useMemo(() => purchases.filter(p => filterByDate(p.purchase_date || p.created_at, dateFilter)), [purchases, dateFilter]);
  const filteredTx = useMemo(() => stockTx.filter(t => filterByDate(t.date, dateFilter)), [stockTx, dateFilter]);

  // 2. Merged Products + Inventory
  const productDict = useMemo(() => {
    const dict = {};
    products.forEach(p => {
      const inv = inventory.find(i => i.product_id === p.id);
      dict[p.id] = {
        ...p,
        stock_quantity: inv ? inv.stock_quantity : 0,
        min_stock_level: inv ? inv.min_stock_level : 5,
        inv_status: inv ? inv.status : 'Unknown'
      };
    });
    return dict;
  }, [products, inventory]);

  // 3. Overview Stats
  const overviewStats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, s) => sum + (parseFloat(s.sale_price) * parseInt(s.quantity)), 0);
    const totalProductsSold = filteredSales.reduce((sum, s) => sum + parseInt(s.quantity), 0);
    const totalOrders = filteredOrders.length;
    
    const currentInventoryValue = Object.values(productDict).reduce((sum, p) => {
      return sum + (p.stock_quantity * parseFloat(p.cost_price || p.base_price || 0));
    }, 0);

    return { totalRevenue, totalProductsSold, totalOrders, currentInventoryValue };
  }, [filteredSales, filteredOrders, productDict]);

  // 4. Product Performance & Profit
  const productPerformance = useMemo(() => {
    const perf = {};
    Object.values(productDict).forEach(p => {
      perf[p.id] = {
        ...p,
        qtySold: 0,
        revenueGenerated: 0,
        costGenerated: 0
      };
    });

    filteredSales.forEach(s => {
      if (perf[s.product_id]) {
        const qty = parseInt(s.quantity);
        const rev = parseFloat(s.sale_price) * qty;
        const cost = parseFloat(perf[s.product_id].cost_price || 0) * qty;
        
        perf[s.product_id].qtySold += qty;
        perf[s.product_id].revenueGenerated += rev;
        perf[s.product_id].costGenerated += cost;
      }
    });

    return Object.values(perf).sort((a,b) => b.revenueGenerated - a.revenueGenerated);
  }, [filteredSales, productDict]);

  // 5. Profit Analysis (Global)
  const profitAnalysis = useMemo(() => {
    let totalRev = 0;
    let totalCost = 0;
    let hasMissingCost = false;

    productPerformance.forEach(p => {
      totalRev += p.revenueGenerated;
      if (p.qtySold > 0) {
        if (!p.cost_price || p.cost_price <= 0) hasMissingCost = true;
        totalCost += p.costGenerated;
      }
    });

    const grossProfit = totalRev - totalCost;
    const margin = totalRev > 0 ? (grossProfit / totalRev) * 100 : 0;

    return { totalRev, totalCost, grossProfit, margin, hasMissingCost };
  }, [productPerformance]);

  // 6. Chart Data
  const salesChartData = useMemo(() => {
    // Group by Date
    const grouped = {};
    filteredSales.forEach(s => {
      const d = new Date(s.sale_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!grouped[d]) grouped[d] = { date: d, revenue: 0, sales: 0 };
      grouped[d].revenue += (parseFloat(s.sale_price) * parseInt(s.quantity));
      grouped[d].sales += 1;
    });
    
    // Sort chronologically (rough, based on order of insertion if dates are recent, but better to sort actual dates)
    // For simplicity, just output values. Since we might have gaps, a real robust chart would fill them.
    return Object.values(grouped);
  }, [filteredSales]);


  // --- Exports ---
  const exportToCSV = (data, filename, columns) => {
    if (!data || !data.length) return alert("No data to export.");
    
    const headers = columns.map(c => c.label).join(',');
    const rows = data.map(row => {
      return columns.map(c => {
        let val = c.accessor(row);
        if (typeof val === 'string') val = `"${val.replace(/"/g, '""')}"`; // escape quotes
        return val;
      }).join(',');
    });
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}_${dateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSales = () => {
    exportToCSV(productPerformance.filter(p => p.qtySold > 0), 'Product_Performance', [
      { label: 'Product Name', accessor: r => r.name },
      { label: 'SKU', accessor: r => r.sku },
      { label: 'Category', accessor: r => r.category },
      { label: 'Units Sold', accessor: r => r.qtySold },
      { label: 'Revenue (INR)', accessor: r => r.revenueGenerated },
      { label: 'Cost (INR)', accessor: r => r.costGenerated },
      { label: 'Gross Profit (INR)', accessor: r => r.revenueGenerated - r.costGenerated },
    ]);
  };

  const handleExportInventory = () => {
    exportToCSV(Object.values(productDict), 'Inventory_Report', [
      { label: 'Product Name', accessor: r => r.name },
      { label: 'SKU', accessor: r => r.sku },
      { label: 'Category', accessor: r => r.category },
      { label: 'Current Stock', accessor: r => r.stock_quantity },
      { label: 'Min Stock Level', accessor: r => r.min_stock_level },
      { label: 'Stock Status', accessor: r => r.stock_quantity === 0 ? 'Out of Stock' : r.stock_quantity <= r.min_stock_level ? 'Low Stock' : 'In Stock' },
      { label: 'Cost Price', accessor: r => r.cost_price || 0 },
      { label: 'Total Value', accessor: r => r.stock_quantity * (r.cost_price || r.base_price || 0) },
    ]);
  };

  // --- Subcomponents for Rendering ---

  if (error) {
    return (
      <Layout title="Business Reports">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="text-red-500 mx-auto mb-3" size={40} />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Reports</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={fetchData} className="btn bg-white border border-red-200 text-red-700">Retry</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Business Reports">
      {/* Header & Date Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 className="text-primary-600" />
            Performance Reports
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Data-driven insights based on your actual business records.
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <Calendar size={18} className="text-slate-400 ml-2" />
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-transparent border-none text-sm font-semibold text-slate-700 focus:outline-none focus:ring-0 pr-2 cursor-pointer"
          >
            <option value="Today">Today</option>
            <option value="7D">Last 7 Days</option>
            <option value="30D">Last 30 Days</option>
            <option value="ThisMonth">This Month</option>
            <option value="3M">Last 3 Months</option>
            <option value="ThisYear">This Year</option>
            <option value="All">All Time</option>
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Revenue" 
          value={`₹${overviewStats.totalRevenue.toLocaleString('en-IN')}`}
          icon={IndianRupeeIcon} 
          colorClass="bg-green-50 text-green-600" 
          isLoading={loading} 
        />
        <StatCard 
          title="Products Sold" 
          value={overviewStats.totalProductsSold} 
          icon={Package} 
          colorClass="bg-blue-50 text-blue-600" 
          isLoading={loading} 
        />
        <StatCard 
          title="Total Orders" 
          value={overviewStats.totalOrders} 
          icon={ShoppingCart} 
          colorClass="bg-indigo-50 text-indigo-600" 
          isLoading={loading} 
        />
        <StatCard 
          title="Inventory Value" 
          value={`₹${overviewStats.currentInventoryValue.toLocaleString('en-IN')}`}
          subValue="Current Stock × Cost"
          icon={Activity} 
          colorClass="bg-purple-50 text-purple-600" 
          isLoading={loading} 
        />
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 mb-6 pb-2 scrollbar-hide">
        {[
          { id: 'overview', label: 'Sales & Performance' },
          { id: 'profit', label: 'Profit Analysis' },
          { id: 'inventory', label: 'Inventory & Low Stock' },
          { id: 'stock', label: 'Stock Movements' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id 
                ? 'bg-primary-600 text-white shadow-sm' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center bg-white border border-slate-200 rounded-xl">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* TAB 1: Sales & Performance */}
          {activeTab === 'overview' && (
            <>
              {/* Chart */}
              <div className="card !p-0 overflow-hidden border border-slate-200">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp size={18} className="text-primary-600" /> Revenue Trend
                  </h3>
                  <button onClick={handleExportSales} className="btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs py-1.5 flex items-center gap-2">
                    <Download size={14} /> Export CSV
                  </button>
                </div>
                <div className="p-6 h-80">
                  {salesChartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400">No sales data for selected period.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={salesChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(val) => `₹${val}`} />
                        <Tooltip 
                          formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                          contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        />
                        <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Product Performance Table */}
              <div className="card !p-0 border border-slate-200">
                <div className="p-5 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-slate-800">Product Performance</h3>
                </div>
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white text-slate-500 sticky top-0 border-b border-slate-100 z-10">
                      <tr>
                        <th className="px-4 py-3 font-medium">Product</th>
                        <th className="px-4 py-3 font-medium">Category</th>
                        <th className="px-4 py-3 font-medium text-center">Units Sold</th>
                        <th className="px-4 py-3 font-medium text-right">Revenue</th>
                        <th className="px-4 py-3 font-medium text-center">Current Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productPerformance.filter(p => p.qtySold > 0).length === 0 ? (
                        <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No products sold in this period.</td></tr>
                      ) : productPerformance.filter(p => p.qtySold > 0).map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">{p.name}</p>
                            <p className="text-xs text-slate-500">{p.sku}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{p.category || '-'}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-800">{p.qtySold}</td>
                          <td className="px-4 py-3 text-right font-semibold text-green-600">₹{p.revenueGenerated.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${p.stock_quantity === 0 ? 'bg-red-100 text-red-700' : p.stock_quantity <= p.min_stock_level ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                              {p.stock_quantity}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: Profit Analysis */}
          {activeTab === 'profit' && (
            <div className="space-y-6">
              {profitAnalysis.hasMissingCost && (
                <div className="p-4 bg-amber-50 text-amber-800 rounded-lg flex items-start gap-3 border border-amber-200">
                  <AlertTriangle className="shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <h4 className="font-bold">Incomplete Profit Data</h4>
                    <p className="text-sm mt-1">Some products sold during this period do not have a Cost Price set. The profit analysis below is estimated and may not be fully accurate.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
                  <p className="text-slate-500 text-sm font-medium mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-slate-900">₹{profitAnalysis.totalRev.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
                  <p className="text-slate-500 text-sm font-medium mb-1">Estimated Cost of Goods</p>
                  <p className="text-3xl font-bold text-red-600">₹{profitAnalysis.totalCost.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-primary-200 shadow-sm text-center bg-primary-50/30">
                  <p className="text-primary-700 text-sm font-medium mb-1">Gross Profit</p>
                  <p className="text-3xl font-bold text-primary-700">₹{profitAnalysis.grossProfit.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-green-200 shadow-sm text-center bg-green-50/30">
                  <p className="text-green-700 text-sm font-medium mb-1">Profit Margin</p>
                  <p className="text-3xl font-bold text-green-700">{profitAnalysis.margin.toFixed(1)}%</p>
                </div>
              </div>
              
              <div className="card !p-0 border border-slate-200">
                <div className="p-5 border-b border-slate-100 bg-slate-50">
                   <h3 className="font-bold text-slate-800">Profit by Product</h3>
                </div>
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white text-slate-500 sticky top-0 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 font-medium">Product</th>
                        <th className="px-4 py-3 font-medium text-center">Units Sold</th>
                        <th className="px-4 py-3 font-medium text-right">Revenue</th>
                        <th className="px-4 py-3 font-medium text-right">Cost</th>
                        <th className="px-4 py-3 font-medium text-right">Gross Profit</th>
                        <th className="px-4 py-3 font-medium text-center">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {productPerformance.filter(p => p.qtySold > 0).map(p => {
                         const profit = p.revenueGenerated - p.costGenerated;
                         const margin = p.revenueGenerated > 0 ? (profit / p.revenueGenerated) * 100 : 0;
                         return (
                           <tr key={p.id} className="hover:bg-slate-50">
                             <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                             <td className="px-4 py-3 text-center">{p.qtySold}</td>
                             <td className="px-4 py-3 text-right">₹{p.revenueGenerated.toLocaleString('en-IN')}</td>
                             <td className="px-4 py-3 text-right text-red-600">₹{p.costGenerated.toLocaleString('en-IN')}</td>
                             <td className="px-4 py-3 text-right font-semibold text-primary-600">₹{profit.toLocaleString('en-IN')}</td>
                             <td className="px-4 py-3 text-center font-bold text-green-600">{margin.toFixed(1)}%</td>
                           </tr>
                         )
                       })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Inventory & Low Stock */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button onClick={handleExportInventory} className="btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm py-2 flex items-center gap-2 shadow-sm">
                  <Download size={16} /> Export Inventory Report
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Low Stock Dedicated View */}
                 <div className="card !p-0 border border-red-200 shadow-sm overflow-hidden flex flex-col max-h-[500px]">
                   <div className="p-4 bg-red-50 border-b border-red-100 flex items-center gap-2">
                     <AlertTriangle className="text-red-600" size={18} />
                     <h3 className="font-bold text-red-800">Critical Low Stock Report</h3>
                   </div>
                   <div className="overflow-y-auto flex-1">
                     <table className="w-full text-sm text-left">
                       <thead className="bg-white text-slate-500 sticky top-0 border-b border-slate-100">
                         <tr>
                           <th className="px-4 py-3 font-medium">Product</th>
                           <th className="px-4 py-3 font-medium text-center">Stock</th>
                           <th className="px-4 py-3 font-medium text-center">Min Lvl</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {Object.values(productDict).filter(p => p.stock_quantity <= p.min_stock_level).length === 0 ? (
                            <tr><td colSpan="3" className="p-8 text-center text-slate-500">All products are adequately stocked.</td></tr>
                          ) : Object.values(productDict).filter(p => p.stock_quantity <= p.min_stock_level).sort((a,b)=> a.stock_quantity - b.stock_quantity).map(p => (
                            <tr key={p.id}>
                              <td className="px-4 py-3">
                                <p className="font-medium text-slate-900">{p.name}</p>
                                {p.stock_quantity === 0 && <span className="text-[10px] uppercase font-bold text-red-600">Out of Stock</span>}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-red-600">{p.stock_quantity}</td>
                              <td className="px-4 py-3 text-center text-slate-500">{p.min_stock_level}</td>
                            </tr>
                          ))}
                       </tbody>
                     </table>
                   </div>
                 </div>

                 {/* Full Inventory Value */}
                 <div className="card !p-0 border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[500px]">
                   <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                     <Package className="text-slate-600" size={18} />
                     <h3 className="font-bold text-slate-800">Inventory Value by Product</h3>
                   </div>
                   <div className="overflow-y-auto flex-1">
                     <table className="w-full text-sm text-left">
                       <thead className="bg-white text-slate-500 sticky top-0 border-b border-slate-100">
                         <tr>
                           <th className="px-4 py-3 font-medium">Product</th>
                           <th className="px-4 py-3 font-medium text-center">Stock</th>
                           <th className="px-4 py-3 font-medium text-right">Total Value</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {Object.values(productDict).sort((a,b)=> (b.stock_quantity * (b.cost_price||b.base_price||0)) - (a.stock_quantity * (a.cost_price||a.base_price||0))).map(p => {
                            const val = p.stock_quantity * (parseFloat(p.cost_price) || parseFloat(p.base_price) || 0);
                            return (
                              <tr key={p.id}>
                                <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                                <td className="px-4 py-3 text-center">{p.stock_quantity}</td>
                                <td className="px-4 py-3 text-right font-semibold text-slate-800">₹{val.toLocaleString('en-IN')}</td>
                              </tr>
                            )
                          })}
                       </tbody>
                     </table>
                   </div>
                 </div>
              </div>
            </div>
          )}

          {/* TAB 4: Stock Movements */}
          {activeTab === 'stock' && (
            <div className="card !p-0 border border-slate-200 max-h-[600px] flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Activity size={18} className="text-primary-600"/> Stock Movement Log</h3>
              </div>
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-slate-500 sticky top-0 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date & Time</th>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium text-center">Qty Change</th>
                      <th className="px-4 py-3 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTx.length === 0 ? (
                      <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No stock movements found for this period.</td></tr>
                    ) : filteredTx.sort((a,b)=> new Date(b.date) - new Date(a.date)).map(tx => {
                       const p = productDict[tx.product_id] || { name: 'Unknown Product' };
                       const isPositive = tx.quantity > 0;
                       return (
                         <tr key={tx.id} className="hover:bg-slate-50">
                           <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(tx.date).toLocaleString()}</td>
                           <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                           <td className="px-4 py-3">
                             <span className="px-2 py-1 bg-slate-100 rounded text-xs font-semibold">{tx.action}</span>
                           </td>
                           <td className="px-4 py-3 text-center">
                             <span className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                               {isPositive ? '+' : ''}{tx.quantity}
                             </span>
                           </td>
                           <td className="px-4 py-3 text-slate-600 text-xs">{tx.reason || '-'}</td>
                         </tr>
                       )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </Layout>
  );
};

// Helper for generic icon
const IndianRupeeIcon = ({ size }) => <IndianRupee size={size} />;

export default Reports;
