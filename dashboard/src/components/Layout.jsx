import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  LayoutDashboard, 
  Package, 
  Tag, 
  TrendingUp, 
  Receipt, 
  ShoppingCart, 
  BrainCircuit, 
  Truck, 
  BarChart2, 
  Settings, 
  LogOut, 
  Bell, 
  Search, 
  Network, 
  X, 
  Send, 
  MessageSquare,
  Compass,
  ChevronDown,
  HelpCircle
} from 'lucide-react';
import { getAIInsights } from '../services/ai';
import { useProductTour } from '../context/ProductTourContext';

const formatMarkdown = (text) => {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
};

const Sidebar = ({ profile }) => {
  const navigate = useNavigate();
  const isDealer = (profile?.role || localStorage.getItem('user_role')) === 'dealer';
  let tour = null;
  try {
    tour = useProductTour();
  } catch (e) {}

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    ...(isDealer ? [{ name: 'City Network', icon: Network, path: '/city-network' }] : []),
    { name: 'Inventory', icon: Package, path: '/inventory' },
    { name: 'Products', icon: Tag, path: '/products' },
    { name: 'Sales', icon: TrendingUp, path: '/sales' },
    { name: 'Billing', icon: Receipt, path: '/billing' },
    { name: 'Orders', icon: ShoppingCart, path: '/orders' },
    { name: 'AI Insights', icon: BrainCircuit, path: '/ai-insights' },
    { name: 'Suppliers', icon: Truck, path: '/suppliers' },
    { name: 'Reports', icon: BarChart2, path: '/reports' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 h-screen flex flex-col fixed left-0 top-0 z-30 shadow-xs">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary-600 flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <BrainCircuit className="text-primary-500" />
          InventoryX <span className="text-slate-800">AI</span>
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
        {navItems.map((item) => {
          const Icon = item.icon;
          const tourKey = `nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              data-tour={tourKey}
              onClick={(e) => {
                navigate(item.path);
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer select-none ${
                  isActive 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon size={18} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 mb-3">
          <img src={profile?.avatar} alt="Profile" className="w-10 h-10 rounded-full bg-slate-200" />
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-slate-900 truncate" title={profile?.name}>{profile?.name || 'Loading...'}</p>
            <p className="text-xs text-slate-500 truncate" title={profile?.shopName}>{profile?.shopName}</p>
          </div>
        </div>
        {tour && (
          <button 
            onClick={() => tour.startTour(0)}
            className="flex items-center gap-2 text-xs text-primary-700 bg-primary-50 hover:bg-primary-100 font-semibold w-full px-2.5 py-2 rounded-lg mb-2 transition-colors border border-primary-200"
          >
            <Compass size={15} />
            Take Product Tour
          </button>
        )}
        <button 
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = '/index.html';
          }} 
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-critical font-medium w-full px-2 py-2 rounded transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );
};

const Topbar = ({ title, profile }) => {
  const [aiMessage, setAiMessage] = useState("AI is analyzing your sales trends...");
  const [alerts, setAlerts] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  let tour = null;
  try {
    tour = useProductTour();
  } catch (e) {}

  useEffect(() => {
    if (profile?.id) {
      import('../services/ai').then(({ getAIInsights }) => {
        getAIInsights(profile.id, 7).then(insights => {
          if (insights?.stockoutPredictions) {
            setAlerts(insights.stockoutPredictions);
          }
        }).catch(err => console.log(err));
      });
    }
  }, [profile?.id]);

  useEffect(() => {
    const messages = [
      "AI: Sales for Wireless Earbuds are up 20% this week.",
      "AI: Consider restocking Power Banks before weekend.",
      "AI: Detected anomaly in recent order volumes.",
      "AI: Your top performing category is Accessories."
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setAiMessage(messages[i]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
        <div className="hidden md:flex items-center gap-2 bg-primary-50 px-3 py-1.5 rounded-full text-xs font-medium text-primary-700">
          <BrainCircuit size={14} className="animate-pulse" />
          <span className="animate-fade-in-up">{aiMessage}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {tour && (
          <button 
            onClick={() => tour.startTour(0)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 transition-colors shadow-xs"
            title="Replay interactive product walkthrough"
          >
            <Compass size={15} />
            <span className="hidden sm:inline">Product Tour</span>
          </button>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search products..." 
            className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white w-52 md:w-64 transition-all"
          />
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
          >
            <Bell size={20} />
            {alerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-critical rounded-full border-2 border-white"></span>
            )}
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50 animate-fade-in-up">
              <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <h4 className="text-sm font-bold text-slate-800">Notifications</h4>
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{alerts.length} Alerts</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">No new alerts</div>
                ) : (
                  alerts.map((alert, idx) => (
                    <div key={idx} className="p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <p className="text-xs font-bold text-red-600 mb-0.5 flex items-center gap-1">
                        Stock Alert
                      </p>
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold">{alert.name}</span> is low on stock ({alert.currentStock} left). Might run out in {alert.estimatedDaysRemaining} days!
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
          <img src={profile?.avatar} alt="Profile" className="w-8 h-8 rounded-full bg-slate-200" />
          <span className="text-sm font-medium text-slate-700 max-w-[150px] truncate" title={profile?.shopName}>{profile?.shopName || '...'}</span>
        </div>
      </div>
    </div>
  );
};

const Layout = ({ children, title = "Dashboard" }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { type: 'ai', text: "Hello! I'm your **InventoryX AI** 🤖\n\nI'm connected to your live business data. You can ask me to:\n- Analyze your recent sales trends\n- Identify fast or slow-moving products\n- Recommend items to restock\n\n*What would you like to know today?*" }
  ]);

  const [profile, setProfile] = useState({
    name: 'Loading...',
    shopName: '',
    avatar: 'https://ui-avatars.com/api/?name=Loading&background=0D8ABC&color=fff'
  });

  const handleSendMessage = async (e, text = null) => {
    if (e) e.preventDefault();
    const message = text || chatInput;
    if (!message.trim()) return;

    // Add user message
    setChatMessages(prev => [...prev, { type: 'user', text: message }]);
    setChatInput('');

    // Add loading message
    setChatMessages(prev => [...prev, { type: 'ai', text: 'Thinking...', isLoading: true }]);

    try {
      const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error("API key missing in .env");
      }

      // Fetch context data so AI knows about the website data
      let contextData = "You are InventoryX AI, a helpful inventory and sales management assistant. Keep answers concise.";
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: dealerData } = await supabase.from('dealers').select('id').eq('user_id', session.user.id).single();
          if (dealerData) {
            const insights = await getAIInsights(dealerData.id, 7);
            contextData += `\n\nHere is the current business data for this user:
- Sales Trend: ${insights.salesTrend.revenueTrend}, Growth: ${insights.salesTrend.revenueGrowth.toFixed(1)}%
- Products at Risk of Stockout: ${insights.stockoutPredictions.map(p => p.name).join(', ') || 'None'}
- Fast Moving Products: ${insights.fastMoving.map(p => p.name).join(', ') || 'None'}
- High Demand Products: ${insights.overview.highDemandCount}
- Forecasted Profit (Next 7 days): ₹${Math.round(insights.profitPrediction.predictedProfit)}

CRITICAL INSTRUCTIONS:
1. Answer the user's questions accurately based ONLY on the provided data.
2. ALWAYS end your response by asking a relevant follow-up question or suggesting an actionable next step to keep the conversation engaging.
3. You MUST proactively suggest 1 or 2 NEW complementary products they should add to their store to boost revenue, based on what is fast moving.
4. You can understand and speak Telugu. If the user asks in Telugu (or Tanglish), reply natively in a friendly Telugu script or Tanglish. Keep it concise, friendly, and use formatting.`;
          }
        }
      } catch (err) {
        console.warn("Could not fetch context data for AI", err);
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            { role: "system", content: contextData },
            { role: "user", content: message }
          ]
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Failed to fetch AI response");

      const reply = data.choices[0]?.message?.content || "Sorry, I couldn't process that.";
      
      setChatMessages(prev => {
        const newMsgs = [...prev];
        newMsgs.pop();
        newMsgs.push({ type: 'ai', text: reply });
        return newMsgs;
      });
    } catch (error) {
      console.error(error);
      setChatMessages(prev => {
        const newMsgs = [...prev];
        newMsgs.pop();
        newMsgs.push({ type: 'ai', text: "Error: Could not connect to AI. Please check your API key." });
        return newMsgs;
      });
    }
  };

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) return;
      
      const { data, error } = await supabase
        .from('dealers')
        .select('id, full_name, shop_name, role')
        .eq('user_id', session.user.id)
        .single();
        
      if (error) throw error;
      if (data) {
        const effectiveRole = session.user.user_metadata?.role || data.role || localStorage.getItem('user_role') || 'shopkeeper';
        setProfile({
          id: data.id,
          name: data.full_name,
          shopName: data.shop_name,
          role: effectiveRole,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.full_name)}&background=0D8ABC&color=fff`
        });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  useEffect(() => {
    fetchProfile();
    
    const handleProfileUpdate = () => {
      fetchProfile();
    };
    
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  return (
    <div className="min-h-screen bg-slate-50 flex relative">
      <Sidebar profile={profile} />
      <div className="flex-1 ml-64">
        <Topbar title={title} profile={profile} />
        <main className="p-8">
          {children}
        </main>
      </div>
      
      {/* AI Assistant Chat Box */}
      {isChatOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 max-h-[calc(100vh-7rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fade-in-up">
          {/* Header - Always visible inside viewport, never cut off at top */}
          <div className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-sm select-none">
            <div className="flex items-center gap-2">
              <BrainCircuit size={18} />
              <div>
                <span className="font-semibold text-sm block leading-tight">InventoryX AI</span>
                <span className="text-[10px] text-primary-200 block">Live Data Connected</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsChatOpen(false)} 
                className="text-primary-100 hover:text-white p-1 rounded-md hover:bg-primary-700/50 transition-colors"
                title="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          
          {/* Messages Body - Smooth Swipe & Touch Scrolling */}
          <div 
            className="flex-1 p-4 min-h-[160px] max-h-[380px] overflow-y-auto overscroll-contain touch-pan-y flex flex-col gap-3 bg-slate-50"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.type === 'ai' ? 'bg-white border border-slate-100 text-slate-700 self-start rounded-tl-sm leading-relaxed shadow-xs' : 'bg-primary-600 text-white self-end rounded-tr-sm shadow-xs'}`}>
                {msg.type === 'ai' ? (
                  <div dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.text) }} />
                ) : (
                  msg.text
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions - Horizontal Swipeable */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-2 overflow-x-auto touch-pan-x scrollbar-thin">
            {["Analyze sales", "Low stock items?", "Generate report"].map(sug => (
              <button 
                key={sug} 
                onClick={() => handleSendMessage(null, sug)}
                className="whitespace-nowrap px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-medium transition-colors shrink-0"
              >
                {sug}
              </button>
            ))}
          </div>
          
          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask me anything..." 
              className="flex-1 bg-slate-100 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
            />
            <button type="submit" className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* AI Assistant Video Widget */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2 pointer-events-none">
        {!isChatOpen && (
          <div className="bg-white px-4 py-2 rounded-2xl shadow-lg border border-slate-100 text-sm font-medium text-slate-700 opacity-90 animate-pulse">
            Hi! I'm your AI Assistant.
          </div>
        )}
        <div 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-20 h-20 rounded-full overflow-hidden shadow-2xl border-4 border-white pointer-events-auto cursor-pointer hover:scale-105 transition-transform bg-slate-100 relative"
        >
          <video 
            src="/assist.mp4" 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover"
          ></video>
        </div>
      </div>
    </div>
  );
};

export default Layout;
