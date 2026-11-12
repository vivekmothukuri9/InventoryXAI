import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  X, 
  Search, 
  Package, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  IndianRupee, 
  ShoppingCart, 
  Plus, 
  ExternalLink,
  ArrowRight
} from 'lucide-react';

const ProductListModal = ({
  isOpen,
  onClose,
  title = "Products List",
  subtitle = "",
  icon: Icon = Package,
  colorClass = { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-500' },
  products = [],
  emptyMessage = "No products found."
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredProducts = products.filter(p => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    const name = (p.name || p.product_name || p.product?.name || '').toLowerCase();
    const sku = (p.sku || p.product?.sku || '').toLowerCase();
    const cat = (p.category || p.product?.category || '').toLowerCase();
    return name.includes(q) || sku.includes(q) || cat.includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose}></div>

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] z-10 animate-scale-up">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${colorClass.bg || 'bg-blue-50'} ${colorClass.text || 'text-blue-600'}`}>
              <Icon size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                  {products.length} {products.length === 1 ? 'Item' : 'Items'}
                </span>
              </div>
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search in this list by name, SKU or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Products List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <Package size={24} />
              </div>
              <p className="text-sm font-semibold text-slate-700 mb-1">{emptyMessage}</p>
              {searchTerm && (
                <p className="text-xs text-slate-400">Try adjusting your search keyword.</p>
              )}
            </div>
          ) : (
            filteredProducts.map((item, idx) => {
              const name = item.name || item.product_name || item.product?.name || "Unnamed Product";
              const sku = item.sku || item.product?.sku || "N/A";
              const category = item.category || item.product?.category || "General";
              const stock = item.stock_quantity !== undefined 
                ? item.stock_quantity 
                : (item.quantity !== undefined ? item.quantity : (item.currentStock || 0));
              const minStock = item.min_stock_level || item.min_stock || 5;
              const price = item.price || item.base_price || item.product?.base_price || 0;
              const isOutOfStock = stock === 0;
              const isLowStock = stock > 0 && stock <= minStock;

              return (
                <div 
                  key={item.id || item.product_id || idx}
                  className="p-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-between gap-3 transition-all hover:shadow-xs"
                >
                  {/* Left: Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-bold text-slate-900 text-sm truncate" title={name}>
                        {name}
                      </h4>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {category}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>SKU: <strong className="font-mono text-slate-700">{sku}</strong></span>
                      {price > 0 && (
                        <span>• Price: <strong className="text-slate-900">₹{price.toLocaleString('en-IN')}</strong></span>
                      )}
                      {item.daysRemaining !== undefined && item.daysRemaining !== null && (
                        <span>• Est: <strong className="text-amber-600">{item.daysRemaining} days left</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Right: Stock Badge & Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                          isOutOfStock 
                            ? 'bg-red-50 text-red-700 border border-red-200' 
                            : isLowStock 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {isOutOfStock && <AlertCircle size={12} />}
                          {isLowStock && <AlertTriangle size={12} />}
                          {!isOutOfStock && !isLowStock && <CheckCircle size={12} />}
                          {stock} {stock === 1 ? 'unit' : 'units'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Min alert: {minStock} units
                      </p>
                    </div>

                    {(isOutOfStock || isLowStock) && (
                      <Link
                        to="/orders"
                        onClick={onClose}
                        className="hidden sm:flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg border border-primary-200 transition-colors"
                        title="Order stock from dealer"
                      >
                        <ShoppingCart size={13} />
                        <span>Restock</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Showing {filteredProducts.length} of {products.length} products
          </span>
          <div className="flex items-center gap-2">
            <Link 
              to="/inventory"
              onClick={onClose}
              className="font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 py-1 px-2 rounded hover:bg-primary-50 transition-colors"
            >
              Open Full Inventory <ArrowRight size={13} />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProductListModal;
