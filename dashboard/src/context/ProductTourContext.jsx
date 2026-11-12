import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { 
  LayoutDashboard, 
  Network,
  Package, 
  Tag, 
  TrendingUp, 
  Receipt,
  ShoppingCart, 
  BrainCircuit, 
  Truck,
  BarChart2, 
  Settings,
  Sparkles
} from 'lucide-react';

const ProductTourContext = createContext(null);

export const TOUR_STEPS = [
  {
    id: 'nav-dashboard',
    name: 'Dashboard',
    selector: '[data-tour="nav-dashboard"]',
    route: '/',
    badge: 'Main Overview',
    description: "Your main command center. View today's sales, active orders, live stock health, and AI profit estimations at a glance.",
    icon: LayoutDashboard
  },
  {
    id: 'nav-city-network',
    name: 'City Network',
    selector: '[data-tour="nav-city-network"]',
    route: '/city-network',
    badge: 'Network Map',
    description: 'Interactive map of dealers and shops across the city. Locate nearby stores, check distance, and manage distribution.',
    icon: Network
  },
  {
    id: 'nav-inventory',
    name: 'Inventory',
    selector: '[data-tour="nav-inventory"]',
    route: '/inventory',
    badge: 'Stock Tracking',
    description: 'Track live stock quantities across all products. Perform quick stock adjustments (+ / -), and get low-stock alerts.',
    icon: Package
  },
  {
    id: 'nav-products',
    name: 'Products',
    selector: '[data-tour="nav-products"]',
    route: '/products',
    badge: 'Product Catalog',
    description: 'Manage your catalog. Add new items, organize categories, set base prices, cost prices, and track SKUs easily.',
    icon: Tag
  },
  {
    id: 'nav-sales',
    name: 'Sales',
    selector: '[data-tour="nav-sales"]',
    route: '/sales',
    badge: 'Revenue & Records',
    description: 'Record retail sales directly, track daily and monthly revenue charts, and analyze your best-performing products.',
    icon: TrendingUp
  },
  {
    id: 'nav-billing',
    name: 'Billing',
    selector: '[data-tour="nav-billing"]',
    route: '/billing',
    badge: 'POS & Invoices',
    description: 'Generate GST-compliant invoices, collect UPI payments via dynamic QR code, and use AI Voice Billing for fast checkout.',
    icon: Receipt
  },
  {
    id: 'nav-orders',
    name: 'Orders',
    selector: '[data-tour="nav-orders"]',
    route: '/orders',
    badge: 'Live Pipeline',
    description: 'Incoming customer orders with real-time sound chimes. Update fulfillment status from Confirmed to Delivered with one click.',
    icon: ShoppingCart
  },
  {
    id: 'nav-ai-insights',
    name: 'AI Insights',
    selector: '[data-tour="nav-ai-insights"]',
    route: '/ai-insights',
    badge: 'Smart Forecasts',
    description: 'AI analyzes sales trends, predicts stockout risks, estimates days of inventory remaining, and gives smart restock advice.',
    icon: BrainCircuit
  },
  {
    id: 'nav-suppliers',
    name: 'Suppliers',
    selector: '[data-tour="nav-suppliers"]',
    route: '/suppliers',
    badge: 'Vendor Management',
    description: 'Manage vendor contacts, supplier categories, and record purchase shipments to restock your store inventory.',
    icon: Truck
  },
  {
    id: 'nav-reports',
    name: 'Reports',
    selector: '[data-tour="nav-reports"]',
    route: '/reports',
    badge: 'Analytics & Export',
    description: 'Comprehensive business reports. Review profit margins, category sales breakdowns, and export data to CSV/Excel.',
    icon: BarChart2
  },
  {
    id: 'nav-settings',
    name: 'Settings',
    selector: '[data-tour="nav-settings"]',
    route: '/settings',
    badge: 'Store Profile',
    description: 'Update your shop details, contact phone, business address, and replay this product tour whenever needed.',
    icon: Settings
  }
];

