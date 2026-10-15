export const calculateAIInsights = (products) => {
  return products.map(product => {
    // 1. Average Daily Sales
    const averageDailySales = product.dailySales;
    
    // 2. Estimated Days Until Stockout
    const estimatedDaysUntilStockout = averageDailySales > 0 
      ? Math.floor(product.currentStock / averageDailySales)
      : 999;
      
    // 3. Stock Risk Level
    let riskLevel = "SAFE";
    if (estimatedDaysUntilStockout <= 3) riskLevel = "CRITICAL";
    else if (estimatedDaysUntilStockout <= 7) riskLevel = "HIGH RISK";
    else if (estimatedDaysUntilStockout <= 14) riskLevel = "MEDIUM RISK";
    
    // 4. Predicted Demand (next 7 days)
    const predictedDemand = Math.ceil(averageDailySales * 7);
    
    // 5. Safety Stock (usually 2-3 days of average sales)
    const safetyStock = Math.ceil(averageDailySales * 3);
    
    // 6. Recommended Purchase Quantity
    let recommendedPurchase = 0;
    if (riskLevel !== "SAFE" || product.currentStock < (predictedDemand + safetyStock)) {
      recommendedPurchase = Math.max(0, predictedDemand + safetyStock - product.currentStock);
      // Round up to nearest 10 for wholesale realism
      recommendedPurchase = Math.ceil(recommendedPurchase / 10) * 10;
    }
    
    // 7. Smart Price Suggestion
    let suggestedPrice = product.price;
    let priceReason = "Optimal";
    
    if (riskLevel === "CRITICAL" && product.salesTrend === "up") {
      // High demand, low supply -> Suggest small price increase (+5%)
      suggestedPrice = Math.ceil(product.price * 1.05);
      priceReason = "High demand & low stock. Suggest slight price increase.";
    } else if (product.salesTrend === "down" && product.currentStock > 30) {
      // Low demand, high supply -> Suggest price decrease (-5%) to clear stock
      suggestedPrice = Math.floor(product.price * 0.95);
      priceReason = "Slow moving inventory. Suggest discount to clear stock.";
    }

    // 8. Fake Demand Detection
    // In a real scenario, this would analyze order history for sudden massive spikes from single users.
    // Here we use a heuristic: if daily sales suddenly spike > 300% of safety stock, flag it.
    const isFakeDemandRisk = averageDailySales > (product.safetyStock || 10) * 3;

    // 9. AI Recommendation Text
    let recommendation = "";
    if (isFakeDemandRisk) {
      recommendation = "⚠️ ALERT: Unusual demand spike detected! Verify recent bulk orders for potential hoarding/fraud.";
      riskLevel = "ANOMALY";
    } else if (riskLevel === "CRITICAL") {
      recommendation = `You may run out of stock in ${estimatedDaysUntilStockout} days. Consider purchasing ${recommendedPurchase} units immediately.`;
    } else if (riskLevel === "HIGH RISK") {
      recommendation = `Stock levels are dropping. Recommend purchasing ${recommendedPurchase} units soon.`;
    } else if (product.salesTrend === "down" && product.currentStock > 30) {
      recommendation = "Consider reducing future purchases for this product due to slow sales.";
    } else if (product.searches > 150 && product.currentStock < 20) {
      recommendation = "Customer demand is high compared with current availability. Consider increasing inventory.";
    } else {
      recommendation = "Stock levels are optimal.";
    }
    
    return {
      ...product,
      estimatedDaysUntilStockout,
      riskLevel,
      predictedDemand,
      safetyStock,
      recommendedPurchase,
      recommendation,
      suggestedPrice,
      priceReason,
      isFakeDemandRisk
    };
  });
};

export const getFastMovingProducts = (productsWithAI) => {
  return productsWithAI
    .filter(p => p.salesTrend === "up" && p.dailySales >= 2)
    .sort((a, b) => b.dailySales - a.dailySales);
};

export const getSlowMovingProducts = (productsWithAI) => {
  return productsWithAI
    .filter(p => p.salesTrend === "down" && p.dailySales < 1)
    .sort((a, b) => a.dailySales - b.dailySales);
};

export const getMostSearchedProducts = (productsWithAI) => {
  return [...productsWithAI].sort((a, b) => b.searches - a.searches).slice(0, 5);
};

export const getStockRisks = (productsWithAI) => {
  return productsWithAI
    .filter(p => p.riskLevel !== "SAFE")
    .sort((a, b) => a.estimatedDaysUntilStockout - b.estimatedDaysUntilStockout);
};
