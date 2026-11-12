import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../services/supabase';
import { getAIInsights } from '../services/ai';
import { 
  BrainCircuit, AlertCircle, RefreshCw, TrendingUp, TrendingDown, 
  Package, ShoppingCart, Box, Activity, ArrowUpRight, ArrowDownRight, 
  AlertTriangle, Lightbulb, Info, CheckCircle, ChevronRight, X, IndianRupee,
  Calendar, Sparkles
} from 'lucide-react';
import ProductListModal from '../components/ProductListModal';

const StatCard = ({ title, value, icon: Icon, colorClass, onClick }) => (
  <div 
    className={`card cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.99] border-l-4 ${colorClass.border} select-none`}
    onClick={onClick}
  >
    <div className="flex justify-between items-start mb-2">
      <div className={`p-2 rounded-lg ${colorClass.bg} ${colorClass.text}`}>
        <Icon size={20} />
      </div>
      <span className="text-[10px] font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-200">
        View ↗
      </span>
    </div>
    <div>
      <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
    </div>
  </div>
);

const PriorityBadge = ({ priority }) => {
  switch(priority) {
    case 'CRITICAL': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-bold uppercase tracking-wider border border-red-200 flex items-center gap-1"><AlertTriangle size={12}/> Critical</span>;
    case 'HIGH': return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-bold uppercase tracking-wider border border-amber-200">High Risk</span>;
    case 'MEDIUM': return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-[10px] font-bold uppercase tracking-wider border border-yellow-200">Medium</span>;
    case 'POSITIVE': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase tracking-wider border border-green-200 flex items-center gap-1"><CheckCircle size={12}/> Positive</span>;
    default: return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-200 flex items-center gap-1"><Info size={12}/> Info</span>;
  }
};

