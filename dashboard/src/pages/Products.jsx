import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../services/supabase';
import { 
  Tag, 
  Package, 
  AlertTriangle, 
  AlertCircle, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  X, 
  Image as ImageIcon, 
  Settings, 
  IndianRupee, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle,
  Smartphone,
  CheckSquare,
  Square,
  Check,
  Sparkles,
  Store,
  Send,
  Upload,
  RefreshCw,
  ExternalLink,
  Mic,
  MicOff,
  Volume2
} from 'lucide-react';
import { useVoiceInput, parseSpokenDigits } from '../hooks/useVoiceInput';

const IMAGE_PRESETS = [
  { label: '🖥️ Monitor / Display', url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&auto=format&fit=crop&q=80' },
  { label: '🔊 Bluetooth Speaker', url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500&auto=format&fit=crop&q=80' },
  { label: '⚡ 65W Fast Charger', url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&auto=format&fit=crop&q=80' },
  { label: '💻 Laptop Stand', url: 'https://images.unsplash.com/photo-1616353071855-2c045c4458ae?w=500&auto=format&fit=crop&q=80' },
  { label: '⌨️ Mechanical Keyboard', url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&auto=format&fit=crop&q=80' },
  { label: '🎧 Wireless Headphones', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80' },
  { label: '🌾 Basmati Rice / Grains', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80' },
  { label: '🥫 Grocery & Provisions', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80' },
  { label: '⌚ Smart Watch', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80' },
  { label: '🔌 USB-C Cable', url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80' }
];

const DEFAULT_CATEGORIES = [
  'Accessories',
  'Audio',
  'Displays',
  'Power',
  'Storage',
  'Electronics',
  'Groceries',
  'Beverages',
  'Snacks',
  'Personal Care',
  'Household',
  'Dairy',
  'Other'
];

/**
 * Resizes and compresses an image file to a lightweight data URL (JPEG ~30-40KB)
 * for storage directly in the database without needing third-party storage buckets.
 */
const compressImageFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 600;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to high quality WebP/JPEG data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const StatCard = ({ title, value, icon: Icon, colorClass, isLoading, isActive, onClick, tooltip }) => {
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
    <div 
      onClick={onClick}
      title={tooltip || `Click to filter by ${title}`}
      className={`card transition-all duration-200 cursor-pointer select-none hover:scale-[1.02] hover:shadow-md ${
        isActive 
          ? 'ring-2 ring-primary-500 shadow-md bg-white border-primary-300' 
          : 'hover:border-slate-300'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className={`p-2.5 rounded-xl ${colorClass}`}>
          <Icon size={22} />
        </div>
        {isActive && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 animate-fade-in">
            Active
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-slate-500 font-semibold mb-0.5">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      </div>
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-2xl" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-slate-900/60 backdrop-blur-xs p-4">
      <div className={`relative w-full ${maxWidth} max-h-full my-8`}>
        <div className="relative bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-scale-up">
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-100 shrink-0 bg-slate-50/80">
            <h3 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">{title}</h3>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:bg-slate-200 hover:text-slate-900 rounded-full text-sm w-8 h-8 flex justify-center items-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-4 md:p-6 overflow-y-auto flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const Products = () => {
  const voiceInput = useVoiceInput();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dealerId, setDealerId] = useState(null);
  const [shopName, setShopName] = useState(() => localStorage.getItem('user_shop_name') || 'vivek Store');
  
  // Data State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  // Selection State (for bulk check/uncheck & publishing to app)
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  
  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [channelFilter, setChannelFilter] = useState('all'); // 'all', 'published', 'unpublished'
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  // Helper to check if a product is published to the mobile app
  const isProductPublished = (p) => {
    return p.is_published !== false && Boolean(p.image_url);
  };
  
  // Modals
  const [activeModal, setActiveModal] = useState(null); // 'add', 'edit', 'view', 'delete', 'categories', 'publish_app', 'quick_image'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quickImageProduct, setQuickImageProduct] = useState(null);
  const [quickImageUrl, setQuickImageUrl] = useState('');
  
  // Custom Category & Image Upload Mode States
  const [imageInputMode, setImageInputMode] = useState('upload'); // 'upload' or 'url'
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  // Image file upload handler (converts & compresses locally to Base64)
  const handleImageFileUpload = async (e, customCallback = null) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await compressImageFile(file);
      if (customCallback) {
        customCallback(dataUrl);
      } else {
        setFormData(prev => ({ ...prev, image_url: dataUrl }));
      }
    } catch (err) {
      console.error("Image compression error:", err);
      alert("Failed to process image file: " + err.message);
    }
  };
  
  // Publish to App modal state
  const [publishShopName, setPublishShopName] = useState('');
  const [publishList, setPublishList] = useState([]);
  const [publishSuccessMessage, setPublishSuccessMessage] = useState(null);
  
  // Form States
  const [formData, setFormData] = useState({
    name: '', sku: '', category: '', base_price: '', cost_price: '', 
    initial_stock: '', min_stock_level: '', supplier_id: '', supplier: '', description: '', image_url: '',
    shop_name: ''
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
        .select('id, shop_name, full_name')
        .eq('user_id', session.user.id)
        .single();
        
      if (dealerError || !dealerData) throw new Error("Dealer profile not found.");
      const dId = dealerData.id;
      setDealerId(dId);

      const resolvedShopName = dealerData.shop_name || session.user.user_metadata?.shop_name || 'My Store';
      setShopName(resolvedShopName);
      localStorage.setItem('user_shop_name', resolvedShopName);

      // Fetch Categories from Database
      const { data: catData } = await supabase
        .from('product_categories')
        .select('*')
        .eq('dealer_id', dId)
        .order('name');

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

      // Extract unique categories from existing products
      const productCategories = (prodData || [])
        .map(p => p.category)
        .filter(Boolean);

      // Merge DB categories + existing product categories + defaults
      const existingDbNames = (catData || []).map(c => c.name);
      const allCategoryNames = Array.from(new Set([
        ...existingDbNames,
        ...productCategories,
        ...DEFAULT_CATEGORIES
      ])).filter(Boolean).sort();

      const resolvedCategories = allCategoryNames.map((name, idx) => {
        const dbCat = (catData || []).find(c => c.name === name);
        return dbCat || { id: `cat-${idx}-${name}`, name, isDefault: true };
      });

      setCategories(resolvedCategories);

      // Transform data for easier consumption
      const formattedProducts = (prodData || []).map(p => ({
        ...p,
        shop_name: p.shop_name || resolvedShopName,
        is_published: p.is_published !== false, // default true if not false
        stock_quantity: p.inventory?.[0]?.stock_quantity || 0,
        min_stock_level: p.inventory?.[0]?.min_stock_level || 0,
        status: p.inventory?.[0]?.status || 'Unknown',
        last_updated: p.inventory?.[0]?.last_updated || p.created_at
      }));

      setProducts(formattedProducts);
    } catch (err) {
      console.error("Products fetch error:", err);
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
    let published = 0;
    
    products.forEach(p => {
      if (p.stock_quantity > 0) active++;
      if (p.stock_quantity === 0) outOfStock++;
      else if (p.stock_quantity <= (p.min_stock_level || 5)) lowStock++;
      if (isProductPublished(p)) published++;
    });

    return { total, active, lowStock, outOfStock, cats: categories.length, published };
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

      let matchesChannel = true;
      const isPub = isProductPublished(p);
      if (channelFilter === 'published') matchesChannel = isPub;
      if (channelFilter === 'unpublished') matchesChannel = !isPub;

      return matchesSearch && matchesCategory && matchesStatus && matchesChannel;
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
  }, [products, searchQuery, categoryFilter, statusFilter, channelFilter, sortConfig]);

  // Bulk Check / Uncheck handlers
  const isAllSelected = filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length;
  const isSomeSelected = selectedProductIds.length > 0 && selectedProductIds.length < filteredProducts.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelectProduct = (id) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

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
      const productPayload = {
        dealer_id: dealerId,
        name: formData.name,
        sku: sku,
        category: formData.category,
        base_price: parseFloat(formData.base_price || 0),
        cost_price: parseFloat(formData.cost_price || 0),
        supplier_id: formData.supplier_id || null,
        supplier: formData.supplier_id ? suppliers.find(s => s.id === formData.supplier_id)?.name : '',
        description: formData.description,
        image_url: formData.image_url,
        shop_name: shopName,
        is_published: true
      };

      const { data: newProduct, error: prodError } = await supabase
        .from('products')
        .insert([productPayload])
        .select()
        .single();

      if (prodError) {
        // Fallback without shop_name/is_published if schema columns not added yet
        if (prodError.message?.includes('column')) {
          delete productPayload.shop_name;
          delete productPayload.is_published;
          const { data: fallbackProd, error: fallbackErr } = await supabase
            .from('products')
            .insert([productPayload])
            .select()
            .single();
          if (fallbackErr) throw fallbackErr;
        } else {
          throw prodError;
        }
      }

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
      const updatePayload = {
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        base_price: parseFloat(formData.base_price || 0),
        cost_price: parseFloat(formData.cost_price || 0),
        supplier_id: formData.supplier_id || null,
        supplier: formData.supplier_id ? suppliers.find(s => s.id === formData.supplier_id)?.name : '',
        description: formData.description,
        image_url: formData.image_url,
        shop_name: shopName
      };

      const { error: prodError } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', selectedProduct.id)
        .eq('dealer_id', dealerId);

      if (prodError) {
        if (prodError.message?.includes('column')) {
          delete updatePayload.shop_name;
          const { error: fallbackErr } = await supabase
            .from('products')
            .update(updatePayload)
            .eq('id', selectedProduct.id)
            .eq('dealer_id', dealerId);
          if (fallbackErr) throw fallbackErr;
        } else {
          throw prodError;
        }
      }
      
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

  // Open "Publish to Mobile App" Modal
  const openPublishModal = (specificProduct = null) => {
    // If a specific product was clicked, target only that; otherwise use selected or filtered products
    let targetProducts = [];
    if (specificProduct && specificProduct.id) {
      targetProducts = [specificProduct];
    } else if (selectedProductIds.length > 0) {
      targetProducts = products.filter(p => selectedProductIds.includes(p.id));
    } else {
      targetProducts = filteredProducts;
    }

    setPublishList(targetProducts.map(p => ({
      ...p,
      selectedForApp: true,
      customImage: p.image_url || ''
    })));
    setPublishShopName(shopName);
    setActiveModal('publish_app');
  };

  // Unpublish a product from the Customer Mobile App
  const handleUnpublishProduct = async (product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_published: false })
        .eq('id', product.id);

      if (error && error.message?.includes('column')) {
        await supabase
          .from('products')
          .update({ image_url: null })
          .eq('id', product.id);
      }

      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_published: false } : p));
      setPublishSuccessMessage(`"${product.name}" has been unpublished from Customer Mobile App.`);
      setTimeout(() => setPublishSuccessMessage(null), 4000);
    } catch (err) {
      console.error("Error unpublishing product:", err);
      alert("Error unpublishing: " + err.message);
    }
  };

  // Bulk unpublish selected products
  const handleBulkUnpublish = async () => {
    if (selectedProductIds.length === 0) return;
    setFormSubmitting(true);
    try {
      for (const id of selectedProductIds) {
        await supabase.from('products').update({ is_published: false }).eq('id', id);
      }
      setProducts(prev => prev.map(p => selectedProductIds.includes(p.id) ? { ...p, is_published: false } : p));
      const count = selectedProductIds.length;
      setSelectedProductIds([]);
      setPublishSuccessMessage(`Unpublished ${count} products from Customer Mobile App.`);
      setTimeout(() => setPublishSuccessMessage(null), 4000);
    } catch (err) {
      console.error("Bulk unpublish error:", err);
      alert("Error unpublishing: " + err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Publish to App Execution
  const handleConfirmPublish = async () => {
    setFormSubmitting(true);
    try {
      // 1. Update dealer shop name if changed
      if (publishShopName && publishShopName !== shopName) {
        setShopName(publishShopName);
        localStorage.setItem('user_shop_name', publishShopName);
        if (dealerId) {
          await supabase.from('dealers').update({ shop_name: publishShopName }).eq('id', dealerId);
        }
      }

      // 2. Update each product's image_url, shop_name, and is_published in Supabase
      const itemsToPublish = publishList.filter(p => p.selectedForApp);

      for (const item of itemsToPublish) {
        const updateObj = {
          image_url: item.customImage || item.image_url || null,
          shop_name: publishShopName || shopName,
          is_published: true
        };

        const { error: pErr } = await supabase
          .from('products')
          .update(updateObj)
          .eq('id', item.id);

        if (pErr && pErr.message?.includes('column')) {
          // If shop_name column doesn't exist yet, update image_url only
          await supabase
            .from('products')
            .update({ image_url: item.customImage || item.image_url || null })
            .eq('id', item.id);
        }
      }

      setPublishSuccessMessage(`Successfully published ${itemsToPublish.length} products to Customer Mobile App under "${publishShopName || shopName}"!`);
      setTimeout(() => setPublishSuccessMessage(null), 5000);
      
      await fetchData();
      closeModal();
    } catch (err) {
      console.error(err);
      alert("Error publishing products: " + err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Quick single image update modal
  const openQuickImageModal = (product) => {
    setQuickImageProduct(product);
    setQuickImageUrl(product.image_url || '');
    setActiveModal('quick_image');
  };

  const handleSaveQuickImage = async () => {
    if (!quickImageProduct) return;
    setFormSubmitting(true);
    try {
      const { error: imgErr } = await supabase
        .from('products')
        .update({ image_url: quickImageUrl })
        .eq('id', quickImageProduct.id);

      if (imgErr) throw imgErr;
      await fetchData();
      closeModal();
    } catch (err) {
      alert("Failed to update image: " + err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      if (!categoryName.trim()) return;
      const { data, error } = await supabase
        .from('product_categories')
        .insert([{ dealer_id: dealerId, name: categoryName.trim() }])
        .select()
        .single();

      if (error) throw error;
      setCategories([...categories, data]);
      setCategoryName('');
    } catch (err) {
      alert(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCategories(categories.filter(c => c.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const openAddModal = () => {
    setIsCustomCategory(false);
    setCustomCategoryInput('');
    setImageInputMode('upload');
    const defaultCat = categories[0]?.name || DEFAULT_CATEGORIES[0] || 'Accessories';
    setFormData({
      name: '', 
      sku: '', 
      category: defaultCat, 
      base_price: '', 
      cost_price: '', 
      initial_stock: '', 
      min_stock_level: 5, 
      supplier_id: '', 
      supplier: '', 
      description: '', 
      image_url: '',
      shop_name: shopName
    });
    setFormError(null);
    setActiveModal('add');
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setIsCustomCategory(false);
    setCustomCategoryInput('');
    setImageInputMode('upload');
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      base_price: product.base_price,
      cost_price: product.cost_price || '',
      min_stock_level: product.min_stock_level,
      supplier_id: product.supplier_id || '',
      supplier: product.supplier || '',
      description: product.description || '',
      image_url: product.image_url || '',
      shop_name: product.shop_name || shopName
    });
    setFormError(null);
    setActiveModal('edit');
  };

  const openViewModal = (product) => {
    setSelectedProduct(product);
    setActiveModal('view');
  };

  const openDeleteModal = (product) => {
    setSelectedProduct(product);
    setFormError(null);
    setActiveModal('delete');
  };

  const closeModal = () => {
    if (voiceInput.isListening) {
      voiceInput.stopListening();
    }
    setActiveModal(null);
    setSelectedProduct(null);
    setQuickImageProduct(null);
    setFormError(null);
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return <ChevronDown size={14} className="text-slate-300" />;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp size={14} className="text-primary-600" /> 
      : <ChevronDown size={14} className="text-primary-600" />;
  };

  const getStockBadge = (stock, min) => {
    if (stock === 0) return <span className="px-2 py-1 bg-red-50 text-red-700 rounded-md text-xs font-semibold border border-red-200">Out of Stock</span>;
    if (stock <= (min || 5)) return <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-semibold border border-amber-200">Low Stock</span>;
    return <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-semibold border border-emerald-200">In Stock</span>;
  };

  return (
    <Layout title="Products Catalog">
      {/* Success Notification Banner */}
      {publishSuccessMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 text-white rounded-xl">
              <Smartphone size={20} />
            </div>
            <div>
              <p className="font-bold text-sm">{publishSuccessMessage}</p>
              <p className="text-xs text-emerald-600 mt-0.5">Customers can now view and order these items with your shop name directly on their mobile app.</p>
            </div>
          </div>
          <button onClick={() => setPublishSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 p-1">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Stat Cards - Interactive Quick Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard 
          title="Total Products" 
          value={stats.total} 
          icon={Package} 
          colorClass="bg-blue-50 text-blue-600"
          isLoading={loading}
          isActive={channelFilter === 'all' && statusFilter === 'All' && categoryFilter === 'All' && !searchQuery}
          onClick={() => {
            setChannelFilter('all');
            setStatusFilter('All');
            setCategoryFilter('All');
            setSearchQuery('');
          }}
          tooltip="Click to view all products"
        />
        <StatCard 
          title="Published on App" 
          value={stats.published} 
          icon={Smartphone} 
          colorClass="bg-indigo-50 text-indigo-600"
          isLoading={loading}
          isActive={channelFilter === 'published'}
          onClick={() => {
            setChannelFilter(channelFilter === 'published' ? 'all' : 'published');
          }}
          tooltip="Click to filter products live on Customer Mobile App"
        />
        <StatCard 
          title="In Stock" 
          value={stats.active} 
          icon={CheckCircle} 
          colorClass="bg-green-50 text-green-600"
          isLoading={loading}
          isActive={statusFilter === 'In Stock'}
          onClick={() => {
            setStatusFilter(statusFilter === 'In Stock' ? 'All' : 'In Stock');
            setChannelFilter('all');
          }}
          tooltip="Click to filter In Stock products"
        />
        <StatCard 
          title="Low Stock" 
          value={stats.lowStock} 
          icon={AlertTriangle} 
          colorClass="bg-amber-50 text-amber-600"
          isLoading={loading}
          isActive={statusFilter === 'Low Stock'}
          onClick={() => {
            setStatusFilter(statusFilter === 'Low Stock' ? 'All' : 'Low Stock');
            setChannelFilter('all');
          }}
          tooltip="Click to filter Low Stock products"
        />
        <StatCard 
          title="Out of Stock" 
          value={stats.outOfStock} 
          icon={AlertCircle} 
          colorClass="bg-red-50 text-red-600"
          isLoading={loading}
          isActive={statusFilter === 'Out of Stock'}
          onClick={() => {
            setStatusFilter(statusFilter === 'Out of Stock' ? 'All' : 'Out of Stock');
            setChannelFilter('all');
          }}
          tooltip="Click to filter Out of Stock products"
        />
        <StatCard 
          title="Categories" 
          value={stats.cats} 
          icon={Layers} 
          colorClass="bg-purple-50 text-purple-600"
          isLoading={loading}
          isActive={false}
          onClick={() => setActiveModal('categories')}
          tooltip="Click to manage and add categories"
        />
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center mb-8">
          <AlertCircle className="text-red-500 mx-auto mb-3" size={40} />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Products</h3>
          <p className="text-red-600">{error}</p>
        </div>
      ) : (
        <div className="card !p-0 overflow-hidden flex flex-col min-h-[550px] shadow-sm border border-slate-200 rounded-2xl">
          
          {/* Header & Controls */}
          <div data-tour="products" className="p-5 border-b border-slate-100 flex flex-col gap-4 shrink-0 bg-slate-50/70">
            {/* 1. Channel Filter Tabs (Separate Views for All vs Mobile App Published vs In-Store) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3.5">
              <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => setChannelFilter('all')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    channelFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  <span>All Products</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                    {stats.total}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setChannelFilter('published')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    channelFilter === 'published'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-indigo-700 hover:text-indigo-950 hover:bg-white/50'
                  }`}
                >
                  <Smartphone size={13} />
                  <span>Published to Mobile App</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                    channelFilter === 'published' 
                      ? 'bg-indigo-500 text-white' 
                      : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {stats.published}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setChannelFilter('unpublished')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    channelFilter === 'unpublished'
                      ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  <Store size={13} />
                  <span>In-Store Only</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                    {stats.total - stats.published}
                  </span>
                </button>
              </div>

              {channelFilter === 'published' && (
                <div className="flex items-center gap-2 text-xs text-indigo-800 bg-indigo-50/90 border border-indigo-200/80 px-3 py-1.5 rounded-xl font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Live on Customer Mobile App under <strong>"{shopName}"</strong></span>
                </div>
              )}
            </div>

            {/* 2. Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Left Search & Filters */}
              <div className="flex items-center gap-3 flex-1 flex-wrap">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input 
                    type="text" 
                    placeholder="Search products, SKUs, category..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9 py-2 w-full bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (voiceInput.isListening && voiceInput.activeField === 'search') {
                        voiceInput.stopListening();
                      } else {
                        voiceInput.startListening('search', (text) => {
                          setSearchQuery(text);
                        });
                      }
                    }}
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition-all cursor-pointer ${
                      voiceInput.isListening && voiceInput.activeField === 'search'
                        ? 'text-rose-600 bg-rose-50 animate-pulse'
                        : 'text-slate-400 hover:text-primary-600'
                    }`}
                    title="Speak to search products"
                  >
                    <Mic size={14} />
                  </button>
                </div>
                
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-2xs cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>

                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-2xs cursor-pointer"
                >
                  <option value="All">All Status</option>
                  <option value="In Stock">In Stock</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Professional "Publish to Mobile App" Button */}
                <button 
                  onClick={() => openPublishModal()}
                  className="btn bg-indigo-600 hover:bg-indigo-700 text-white border-none px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  title="Publish selected products with shop name & images to Customer Mobile App"
                >
                  <Smartphone size={16} />
                  <span>Publish to Mobile App {selectedProductIds.length > 0 ? `(${selectedProductIds.length})` : ''}</span>
                </button>

                <button 
                  onClick={() => setActiveModal('categories')}
                  className="btn bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors hidden md:flex"
                >
                  <Settings size={15} /> Categories
                </button>

                <button onClick={openAddModal} className="btn btn-primary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <Plus size={16} /> Add Product
                </button>
              </div>
            </div>

            {/* Bulk Selection Bar (Shows when 1 or more products are checked) */}
            <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                  <input 
                    type="checkbox" 
                    checked={isAllSelected}
                    ref={input => { if (input) input.indeterminate = isSomeSelected; }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300 cursor-pointer"
                  />
                  <span>Select All ({filteredProducts.length})</span>
                </label>
                
                {selectedProductIds.length > 0 && (
                  <span className="text-primary-700 font-bold bg-primary-50 border border-primary-200 px-2.5 py-0.5 rounded-lg">
                    ✓ {selectedProductIds.length} Selected
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedProductIds.length > 0 ? (
                  <>
                    <button 
                      onClick={() => openPublishModal()}
                      className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Smartphone size={14} /> Publish {selectedProductIds.length} to Mobile App
                    </button>
                    {channelFilter === 'published' && (
                      <button 
                        onClick={handleBulkUnpublish}
                        disabled={formSubmitting}
                        className="text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                        title="Unpublish selected items from mobile app"
                      >
                        <X size={14} /> Unpublish {selectedProductIds.length}
                      </button>
                    )}
                    <button 
                      onClick={() => setSelectedProductIds([])}
                      className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded"
                    >
                      Clear
                    </button>
                  </>
                ) : (
                  <span className="text-slate-400 text-[11px] hidden sm:inline">
                    Select products using checkboxes to publish or manage items on the Customer Mobile App
                  </span>
                )}
              </div>
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
                {channelFilter === 'published' ? (
                  <>
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-3 shadow-2xs">
                      <Smartphone size={32} />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 mb-1">No products published to Mobile App yet</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                      Select items from your catalog and click "Publish to Mobile App" to make them live for customers on their mobile application.
                    </p>
                    <button onClick={() => openPublishModal()} className="btn bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5 shadow-sm">
                      <Smartphone size={15} /> Publish Products to Mobile App
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
                      <Package size={32} />
                    </div>
                    <h3 className="text-base font-bold text-slate-700 mb-1">No products found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                      {searchQuery || categoryFilter !== 'All' 
                        ? "No products match your current search or category filter."
                        : "Your product catalog is empty. Start by adding your first product."}
                    </p>
                    {(!searchQuery && categoryFilter === 'All') && (
                      <button onClick={openAddModal} className="btn btn-primary text-xs flex items-center gap-1.5">
                        <Plus size={16} /> Add Your First Product
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-2xs">
                  <tr>
                    {/* Checkbox Column Header */}
                    <th className="px-4 py-3.5 w-10 text-center">
                      <input 
                        type="checkbox" 
                        checked={isAllSelected}
                        ref={input => { if (input) input.indeterminate = isSomeSelected; }}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300 cursor-pointer"
                        title="Select / Deselect All Products"
                      />
                    </th>
                    <th className="px-4 py-3.5 font-medium cursor-pointer" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-1.5">PRODUCT {renderSortIcon('name')}</div>
                    </th>
                    <th className="px-4 py-3.5 font-medium cursor-pointer" onClick={() => handleSort('sku')}>
                      <div className="flex items-center gap-1.5">SKU {renderSortIcon('sku')}</div>
                    </th>
                    <th className="px-4 py-3.5 font-medium cursor-pointer hidden md:table-cell" onClick={() => handleSort('category')}>
                      <div className="flex items-center gap-1.5">CATEGORY {renderSortIcon('category')}</div>
                    </th>
                    <th className="px-4 py-3.5 font-medium cursor-pointer" onClick={() => handleSort('base_price')}>
                      <div className="flex items-center gap-1.5">PRICE {renderSortIcon('base_price')}</div>
                    </th>
                    <th className="px-4 py-3.5 font-medium cursor-pointer text-center" onClick={() => handleSort('stock_quantity')}>
                      <div className="flex items-center justify-center gap-1.5">STOCK {renderSortIcon('stock_quantity')}</div>
                    </th>
                    <th className="px-4 py-3.5 font-medium text-center">STATUS</th>
                    <th className="px-4 py-3.5 font-medium text-center">MOBILE APP STATUS</th>
                    <th className="px-4 py-3.5 font-medium text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((product) => {
                    const isChecked = selectedProductIds.includes(product.id);
                    return (
                      <tr 
                        key={product.id} 
                        className={`hover:bg-slate-50/80 transition-colors group ${isChecked ? 'bg-primary-50/30' : ''}`}
                      >
                        {/* Checkbox Cell */}
                        <td className="px-4 py-3.5 text-center">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => toggleSelectProduct(product.id)}
                            className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300 cursor-pointer"
                          />
                        </td>

                        {/* Product Image & Name */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {/* Clickable Image thumbnail */}
                            <div 
                              onClick={() => openQuickImageModal(product)}
                              className="relative w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer group/img hover:ring-2 hover:ring-primary-500 shadow-2xs"
                              title="Click to add or change image"
                            >
                              {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon size={20} className="text-slate-400" />
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-bold">
                                Edit 📷
                              </div>
                            </div>

                            <div>
                              <div className="font-bold text-slate-900 truncate max-w-[200px]" title={product.name}>
                                {product.name}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <Store size={11} className="text-slate-400" />
                                <span className="font-medium text-slate-600 truncate max-w-[150px]">{product.shop_name || shopName}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* SKU */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono text-xs font-semibold text-slate-600">
                          {product.sku}
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3.5 whitespace-nowrap hidden md:table-cell">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200">
                            {product.category || 'Uncategorized'}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-bold text-slate-900">
                          ₹{parseFloat(product.base_price).toLocaleString('en-IN')}
                        </td>

                        {/* Stock */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center">
                          <span className="font-bold text-slate-900">{product.stock_quantity}</span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center">
                          {getStockBadge(product.stock_quantity, product.min_stock_level)}
                        </td>

                        {/* App Status Badge */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center">
                          {isProductPublished(product) ? (
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs" title={`Published in Mobile App under: ${product.shop_name || shopName}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <Smartphone size={11} /> Published on App
                              </span>
                              <button 
                                onClick={() => handleUnpublishProduct(product)}
                                className="text-[10px] text-slate-400 hover:text-red-600 hover:underline transition-colors cursor-pointer"
                                title="Remove this product from the Customer Mobile App"
                              >
                                Unpublish
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                In-Store Only
                              </span>
                              <button 
                                onClick={() => openPublishModal(product)}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
                                title="Publish this product to Customer Mobile App"
                              >
                                <Smartphone size={10} /> + Publish
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openViewModal(product)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="View Details">
                              <Eye size={16} />
                            </button>
                            <button onClick={() => openEditModal(product)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Product">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => openDeleteModal(product)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Product">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* 1. PUBLISH TO CUSTOMER MOBILE APP MODAL */}
      <Modal 
        isOpen={activeModal === 'publish_app'} 
        onClose={closeModal} 
        title="📱 Publish Products to Customer Mobile App"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-5">
          {/* Shop Name Configuration Banner */}
          <div className="p-4 bg-indigo-50/80 border border-indigo-100 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl shrink-0 mt-0.5">
                <Store size={22} />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">
                  Your Store / Shop Name (Displayed in Customer App) *
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    required
                    value={publishShopName}
                    onChange={(e) => setPublishShopName(e.target.value)}
                    className="flex-1 px-3.5 py-2 bg-white border border-indigo-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    placeholder="e.g. Sri Lakshmi Kirana & General Stores"
                  />
                </div>
                <p className="text-[11px] text-indigo-700 mt-1.5">
                  Customers in the mobile app will see: <strong>"Available at {publishShopName || 'Your Shop'}"</strong> on all published items!
                </p>
              </div>
            </div>
          </div>

          {/* Product Items Image & Detail Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Review Products & Images ({publishList.length} items)
              </h4>
              <span className="text-xs text-slate-500">
                Add an image or pick a preset so items look attractive in the app
              </span>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {publishList.map((item, index) => (
                <div key={item.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <input 
                        type="checkbox"
                        checked={item.selectedForApp}
                        onChange={(e) => {
                          const updated = [...publishList];
                          updated[index].selectedForApp = e.target.checked;
                          setPublishList(updated);
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      
                      {/* Image Preview Thumbnail */}
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                        {item.customImage ? (
                          <img src={item.customImage} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={20} className="text-slate-300" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h5 className="font-bold text-slate-900 text-sm truncate">{item.name}</h5>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>SKU: {item.sku}</span>
                          <span>• Price: <strong>₹{item.base_price}</strong></span>
                          <span>• Stock: <strong>{item.stock_quantity} units</strong></span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 shrink-0">
                      {item.category}
                    </span>
                  </div>

                  {/* Image URL input & Presets */}
                  <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2">
                    <input 
                      type="url" 
                      placeholder="Paste image URL (https://...)..."
                      value={item.customImage || ''}
                      onChange={(e) => {
                        const updated = [...publishList];
                        updated[index].customImage = e.target.value;
                        setPublishList(updated);
                      }}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />

                    {/* Presets dropdown */}
                    <select 
                      onChange={(e) => {
                        if (e.target.value) {
                          const updated = [...publishList];
                          updated[index].customImage = e.target.value;
                          setPublishList(updated);
                        }
                      }}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      <option value="">Quick Preset Image ▾</option>
                      {IMAGE_PRESETS.map((preset, pIdx) => (
                        <option key={pIdx} value={preset.url}>{preset.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Ready to publish {publishList.filter(p => p.selectedForApp).length} items
            </span>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={closeModal} 
                className="btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs px-4"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleConfirmPublish}
                disabled={formSubmitting || publishList.filter(p => p.selectedForApp).length === 0}
                className="btn bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                <Smartphone size={16} />
                <span>{formSubmitting ? 'Publishing to App...' : 'Confirm & Publish to Mobile App'}</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* 2. QUICK IMAGE UPDATE MODAL */}
      <Modal
        isOpen={activeModal === 'quick_image'}
        onClose={closeModal}
        title={`Update Photo: ${quickImageProduct?.name}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="w-32 h-32 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden mb-3 shadow-xs">
              {quickImageUrl ? (
                <img src={quickImageUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={36} className="text-slate-300" />
              )}
            </div>
            <p className="text-xs text-slate-500">Live Photo Preview</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Product Image Source
              </label>
              <label className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs">
                <Upload size={13} /> Upload From Device
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleImageFileUpload(e, (dataUrl) => setQuickImageUrl(dataUrl))} 
                  className="hidden" 
                />
              </label>
            </div>
            <input 
              type="url" 
              placeholder="Or paste image URL (https://...)"
              value={quickImageUrl}
              onChange={(e) => setQuickImageUrl(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Or Pick a Popular Image Preset:
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {IMAGE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setQuickImageUrl(preset.url)}
                  className="text-left text-xs p-2 rounded-lg border border-slate-200 bg-white hover:bg-primary-50 hover:border-primary-300 transition-colors truncate"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex gap-2">
            <button type="button" onClick={closeModal} className="flex-1 btn bg-white border border-slate-200 text-slate-700 text-xs py-2">
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleSaveQuickImage}
              disabled={formSubmitting}
              className="flex-1 btn btn-primary text-xs py-2 flex items-center justify-center gap-1.5"
            >
              {formSubmitting ? 'Saving...' : 'Save Photo'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 3. ADD / EDIT PRODUCT MODAL (WITH VOICE INPUT) */}
      <Modal isOpen={activeModal === 'add' || activeModal === 'edit'} onClose={closeModal} title={activeModal === 'add' ? 'Add New Product' : 'Edit Product'}>
        <form onSubmit={activeModal === 'add' ? handleAddProduct : handleEditProduct} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Voice Input Assistant Bar */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary-50/80 to-indigo-50/80 border border-primary-200/60 rounded-xl shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-2 rounded-xl transition-all ${voiceInput.isListening ? 'bg-rose-500 text-white animate-pulse shadow-xs' : 'bg-primary-600 text-white'}`}>
                <Mic size={16} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span>Voice Auto-Fill Assistant</span>
                  {voiceInput.isListening && (
                    <span className="text-[10px] text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full font-bold animate-pulse">
                      Listening for {voiceInput.activeField}...
                    </span>
                  )}
                </span>
                <p className="text-[11px] text-slate-500 truncate">
                  Click any <strong className="text-primary-700">"🎙️ Speak"</strong> button to speak your inputs!
                </p>
              </div>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => voiceInput.setVoiceLang('en-IN')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  voiceInput.voiceLang === 'en-IN' ? 'bg-primary-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => voiceInput.setVoiceLang('te-IN')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  voiceInput.voiceLang === 'te-IN' ? 'bg-primary-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                తెలుగు
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Product Name *</label>
                <button
                  type="button"
                  onClick={() => {
                    if (voiceInput.isListening && voiceInput.activeField === 'prod_name') {
                      voiceInput.stopListening();
                    } else {
                      voiceInput.startListening('prod_name', (text) => {
                        setFormData(prev => ({ ...prev, name: text }));
                      });
                    }
                  }}
                  className={`text-[11px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    voiceInput.isListening && voiceInput.activeField === 'prod_name'
                      ? 'bg-rose-100 text-rose-700 animate-pulse font-bold'
                      : 'text-primary-600 hover:text-primary-800 hover:bg-primary-50'
                  }`}
                  title="Speak Product Name"
                >
                  <Mic size={12} className={voiceInput.isListening && voiceInput.activeField === 'prod_name' ? 'text-rose-600 animate-pulse' : ''} />
                  <span>{voiceInput.isListening && voiceInput.activeField === 'prod_name' ? 'Listening...' : 'Speak'}</span>
                </button>
              </div>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" placeholder="e.g. Samsung Galaxy S23" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">SKU (Optional)</label>
              <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" placeholder="Auto-generated if empty" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Category *</label>
                {!isCustomCategory ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(true);
                      setCustomCategoryInput('');
                    }}
                    className="text-[11px] font-semibold text-primary-600 hover:text-primary-800"
                  >
                    + New Category
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(false);
                      const defaultCat = categories[0]?.name || 'Accessories';
                      setFormData(prev => ({ ...prev, category: defaultCat }));
                    }}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Select Existing
                  </button>
                )}
              </div>

              {!isCustomCategory ? (
                <select 
                  required 
                  value={formData.category} 
                  onChange={e => {
                    if (e.target.value === '__add_new__') {
                      setIsCustomCategory(true);
                      setCustomCategoryInput('');
                    } else {
                      setFormData({...formData, category: e.target.value});
                    }
                  }} 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium cursor-pointer"
                >
                  <option value="">Select Category</option>
                  {categories.map(c => (
                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                  ))}
                  <option value="__add_new__">➕ + Add Custom Category...</option>
                </select>
              ) : (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Type category name (e.g. Dairy, Spices)..."
                    value={customCategoryInput}
                    onChange={e => {
                      setCustomCategoryInput(e.target.value);
                      setFormData(prev => ({ ...prev, category: e.target.value }));
                    }}
                    className="flex-1 px-3.5 py-2 bg-white border border-primary-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Supplier (Optional)</label>
              <select value={formData.supplier_id || ''} onChange={e => setFormData({...formData, supplier_id: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm">
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Selling Price (₹) *</label>
                <button
                  type="button"
                  onClick={() => {
                    if (voiceInput.isListening && voiceInput.activeField === 'prod_price') {
                      voiceInput.stopListening();
                    } else {
                      voiceInput.startListening('prod_price', (text) => {
                        const num = parseSpokenDigits(text) || text.replace(/[^\d.]/g, '');
                        if (num) setFormData(prev => ({ ...prev, base_price: num }));
                      });
                    }
                  }}
                  className={`text-[11px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    voiceInput.isListening && voiceInput.activeField === 'prod_price'
                      ? 'bg-rose-100 text-rose-700 animate-pulse font-bold'
                      : 'text-primary-600 hover:text-primary-800 hover:bg-primary-50'
                  }`}
                  title="Speak Selling Price"
                >
                  <Mic size={12} className={voiceInput.isListening && voiceInput.activeField === 'prod_price' ? 'text-rose-600 animate-pulse' : ''} />
                  <span>{voiceInput.isListening && voiceInput.activeField === 'prod_price' ? 'Listening...' : 'Speak'}</span>
                </button>
              </div>
              <input type="number" min="0" step="0.01" required value={formData.base_price} onChange={e => setFormData({...formData, base_price: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-semibold" placeholder="0.00" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Cost Price (₹)</label>
                <button
                  type="button"
                  onClick={() => {
                    if (voiceInput.isListening && voiceInput.activeField === 'prod_cost') {
                      voiceInput.stopListening();
                    } else {
                      voiceInput.startListening('prod_cost', (text) => {
                        const num = parseSpokenDigits(text) || text.replace(/[^\d.]/g, '');
                        if (num) setFormData(prev => ({ ...prev, cost_price: num }));
                      });
                    }
                  }}
                  className={`text-[11px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    voiceInput.isListening && voiceInput.activeField === 'prod_cost'
                      ? 'bg-rose-100 text-rose-700 animate-pulse font-bold'
                      : 'text-primary-600 hover:text-primary-800 hover:bg-primary-50'
                  }`}
                  title="Speak Cost Price"
                >
                  <Mic size={12} className={voiceInput.isListening && voiceInput.activeField === 'prod_cost' ? 'text-rose-600 animate-pulse' : ''} />
                  <span>{voiceInput.isListening && voiceInput.activeField === 'prod_cost' ? 'Listening...' : 'Speak'}</span>
                </button>
              </div>
              <input type="number" min="0" step="0.01" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Min Stock Level</label>
                <button
                  type="button"
                  onClick={() => {
                    if (voiceInput.isListening && voiceInput.activeField === 'prod_min_stock') {
                      voiceInput.stopListening();
                    } else {
                      voiceInput.startListening('prod_min_stock', (text) => {
                        const num = parseSpokenDigits(text) || text.replace(/[^\d]/g, '');
                        if (num) setFormData(prev => ({ ...prev, min_stock_level: num }));
                      });
                    }
                  }}
                  className={`text-[11px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    voiceInput.isListening && voiceInput.activeField === 'prod_min_stock'
                      ? 'bg-rose-100 text-rose-700 animate-pulse font-bold'
                      : 'text-primary-600 hover:text-primary-800 hover:bg-primary-50'
                  }`}
                  title="Speak Min Stock"
                >
                  <Mic size={12} />
                  <span>{voiceInput.isListening && voiceInput.activeField === 'prod_min_stock' ? 'Listening...' : 'Speak'}</span>
                </button>
              </div>
              <input type="number" min="0" required value={formData.min_stock_level} onChange={e => setFormData({...formData, min_stock_level: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
            </div>
            {activeModal === 'add' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Initial Stock Qty</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (voiceInput.isListening && voiceInput.activeField === 'prod_stock') {
                        voiceInput.stopListening();
                      } else {
                        voiceInput.startListening('prod_stock', (text) => {
                          const num = parseSpokenDigits(text) || text.replace(/[^\d]/g, '');
                          if (num) setFormData(prev => ({ ...prev, initial_stock: num }));
                        });
                      }
                    }}
                    className={`text-[11px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                      voiceInput.isListening && voiceInput.activeField === 'prod_stock'
                        ? 'bg-rose-100 text-rose-700 animate-pulse font-bold'
                        : 'text-primary-600 hover:text-primary-800 hover:bg-primary-50'
                    }`}
                    title="Speak Initial Stock"
                  >
                    <Mic size={12} />
                    <span>{voiceInput.isListening && voiceInput.activeField === 'prod_stock' ? 'Listening...' : 'Speak'}</span>
                  </button>
                </div>
                <input type="number" min="0" required value={formData.initial_stock} onChange={e => setFormData({...formData, initial_stock: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-semibold" placeholder="0" />
              </div>
            )}
            {activeModal === 'edit' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Current Stock</label>
                <input type="text" disabled value={selectedProduct?.stock_quantity || 0} className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed text-sm" title="Stock must be modified from the Inventory page" />
              </div>
            )}
          </div>
          
          {/* Product Image Section: Upload File or URL */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Product Image
              </label>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setImageInputMode('upload')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    imageInputMode === 'upload' 
                      ? 'bg-primary-600 text-white shadow-2xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📁 Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setImageInputMode('url')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    imageInputMode === 'url' 
                      ? 'bg-primary-600 text-white shadow-2xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🔗 Image URL / Presets
                </button>
              </div>
            </div>

            {imageInputMode === 'upload' ? (
              <div>
                {formData.image_url ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                        <img src={formData.image_url} alt="Product" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle size={14} /> Photo Uploaded & Ready
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Will be shown in Customer Mobile App & store catalog</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="btn btn-primary text-xs py-1.5 px-3 cursor-pointer shadow-2xs">
                        Change
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageFileUpload} 
                          className="hidden" 
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                        className="btn bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 text-xs py-1.5 px-2.5"
                        title="Remove image"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-primary-500 bg-slate-50 hover:bg-primary-50/20 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                    <div className="p-2.5 bg-white rounded-full text-slate-400 group-hover:text-primary-600 shadow-2xs mb-2 transition-colors">
                      <Upload size={22} />
                    </div>
                    <p className="text-xs font-bold text-slate-700 group-hover:text-primary-700">
                      Click to browse & upload image from Computer or Mobile
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Supports PNG, JPG, JPEG, WebP (auto-compressed)</p>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageFileUpload} 
                      className="hidden" 
                    />
                  </label>
                )}
              </div>
            ) : (
              <div>
                <div className="flex gap-2 mb-2">
                  <input 
                    type="url" 
                    value={formData.image_url} 
                    onChange={e => setFormData({...formData, image_url: e.target.value})} 
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" 
                    placeholder="https://example.com/image.jpg" 
                  />
                  {formData.image_url && (
                    <div className="w-10 h-10 rounded-lg border border-slate-200 overflow-hidden shrink-0">
                      <img src={formData.image_url} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                {/* Quick preset chips */}
                <div className="flex flex-wrap gap-1">
                  {IMAGE_PRESETS.slice(0, 6).map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData({...formData, image_url: p.url})}
                      className="text-[11px] px-2 py-1 bg-slate-100 hover:bg-primary-50 rounded-md text-slate-600 transition-colors cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Description (Optional)</label>
              <button
                type="button"
                onClick={() => {
                  if (voiceInput.isListening && voiceInput.activeField === 'prod_desc') {
                    voiceInput.stopListening();
                  } else {
                    voiceInput.startListening('prod_desc', (text) => {
                      setFormData(prev => ({ ...prev, description: text }));
                    });
                  }
                }}
                className={`text-[11px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                  voiceInput.isListening && voiceInput.activeField === 'prod_desc'
                    ? 'bg-rose-100 text-rose-700 animate-pulse font-bold'
                    : 'text-primary-600 hover:text-primary-800 hover:bg-primary-50'
                }`}
                title="Speak Description"
              >
                <Mic size={12} />
                <span>{voiceInput.isListening && voiceInput.activeField === 'prod_desc' ? 'Listening...' : 'Speak'}</span>
              </button>
            </div>
            <textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" placeholder="Product details..."></textarea>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={closeModal} className="btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs">Cancel</button>
            <button type="submit" disabled={formSubmitting} className="btn btn-primary min-w-[120px] text-xs font-bold">
              {formSubmitting ? <span className="spinner"></span> : (activeModal === 'add' ? 'Save Product' : 'Update Product')}
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. DELETE PRODUCT MODAL */}
      <Modal isOpen={activeModal === 'delete'} onClose={closeModal} title="Delete Product" maxWidth="max-w-md">
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Delete {selectedProduct?.name}?</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto text-xs">
            Are you sure you want to delete this product? This will hide the product from your catalog but preserve historical sales data.
          </p>
          
          {formError && <p className="text-red-500 mb-4 text-sm">{formError}</p>}
          
          <div className="flex gap-3 w-full">
            <button onClick={closeModal} className="flex-1 btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs">Cancel</button>
            <button onClick={handleDeleteProduct} disabled={formSubmitting} className="flex-1 btn bg-red-600 hover:bg-red-700 text-white border-none shadow-sm flex justify-center text-xs font-bold">
              {formSubmitting ? <span className="spinner"></span> : 'Yes, Delete'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 5. VIEW PRODUCT DETAILS MODAL */}
      <Modal isOpen={activeModal === 'view'} onClose={closeModal} title="Product Details">
        {selectedProduct && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden shadow-2xs">
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
                    <p className="text-xs font-medium text-primary-700 flex items-center gap-1 mt-1">
                      <Store size={13} /> {selectedProduct.shop_name || shopName}
                    </p>
                  </div>
                  {getStockBadge(selectedProduct.stock_quantity, selectedProduct.min_stock_level)}
                </div>
                
                <div className="inline-block px-2.5 py-1 bg-slate-100 rounded-md text-xs font-semibold text-slate-600 border border-slate-200 mt-2">
                  {selectedProduct.category || 'Uncategorized'}
                </div>
                
                <p className="text-slate-600 mt-4 leading-relaxed text-sm">{selectedProduct.description || "No description provided."}</p>
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
                <p className="text-slate-900 font-medium text-sm">
                  {selectedProduct.supplier_id 
                    ? suppliers.find(s => s.id === selectedProduct.supplier_id)?.name || selectedProduct.supplier 
                    : selectedProduct.supplier || "Not specified"}
                </p>
              </div>
              <div className="p-4 border border-slate-100 rounded-xl">
                <p className="text-sm font-medium text-slate-500 mb-1">Dates</p>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Added:</span>
                  <span className="text-slate-900 font-medium">{new Date(selectedProduct.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-slate-500">Updated:</span>
                  <span className="text-slate-900 font-medium">{new Date(selectedProduct.last_updated).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100 flex justify-end">
               <button onClick={() => { closeModal(); openEditModal(selectedProduct); }} className="btn btn-primary flex items-center gap-2 text-xs font-bold">
                 <Edit size={16} /> Edit Product
               </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 6. CATEGORIES MANAGEMENT MODAL */}
      <Modal isOpen={activeModal === 'categories'} onClose={closeModal} title="Manage Categories" maxWidth="max-w-md">
        <div className="space-y-5">
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input 
              type="text" 
              required
              value={categoryName}
              onChange={e => setCategoryName(e.target.value)}
              placeholder="New Category Name" 
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button type="submit" disabled={formSubmitting} className="btn btn-primary text-xs font-bold flex items-center gap-1 shrink-0 px-3 py-2 rounded-xl">
              <Plus size={16} /> Add
            </button>
          </form>

          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {categories.length === 0 ? (
                <li className="p-4 text-center text-slate-500 text-xs">No categories created yet.</li>
              ) : (
                categories.map(cat => (
                  <li key={cat.id} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors text-xs">
                    <span className="font-semibold text-slate-700">{cat.name}</span>
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 size={15} />
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
