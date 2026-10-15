import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../services/supabase';
import { 
  Truck, Plus, Search, Eye, Edit, Trash2, X, AlertCircle, 
  ShoppingCart, CheckCircle, Package, IndianRupee, Clock, MapPin 
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
            <button onClick={onClose} className="text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-lg text-sm w-8 h-8 flex justify-center items-center transition-colors">
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

const Suppliers = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dealerId, setDealerId] = useState(null);
  
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  
  // UI State
  const [activeModal, setActiveModal] = useState(null); // 'add', 'edit', 'view', 'delete', 'purchase'
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Forms
  const [supplierForm, setSupplierForm] = useState({
    name: '', contact_person: '', phone: '', email: '', 
    address: '', city: '', gst_number: '', status: 'Active', notes: ''
  });
  
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_id: '',
    items: [{ product_id: '', quantity: 1, unit_price: 0 }],
    notes: '',
    purchase_date: new Date().toISOString().slice(0, 16)
  });
  
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

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

      // Fetch Suppliers
      const { data: supData, error: supError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('dealer_id', dId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
        
      if (supError) throw supError;
      setSuppliers(supData || []);

      // Fetch Products to see which ones belong to suppliers
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select(`id, name, sku, supplier_id, base_price, cost_price, inventory(stock_quantity)`)
        .eq('dealer_id', dId)
        .eq('is_deleted', false);
        
      if (prodError) throw prodError;
      setProducts(prodData || []);

      // Fetch Purchases
      const { data: purData, error: purError } = await supabase
        .from('purchases')
        .select(`*, purchase_items(*, products(name, sku))`)
        .eq('dealer_id', dId)
        .order('purchase_date', { ascending: false });
        
      if (purError) throw purError;
      setPurchases(purData || []);

    } catch (err) {
      console.error("Fetch error:", err);
      if (err.message?.includes('relation "public.suppliers" does not exist') || err.message?.includes('schema cache')) {
         setError("Database schema missing. Please run update-suppliers-schema.sql in your Supabase SQL Editor. If you already ran it, run `NOTIFY pgrst, reload_schema;` or wait a minute.");
      } else {
         setError(err.message || "Failed to load suppliers data");
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
    const total = suppliers.length;
    const active = suppliers.filter(s => s.status === 'Active').length;
    const productsSupplied = products.filter(p => p.supplier_id).length;
    
    // recent purchases count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentPurchases = purchases.filter(p => new Date(p.purchase_date) >= thirtyDaysAgo).length;

    return { total, active, productsSupplied, recentPurchases };
  }, [suppliers, products, purchases]);

  // Filtering
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        s.name.toLowerCase().includes(q) ||
        (s.contact_person && s.contact_person.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.city && s.city.toLowerCase().includes(q));
        
      const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchQuery, statusFilter]);

  // Modals Management
  const openModal = (type, supplier = null) => {
    setFormError(null);
    setSuccessMessage(null);
    setActiveModal(type);
    
    if (type === 'add') {
      setSupplierForm({
        name: '', contact_person: '', phone: '', email: '', 
        address: '', city: '', gst_number: '', status: 'Active', notes: ''
      });
    } else if (type === 'edit' && supplier) {
      setSelectedSupplier(supplier);
      setSupplierForm({
        name: supplier.name, contact_person: supplier.contact_person || '', 
        phone: supplier.phone || '', email: supplier.email || '', 
        address: supplier.address || '', city: supplier.city || '', 
        gst_number: supplier.gst_number || '', status: supplier.status || 'Active', 
        notes: supplier.notes || ''
      });
    } else if (type === 'view' && supplier) {
      setSelectedSupplier(supplier);
    } else if (type === 'delete' && supplier) {
      setSelectedSupplier(supplier);
    } else if (type === 'purchase') {
      setSelectedSupplier(supplier);
      setPurchaseForm({
        supplier_id: supplier ? supplier.id : '',
        items: [{ product_id: '', quantity: 1, unit_price: 0 }],
        notes: '',
        purchase_date: new Date().toISOString().slice(0, 16)
      });
    }
  };

  const closeModal = () => {
    if (formSubmitting) return;
    setActiveModal(null);
    setTimeout(() => {
      setSelectedSupplier(null);
      setSuccessMessage(null);
    }, 200);
  };

  // Supplier Handlers
  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    try {
      if (!supplierForm.name.trim()) throw new Error("Supplier name is required.");

      if (activeModal === 'add') {
        // Check for duplicates
        const existing = suppliers.find(s => s.name.toLowerCase() === supplierForm.name.toLowerCase());
        if (existing) throw new Error("A supplier with this name already exists.");

        const { error } = await supabase.from('suppliers').insert([{
          ...supplierForm,
          dealer_id: dealerId
        }]);
        if (error) throw error;
        setSuccessMessage("Supplier added successfully!");
        
      } else if (activeModal === 'edit') {
        const { error } = await supabase.from('suppliers')
          .update({
            ...supplierForm,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedSupplier.id);
        if (error) throw error;
        setSuccessMessage("Supplier updated successfully!");
      }

      await fetchData();
      if (activeModal === 'add') {
         setTimeout(closeModal, 1500);
      } else {
         setTimeout(() => {
           // update selected supplier with new details if viewing
           setSelectedSupplier({...selectedSupplier, ...supplierForm});
           setSuccessMessage(null);
           setActiveModal('view');
         }, 1500);
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteSupplier = async () => {
    setFormSubmitting(true);
    setFormError(null);
    try {
      // Soft delete
      const { error } = await supabase.from('suppliers')
        .update({ is_deleted: true, status: 'Inactive', updated_at: new Date().toISOString() })
        .eq('id', selectedSupplier.id);
      if (error) throw error;
      
      // Optionally remove connections from products (but let's keep it soft deleted, so we just filter out deleted suppliers everywhere)
      // If we don't update products, they will still have supplier_id. The products UI should handle showing "Deleted Supplier".
      
      await fetchData();
      closeModal();
    } catch (err) {
      setFormError(err.message);
      setFormSubmitting(false);
    }
  };

  // Purchase Form Calculation
  const calculatePurchaseTotals = () => {
    const total = purchaseForm.items.reduce((sum, item) => sum + ((parseFloat(item.quantity)||0) * (parseFloat(item.unit_price)||0)), 0);
    return { subtotal: total, total: total };
  };

  const handlePurchaseUpdateRow = (index, field, value) => {
    const newItems = [...purchaseForm.items];
    newItems[index][field] = value;
    
    // Auto-fill cost price if product selected
    if (field === 'product_id') {
      const p = products.find(prod => prod.id === value);
      if (p) newItems[index].unit_price = parseFloat(p.cost_price || p.base_price || 0);
    }
    
    setPurchaseForm({...purchaseForm, items: newItems});
  };

  const handleCreatePurchase = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    try {
      if (!purchaseForm.supplier_id) throw new Error("Select a supplier.");
      if (purchaseForm.items.length === 0) throw new Error("Add at least one product.");
      
      const cleanItems = [];
      for (let i = 0; i < purchaseForm.items.length; i++) {
        const item = purchaseForm.items[i];
        if (!item.product_id) throw new Error(`Row ${i+1}: Select a product.`);
        const qty = parseInt(item.quantity);
        if (isNaN(qty) || qty <= 0) throw new Error(`Row ${i+1}: Quantity must be > 0.`);
        const price = parseFloat(item.unit_price);
        if (isNaN(price) || price < 0) throw new Error(`Row ${i+1}: Invalid price.`);
        
        cleanItems.push({
          product_id: item.product_id,
          quantity: qty,
          unit_price: price,
          total_price: qty * price
        });
      }

      const { total } = calculatePurchaseTotals();

      // 1. Create Purchase (Draft by default, let dealer confirm receipt later, or we can assume Ordered)
      const { data: newPurchase, error: purErr } = await supabase
        .from('purchases')
        .insert([{
          dealer_id: dealerId,
          supplier_id: purchaseForm.supplier_id,
          status: 'Ordered', // Or 'Received' if we want to immediately receive it. Let's make them 'Ordered' so they can manually 'Receive'.
          subtotal: total,
          total_amount: total,
          notes: purchaseForm.notes,
          purchase_date: new Date(purchaseForm.purchase_date).toISOString()
        }])
        .select()
        .single();
        
      if (purErr) throw purErr;

      // 2. Add Items
      const itemsToInsert = cleanItems.map(item => ({
        purchase_id: newPurchase.id,
        ...item
      }));
      
      const { error: itemsErr } = await supabase.from('purchase_items').insert(itemsToInsert);
      if (itemsErr) {
        await supabase.from('purchases').delete().eq('id', newPurchase.id);
        throw itemsErr;
      }

      setSuccessMessage("Purchase order created successfully!");
      await fetchData();
      setTimeout(closeModal, 1500);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleReceivePurchase = async (purchase) => {
    setFormSubmitting(true);
    setFormError(null);
    try {
      if (purchase.status === 'Received') throw new Error("Already received.");
      
      const { data, error } = await supabase.rpc('receive_purchase', {
        p_purchase_id: purchase.id
      });

      if (error) throw error;
        
      await fetchData();
      setSuccessMessage("Purchase received! Inventory updated.");
      // update local view state
      setSelectedSupplier({...selectedSupplier}); // trigger re-render if needed, but fetch data handles it mostly
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  if (error) {
    return (
      <Layout title="Suppliers">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-8">
          <AlertCircle className="text-red-500 mx-auto mb-3" size={40} />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Suppliers Data</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Suppliers">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Suppliers" value={stats.total} icon={Truck} colorClass="bg-blue-50 text-blue-600" isLoading={loading} />
        <StatCard title="Active Suppliers" value={stats.active} icon={CheckCircle} colorClass="bg-green-50 text-green-600" isLoading={loading} />
        <StatCard title="Products Supplied" value={stats.productsSupplied} icon={Package} colorClass="bg-indigo-50 text-indigo-600" isLoading={loading} />
        <StatCard title="Recent Purchases" value={stats.recentPurchases} icon={ShoppingCart} colorClass="bg-amber-50 text-amber-600" isLoading={loading} />
      </div>

      <div className="card !p-0 overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
        {/* Header & Controls */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search suppliers..." 
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
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => openModal('purchase')} className="btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2">
              <ShoppingCart size={18} /> Create Purchase
            </button>
            <button onClick={() => openModal('add')} className="btn btn-primary flex items-center gap-2">
              <Plus size={18} /> Add Supplier
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          {loading ? (
            <div className="p-12 flex justify-center"><div className="spinner"></div></div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
                <Truck size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">No suppliers found</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-6">Manage your product suppliers and track purchases.</p>
              {!searchQuery && <button onClick={() => openModal('add')} className="btn btn-primary flex items-center gap-2"><Plus size={18}/> Add Your First Supplier</button>}
            </div>
          ) : (
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 font-medium">Supplier</th>
                  <th className="px-6 py-4 font-medium text-center">Products</th>
                  <th className="px-6 py-4 font-medium">Last Purchase</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map((sup) => {
                  const supProducts = products.filter(p => p.supplier_id === sup.id);
                  const supPurchases = purchases.filter(p => p.supplier_id === sup.id);
                  const lastPur = supPurchases.length > 0 ? supPurchases[0] : null;
                  
                  return (
                    <tr key={sup.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{sup.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{sup.phone || sup.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full font-semibold">{supProducts.length}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {lastPur ? new Date(lastPur.purchase_date).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {sup.status === 'Active' 
                          ? <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium border border-green-200">Active</span>
                          : <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium border border-slate-200">Inactive</span>
                        }
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openModal('view', sup)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg" title="View Details"><Eye size={18} /></button>
                          <button onClick={() => openModal('edit', sup)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg" title="Edit"><Edit size={18} /></button>
                          <button onClick={() => openModal('delete', sup)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 size={18} /></button>
                        </div>
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

      {/* Add / Edit Supplier Modal */}
      <Modal isOpen={activeModal === 'add' || activeModal === 'edit'} onClose={closeModal} title={activeModal === 'add' ? "Add New Supplier" : "Edit Supplier"}>
        <form onSubmit={handleSaveSupplier} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" /> <span>{formError}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-start gap-2">
              <CheckCircle size={16} className="shrink-0 mt-0.5" /> <span>{successMessage}</span>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier Name *</label>
              <input required type="text" value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input type="tel" value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={supplierForm.email} onChange={e => setSupplierForm({...supplierForm, email: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <input type="text" value={supplierForm.address} onChange={e => setSupplierForm({...supplierForm, address: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500" />
            </div>


          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={closeModal} className="btn bg-white border border-slate-200 text-slate-700">Cancel</button>
            <button type="submit" disabled={formSubmitting} className="btn btn-primary min-w-[100px]">{formSubmitting ? <span className="spinner"></span> : 'Save Supplier'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={activeModal === 'delete'} onClose={closeModal} title="Delete Supplier">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-start gap-3 border border-red-100">
             <AlertCircle className="shrink-0 mt-0.5 text-red-600" />
             <div>
               <h4 className="font-bold">Are you sure you want to delete {selectedSupplier?.name}?</h4>
               <p className="text-sm mt-1">This will mark the supplier as inactive and hide them from the active lists. Historical purchase records will remain intact.</p>
             </div>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="btn bg-white border border-slate-200 text-slate-700">Cancel</button>
            <button onClick={handleDeleteSupplier} disabled={formSubmitting} className="btn bg-red-600 hover:bg-red-700 text-white border-none">{formSubmitting ? <span className="spinner"></span> : 'Yes, Delete'}</button>
          </div>
        </div>
      </Modal>

      {/* View Details Modal */}
      <Modal isOpen={activeModal === 'view'} onClose={closeModal} title={selectedSupplier?.name}>
        {selectedSupplier && (() => {
          const supProducts = products.filter(p => p.supplier_id === selectedSupplier.id);
          const supPurchases = purchases.filter(p => p.supplier_id === selectedSupplier.id);
          
          return (
            <div className="space-y-6">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" /> <span>{formError}</span>
                </div>
              )}
              {successMessage && (
                <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-start gap-2">
                  <CheckCircle size={16} className="shrink-0 mt-0.5" /> <span>{successMessage}</span>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                   <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Contact Details</p>
                   <p className="text-sm text-slate-600">{selectedSupplier.phone}</p>
                   <p className="text-sm text-slate-600">{selectedSupplier.email}</p>
                </div>
                <div>
                   <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Location & Info</p>
                   <p className="text-sm text-slate-700">{selectedSupplier.address}</p>
                </div>
              </div>

              {/* Products Supplied */}
              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2"><Package size={16}/> Products Supplied</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Product</th>
                        <th className="px-4 py-3 font-medium text-center">Stock</th>
                        <th className="px-4 py-3 font-medium text-right">Cost Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {supProducts.length === 0 ? (
                        <tr><td colSpan="3" className="px-4 py-6 text-center text-slate-500">No products linked to this supplier.</td></tr>
                      ) : supProducts.map(p => (
                        <tr key={p.id}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">{p.name}</p>
                            <p className="text-xs text-slate-500">{p.sku}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-semibold ${p.inventory?.[0]?.stock_quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {p.inventory?.[0]?.stock_quantity || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700">₹{(p.cost_price || p.base_price || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Purchase History */}
              <div>
                <div className="flex justify-between items-end mb-3">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2"><Clock size={16}/> Purchase History</h4>
                  <button onClick={() => openModal('purchase', selectedSupplier)} className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                    <Plus size={14}/> Create Purchase
                  </button>
                </div>
                
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Date & ID</th>
                        <th className="px-4 py-3 font-medium">Items</th>
                        <th className="px-4 py-3 font-medium text-right">Amount</th>
                        <th className="px-4 py-3 font-medium text-center">Status</th>
                        <th className="px-4 py-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {supPurchases.length === 0 ? (
                        <tr><td colSpan="5" className="px-4 py-6 text-center text-slate-500">No purchase history available.</td></tr>
                      ) : supPurchases.map(pur => (
                        <tr key={pur.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{new Date(pur.purchase_date).toLocaleDateString()}</div>
                            <div className="text-xs font-mono text-slate-500">#{pur.id.slice(0,8)}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{pur.purchase_items?.length || 0} prod.</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">₹{parseFloat(pur.total_amount).toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">
                            {pur.status === 'Received' ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Received</span>
                            ) : (
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">{pur.status}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                             {pur.status !== 'Received' && (
                               <button 
                                 onClick={() => handleReceivePurchase(pur)} 
                                 disabled={formSubmitting}
                                 className="btn bg-white border border-primary-200 text-primary-700 hover:bg-primary-50 text-xs px-2 py-1 whitespace-nowrap"
                               >
                                 {formSubmitting ? '...' : 'Mark Received'}
                               </button>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          );
        })()}
      </Modal>

      {/* Create Purchase Modal */}
      <Modal isOpen={activeModal === 'purchase'} onClose={closeModal} title="Create Purchase Order">
        <form onSubmit={handleCreatePurchase} className="space-y-6">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" /> <span>{formError}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-start gap-2">
              <CheckCircle size={16} className="shrink-0 mt-0.5" /> <span>{successMessage}</span>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Supplier *</label>
                <select required value={purchaseForm.supplier_id} onChange={e => setPurchaseForm({...purchaseForm, supplier_id: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500">
                   <option value="">-- Choose Supplier --</option>
                   {suppliers.filter(s => s.status === 'Active').map(s => (
                     <option key={s.id} value={s.id}>{s.name}</option>
                   ))}
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date</label>
                <input type="datetime-local" value={purchaseForm.purchase_date} onChange={e => setPurchaseForm({...purchaseForm, purchase_date: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500" />
             </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Products</h4>
            <div className="space-y-3">
              {purchaseForm.items.map((item, index) => {
                 const availableProducts = purchaseForm.supplier_id 
                   ? products.filter(p => p.supplier_id === purchaseForm.supplier_id || !p.supplier_id)
                   : products; // Can show all, but best to filter by supplier if possible. We allow buying any product and implicitly that supplier supplies it, but for simplicity let's show all products.
                 
                 return (
                  <div key={index} className="flex flex-col md:flex-row gap-3 items-end bg-white p-3 border border-slate-200 rounded-lg">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Product</label>
                      <select required value={item.product_id} onChange={e => handlePurchaseUpdateRow(index, 'product_id', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-500">
                        <option value="">-- Select Product --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full md:w-24">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Quantity</label>
                      <input required type="number" min="1" value={item.quantity} onChange={e => handlePurchaseUpdateRow(index, 'quantity', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:border-primary-500" />
                    </div>
                    <div className="w-full md:w-32">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Cost Price (₹)</label>
                      <input required type="number" min="0" step="0.01" value={item.unit_price} onChange={e => handlePurchaseUpdateRow(index, 'unit_price', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:border-primary-500" />
                    </div>
                    <div className="w-full md:w-32 hidden md:block">
                      <label className="block text-xs font-medium text-slate-500 mb-1 text-right">Total (₹)</label>
                      <div className="px-3 py-2 bg-slate-100 border border-slate-100 rounded-lg text-sm font-semibold text-right text-slate-700">
                        {((parseInt(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toLocaleString('en-IN')}
                      </div>
                    </div>
                    {purchaseForm.items.length > 1 && (
                      <button type="button" onClick={() => {
                        const newItems = [...purchaseForm.items];
                        newItems.splice(index, 1);
                        setPurchaseForm({...purchaseForm, items: newItems});
                      }} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 rounded-lg border border-slate-200">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                 )
              })}
            </div>
            <button type="button" onClick={() => setPurchaseForm({...purchaseForm, items: [...purchaseForm.items, { product_id: '', quantity: 1, unit_price: 0 }]})} className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
              <Plus size={16} /> Add Another Product
            </button>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
             <div className="w-full md:w-64">
               <div className="flex justify-between items-center text-lg">
                 <span className="font-bold text-slate-800">Total Amount</span>
                 <span className="font-bold text-primary-600">₹{calculatePurchaseTotals().total.toLocaleString('en-IN')}</span>
               </div>
             </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={closeModal} className="btn bg-white border border-slate-200 text-slate-700">Cancel</button>
            <button type="submit" disabled={formSubmitting} className="btn btn-primary min-w-[120px]">{formSubmitting ? <span className="spinner"></span> : 'Submit Purchase'}</button>
          </div>
        </form>
      </Modal>

    </Layout>
  );
};

export default Suppliers;
