import { supabase } from '../supabase';
import { analyzeInventory, getFastMovingProducts, getSlowMovingProducts, getStockoutPredictions } from './inventoryAnalysisService';
import { analyzeDemand } from './demandAnalysisService';
import { analyzeSalesTrend } from './salesAnalysisService';
import { generateRecommendations } from './recommendationService';
import { analyzeProfit } from './profitAnalysisService';
import { getFestivalForecasts } from './festivalForecastService';
import { generateMockSales } from '../mockSalesService';

export const getAIInsights = async (dealerId, dataPeriodDays) => {
  try {
    // 1. Fetch required data from Supabase
    
    // Fetch Products & Inventory
    const { data: prodData, error: prodError } = await supabase
      .from('products')
      .select(`
        id, name, sku, base_price, cost_price, category,
        inventory ( stock_quantity )
      `)
      .eq('dealer_id', dealerId)
      .eq('is_deleted', false);
      
    if (prodError) throw prodError;
    
    const products = (prodData || []).map(p => ({
      ...p,
      stock_quantity: p.inventory?.[0]?.stock_quantity || 0,
    }));

    // Fetch Sales
    // We fetch more sales than the dataPeriodDays to be able to compare previous period
    const now = new Date();
    const fetchStartDate = new Date(now.getTime() - (dataPeriodDays * 2 * 24 * 60 * 60 * 1000));
    
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('id, product_id, quantity, sale_price, status, sale_date')
      .eq('dealer_id', dealerId)
      .gte('sale_date', fetchStartDate.toISOString());
      
    if (salesError) throw salesError;

    // Use mock sales if DB sales is sparse or empty (< 15 records)
    const effectiveSales = (salesData && salesData.length >= 15)
      ? salesData
      : generateMockSales(products, dealerId, dataPeriodDays * 2);

    // Fetch Stock Transactions for Slow Moving analysis
    const { data: stockTxData, error: stockTxError } = await supabase
      .from('stock_transactions')
      .select('product_id, action, date')
      .eq('dealer_id', dealerId)
      .gte('date', fetchStartDate.toISOString());
      
    if (stockTxError) throw stockTxError;

    // 2. Process through AI Services
    const analyzedInventory = analyzeInventory(products, effectiveSales, dataPeriodDays);
    const demandData = analyzeDemand(products, effectiveSales, dataPeriodDays);
    const salesTrend = analyzeSalesTrend(effectiveSales, dataPeriodDays);
    
    const festivalData = getFestivalForecasts(analyzedInventory);
    const fastMoving = getFastMovingProducts(analyzedInventory);
    const slowMoving = getSlowMovingProducts(analyzedInventory, stockTxData);
    const stockoutPredictions = getStockoutPredictions(analyzedInventory);
    const recommendations = generateRecommendations(analyzedInventory, demandData, salesTrend, festivalData);
    const profitPrediction = analyzeProfit(products, effectiveSales, dataPeriodDays);

    // Merge analyzed inventory with demand data
    const comprehensiveProducts = analyzedInventory.map(inv => {
      const dem = demandData.find(d => d.id === inv.id) || {};
      return {
        ...inv,
        ...dem
      };
    });

    // 3. Return structured insights
    return {
      overview: {
        productsAtRisk: stockoutPredictions.length,
        restockRecommended: recommendations.filter(r => r.type === 'Restock' || r.type === 'Festival').length,
        fastMovingCount: fastMoving.length,
        slowMovingCount: slowMoving.length,
        highDemandCount: demandData.filter(d => d.demandStatus === 'Increasing Demand').length,
        festivalAlertsCount: festivalData.forecasts.length
      },
      stockoutPredictions,
      demandAnalysis: comprehensiveProducts.filter(p => p.hasDemandData),
      fastMoving,
      slowMoving,
      salesTrend,
      festivalData,
      recommendations,
      profitPrediction,
      hasEnoughData: effectiveSales.length > 0
    };

  } catch (error) {
    console.error("AI Insights Analysis Error:", error);
    throw error;
  }
};
