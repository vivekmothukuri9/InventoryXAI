import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase } from '../services/supabase';
import { getAIInsights } from '../services/ai';
import { 
  TrendingUp, Package, IndianRupee, ShoppingCart, Box, 
  AlertCircle, RefreshCw, AlertTriangle, Plus, Tag, Truck, 
  ArrowRight, Clock, CheckCircle, Activity, BrainCircuit, Users, XCircle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }) => (
  <div className={`card border-l-4 ${colorClass.border}`}>
    <div className="flex justify-between items-start mb-2">
      <div className={`p-2 rounded-lg ${colorClass.bg} ${colorClass.text}`}>
        <Icon size={20} />
      </div>
    </div>
    <div>
      <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  </div>
);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dealerName, setDealerName] = useState('');
  const [userRole, setUserRole] = useState('dealer');
  
  // Data States
  const [todaySalesList, setTodaySalesList] = useState([]);
  const [chartSales, setChartSales] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [aiInsights, setAiInsights] = useState(null);
  
  // Filters
  const [chartPeriod, setChartPeriod] = useState(7); // 7 Days by default

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session?.user) throw new Error("Authentication required.");

      const { data: dealerData, error: dealerError } = await supabase
        .from('dealers')
        .select('id, full_name, role')
        .eq('user_id', session.user.id)
        .single();
        
      if (dealerError) throw dealerError;
      const dealerId = dealerData.id;
      setDealerName(dealerData.full_name);
      setUserRole(dealerData.role || 'dealer');

      // Fetch AI Insights (predicts stockouts, restocks, profits)
      const insights = await getAIInsights(dealerId, chartPeriod);
      setAiInsights(insights);

      // Dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const chartStartDate = new Date(today);
      chartStartDate.setDate(chartStartDate.getDate() - chartPeriod + 1);

      // Fetch Sales for Chart & Today
      const { data: allRecentSales } = await supabase
        .from('sales')
        .select(`
          id, quantity, sale_price, sale_date, 
          product:products(name)
        `)
        .eq('dealer_id', dealerId)
        .gte('sale_date', chartStartDate.toISOString())
        .order('sale_date', { ascending: false });

      const recentSales = allRecentSales || [];
      setChartSales(recentSales);
      setTodaySalesList(recentSales.filter(s => new Date(s.sale_date) >= today).slice(0, 5));

      // Fetch Recent Orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          id, customer_name, total_amount, status, created_at,
          order_items(quantity)
        `)
        .eq('dealer_id', dealerId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch Inventory Status
      const { data: invData } = await supabase
        .from('inventory')
        .select(`
          product_id, stock_quantity, min_stock_level,
          product:products(name)
        `)
        .eq('dealer_id', dealerId);

      // Fetch Suppliers (Quick Access)
      const { data: suppliersData } = await supabase
        .from('suppliers')
        .select('id, name, contact_phone, categories')
        .eq('dealer_id', dealerId)
        .limit(4);

      setOrders(ordersData || []);
      setInventory(invData || []);
      setSuppliers(suppliersData || []);

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [chartPeriod]);

  // Derived Stats
  const todaySalesTotal = todaySalesList.reduce((sum, s) => sum + (parseFloat(s.sale_price) * parseInt(s.quantity)), 0);
  
  const todayOrdersTotal = orders.filter(o => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return new Date(o.created_at) >= today;
  }).length;

  const inventoryStats = useMemo(() => {
    let total = inventory.length;
    let outOfStock = 0;
    let lowStock = 0;
    let available = 0;
    let lowStockList = [];

    inventory.forEach(item => {
      if (item.stock_quantity === 0) {
        outOfStock++;
        lowStockList.push(item);
      } else if (item.stock_quantity <= item.min_stock_level) {
        lowStock++;
        lowStockList.push(item);
      } else {
        available++;
      }
    });

    return { 
      total, available, lowStock, outOfStock, 
      lowStockList: lowStockList.sort((a,b) => a.stock_quantity - b.stock_quantity).slice(0, 5) 
    };
  }, [inventory]);

  const salesChartData = useMemo(() => {
    const dataMap = {};
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = chartPeriod - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dataMap[dateStr] = { date: dateStr, revenue: 0 };
    }

    chartSales.forEach(sale => {
      const d = new Date(sale.sale_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dataMap[d]) {
        dataMap[d].revenue += (parseFloat(sale.sale_price) * parseInt(sale.quantity));
      }
    });

    return Object.values(dataMap);
  }, [chartSales, chartPeriod]);

  return (
    <Layout title="Dashboard">
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          {loading && !dealerName ? (
             <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-1"></div>
          ) : (
            <h1 className="text-2xl font-bold text-slate-900 mb-1 capitalize">
              {userRole} Dashboard 👋
            </h1>
          )}
          <p className="text-slate-500 text-sm">Welcome back, {dealerName || 'User'}. Here is your business at a glance.</p>
        </div>
        
        {/* Quick Actions Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide shrink-0">
          <Link to="/products" className="btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm text-xs py-1.5 px-3 flex items-center gap-1.5 whitespace-nowrap">
            <Plus size={14} /> Add Product
          </Link>
          <Link to="/inventory" className="btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm text-xs py-1.5 px-3 flex items-center gap-1.5 whitespace-nowrap">
            <Package size={14} /> Add Stock
          </Link>
          <Link to="/sales" className="btn bg-primary-50 border border-primary-100 text-primary-700 hover:bg-primary-100 shadow-sm text-xs py-1.5 px-3 flex items-center gap-1.5 font-medium whitespace-nowrap">
            <TrendingUp size={14} /> New Sale
          </Link>
          <Link to="/orders" className="btn bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 shadow-sm text-xs py-1.5 px-3 flex items-center gap-1.5 font-medium whitespace-nowrap">
            <ShoppingCart size={14} /> New Order
          </Link>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex flex-col items-center justify-center text-center">
          <AlertCircle className="text-red-500 mb-3" size={40} />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load data</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={fetchData} className="btn bg-red-100 text-red-700 hover:bg-red-200"><RefreshCw size={16} className="mr-2 inline"/>Retry</button>
        </div>
      ) : (
        <>
          {/* 1. Dashboard Overview (5 Cards) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <StatCard 
              title="Today's Sales" 
              value={`₹${todaySalesTotal.toLocaleString('en-IN')}`}
              icon={IndianRupee} 
              colorClass={{ bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-500' }}
            />
            <StatCard 
              title="Today's Orders" 
              value={todayOrdersTotal}
              icon={ShoppingCart} 
              colorClass={{ bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-500' }}
            />
            <StatCard 
              title="Total Products" 
              value={inventoryStats.total}
              icon={Box} 
              colorClass={{ bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-500' }}
            />
            <StatCard 
              title="Low Stock" 
              value={inventoryStats.lowStock + inventoryStats.outOfStock}
              icon={AlertTriangle} 
              colorClass={{ bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-500' }}
              subtitle={`${inventoryStats.outOfStock} out of stock`}
            />
            <StatCard 
              title="Today's Profit" 
              value={`₹${aiInsights && aiInsights.profitPrediction.projectedDays > 0 ? Math.round(aiInsights.profitPrediction.currentProfit / aiInsights.profitPrediction.projectedDays).toLocaleString('en-IN') : 0}`}
              icon={TrendingUp} 
              colorClass={{ bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-500' }}
              subtitle="Estimated via AI"
            />
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN: Sales & Orders */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* 2. Sales Growth Graph */}
              <div className="card !p-0 overflow-hidden shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><Activity size={18} className="text-primary-600"/> Sales Growth</h3>
                  <select 
                    value={chartPeriod} 
                    onChange={e => setChartPeriod(Number(e.target.value))}
                    className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded px-2 py-1 outline-none cursor-pointer"
                  >
                    <option value={7}>Last 7 Days</option>
                    <option value={14}>Last 14 Days</option>
                    <option value={30}>Last 30 Days</option>
                  </select>
                </div>
                <div className="p-4 h-64">
                  {loading ? (
                    <div className="h-full flex items-center justify-center"><RefreshCw className="animate-spin text-slate-300" /></div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} tickFormatter={(v) => `₹${v}`} />
                        <Tooltip formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* 3. Today's Sales List */}
              <div className="card !p-0 shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><Tag size={18} className="text-green-600"/> Today's Sales</h3>
                  <Link to="/sales" className="text-xs font-semibold text-primary-600 hover:text-primary-800 flex items-center gap-1">View All <ArrowRight size={12}/></Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2 font-medium">Product</th>
                        <th className="px-4 py-2 font-medium text-center">Qty</th>
                        <th className="px-4 py-2 font-medium text-right">Amount</th>
                        <th className="px-4 py-2 font-medium text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {todaySalesList.length === 0 ? (
                        <tr><td colSpan="4" className="px-4 py-6 text-center text-slate-400">No sales recorded today yet.</td></tr>
                      ) : todaySalesList.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-medium text-slate-900">{s.product?.name || 'Unknown'}</td>
                          <td className="px-4 py-2.5 text-center">{s.quantity}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-slate-800">₹{(s.sale_price * s.quantity).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2.5 text-right text-xs text-slate-500">{new Date(s.sale_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 7. Recent Orders */}
              <div className="card !p-0 shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><ShoppingCart size={18} className="text-indigo-600"/> Recent Orders</h3>
                  <Link to="/orders" className="text-xs font-semibold text-primary-600 hover:text-primary-800 flex items-center gap-1">View All <ArrowRight size={12}/></Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2 font-medium">Order ID</th>
                        <th className="px-4 py-2 font-medium">Customer</th>
                        <th className="px-4 py-2 font-medium text-center">Items</th>
                        <th className="px-4 py-2 font-medium text-right">Amount</th>
                        <th className="px-4 py-2 font-medium text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {orders.length === 0 ? (
                        <tr><td colSpan="5" className="px-4 py-6 text-center text-slate-400">No recent orders.</td></tr>
                      ) : orders.map(o => {
                        const itemsCount = o.order_items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
                        return (
                          <tr key={o.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{o.id.substring(0,8)}</td>
                            <td className="px-4 py-2.5 font-medium text-slate-900">{o.customer_name}</td>
                            <td className="px-4 py-2.5 text-center">{itemsCount}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-slate-800">₹{o.total_amount.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${o.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Inventory & AI */}
            <div className="space-y-6">
              
              {/* 4. Inventory Status Summary & Low Stock Direct */}
              <div className="card shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Package size={18} className="text-slate-600"/> Inventory Status</h3>
                
                {inventoryStats.total > 0 && (
                  <div className="flex bg-slate-100 rounded-lg overflow-hidden mb-4 h-2">
                     <div style={{width: `${(inventoryStats.available/inventoryStats.total)*100}%`}} className="bg-green-500"></div>
                     <div style={{width: `${(inventoryStats.lowStock/inventoryStats.total)*100}%`}} className="bg-amber-500"></div>
                     <div style={{width: `${(inventoryStats.outOfStock/inventoryStats.total)*100}%`}} className="bg-red-500"></div>
                  </div>
                )}
                
                <div className="grid grid-cols-3 gap-2 text-center mb-5 text-sm">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Available</p>
                    <p className="font-bold text-green-600">{inventoryStats.available}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Low Stock</p>
                    <p className="font-bold text-amber-600">{inventoryStats.lowStock}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Out of Stock</p>
                    <p className="font-bold text-red-600">{inventoryStats.outOfStock}</p>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Immediate Attention</h4>
                <ul className="space-y-2">
                  {inventoryStats.lowStockList.length === 0 ? (
                    <li className="text-sm text-slate-500 flex items-center gap-2"><CheckCircle size={14} className="text-green-500"/> All products stocked up!</li>
                  ) : inventoryStats.lowStockList.map(item => (
                    <li key={item.product_id} className="flex justify-between items-center text-sm p-2 rounded-lg border border-slate-100 bg-slate-50">
                      <span className="font-medium text-slate-800 truncate pr-2">{item.product?.name}</span>
                      <span className={`font-bold flex items-center gap-1 shrink-0 ${item.stock_quantity === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {item.stock_quantity} left {item.stock_quantity === 0 ? <XCircle size={14}/> : <AlertTriangle size={14}/>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 5. AI Stock Prediction & 6. Restock Recommendations */}
              <div className="card shadow-sm border border-primary-200 bg-gradient-to-br from-white to-primary-50/30">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-primary-800 flex items-center gap-2"><BrainCircuit size={18} className="text-primary-600"/> Smart Inventory AI</h3>
                   <Link to="/ai-insights" className="text-xs font-semibold text-primary-600 hover:text-primary-800">View Full Analysis</Link>
                </div>
                
                {loading || !aiInsights ? (
                  <div className="h-32 flex items-center justify-center"><RefreshCw className="animate-spin text-primary-300" /></div>
                ) : (
                  <div className="space-y-4">
                    {/* Stock Predictions */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Stockout Risk Prediction</h4>
                      {aiInsights.stockoutPredictions.length === 0 ? (
                        <p className="text-sm text-slate-500">No immediate stockout risks detected.</p>
                      ) : (
                        <div className="space-y-2">
                          {aiInsights.stockoutPredictions.slice(0,2).map(p => (
                            <div key={p.id} className="bg-white p-3 rounded-lg border border-red-100 text-sm shadow-sm relative overflow-hidden">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                              <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                              <div className="flex justify-between mt-1 text-xs">
                                <span className="text-slate-500">Avg {p.averageDailySales.toFixed(1)}/day</span>
                                <span className="font-bold text-red-600">{p.estimatedDaysRemaining} days remaining</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Restock Recommendations */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Restock Suggested</h4>
                      {aiInsights.recommendations.filter(r => r.type === 'Restock').length === 0 ? (
                        <p className="text-sm text-slate-500">Inventory levels are optimal.</p>
                      ) : (
                        <div className="space-y-2">
                          {aiInsights.recommendations.filter(r => r.type === 'Restock').slice(0,2).map(r => (
                            <div key={r.id} className="bg-white p-2.5 rounded-lg border border-amber-200 text-sm shadow-sm flex justify-between items-center">
                              <div className="overflow-hidden pr-2">
                                <p className="font-semibold text-slate-800 truncate">{r.product.name}</p>
                                <p className="text-[10px] text-slate-500">Order from supplier</p>
                              </div>
                              <div className="bg-amber-100 text-amber-800 px-2 py-1 rounded font-bold text-xs shrink-0 whitespace-nowrap">
                                Buy {r.recommendedRestockQuantity}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* 8. Top Selling Products */}
              <div className="card !p-0 shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-600"/> Top Selling Products</h3>
                </div>
                <div className="p-2">
                   {!aiInsights || aiInsights.fastMoving.length === 0 ? (
                     <div className="p-4 text-center text-sm text-slate-500">Not enough data to determine top sellers.</div>
                   ) : (
                     <ul className="space-y-1">
                       {aiInsights.fastMoving.slice(0,3).map((p, idx) => (
                         <li key={p.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg">
                           <div className="flex items-center gap-3 overflow-hidden">
                             <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</div>
                             <span className="font-medium text-sm text-slate-800 truncate">{p.name}</span>
                           </div>
                           <span className="text-sm font-bold text-slate-600 shrink-0">{p.totalQuantitySold} sold</span>
                         </li>
                       ))}
                     </ul>
                   )}
                </div>
              </div>

              {/* 9. Supplier Quick Access */}
              <div className="card shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><Truck size={18} className="text-slate-600"/> Suppliers</h3>
                  <Link to="/suppliers" className="text-xs font-semibold text-primary-600 hover:text-primary-800">Manage</Link>
                </div>
                <div className="space-y-2 mb-3">
                  {suppliers.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-2">No suppliers added yet.</p>
                  ) : suppliers.map(sup => (
                    <div key={sup.id} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                      <span className="font-medium text-slate-800 truncate pr-2">{sup.name}</span>
                      <a href={`tel:${sup.contact_phone}`} className="text-primary-600 hover:underline">{sup.contact_phone}</a>
                    </div>
                  ))}
                </div>
                <Link to="/inventory" className="btn w-full justify-center bg-slate-800 hover:bg-slate-900 text-white text-xs py-2 shadow-sm font-medium">
                  + New Purchase
                </Link>
              </div>

            </div>
          </div>
        </>
      )}
    </Layout>
  );
};

export default Dashboard;
