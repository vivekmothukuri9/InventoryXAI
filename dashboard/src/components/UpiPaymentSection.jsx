import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, Copy, Check, ExternalLink, Maximize2, X, Smartphone, Edit2 } from 'lucide-react';

const UpiPaymentSection = ({
  amount,
  billNumber,
  dealer,
  onPaymentConfirmed
}) => {
  const defaultUpi = dealer?.phone ? `${dealer.phone}@ibl` : 'merchant@upi';
  const [upiId, setUpiId] = useState(() => localStorage.getItem('dealer_upi_id') || defaultUpi);
  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [tempUpi, setTempUpi] = useState(upiId);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaidConfirmed, setIsPaidConfirmed] = useState(false);

  const shopName = dealer?.shop_name || dealer?.full_name || 'Retail Outlet';

  // Generate UPI payment URI
  // Standard format: upi://pay?pa=UPI_ID&pn=MERCHANT_NAME&am=AMOUNT&cu=INR&tn=BILL_NUMBER
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${parseFloat(amount || 0).toFixed(2)}&cu=INR&tn=Bill_${encodeURIComponent(billNumber)}`;

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(upiUri, {
      width: 260,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then(url => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch(err => {
        console.error("Failed to generate UPI QR:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [upiUri]);

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveUpiId = () => {
    if (tempUpi.trim()) {
      setUpiId(tempUpi.trim());
      localStorage.setItem('dealer_upi_id', tempUpi.trim());
      setIsEditingUpi(false);
    }
  };

  const handleConfirmReceived = () => {
    setIsPaidConfirmed(true);
    if (onPaymentConfirmed) onPaymentConfirmed();
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/60 border-2 border-primary-300 rounded-2xl p-4 shadow-sm animate-fade-in transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-indigo-100 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary-600 text-white rounded-lg shadow-xs">
            <QrCode size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Scan & Pay via UPI</h4>
            <p className="text-[10px] text-slate-500">Google Pay, PhonePe, Paytm, BHIM</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-xs text-primary-700 hover:text-primary-900 font-semibold p-1.5 hover:bg-white rounded-lg border border-primary-200 transition-colors flex items-center gap-1 shadow-2xs"
          title="Open Large QR Code for Customer"
        >
          <Maximize2 size={13} />
          <span className="text-[11px]">Enlarge</span>
        </button>
      </div>

      {/* QR Display Card */}
      <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
        {qrDataUrl ? (
          <div className="relative group cursor-pointer" onClick={() => setIsModalOpen(true)}>
            <img
              src={qrDataUrl}
              alt="UPI QR Code"
              className="w-44 h-44 rounded-lg object-contain transition-transform group-hover:scale-102"
            />
            <div className="absolute inset-0 bg-primary-950/10 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
              <span className="bg-white/95 text-slate-900 text-[10px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                <Maximize2 size={11} /> Click to Enlarge
              </span>
            </div>
          </div>
        ) : (
          <div className="w-44 h-44 flex items-center justify-center bg-slate-50 rounded-lg animate-pulse">
            <QrCode className="text-slate-300" size={32} />
          </div>
        )}

        {/* Amount Badge */}
        <div className="mt-2 text-center">
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Amount to Pay</span>
          <p className="text-lg font-extrabold text-primary-700 font-mono">
            ₹{parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* UPI ID Details & Edit */}
      <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
          <span>Merchant UPI ID:</span>
          {!isEditingUpi ? (
            <button
              type="button"
              onClick={() => {
                setTempUpi(upiId);
                setIsEditingUpi(true);
              }}
              className="text-primary-600 hover:text-primary-800 font-semibold flex items-center gap-1 hover:underline"
            >
              <Edit2 size={10} /> Change
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingUpi(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          )}
        </div>

        {isEditingUpi ? (
          <div className="flex items-center gap-1.5 mt-1">
            <input
              type="text"
              value={tempUpi}
              onChange={(e) => setTempUpi(e.target.value)}
              placeholder="e.g. 9848022338@upi"
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <button
              type="button"
              onClick={handleSaveUpiId}
              className="bg-primary-600 text-white text-[11px] font-bold px-2 py-1 rounded-lg hover:bg-primary-700 shrink-0"
            >
              Save
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-slate-800 truncate" title={upiId}>
              {upiId}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(upiId)}
              className="p-1 text-slate-500 hover:text-primary-700 hover:bg-white rounded transition-colors shrink-0 ml-1"
              title="Copy UPI ID"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Action */}
      <div className="mt-3">
        <button
          type="button"
          onClick={handleConfirmReceived}
          className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs ${
            isPaidConfirmed
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
          }`}
        >
          <Check size={14} />
          <span>{isPaidConfirmed ? 'Payment Received Confirmed!' : 'Mark UPI Payment Received'}</span>
        </button>
      </div>

      {/* Full-Screen Customer Facing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center relative animate-scale-up">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>

            <div className="p-3 bg-primary-50 rounded-2xl text-primary-600 mb-2">
              <QrCode size={32} />
            </div>

            <h3 className="text-lg font-bold text-slate-900">{shopName}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Scan with Google Pay, PhonePe, Paytm, or BHIM</p>

            <div className="my-5 p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-inner">
              <img
                src={qrDataUrl}
                alt="UPI QR Code"
                className="w-56 h-56 rounded-xl object-contain"
              />
            </div>

            <div className="bg-slate-50 w-full py-2.5 px-4 rounded-xl border border-slate-200 mb-4">
              <span className="text-[11px] text-slate-500 block">Total Amount to Pay</span>
              <span className="text-2xl font-black text-primary-700 font-mono">
                ₹{parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="w-full flex items-center justify-between text-xs text-slate-600 mb-4 font-mono px-2">
              <span>UPI: {upiId}</span>
              <button
                type="button"
                onClick={() => handleCopy(upiId)}
                className="text-primary-600 hover:underline flex items-center gap-1 font-sans font-semibold text-[11px]"
              >
                {copied ? 'Copied!' : 'Copy ID'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                handleConfirmReceived();
                setIsModalOpen(false);
              }}
              className="w-full btn-primary py-2.5 rounded-xl font-bold text-xs shadow-md"
            >
              Payment Done / Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpiPaymentSection;
