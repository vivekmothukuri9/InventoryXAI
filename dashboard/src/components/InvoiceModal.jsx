import React, { useRef } from 'react';
import { 
  X, Printer, Download, CheckCircle, AlertTriangle, 
  Store, Phone, MapPin, Calendar, CreditCard, ShieldCheck, XCircle
} from 'lucide-react';

const InvoiceModal = ({ isOpen, onClose, bill, dealer }) => {
  const invoiceRef = useRef(null);

  if (!isOpen || !bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    // Triggers native browser print-to-PDF
    window.print();
  };

  const isVoided = bill.status === 'voided';
  const hasGst = dealer?.gst_number && dealer.gst_number.trim().length > 0;

  // Format currency
  const formatInr = (val) => {
    const num = parseFloat(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const items = bill.bill_items || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-slate-900/60 backdrop-blur-sm p-4 print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-3xl my-8 print:my-0 print:max-w-none">
        
        {/* Modal Controls (Hidden in Print) */}
        <div className="bg-slate-800 text-white px-6 py-3 rounded-t-2xl flex items-center justify-between print:hidden shadow-md">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Invoice Preview: {bill.bill_number}</span>
            {isVoided && (
              <span className="bg-rose-500/20 text-rose-300 text-xs px-2 py-0.5 rounded font-bold border border-rose-500/30">
                VOIDED
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
              title="Print Invoice"
            >
              <Printer size={15} />
              Print
            </button>
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-slate-600"
              title="Save as PDF"
            >
              <Download size={15} />
              PDF
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              title="Close Preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div 
          ref={invoiceRef}
          id="printable-invoice"
          className="bg-white p-8 md:p-10 rounded-b-2xl print:rounded-none shadow-2xl print:shadow-none border border-slate-200 print:border-none relative overflow-hidden"
        >
          {/* Watermark for voided bills */}
          {isVoided && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 opacity-15">
              <div className="text-8xl md:text-9xl font-black text-rose-600 border-8 border-rose-600 p-8 rounded-3xl -rotate-12 tracking-widest">
                VOIDED
              </div>
            </div>
          )}

          {/* Invoice Header */}
          <div className="flex flex-col md:flex-row justify-between items-start border-b border-slate-200 pb-6 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Store className="text-primary-600" size={24} />
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {dealer?.shop_name || 'InventoryX Dealer'}
                </h1>
              </div>
              <p className="text-sm font-semibold text-slate-700">{dealer?.full_name}</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                {[dealer?.address, dealer?.city, dealer?.state, dealer?.pincode].filter(Boolean).join(', ') || 'Authorized Dealer Outlet'}
              </p>
              {dealer?.phone && (
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <Phone size={12} className="text-slate-400" /> Phone: {dealer.phone}
                </p>
              )}
              {hasGst ? (
                <p className="text-xs text-slate-600 font-medium mt-1">
                  GSTIN: <span className="font-mono text-slate-800">{dealer.gst_number}</span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 italic mt-1">
                  GST: Unregistered / Not Applicable
                </p>
              )}
            </div>

            <div className="md:text-right">
              <div className="inline-block bg-primary-50 text-primary-700 text-xs uppercase tracking-wider font-extrabold px-3 py-1 rounded-md mb-2">
                TAX INVOICE / BILL OF SALE
              </div>
              <h2 className="text-xl font-bold font-mono text-slate-900">{bill.bill_number}</h2>
              <p className="text-xs text-slate-500 mt-1 flex md:justify-end items-center gap-1">
                <Calendar size={12} className="text-slate-400" /> Date: {formatDate(bill.bill_date)}
              </p>
              <div className="flex md:justify-end items-center gap-2 mt-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  bill.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  bill.payment_status === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {bill.payment_status}
                </span>
                <span className="text-[11px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                  {bill.payment_method}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-5 border-b border-slate-200 bg-slate-50/70 p-4 rounded-xl mt-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Billed To (Customer):</p>
              <h3 className="text-base font-bold text-slate-800">{bill.customer_name || 'Walk-in Customer'}</h3>
              {bill.customer_phone && (
                <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                  <Phone size={12} className="text-slate-400" /> {bill.customer_phone}
                </p>
              )}
              {bill.customer_address && (
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <MapPin size={12} className="text-slate-400" /> {bill.customer_address}
                </p>
              )}
            </div>

            <div className="md:text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Customer Category:</p>
              <span className="inline-block capitalize text-xs font-semibold bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md">
                {bill.customer_type || 'Walk-in'}
              </span>
              {isVoided && bill.void_reason && (
                <div className="mt-2 text-xs text-rose-700 font-medium bg-rose-50 border border-rose-200 p-2 rounded text-left md:text-right">
                  <strong>Void Reason:</strong> {bill.void_reason}
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-600 uppercase tracking-wider font-bold">
                  <th className="py-2.5 px-2">#</th>
                  <th className="py-2.5 px-2">Product Description</th>
                  <th className="py-2.5 px-2">SKU</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-2 text-right">Unit Price</th>
                  <th className="py-2.5 px-2 text-right">Discount</th>
                  <th className="py-2.5 px-2 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400 italic">No items found in this bill</td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={item.id || idx} className="text-slate-800">
                      <td className="py-3 px-2 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-2 font-medium">
                        <div>{item.product_name}</div>
                      </td>
                      <td className="py-3 px-2 text-slate-500 font-mono text-[11px]">{item.sku || '-'}</td>
                      <td className="py-3 px-2 text-center font-bold text-slate-900">{item.quantity}</td>
                      <td className="py-3 px-2 text-right text-slate-600">{formatInr(item.unit_price)}</td>
                      <td className="py-3 px-2 text-right text-slate-500">
                        {parseFloat(item.discount_amount) > 0 ? (
                          <span className="text-amber-600 font-medium">
                            -{formatInr(item.discount_amount)}
                            {item.discount_percent > 0 && <span className="text-[10px] ml-0.5">({item.discount_percent}%)</span>}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-2 text-right font-bold text-slate-900">{formatInr(item.line_total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown Section */}
          <div className="mt-6 border-t-2 border-slate-200 pt-4 flex flex-col md:flex-row justify-between gap-6">
            <div className="flex-1">
              {bill.notes && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-w-md">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Notes / Remarks:</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{bill.notes}</p>
                </div>
              )}
              
              <div className="mt-4 text-[11px] text-slate-500 space-y-1">
                <p>• Goods once sold are subject to standard merchant exchange policy.</p>
                <p>• Computer-generated sales invoice generated via InventoryX AI.</p>
              </div>
            </div>

            <div className="w-full md:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800">{formatInr(bill.subtotal)}</span>
              </div>

              {parseFloat(bill.item_discount_total) > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Item Discounts:</span>
                  <span>-{formatInr(bill.item_discount_total)}</span>
                </div>
              )}

              {parseFloat(bill.bill_discount) > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Bill Discount:</span>
                  <span>-{formatInr(bill.bill_discount)}</span>
                </div>
              )}

              {parseFloat(bill.tax_amount) > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <span>Applicable Tax ({bill.tax_rate}%):</span>
                  <span className="font-semibold text-slate-800">{formatInr(bill.tax_amount)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-slate-400">
                  <span>Tax (0%):</span>
                  <span>₹0.00</span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
                <span>Grand Total:</span>
                <span className="text-base text-primary-700 font-extrabold">{formatInr(bill.grand_total)}</span>
              </div>

              <div className="flex justify-between text-slate-700 pt-1">
                <span>Amount Paid:</span>
                <span className="font-semibold text-emerald-600">{formatInr(bill.paid_amount)}</span>
              </div>

              <div className="flex justify-between text-slate-700 border-t border-slate-100 pt-1">
                <span className="font-semibold">Balance Due:</span>
                <span className={`font-bold ${parseFloat(bill.balance_due) > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                  {formatInr(bill.balance_due)}
                </span>
              </div>
            </div>
          </div>

          {/* Signature & Authentication */}
          <div className="mt-10 pt-6 border-t border-dashed border-slate-200 flex flex-col md:flex-row justify-between items-end gap-6 text-xs text-slate-500">
            <div>
              <p className="font-medium text-slate-700">Thank you for your business!</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Powered by InventoryX AI Dealer Platform</p>
            </div>

            <div className="text-right">
              <div className="w-48 border-b border-slate-400 mb-1"></div>
              <p className="font-semibold text-slate-700">Authorized Signatory</p>
              <p className="text-[10px] text-slate-400">For {dealer?.shop_name || 'Dealer'}</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default InvoiceModal;