const Modal = ({ isOpen, onClose, insight }) => {
  if (!isOpen || !insight) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg my-8">
        <div className="relative bg-white rounded-xl shadow-xl flex flex-col overflow-hidden">
          
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <BrainCircuit className="text-primary-600" size={20} />
              <h3 className="text-lg font-bold text-slate-800">AI Insight Detail</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:bg-slate-200 hover:text-slate-900 rounded-lg p-1.5 transition-colors">
              <X size={18} />
            </button>
          </div>
          
          <div className="p-6">
            <div className="mb-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-xl font-bold text-slate-900 leading-tight">{insight.title}</h4>
                <PriorityBadge priority={insight.priority} />
              </div>
              <p className="text-slate-600 text-sm">{insight.reason}</p>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 space-y-3">
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Data Analysis</h5>
              
              {insight.product && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Current Stock:</span>
                    <span className="font-semibold text-slate-900">{insight.product.currentStock} units</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Average Daily Sales:</span>
                    <span className="font-semibold text-slate-900">{insight.product.averageDailySales.toFixed(2)} units/day</span>
                  </div>
                  {insight.product.estimatedDaysRemaining !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Estimated Days Remaining:</span>
                      <span className={`font-semibold ${insight.product.estimatedDaysRemaining <= 3 ? 'text-red-600' : 'text-slate-900'}`}>
                        {insight.product.estimatedDaysRemaining} days
                      </span>
                    </div>
                  )}
                </>
              )}
              
              {insight.demandInfo && insight.demandInfo.demandGrowth !== undefined && (
                <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Demand Change:</span>
                  <span className={`font-semibold ${insight.demandInfo.demandGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {insight.demandInfo.demandGrowth > 0 ? '+' : ''}{insight.demandInfo.demandGrowth.toFixed(1)}%
                  </span>
                </div>
              )}
              
              {insight.recommendedRestockQuantity && (
                <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Safety Stock needed:</span>
                  <span className="font-semibold text-slate-900">{insight.safetyStock} units</span>
                </div>
              )}
            </div>
            
            <div className="bg-primary-50 border border-primary-100 rounded-lg p-4">
              <h5 className="text-xs font-bold text-primary-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Lightbulb size={14} /> Recommended Action
              </h5>
              <p className="text-primary-900 font-medium text-sm">
                {insight.action}
              </p>
              {insight.recommendedRestockQuantity > 0 && (
                 <div className="mt-3 pt-3 border-t border-primary-200 flex justify-between items-center">
                    <span className="text-sm font-semibold text-primary-800">Suggested Restock:</span>
                    <span className="text-lg font-bold text-primary-900">{insight.recommendedRestockQuantity} units</span>
                 </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

const AIInsights = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(7); // default 7 days
  const [insightsData, setInsightsData] = useState(null);
  
  const [activeSection, setActiveSection] = useState('recommendations'); // 'recommendations', 'stockout', 'demand', 'fast', 'slow'
  const [selectedInsight, setSelectedInsight] = useState(null);

  // Products Modal State
  const [productsModal, setProductsModal] = useState({
    isOpen: false,
    title: '',
    subtitle: '',
    icon: Package,
    colorClass: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-500' },
    products: [],
    emptyMessage: 'No products found.'
  });

  const fetchInsights = async () => {
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

      const data = await getAIInsights(dealerData.id, period);
      setInsightsData(data);
    } catch (err) {
      console.error("Failed to fetch insights:", err);
      setError(err.message || "Failed to analyze business data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [period]);

  const handleRefresh = () => {
    fetchInsights();
  };

  const handleExportCSV = () => {
    if (!insightsData) return;
    
    let csvContent = "data:text/csv;charset=utf-8,\n";
    csvContent += "Category,Product Name,Current Stock,Avg Daily Sales,Status/Days Left\n";
    
    insightsData.stockoutPredictions.forEach(p => {
      csvContent += `Low Stock Risk,${p.name},${p.currentStock},${p.averageDailySales.toFixed(2)},${p.estimatedDaysRemaining} days left\n`;
    });
    
    insightsData.fastMoving.forEach(p => {
      csvContent += `Fast Moving,${p.name},${p.currentStock},${p.averageDailySales.toFixed(2)},Selling Fast\n`;
    });

    insightsData.slowMoving.forEach(p => {
      csvContent += `Slow Moving,${p.name},${p.currentStock},${p.averageDailySales.toFixed(2)},Dead Stock\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Inventory_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return (
      <Layout title="AI Insights">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex flex-col items-center justify-center text-center">
          <AlertCircle className="text-red-500 mb-3" size={40} />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Analysis Failed</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={handleRefresh} className="btn bg-white border border-red-200 text-red-700 hover:bg-red-50 flex items-center gap-2">
            <RefreshCw size={18} /> Retry Analysis
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="AI Business Insights">
      <div data-tour="ai-insights" className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BrainCircuit className="text-primary-600" /> 
            Smart Analysis
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Data-driven predictions based on your actual business performance.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 w-full md:w-auto shadow-sm"
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 3 Months</option>
          </select>
          <button 
            onClick={handleExportCSV}
            disabled={loading || !insightsData}
            className="btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <Box size={16} /> Export Excel
          </button>
          <button 
            onClick={handleRefresh} 
            disabled={loading}
            className="btn btn-primary flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> 
            Refresh Analysis
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-28 bg-white border border-slate-100 rounded-xl animate-pulse"></div>
            ))}
          </div>
          <div className="h-64 bg-white border border-slate-100 rounded-xl animate-pulse flex items-center justify-center">
             <div className="flex flex-col items-center">
               <BrainCircuit className="text-slate-300 animate-pulse mb-3" size={40} />
               <p className="text-slate-400 font-medium">Analyzing your business data...</p>
             </div>
          </div>
        </div>
      ) : !insightsData?.hasEnoughData ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
            <Activity size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Not enough data available for an accurate prediction.</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Record more sales, orders, and inventory activity over the selected period to receive better AI predictions and business recommendations.
          </p>
        </div>
      ) : (
        <>
          {/* 1. AI BUSINESS OVERVIEW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <StatCard 
              title="Festival Forecast" 
              value={insightsData.overview.festivalAlertsCount} 
              icon={Sparkles} 
              colorClass={{ bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-l-purple-500' }}
              onClick={() => {
                setActiveSection('festival');
                const festivalItems = (insightsData.festivalData?.forecasts || []).map(f => ({
                  id: f.id || f.product?.id,
                  name: f.product?.name || "Product",
                  category: f.festival || "Festival Item",
                  stock_quantity: f.currentStock,
                  price: f.product?.base_price || 0,
                  daysRemaining: f.daysUntil,
                  daysUntil: f.daysUntil
                }));
                setProductsModal({
                  isOpen: true,
                  title: 'Festival Demand Forecast',
                  subtitle: `${insightsData.overview.festivalAlertsCount} products with upcoming festive surges`,
                  icon: Sparkles,
                  colorClass: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-500' },
                  products: festivalItems,
                  emptyMessage: 'No upcoming festival spikes detected.'
                });
              }}
            />
            <StatCard 
              title="At Risk of Stockout" 
              value={insightsData.overview.productsAtRisk} 
              icon={AlertCircle} 
              colorClass={{ bg: 'bg-red-50', text: 'text-red-600', border: 'border-l-red-500' }}
              onClick={() => {
                setActiveSection('stockout');
                const riskItems = (insightsData.stockoutPredictions || []).map(p => ({
                  id: p.id,
                  name: p.name,
                  category: p.category || "Stockout Risk",
                  stock_quantity: p.currentStock,
                  price: p.price || p.base_price || 0,
                  daysRemaining: p.estimatedDaysRemaining
                }));
                setProductsModal({
                  isOpen: true,
                  title: 'Products at Risk of Stockout',
                  subtitle: `${insightsData.overview.productsAtRisk} products projected to run out soon`,
                  icon: AlertCircle,
                  colorClass: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-500' },
                  products: riskItems,
                  emptyMessage: 'Zero products at risk of stockout!'
                });
              }}
            />
            <StatCard 
              title="Restock Recommended" 
              value={insightsData.overview.restockRecommended} 
              icon={Package} 
              colorClass={{ bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-l-amber-500' }}
              onClick={() => {
                setActiveSection('recommendations');
                const restockItems = (insightsData.recommendations || []).map(r => ({
                  id: r.id || r.product?.id,
                  name: r.product?.name || r.name,
                  category: r.product?.category || "Restock",
                  stock_quantity: r.currentStock || r.product?.stock_quantity,
                  price: r.product?.base_price || 0
                }));
                setProductsModal({
                  isOpen: true,
                  title: 'Restock Recommendations',
                  subtitle: `${insightsData.overview.restockRecommended} products needing inventory replenishment`,
                  icon: Package,
                  colorClass: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-500' },
                  products: restockItems,
                  emptyMessage: 'All products have optimal stock levels.'
                });
              }}
            />
            <StatCard 
              title="High Demand" 
              value={insightsData.overview.highDemandCount} 
              icon={TrendingUp} 
              colorClass={{ bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-l-indigo-500' }}
              onClick={() => {
                setActiveSection('demand');
                const highDemandItems = (insightsData.demandAnalysis?.highDemand || []).map(p => ({
                  id: p.id,
                  name: p.name,
                  category: p.category || "High Demand",
                  stock_quantity: p.currentStock || p.stock_quantity,
                  price: p.base_price || 0
                }));
                setProductsModal({
                  isOpen: true,
                  title: 'High Demand Products',
                  subtitle: `${insightsData.overview.highDemandCount} products experiencing heavy sales velocity`,
                  icon: TrendingUp,
                  colorClass: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-500' },
                  products: highDemandItems,
                  emptyMessage: 'No high demand spikes detected.'
                });
              }}
            />
            <StatCard 
              title="Fast Moving" 
              value={insightsData.overview.fastMovingCount} 
              icon={ShoppingCart} 
              colorClass={{ bg: 'bg-green-50', text: 'text-green-600', border: 'border-l-green-500' }}
              onClick={() => {
                setActiveSection('fast');
                const fastItems = (insightsData.fastMoving || []).map(p => ({
                  id: p.id,
                  name: p.name,
                  category: p.category || "Fast Moving",
                  stock_quantity: p.currentStock || p.stock_quantity,
                  price: p.base_price || 0
                }));
                setProductsModal({
                  isOpen: true,
                  title: 'Fast Moving Products',
                  subtitle: `${insightsData.overview.fastMovingCount} best-selling inventory items`,
                  icon: ShoppingCart,
                  colorClass: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-500' },
                  products: fastItems,
                  emptyMessage: 'No fast moving items currently.'
                });
              }}
            />
            <StatCard 
              title="Slow Moving" 
              value={insightsData.overview.slowMovingCount} 
              icon={Box} 
              colorClass={{ bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-l-slate-400' }}
              onClick={() => {
                setActiveSection('slow');
                const slowItems = (insightsData.slowMoving || []).map(p => ({
                  id: p.id,
                  name: p.name,
                  category: p.category || "Slow Moving",
                  stock_quantity: p.currentStock || p.stock_quantity,
                  price: p.base_price || 0
                }));
                setProductsModal({
                  isOpen: true,
                  title: 'Slow Moving Products',
                  subtitle: `${insightsData.overview.slowMovingCount} products with sluggish turnover`,
                  icon: Box,
                  colorClass: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-400' },
                  products: slowItems,
                  emptyMessage: 'Great news! No dead/slow moving inventory detected.'
                });
              }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Detailed Views based on activeSection */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sales Trend Analysis Header Card */}
                <div className="bg-gradient-to-r from-primary-600 to-indigo-700 rounded-xl p-6 text-white shadow-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
                        <Activity size={20} /> Sales Trend Analysis
                      </h3>
                      <p className="text-primary-100 text-sm">
                        {insightsData.salesTrend.revenueTrend === 'Increasing trend' 
                          ? `Great job! Your sales have increased by ${insightsData.salesTrend.revenueGrowth.toFixed(1)}% compared with the previous ${period} days.`
                          : insightsData.salesTrend.revenueTrend === 'Decreasing trend'
                          ? `Sales decreased by ${Math.abs(insightsData.salesTrend.revenueGrowth).toFixed(1)}% compared with the previous ${period} days.`
                          : `Your sales are stable compared with the previous ${period} days.`}
                      </p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                      {insightsData.salesTrend.revenueGrowth >= 0 ? <TrendingUp size={28} /> : <TrendingDown size={28} />}
                    </div>
                  </div>
                </div>

                {/* Profit Forecast Header Card */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-6 text-white shadow-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
                        <TrendingUp size={20} /> Profit Forecast (Next {insightsData.profitPrediction.projectedDays} Days)
                      </h3>
                      <p className="text-emerald-100 text-sm mb-2">
                        {insightsData.profitPrediction.trendMessage}
                      </p>
                      <p className="font-bold text-2xl flex items-center gap-1">
                         <IndianRupee size={22} /> {Math.round(insightsData.profitPrediction.predictedProfit).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm shrink-0">
                       <IndianRupee size={28} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Section Content */}
              <div className="card !p-0 overflow-hidden shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    {activeSection === 'festival' && <><Sparkles className="text-purple-500" size={18}/> Festival Forecast</>}
                    {activeSection === 'stockout' && <><AlertCircle className="text-red-500" size={18}/> Stockout Prediction</>}
                    {activeSection === 'recommendations' && <><Lightbulb className="text-amber-500" size={18}/> Restock Recommendations</>}
                    {activeSection === 'demand' && <><TrendingUp className="text-indigo-500" size={18}/> Demand Analysis</>}
                    {activeSection === 'fast' && <><ArrowUpRight className="text-green-500" size={18}/> Fast Moving Products</>}
                    {activeSection === 'slow' && <><ArrowDownRight className="text-slate-500" size={18}/> Slow Moving Products</>}
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  {/* Stockout Prediction Table */}
                  {activeSection === 'stockout' && (
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-3 font-medium">Product</th>
                          <th className="px-4 py-3 font-medium text-center">Current Stock</th>
                          <th className="px-4 py-3 font-medium text-center">Avg Daily Sales</th>
                          <th className="px-4 py-3 font-medium text-center">Est. Days Left</th>
                          <th className="px-4 py-3 font-medium">Risk Level</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {insightsData.stockoutPredictions.length === 0 ? (
                          <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No stockout risks detected.</td></tr>
                        ) : insightsData.stockoutPredictions.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                            <td className="px-4 py-3 text-center">{p.currentStock}</td>
                            <td className="px-4 py-3 text-center text-slate-600">{p.averageDailySales.toFixed(1)}</td>
                            <td className="px-4 py-3 text-center font-bold text-slate-900">{p.estimatedDaysRemaining}</td>
                            <td className="px-4 py-3"><PriorityBadge priority={p.riskLevel} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Festival Forecast Table */}
                  {activeSection === 'festival' && (
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-3 font-medium">Product</th>
                          <th className="px-4 py-3 font-medium">Festival</th>
                          <th className="px-4 py-3 font-medium text-center">Days Left</th>
                          <th className="px-4 py-3 font-medium text-center">Demand Surge</th>
                          <th className="px-4 py-3 font-medium text-center">Suggested Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(!insightsData.festivalData || insightsData.festivalData.forecasts.length === 0) ? (
                          <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No upcoming festivals detected.</td></tr>
                        ) : insightsData.festivalData.forecasts.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900">{p.product.name}</td>
                            <td className="px-4 py-3 text-purple-700 font-semibold flex items-center gap-1"><Calendar size={14} /> {p.festival}</td>
                            <td className="px-4 py-3 text-center text-slate-600">{p.daysUntil} days</td>
                            <td className="px-4 py-3 text-center text-green-600 font-bold">+{p.demandIncreasePercent}%</td>
                            <td className="px-4 py-3 text-center font-bold text-primary-700">+{p.additionalStockNeeded}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Demand Analysis Table */}
                  {activeSection === 'demand' && (
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-3 font-medium">Product</th>
                          <th className="px-4 py-3 font-medium text-center">Recent Sales</th>
                          <th className="px-4 py-3 font-medium text-center">Previous Sales</th>
                          <th className="px-4 py-3 font-medium text-center">Demand Growth</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {insightsData.demandAnalysis.length === 0 ? (
                          <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-500">Not enough data for demand analysis.</td></tr>
                        ) : insightsData.demandAnalysis.sort((a,b)=>b.demandGrowth - a.demandGrowth).map(p => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                            <td className="px-4 py-3 text-center">{p.currentSales}</td>
                            <td className="px-4 py-3 text-center text-slate-500">{p.previousSales}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`font-semibold ${p.demandGrowth > 0 ? 'text-green-600' : p.demandGrowth < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                {p.demandGrowth > 0 ? '+' : ''}{p.demandGrowth.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Fast Moving Table */}
                  {activeSection === 'fast' && (
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-3 font-medium">Product</th>
                          <th className="px-4 py-3 font-medium text-center">Units Sold</th>
                          <th className="px-4 py-3 font-medium text-center">Avg Daily Sales</th>
                          <th className="px-4 py-3 font-medium text-center">Current Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {insightsData.fastMoving.length === 0 ? (
                          <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-500">No fast moving products detected.</td></tr>
                        ) : insightsData.fastMoving.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                            <td className="px-4 py-3 text-center font-semibold text-slate-900">{p.totalQuantitySold}</td>
                            <td className="px-4 py-3 text-center text-green-600 font-medium">{p.averageDailySales.toFixed(1)}/day</td>
                            <td className="px-4 py-3 text-center text-slate-600">{p.currentStock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Slow Moving Table */}
                  {activeSection === 'slow' && (
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-3 font-medium">Product</th>
                          <th className="px-4 py-3 font-medium text-center">Current Stock</th>
                          <th className="px-4 py-3 font-medium text-center">Units Sold</th>
                          <th className="px-4 py-3 font-medium text-center">Avg Daily Sales</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {insightsData.slowMoving.length === 0 ? (
                          <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-500">No slow moving products detected.</td></tr>
                        ) : insightsData.slowMoving.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                            <td className="px-4 py-3 text-center font-medium text-slate-700">{p.currentStock}</td>
                            <td className="px-4 py-3 text-center text-slate-500">{p.totalQuantitySold}</td>
                            <td className="px-4 py-3 text-center text-amber-600">{p.averageDailySales.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Restock Recommendations Table */}
                  {activeSection === 'recommendations' && (
                    <div className="p-2 space-y-2">
                      {insightsData.recommendations.filter(r => r.type === 'Restock').length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No restock recommendations at this time.</div>
                      ) : insightsData.recommendations.filter(r => r.type === 'Restock').map(r => (
                        <div 
                          key={r.id} 
                          className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:border-primary-200 hover:bg-primary-50/30 cursor-pointer transition-colors"
                          onClick={() => setSelectedInsight(r)}
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-slate-900">{r.product.name}</h4>
                              <PriorityBadge priority={r.priority} />
                            </div>
                            <p className="text-xs text-slate-500">Stock: {r.product.currentStock} | Est. Left: {r.product.estimatedDaysRemaining} days</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500 mb-0.5">Recommended</p>
                            <p className="font-bold text-primary-700">+{r.recommendedRestockQuantity} units</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* Right Column: AI Business Recommendations Feed */}
            <div className="lg:col-span-1">
              <div className="card !p-0 h-full max-h-[800px] flex flex-col shadow-sm border border-slate-200">
                <div className="p-5 border-b border-slate-100 bg-slate-50 shrink-0">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <BrainCircuit className="text-primary-600" size={20} />
                    AI Actionable Insights
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Click an insight for detailed analysis</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                  {insightsData.recommendations.length === 0 ? (
                    <div className="text-center p-6 text-slate-500 text-sm">
                      Continue recording sales to receive AI recommendations.
                    </div>
                  ) : (
                    insightsData.recommendations.map(insight => (
                      <div 
                        key={insight.id} 
                        onClick={() => setSelectedInsight(insight)}
                        className={`p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all ${
                          insight.type === 'Festival' ? 'bg-purple-50/50 border-purple-200 hover:border-purple-300' :
                          insight.priority === 'CRITICAL' ? 'bg-red-50/50 border-red-200 hover:border-red-300' :
                          insight.priority === 'HIGH' ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300' :
                          insight.priority === 'POSITIVE' ? 'bg-green-50/50 border-green-200 hover:border-green-300' :
                          'bg-white border-slate-200 hover:border-primary-300'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <h4 className="font-semibold text-slate-900 text-sm leading-tight">{insight.title}</h4>
                          <PriorityBadge priority={insight.priority} />
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 mb-3">{insight.reason}</p>
                        <div className="flex items-center text-xs font-semibold text-primary-600 group">
                          View details <ChevronRight size={14} className="ml-0.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            
          </div>
        </>
      )}

      {/* Insight Detail Modal */}
      <Modal isOpen={!!selectedInsight} onClose={() => setSelectedInsight(null)} insight={selectedInsight} />
      
      {/* Product List Modal for StatCards */}
      <ProductListModal
        isOpen={productsModal.isOpen}
        onClose={() => setProductsModal(prev => ({ ...prev, isOpen: false }))}
        title={productsModal.title}
        subtitle={productsModal.subtitle}
        icon={productsModal.icon}
        colorClass={productsModal.colorClass}
        products={productsModal.products}
        emptyMessage={productsModal.emptyMessage}
      />

    </Layout>
  );
};

export default AIInsights;
