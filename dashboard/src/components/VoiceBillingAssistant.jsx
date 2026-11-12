import React, { useState } from 'react';
import { Mic, MicOff, Sparkles, Volume2, CheckCircle2, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { parseSpokenDigits } from '../hooks/useVoiceInput';

const VoiceBillingAssistant = ({
  products = [],
  onAddProduct,
  onSearchProduct,
  onSetCustomerName,
  onSetCustomerPhone,
  onSetPaymentMethod,
  onSetPaidOption,
  onSetNotes,
  voiceInput
}) => {
  const {
    isSupported,
    isListening,
    activeField,
    transcript,
    voiceLang,
    setVoiceLang,
    errorMessage,
    setErrorMessage,
    startListening,
    stopListening
  } = voiceInput;

  const [feedback, setFeedback] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  // Parse voice commands in English or Telugu
  const processVoiceCommand = (rawText) => {
    if (!rawText || !rawText.trim()) return;
    const text = rawText.trim();
    const lower = text.toLowerCase();

    // 1. ADD PRODUCT COMMAND
    // Matches: "add 2 milk", "add sugar", "2 parle g", "రెండు పాల ప్యాకెట్ add cheyi"
    const addRegex = /(?:add|item|చేర్చు|కలుపు)\s+(\d+)?\s*(.+)/i;
    const quantityFirstRegex = /^(\d+)\s+(.+)/i;
    let addMatch = lower.match(addRegex) || lower.match(quantityFirstRegex);

    if (addMatch) {
      const qty = parseInt(addMatch[1] || '1', 10);
      const query = (addMatch[2] || '').replace(/(?:please|chesi|cheyi|packet|packets|kg|boxes|units)/gi, '').trim().toLowerCase();

      if (query) {
        // Find in products
        const matched = products.find(p => p.name?.toLowerCase().includes(query)) ||
                        products.find(p => query.includes(p.name?.toLowerCase())) ||
                        products.find(p => p.category?.toLowerCase().includes(query));

        if (matched) {
          if (matched.stock_quantity <= 0) {
            setFeedback({
              type: 'error',
              message: `"${matched.name}" is out of stock (Available: 0).`
            });
            return;
          }
          for (let i = 0; i < qty; i++) {
            onAddProduct(matched);
          }
          setFeedback({
            type: 'success',
            message: `Added ${qty} x "${matched.name}" to bill! (₹${matched.base_price} each)`
          });
          return;
        } else {
          // If not exact match, put in search bar
          onSearchProduct(query);
          setFeedback({
            type: 'info',
            message: `Searched for "${query}". Please pick from the dropdown list.`
          });
          return;
        }
      }
    }

    // 2. CUSTOMER NAME COMMAND
    // Matches: "customer Ramesh", "name Sri Krishna Traders", "కస్టమర్ రాము"
    const custRegex = /(?:customer|client|name|buyer|పేరు|కస్టమర్)\s+(?:is\s+)?(.+)/i;
    const custMatch = lower.match(custRegex);
    if (custMatch && custMatch[1]) {
      const originalName = text.slice(text.toLowerCase().indexOf(custMatch[1])).trim();
      onSetCustomerName(originalName);
      setFeedback({
        type: 'success',
        message: `Customer name set to "${originalName}"`
      });
      return;
    }

    // 3. CUSTOMER PHONE COMMAND
    // Matches: "phone 9848022338", "mobile 9876543210", "ఫోన్ నెంబర్..."
    const phoneRegex = /(?:phone|mobile|number|cell|ఫోన్|మొబైల్)\s+(.+)/i;
    const phoneMatch = lower.match(phoneRegex);
    if (phoneMatch && phoneMatch[1]) {
      const digits = parseSpokenDigits(phoneMatch[1]);
      if (digits) {
        onSetCustomerPhone(digits);
        setFeedback({
          type: 'success',
          message: `Customer phone number set to "${digits}"`
        });
        return;
      }
    }

    // 4. PAYMENT METHOD COMMAND
    // Matches: "cash", "upi", "card", "credit"
    if (lower.includes('cash') || lower.includes('నగదు')) {
      onSetPaymentMethod('Cash');
      setFeedback({ type: 'success', message: 'Payment method set to Cash' });
      return;
    }
    if (lower.includes('upi') || lower.includes('gpay') || lower.includes('phonepe') || lower.includes('paytm')) {
      onSetPaymentMethod('UPI');
      setFeedback({ type: 'success', message: 'Payment method set to UPI' });
      return;
    }
    if (lower.includes('card') || lower.includes('debit') || lower.includes('credit card')) {
      onSetPaymentMethod('Card');
      setFeedback({ type: 'success', message: 'Payment method set to Card' });
      return;
    }
    if (lower.includes('credit') || lower.includes('due') || lower.includes('అప్పు') || lower.includes('బాకీ')) {
      onSetPaymentMethod('Credit');
      onSetPaidOption('zero');
      setFeedback({ type: 'success', message: 'Payment set to Credit / Due' });
      return;
    }

    // 5. FULL PAID COMMAND
    if (lower.includes('full paid') || lower.includes('fully paid') || lower.includes('paid full') || lower.includes('మొత్తం చెల్లించారు')) {
      onSetPaidOption('full');
      setFeedback({ type: 'success', message: 'Bill marked as Full Paid' });
      return;
    }

    // 6. NOTES / INVOICE REMARKS COMMAND
    const notesRegex = /(?:note|notes|remark|remarks|గమనిక)\s+(.+)/i;
    const notesMatch = lower.match(notesRegex);
    if (notesMatch && notesMatch[1]) {
      const noteText = text.slice(text.toLowerCase().indexOf(notesMatch[1])).trim();
      onSetNotes(noteText);
      setFeedback({ type: 'success', message: `Invoice notes updated: "${noteText}"` });
      return;
    }

    // 7. DEFAULT FALLBACK: Search product
    onSearchProduct(text);
    setFeedback({
      type: 'info',
      message: `Searching products matching "${text}"...`
    });
  };

  const handleToggleVoiceAssistant = () => {
    if (isListening && activeField === 'assistant') {
      stopListening();
    } else {
      setFeedback(null);
      startListening('assistant', (finalText) => {
        processVoiceCommand(finalText);
      });
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-amber-600 shrink-0" />
          <span>Speech Recognition is supported in Chrome, Edge, and Android Chrome. Use keyboard typing or open in a supported browser.</span>
        </div>
      </div>
    );
  }

  const isCurrentActive = isListening && activeField === 'assistant';

  return (
    <div className={`p-4 rounded-2xl border transition-all shadow-xs ${
      isCurrentActive 
        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-primary-300 ring-2 ring-primary-400/40' 
        : 'bg-white border-slate-200'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleVoiceAssistant}
            className={`relative p-3 rounded-2xl transition-all shadow-md flex items-center justify-center shrink-0 ${
              isCurrentActive
                ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
                : 'bg-primary-600 hover:bg-primary-700 text-white hover:scale-105 active:scale-95'
            }`}
            title={isCurrentActive ? "Click to stop listening" : "Click to speak billing command"}
          >
            {isCurrentActive ? <MicOff size={22} /> : <Mic size={22} />}
            {isCurrentActive && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
            )}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles size={14} className="text-primary-600" />
                AI Voice Billing Assistant
              </span>
              <span className="text-[10px] font-semibold bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
                {voiceLang === 'te-IN' ? 'తెలుగు (Telugu)' : 'English (India)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isCurrentActive 
                ? (voiceLang === 'te-IN' ? 'వింటున్నాము... ఇప్పుడు మాట్లాడండి (Listening... speak now)' : 'Listening... Speak any item, customer name or command')
                : 'Tap mic & speak: "Add 2 Milk", "Customer Ramesh", "Phone 9876543210" or "UPI payment"'}
            </p>
          </div>
        </div>

        {/* Language selector & Help toggle */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <div className="bg-slate-100 p-0.5 rounded-lg flex items-center text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setVoiceLang('en-IN')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                voiceLang === 'en-IN' ? 'bg-white text-primary-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setVoiceLang('te-IN')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                voiceLang === 'te-IN' ? 'bg-white text-primary-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              తెలుగు
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg text-xs font-medium hover:bg-slate-100 flex items-center gap-1"
          >
            <Info size={14} />
            <span className="hidden md:inline">{showHelp ? 'Hide' : 'Voice Tips'}</span>
          </button>
        </div>
      </div>

      {/* Live Transcript Display */}
      {isCurrentActive && (
        <div className="mt-3 pt-3 border-t border-primary-200/60 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-3 bg-primary-600 rounded-full animate-bounce"></span>
            <span className="w-1.5 h-4 bg-primary-600 rounded-full animate-bounce delay-75"></span>
            <span className="w-1.5 h-2 bg-primary-600 rounded-full animate-bounce delay-150"></span>
          </div>
          <p className="text-xs font-medium text-primary-900 italic">
            "{transcript || (voiceLang === 'te-IN' ? 'మాట్లాడండి...' : 'Speak now...')}"
          </p>
        </div>
      )}

      {/* Feedback Toast */}
      {feedback && (
        <div className={`mt-3 p-2.5 rounded-xl text-xs flex items-center justify-between border transition-all ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : feedback.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 size={15} className="text-emerald-600 shrink-0" /> : <AlertCircle size={15} className="shrink-0" />}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 ml-2">
            ×
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-800 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Voice Commands Cheat Sheet */}
      {showHelp && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-600">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <p className="font-bold text-slate-800 mb-1 flex items-center gap-1">
              <Volume2 size={13} className="text-primary-600" /> English Voice Commands:
            </p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong className="text-slate-800">"Add 2 Milk"</strong> / "Add Tata Salt" - Adds item to bill</li>
              <li><strong className="text-slate-800">"Customer Rajesh Stores"</strong> - Enters customer name</li>
              <li><strong className="text-slate-800">"Phone 9848022338"</strong> - Enters mobile number</li>
              <li><strong className="text-slate-800">"Cash"</strong> or <strong className="text-slate-800">"UPI"</strong> - Sets payment method</li>
              <li><strong className="text-slate-800">"Full Paid"</strong> - Marks bill full paid</li>
            </ul>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <p className="font-bold text-slate-800 mb-1 flex items-center gap-1">
              <Volume2 size={13} className="text-primary-600" /> తెలుగు వాయిస్ ఆదేశాలు:
            </p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong className="text-slate-800">"రెండు మిల్క్ add చేయి"</strong> - బిల్లులో ఐటమ్ జతచేస్తుంది</li>
              <li><strong className="text-slate-800">"కస్టమర్ రాము కిరాణా"</strong> - కస్టమర్ పేరు సెట్ అవుతుంది</li>
              <li><strong className="text-slate-800">"ఫోన్ 98480..."</strong> - ఫోన్ నంబర్ టైప్ అవుతుంది</li>
              <li><strong className="text-slate-800">"నగదు"</strong> లేదా <strong className="text-slate-800">"UPI"</strong> - చెల్లింపు పద్ధతి ఎంచుకుంటుంది</li>
              <li><strong className="text-slate-800">"మొత్తం చెల్లించారు"</strong> - ఫుల్ పెయిడ్ చేస్తుంది</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceBillingAssistant;
