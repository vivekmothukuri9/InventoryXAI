import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductTour } from '../context/ProductTourContext';
import { 
  X, 
  ArrowLeft, 
  ArrowRight, 
  BrainCircuit, 
  ExternalLink,
  Sparkles
} from 'lucide-react';

const ProductTour = () => {
  const navigate = useNavigate();
  const {
    isTourOpen,
    currentStepIndex,
    totalSteps,
    currentStep,
    targetRect,
    isFirstTimePromptOpen,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    finishTour,
    dismissFirstTimePrompt
  } = useProductTour();

  const [tooltipPos, setTooltipPos] = useState({ top: 120, left: 275 });

  // Calculate position right next to the active sidebar item
  useEffect(() => {
    if (!isTourOpen || !targetRect) return;

    const vh = window.innerHeight;
    const tooltipHeight = 220;
    const padding = 16;

    // Place tooltip to the right of the sidebar
    const left = Math.max(16, targetRect.right + 14);

    // Center or align vertically with the sidebar item
    let top = targetRect.top - 12;
    // Clamp inside viewport
    top = Math.max(padding, Math.min(vh - tooltipHeight - padding, top));

    setTooltipPos({ top, left });
  }, [isTourOpen, targetRect]);

  // 1. FIRST-TIME ONBOARDING WELCOME DIALOG
  if (isFirstTimePromptOpen) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-fade-in">
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
          <div className="bg-gradient-to-r from-violet-600 to-purple-700 p-6 text-white text-center relative">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3 shadow-inner">
              <BrainCircuit className="text-white animate-pulse" size={30} />
            </div>
            <span className="inline-block px-3 py-0.5 bg-white/20 text-white rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
              Sidebar Walkthrough
            </span>
            <h2 className="text-2xl font-bold">Welcome to InventoryX AI</h2>
            <p className="text-violet-100 text-xs mt-1">
              Let's take a quick 1-minute walkthrough of the side navigation bar.
            </p>
            <button
              onClick={dismissFirstTimePrompt}
              className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6">
            <p className="text-slate-600 text-sm leading-relaxed mb-6 text-center">
              Learn what each module in your sidebar does: Dashboard, Inventory, Products, Billing, Orders, and AI Insights.
            </p>

            <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <button
                onClick={dismissFirstTimePrompt}
                className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Skip for Now
              </button>
              <button
                onClick={() => startTour(0)}
                className="btn bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-violet-500/25 flex items-center gap-2 font-bold text-sm"
              >
                Start Tour <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isTourOpen) return null;

  const StepIcon = currentStep?.icon || Sparkles;

  return (
    <div className="fixed inset-0 z-[9990] pointer-events-auto">
      {/* Soft dim backdrop (main page remains visible in the background) */}
      <div
        onClick={skipTour}
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px] transition-opacity duration-300"
      />

      {/* Spotlight Glowing Ring Directly On Active Sidebar Link */}
      {targetRect && (
        <div
          className="fixed pointer-events-none rounded-xl border-2 border-violet-400 ring-4 ring-violet-500/40 shadow-[0_0_25px_rgba(139,92,246,0.7)] bg-violet-500/10 transition-all duration-300 z-[9995] animate-pulse"
          style={{
            top: targetRect.top - 2,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 4
          }}
        />
      )}

      {/* Purple Speech-Bubble Tooltip Card (Positioned Directly Beside the Sidebar Item) */}
      <div
        className="fixed z-[9999] w-[calc(100vw-2rem)] sm:w-[330px] bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white rounded-2xl p-5 shadow-2xl transition-all duration-300 flex flex-col justify-between"
        style={
          window.innerWidth >= 768 && targetRect
            ? {
                top: `${tooltipPos.top}px`,
                left: `${tooltipPos.left}px`
              }
            : {
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)'
              }
        }
      >
        {/* Left Speech Bubble Arrow Pointer (Points directly into the sidebar item) */}
        <div 
          className="hidden md:block absolute -left-2.5 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[10px] border-r-violet-600 drop-shadow-xs"
          style={{
            top: targetRect 
              ? `${Math.max(16, Math.min(180, targetRect.top - tooltipPos.top + (targetRect.height / 2) - 8))}px`
              : '24px'
          }}
        />

        {/* Tooltip Content */}
        <div>
          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-violet-200 bg-white/15 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span>Step {currentStepIndex + 1} of {totalSteps}</span>
              {currentStep.badge && <span>• {currentStep.badge}</span>}
            </span>
            <button
              onClick={skipTour}
              className="text-white/70 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
              title="Close tour"
            >
              <X size={16} />
            </button>
          </div>

          {/* Title & Icon */}
          <div className="flex items-center gap-2 mb-2 mt-1">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <StepIcon size={18} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {currentStep.name}
            </h3>
          </div>

          {/* Description */}
          <p className="text-violet-100 text-xs leading-relaxed mb-3">
            {currentStep.description}
          </p>

          {/* View Page Link */}
          <button
            onClick={() => {
              navigate(currentStep.route);
            }}
            className="inline-flex items-center gap-1.5 text-xs text-white/90 hover:text-white underline underline-offset-2 mb-3 font-semibold transition-colors"
          >
            <span>Open {currentStep.name} page</span>
            <ExternalLink size={12} />
          </button>
        </div>

        {/* Bottom Actions Row (Back Arrow + White NEXT Button matching screenshot) */}
        <div className="flex items-center justify-between pt-3 border-t border-white/20">
          <button
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className="text-white/80 hover:text-white disabled:opacity-30 disabled:pointer-events-none p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Previous item"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={skipTour}
              className="text-xs font-semibold text-violet-200 hover:text-white px-2 py-1"
            >
              Skip
            </button>
            <button
              onClick={nextStep}
              className="bg-white text-violet-700 hover:bg-slate-100 font-bold px-5 py-2 rounded-xl text-sm shadow-md transition-transform active:scale-95 flex items-center gap-1.5"
            >
              <span>{currentStepIndex === totalSteps - 1 ? 'FINISH' : 'NEXT'}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductTour;
