import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { supabase } from './services/supabase';
import Dashboard from './pages/Dashboard';
import CityNetwork from './pages/CityNetwork';
import Inventory from './pages/Inventory';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Orders from './pages/Orders';
import AIInsights from './pages/AIInsights';
import Suppliers from './pages/Suppliers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

const AuthGuard = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !session) {
      window.location.href = '/auth/index.html';
    }
  }, [loading, session]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: 'white' }}>Loading...</div>;
  }

  if (!session) {
    return null; // The useEffect will handle the redirect
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthGuard>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ai-insights" element={<AIInsights />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/city-network" element={<CityNetwork />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/products" element={<Products />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/settings" element={<Settings />} />
          {/* Other routes can be added here later */}
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </AuthGuard>
    </BrowserRouter>
  );
}

export default App;