export const ProductTourProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userId, setUserId] = useState(null);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [isFirstTimePromptOpen, setIsFirstTimePromptOpen] = useState(false);

  // Scoped localStorage keys
  const getCompletedKey = (uid) => `inventoryx_tour_completed_${uid || 'guest'}`;
  const getDismissedKey = (uid) => `inventoryx_tour_dismissed_${uid || 'guest'}`;

  // Fetch current user ID and trigger tour ONCE after account creation
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id;
      if (!uid) return;
      setUserId(uid);

      const completed = localStorage.getItem(getCompletedKey(uid));
      const dismissed = localStorage.getItem(getDismissedKey(uid));
      const justRegistered = localStorage.getItem('inventoryx_just_registered') === 'true';

      // Runs automatically ONLY once after account creation
      if (justRegistered || (!completed && !dismissed)) {
        // Clear registration flag so it doesn't trigger again
        localStorage.removeItem('inventoryx_just_registered');

        const timer = setTimeout(() => {
          setIsFirstTimePromptOpen(false);
          startTour(0);
        }, 1000);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  // Filter available steps based on actual DOM presence (e.g. City Network is dealer-only)
  const availableSteps = TOUR_STEPS.filter(step => {
    if (step.id === 'nav-city-network') {
      const isDealer = localStorage.getItem('user_role') === 'dealer';
      return isDealer;
    }
    return true;
  });

  const currentStep = availableSteps[currentStepIndex] || availableSteps[0];

  // Helper: locate target sidebar element and calculate bounding rect
  const updateTargetRect = useCallback(() => {
    if (!isTourOpen || !currentStep) {
      setTargetRect(null);
      return;
    }

    const selector = currentStep.selector;
    const el = selector ? document.querySelector(selector) : null;

    if (el) {
      // Ensure the sidebar item is visible in the sidebar scroll area
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right
      });
    } else {
      setTargetRect(null);
    }
  }, [isTourOpen, currentStep]);

  useEffect(() => {
    if (!isTourOpen) return;
    updateTargetRect();
    const timer = setTimeout(updateTargetRect, 80);
    return () => clearTimeout(timer);
  }, [isTourOpen, currentStepIndex, updateTargetRect]);

  // Handle window resize and scroll
  useEffect(() => {
    if (!isTourOpen) return;

    const handleUpdate = () => {
      updateTargetRect();
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isTourOpen, updateTargetRect]);

  // Keyboard navigation
  useEffect(() => {
    if (!isTourOpen && !isFirstTimePromptOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isFirstTimePromptOpen) {
          dismissFirstTimePrompt();
        } else {
          skipTour();
        }
      } else if (isTourOpen && (e.key === 'ArrowRight' || e.key === 'Enter')) {
        nextStep();
      } else if (isTourOpen && e.key === 'ArrowLeft') {
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTourOpen, isFirstTimePromptOpen, currentStepIndex]);

  // Actions
  const startTour = (startIndex = 0) => {
    setIsFirstTimePromptOpen(false);
    setCurrentStepIndex(startIndex);
    setIsTourOpen(true);
  };

  const nextStep = () => {
    if (currentStepIndex < availableSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      finishTour();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const skipTour = () => {
    setIsTourOpen(false);
    if (userId) {
      localStorage.setItem(getDismissedKey(userId), 'true');
    }
  };

  const finishTour = () => {
    setIsTourOpen(false);
    if (userId) {
      localStorage.setItem(getCompletedKey(userId), 'true');
    }
  };

  const dismissFirstTimePrompt = () => {
    setIsFirstTimePromptOpen(false);
    if (userId) {
      localStorage.setItem(getDismissedKey(userId), 'true');
    }
  };

  return (
    <ProductTourContext.Provider
      value={{
        isTourOpen,
        currentStepIndex,
        totalSteps: availableSteps.length,
        currentStep,
        targetRect,
        isFirstTimePromptOpen,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        finishTour,
        dismissFirstTimePrompt
      }}
    >
      {children}
    </ProductTourContext.Provider>
  );
};

export const useProductTour = () => {
  const context = useContext(ProductTourContext);
  if (!context) {
    throw new Error('useProductTour must be used within a ProductTourProvider');
  }
  return context;
};
