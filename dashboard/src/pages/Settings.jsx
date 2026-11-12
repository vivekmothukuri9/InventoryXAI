import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../services/supabase';
import { Settings as SettingsIcon, Save, User, Building, Phone, MapPin, Compass, HelpCircle } from 'lucide-react';
import { useProductTour } from '../context/ProductTourContext';

const Settings = () => {
  let tour = null;
  try {
    tour = useProductTour();
  } catch (e) {}

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    shop_name: '',
    phone: '',
    category: '',
    city: ''
  });

  const [dealerId, setDealerId] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        throw new Error("No authenticated user found.");
      }

      const { data, error } = await supabase
        .from('dealers')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setDealerId(data.id);
        setFormData({
          full_name: data.full_name || '',
          shop_name: data.shop_name || '',
          phone: data.phone || '',
          category: data.category || '',
          city: data.city || ''
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setSuccess(false);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dealerId) return;
    
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('dealers')
        .update({
          full_name: formData.full_name,
          shop_name: formData.shop_name,
          category: formData.category,
          city: formData.city
        })
        .eq('id', dealerId);

      if (error) throw error;

      setSuccess(true);
      // Dispatch event to update sidebar
      window.dispatchEvent(new Event('profileUpdated'));
      
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Settings">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Settings">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary-100 text-primary-600 rounded-xl">
            <SettingsIcon size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
            <p className="text-slate-500">Update your business profile and preferences</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">Business Information</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}
            
            {success && (
              <div className="p-4 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200">
                Profile updated successfully.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <User size={16} className="text-slate-400" />
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Building size={16} className="text-slate-400" />
                  Shop / Business Name
                </label>
                <input
                  type="text"
                  name="shop_name"
                  value={formData.shop_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Phone size={16} className="text-slate-400" />
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  disabled
                  className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500">Phone number cannot be changed directly.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <MapPin size={16} className="text-slate-400" />
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-70 shadow-sm"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save size={18} />
                )}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Help & Product Tour Section */}
        {tour && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center border border-violet-100 shrink-0">
                <Compass size={24} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 bg-violet-50 px-2.5 py-0.5 rounded-full mb-1 inline-block">
                  Interactive Guide
                </span>
                <h3 className="text-base font-bold text-slate-900">Side Navigation Walkthrough</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Need a refresher? Learn how each sidebar module works: Dashboard, Inventory, Products, Billing, Orders & AI Insights.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => tour.startTour(0)}
              className="btn bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 text-xs font-bold rounded-xl shadow-md shadow-violet-500/20 flex items-center gap-2 whitespace-nowrap transition-transform active:scale-95"
            >
              <Compass size={16} />
              Take Product Tour
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Settings;
