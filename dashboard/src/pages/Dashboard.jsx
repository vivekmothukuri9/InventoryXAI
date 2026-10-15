import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import Layout from '../components/Layout';
import { AlertCircle, RefreshCw } from 'lucide-react';
import ShopkeeperDashboard from '../components/ShopkeeperDashboard';
import DealerDashboard from '../components/DealerDashboard';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState('dealer');

  const fetchRole = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session?.user) throw new Error("Authentication required.");

      const { data: dealerData, error: dealerError } = await supabase
        .from('dealers')
        .select('role')
        .eq('user_id', session.user.id)
        .single();
        
      if (dealerError) throw dealerError;
      setUserRole(dealerData.role || 'dealer');

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load dashboard profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRole();
  }, []);

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="flex justify-center items-center h-64">
           <RefreshCw className="animate-spin text-slate-300" size={32} />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Dashboard">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex flex-col items-center justify-center text-center">
          <AlertCircle className="text-red-500 mb-3" size={40} />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load data</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={fetchRole} className="btn bg-red-100 text-red-700 hover:bg-red-200"><RefreshCw size={16} className="mr-2 inline"/>Retry</button>
        </div>
      </Layout>
    );
  }

  // Render Role-based Dashboard Content
  if (userRole === 'shopkeeper') {
    return <ShopkeeperDashboard />;
  }
  
  return <DealerDashboard />;
};

export default Dashboard;
