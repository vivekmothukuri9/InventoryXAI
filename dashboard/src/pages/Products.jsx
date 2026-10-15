import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../services/supabase';
import { 
  Tag, Package, AlertTriangle, AlertCircle, Search, Filter, 
  Plus, Edit, Trash2, Eye, X, Image as ImageIcon, Settings, 
  IndianRupee, Layers, ChevronDown, ChevronUp, CheckCircle
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

const Products = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dealerId, setDealerId] = useState(null);
  
  // Data State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  
  // Modals
  const [activeModal, setActiveModal] = useState(null); // 'add', 'edit', 'view', 'delete', 'categories'
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Form States
  const [formData, setFormData] = useState({
    name: '', sku: '', category: '', base_price: '', cost_price: '', 
    initial_stock: '', min_stock_level: '', supplier_id: '', supplier: '', description: '', image_url: ''
  });
  const [categoryName, setCategoryName] = useState('');
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

      // Fetch Categories
      const { data: catData, error: catError } = await supabase
        .from('product_categories')
        .select('*')
        .eq('dealer_id', dId)
        .order('name');
        
      if (!catError && catData) setCategories(catData);

      // Fetch Suppliers
      const { data: supData, error: supError } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('dealer_id', dId)
        .eq('is_deleted', false)
        .eq('status', 'Active')
        .order('name');
        
      if (!supError && supData) setSuppliers(supData);

      // Fetch Products with their Inventory
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select(`
          *,
          inventory (stock_quantity, min_stock_level, status, last_updated)
        `)
        .eq('dealer_id', dId)
        .eq('is_deleted', false);

      if (prodError) throw prodError;

      // Transform data for easier consumption
      const formattedProducts = (prodData || []).map(p => ({
        ...p,
        stock_quantity: p.inventory?.[0]?.stock_quantity || 0,
        min_stock_level: p.inventory?.[0]?.min_stock_level || 0,
        status: p.inventory?.[0]?.status || 'Unknown',
        last_updated: p.inventory?.[0]?.last_updated || p.created_at
      }));

      setProducts(formattedProducts);
    } catch (err) {
      console.error("Products fetch error:", err);
      // Suppress missing column errors gently if they haven't run the migration
      if (err.message?.includes('column "dealer_id" does not exist')) {
        setError("Database schema needs to be updated. Please run the SQL migration script in your Supabase dashboard.");
      } else {
        setError(err.message || "Failed to load products");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Derived Statistics
  const stats = useMemo(() => {
    let total = products.length;
    let active = 0;
    let lowStock = 0;
    let outOfStock = 0;
    
    products.forEach(p => {
      if (p.stock_quantity > 0) active++;
      if (p.stock_quantity === 0) outOfStock++;
      else if (p.stock_quantity <= (p.min_stock_level || 5)) lowStock++;
    });

    return { total, active, lowStock, outOfStock, cats: categories.length };
  }, [products, categories]);

  // Filtering & Sorting
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
                            
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      
      let matchesStatus = true;
      if (statusFilter === 'In Stock') matchesStatus = p.stock_quantity > (p.min_stock_level || 5);
      if (statusFilter === 'Low Stock') matchesStatus = p.stock_quantity > 0 && p.stock_quantity <= (p.min_stock_level || 5);
      if (statusFilter === 'Out of Stock') matchesStatus = p.stock_quantity === 0;

      return matchesSearch && matchesCategory && matchesStatus;
    }).sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal?.toLowerCase() || '';
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, searchQuery, categoryFilter, statusFilter, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const generateSKU = (name) => {
    const prefix = name ? name.substring(0, 3).toUpperCase() : 'PRD';
    return `${prefix}-${Math.floor(10000 + Math.random() * 90000)}`;
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    try {
      if (!formData.name || !formData.category || !formData.base_price) {
        throw new Error("Please fill in all required fields.");
      }

      const sku = formData.sku || generateSKU(formData.name);
      
      // Check SKU uniqueness
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('sku', sku)
        .eq('dealer_id', dealerId)
        .single();
        
      if (existing) throw new Error("A product with this SKU already exists.");

      // 1. Insert Product
      const { data: newProduct, error: prodError } = await supabase
        .from('products')
        .insert([{
          dealer_id: dealerId,
          name: formData.name,
          sku: sku,
          category: formData.category,
          base_price: parseFloat(formData.base_price || 0),
          cost_price: parseFloat(formData.cost_price || 0),
          supplier_id: formData.supplier_id || null,
          supplier: formData.supplier_id ? suppliers.find(s => s.id === formData.supplier_id)?.name : '',
          description: formData.description,
          image_url: formData.image_url
        }])
        .select()
        .single();

      if (prodError) throw prodError;

      // 2. Insert Inventory
      const initialStock = parseInt(formData.initial_stock || 0);
      const minStock = parseInt(formData.min_stock_level || 5);
      const status = initialStock === 0 ? 'Out of Stock' : (initialStock <= minStock ? 'Low Stock' : 'In Stock');

      const { error: invError } = await supabase
        .from('inventory')
        .insert([{
          dealer_id: dealerId,
          product_id: newProduct.id,
          stock_quantity: initialStock,
          min_stock_level: minStock,
          status: status
        }]);

      if (invError) throw invError;

      await fetchData();
      closeModal();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    try {
      // 1. Update Product
      const { error: prodError } = await supabase
        .from('products')
        .update({
          name: formData.name,
          sku: formData.sku,
          category: formData.category,
          base_price: parseFloat(formData.base_price || 0),
          cost_price: parseFloat(formData.cost_price || 0),
          supplier_id: formData.supplier_id || null,
          supplier: formData.supplier_id ? suppliers.find(s => s.id === formData.supplier_id)?.name : '',
          description: formData.description,
          image_url: formData.image_url
        })
        .eq('id', selectedProduct.id)
        .eq('dealer_id', dealerId);

      if (prodError) throw prodError;
      
      // 2. Update Inventory Min Stock
      const { error: invError } = await supabase
        .from('inventory')
        .update({
          min_stock_level: parseInt(formData.min_stock_level || 5)
        })
        .eq('product_id', selectedProduct.id)
        .eq('dealer_id', dealerId);
        
      if (invError) throw invError;

      await fetchData();
      closeModal();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    setFormSubmitting(true);
    setFormError(null);
    try {
      // Soft Delete
      const { error } = await supabase
        .from('products')
        .update({ is_deleted: true })
        .eq('id', selectedProduct.id)
        .eq('dealer_id', dealerId);

      if (error) throw error;
      
      await fetchData();
      closeModal();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };
  
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setFormSubmitting(true);
    try {
      const { error } = await supabase
        .from('product_categories')
        .insert([{ dealer_id: dealerId, name: categoryName.trim() }]);
      if (error) throw error;
      setCategoryName('');
      // Refetch categories
      const { data } = await supabase.from('product_categories').select('*').eq('dealer_id', dealerId).order('name');
      if (data) setCategories(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };
  
  const handleDeleteCategory = async (catId) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', catId)
        .eq('dealer_id', dealerId);
      if (error) throw error;
      // Refetch categories
      const { data } = await supabase.from('product_categories').select('*').eq('dealer_id', dealerId).order('name');
      if (data) setCategories(data);
    } catch (err) {
      alert(err.message);
    }
  };

  const openAddModal = () => {
    setFormData({
      name: '', sku: '', category: '', base_price: '', cost_price: '', 
      initial_stock: '', min_stock_level: '5', supplier_id: '', supplier: '', description: '', image_url: ''
    });
    setFormError(null);
    setActiveModal('add');
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category || '',
      base_price: product.base_price || '',
      cost_price: product.cost_price || '',
      min_stock_level: product.min_stock_level || '',
      supplier_id: product.supplier_id || '',
      supplier: product.supplier || '',
      description: product.description || '',
      image_url: product.image_url || ''
    });
    setFormError(null);
    setActiveModal('edit');
  };

  const openDeleteModal = (product) => {
    setSelectedProduct(product);
    setFormError(null);
    setActiveModal('delete');
  };
  
  const openViewModal = (product) => {
    setSelectedProduct(product);
    setActiveModal('view');
  };
  
  const closeModal = () => {
    setActiveModal(null);
    setSelectedProduct(null);
  };

  const getStockBadge = (qty, minLvl) => {
    if (qty === 0) return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Out of Stock</span>;
    if (qty <= (minLvl || 5)) return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Low Stock</span>;
    return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">In Stock</span>;
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return <ChevronDown size={14} className="text-slate-300" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-primary-500" /> : <ChevronDown size={14} className="text-primary-500" />;
  };

  return (
    <Layout title="Products Catalog">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard 
          title="Total Products" 
          value={stats.total} 
          icon={Package} 
          colorClass="bg-blue-50 text-blue-600"
          isLoading={loading}
        />
        <StatCard 
          title="Active Products" 
          value={stats.active} 
          icon={CheckCircle} 
          colorClass="bg-green-50 text-green-600"
          isLoading={loading}
        />
        <StatCard 
          title="Low Stock" 
          value={stats.lowStock} 
          icon={AlertTriangle} 
          colorClass="bg-amber-50 text-amber-600"
          isLoading={loading}
        />
        <StatCard 
          title="Out of Stock" 
          value={stats.outOfStock} 
          icon={AlertCircle} 
          colorClass="bg-red-50 text-red-600"
          isLoading={loading}
        />
        <StatCard 
          title="Categories" 
          value={stats.cats} 
          icon={Layers} 
          colorClass="bg-purple-50 text-purple-600"
          isLoading={loading}
        />
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-8">
          <AlertCircle className="text-red-500 mx-auto mb-3" size={40} />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Products</h3>
          <p className="text-red-600">{error}</p>
        </div>
      ) : (
        <div className="card !p-0 overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
          {/* Header & Controls */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search products, SKUs..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
              >
                <option value="All">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer hidden md:block"
              >
                <option value="All">All Status</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveModal('categories')}
                className="btn bg-slate-100 hover:bg-slate-200 text-slate-700 border-none px-4 flex items-center gap-2"
              >
                <Settings size={18} /> Manage Categories
              </button>
              <button onClick={openAddModal} className="btn btn-primary flex items-center gap-2">
                <Plus size={18} /> Add Product
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto flex-1">
            {loading ? (
              <div className="p-12 flex justify-center">
                <div className="spinner"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
                  <Package size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">No products found</h3>
                <p className="text-slate-500 max-w-md mx-auto mb-6">
                  {searchQuery || categoryFilter !== 'All' 
                    ? "We couldn't find any products matching your current filters."
                    : "Your product catalog is empty. Start by adding your first product."}
                </p>
                {(!searchQuery && categoryFilter === 'All') && (
                  <button onClick={openAddModal} className="btn btn-primary flex items-center gap-2">
                    <Plus size={18} /> Add Your First Product
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 font-medium cursor-pointer" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-2">Product {renderSortIcon('name')}</div>
                    </th>
                    <th className="px-6 py-4 font-medium cursor-pointer" onClick={() => handleSort('sku')}>
                      <div className="flex items-center gap-2">SKU {renderSortIcon('sku')}</div>
                    </th>
                    <th className="px-6 py-4 font-medium cursor-pointer hidden md:table-cell" onClick={() => handleSort('category')}>
                      <div className="flex items-center gap-2">Category {renderSortIcon('category')}</div>
                    </th>
                    <th className="px-6 py-4 font-medium cursor-pointer" onClick={() => handleSort('base_price')}>
                      <div className="flex items-center gap-2">Price {renderSortIcon('base_price')}</div>
                    </th>
                    <th className="px-6 py-4 font-medium cursor-pointer text-center" onClick={() => handleSort('stock_quantity')}>
                      <div className="flex items-center justify-center gap-2">Stock {renderSortIcon('stock_quantity')}</div>
                    </th>
                    <th className="px-6 py-4 font-medium text-center">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon size={20} className="text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 truncate max-w-[200px]" title={product.name}>{product.name}</div>
                            <div className="text-xs text-slate-500 md:hidden">{product.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-600">
                        {product.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium border border-slate-200">
                          {product.category || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-900">
                        ₹{parseFloat(product.base_price).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="font-semibold text-slate-900">{product.stock_quantity}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStockBadge(product.stock_quantity, product.min_stock_level)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openViewModal(product)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="View Details">
                            <Eye size={18} />
                          </button>
                          <button onClick={() => openEditModal(product)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Product">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => openDeleteModal(product)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Product">
                            <Trash2 size={18} />
                          </button>
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

      {/* --- MODALS --- */}

      {/* Add / Edit Product Modal */}
      <Modal isOpen={activeModal === 'add' || activeModal === 'edit'} onClose={closeModal} title={activeModal === 'add' ? 'Add New Product' : 'Edit Product'}>
        <form onSubmit={activeModal === 'add' ? handleAddProduct : handleEditProduct} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Product Name *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. Samsung Galaxy S23" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SKU (Optional)</label>
              <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Auto-generated if empty" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
              <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier (Optional)</label>
              <select value={formData.supplier_id || ''} onChange={e => setFormData({...formData, supplier_id: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price (₹) *</label>
              <input type="number" min="0" step="0.01" required value={formData.base_price} onChange={e => setFormData({...formData, base_price: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cost Price (₹)</label>
              <input type="number" min="0" step="0.01" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Stock Level</label>
              <input type="number" min="0" required value={formData.min_stock_level} onChange={e => setFormData({...formData, min_stock_level: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            {activeModal === 'add' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Initial Stock Qty</label>
                <input type="number" min="0" required value={formData.initial_stock} onChange={e => setFormData({...formData, initial_stock: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="0" />
              </div>
            )}
            {activeModal === 'edit' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Stock</label>
                <input type="text" disabled value={selectedProduct?.stock_quantity || 0} className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" title="Stock must be modified from the Inventory page" />
                <p className="text-xs text-slate-500 mt-1">Manage stock in Inventory page</p>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Image URL (Optional)</label>
            <input type="url" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="https://example.com/image.jpg" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
            <textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Product details..."></textarea>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={closeModal} className="btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={formSubmitting} className="btn btn-primary min-w-[120px]">
              {formSubmitting ? <span className="spinner"></span> : (activeModal === 'add' ? 'Save Product' : 'Update Product')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Product Modal */}
      <Modal isOpen={activeModal === 'delete'} onClose={closeModal} title="Delete Product">
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Delete {selectedProduct?.name}?</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Are you sure you want to delete this product? This will hide the product from your catalog but preserve historical sales data.
          </p>
          
          {formError && <p className="text-red-500 mb-4 text-sm">{formError}</p>}
          
          <div className="flex gap-3 w-full">
            <button onClick={closeModal} className="flex-1 btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">Cancel</button>
            <button onClick={handleDeleteProduct} disabled={formSubmitting} className="flex-1 btn bg-red-600 hover:bg-red-700 text-white border-none shadow-sm flex justify-center">
              {formSubmitting ? <span className="spinner"></span> : 'Yes, Delete'}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Product Details Modal */}
      <Modal isOpen={activeModal === 'view'} onClose={closeModal} title="Product Details">
        {selectedProduct && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden">
                {selectedProduct.image_url ? (
                  <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={40} className="text-slate-300" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{selectedProduct.name}</h2>
                    <p className="text-sm font-medium text-slate-500">SKU: {selectedProduct.sku}</p>
                  </div>
                  {getStockBadge(selectedProduct.stock_quantity, selectedProduct.min_stock_level)}
                </div>
                
                <div className="inline-block px-2.5 py-1 bg-slate-100 rounded-md text-xs font-semibold text-slate-600 border border-slate-200 mt-2">
                  {selectedProduct.category || 'Uncategorized'}
                </div>
                
                <p className="text-slate-600 mt-4 leading-relaxed">{selectedProduct.description || "No description provided."}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Selling Price</p>
                <p className="text-lg font-bold text-slate-900 flex items-center"><IndianRupee size={16} className="text-slate-400 mr-1"/>{parseFloat(selectedProduct.base_price).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Cost Price</p>
                <p className="text-lg font-bold text-slate-900 flex items-center"><IndianRupee size={16} className="text-slate-400 mr-1"/>{parseFloat(selectedProduct.cost_price || 0).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Current Stock</p>
                <p className="text-lg font-bold text-slate-900">{selectedProduct.stock_quantity} units</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Min Stock Lvl</p>
                <p className="text-lg font-bold text-slate-900">{selectedProduct.min_stock_level || 5} units</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-slate-100 rounded-xl">
                <p className="text-sm font-medium text-slate-500 mb-1">Supplier Info</p>
                <p className="text-slate-900 font-medium">
                  {selectedProduct.supplier_id 
                    ? suppliers.find(s => s.id === selectedProduct.supplier_id)?.name || selectedProduct.supplier 
                    : selectedProduct.supplier || "Not specified"}
                </p>
              </div>
              <div className="p-4 border border-slate-100 rounded-xl">
                <p className="text-sm font-medium text-slate-500 mb-1">Dates</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Added:</span>
                  <span className="text-slate-900 font-medium">{new Date(selectedProduct.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-500">Updated:</span>
                  <span className="text-slate-900 font-medium">{new Date(selectedProduct.last_updated).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100 flex justify-end">
               <button onClick={() => { closeModal(); openEditModal(selectedProduct); }} className="btn btn-primary flex items-center gap-2">
                 <Edit size={16} /> Edit Product
               </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Categories Management Modal */}
      <Modal isOpen={activeModal === 'categories'} onClose={closeModal} title="Manage Categories">
        <div className="space-y-6">
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input 
              type="text" 
              required
              value={categoryName}
              onChange={e => setCategoryName(e.target.value)}
              placeholder="New Category Name" 
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button type="submit" disabled={formSubmitting} className="btn btn-primary flex items-center gap-2 shrink-0">
              <Plus size={18} /> Add
            </button>
          </form>

          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {categories.length === 0 ? (
                <li className="p-4 text-center text-slate-500 text-sm">No categories created yet.</li>
              ) : (
                categories.map(cat => (
                  <li key={cat.id} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <span className="font-medium text-slate-700">{cat.name}</span>
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default Products;
