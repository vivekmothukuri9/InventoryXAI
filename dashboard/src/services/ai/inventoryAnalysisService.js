export const analyzeInventory = (products, sales, dataPeriodDays) => {
  // Analyze current stock, calculate average daily sales, estimate days remaining
  // and identify stockout risks.
  
  const now = new Date();
  const periodStart = new Date(now.getTime() - (dataPeriodDays * 24 * 60 * 60 * 1000));
  
  return products.map(product => {
    // 1. Calculate Average Daily Sales for this product within the period
    const productSales = sales.filter(s => 
      s.product_id === product.id && 
      s.status !== 'cancelled' &&
      new Date(s.sale_date) >= periodStart
    );
    
    const totalQuantitySold = productSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const averageDailySales = dataPeriodDays > 0 ? (totalQuantitySold / dataPeriodDays) : 0;
    
    // 2. Current Stock
    const currentStock = product.stock_quantity || 0;
    
    // 3. Estimated Days Remaining
    let estimatedDaysRemaining = null;
    let riskLevel = "SAFE";
    
    if (averageDailySales > 0) {
      estimatedDaysRemaining = Math.floor(currentStock / averageDailySales);
      
      if (estimatedDaysRemaining <= 3) {
        riskLevel = "CRITICAL";
      } else if (estimatedDaysRemaining <= 7) {
        riskLevel = "HIGH";
      } else if (estimatedDaysRemaining <= 14) {
        riskLevel = "MEDIUM";
      }
    } else if (currentStock === 0) {
      estimatedDaysRemaining = 0;
      riskLevel = "CRITICAL";
    }

    return {
      ...product,
      totalQuantitySold,
      averageDailySales,
      currentStock,
      estimatedDaysRemaining,
      riskLevel,
      hasSufficientData: averageDailySales > 0
    };
  });
};

export const getFastMovingProducts = (analyzedProducts) => {
  return analyzedProducts
    .filter(p => p.hasSufficientData && p.averageDailySales > 1) // Heuristic: >1 per day is fast
    .sort((a, b) => b.averageDailySales - a.averageDailySales);
};

export const getSlowMovingProducts = (analyzedProducts, stockTransactions) => {
  return analyzedProducts
    .filter(p => {
      // Very low sales activity
      if (p.hasSufficientData && p.averageDailySales < 0.2 && p.currentStock > 0) return true;
      if (!p.hasSufficientData && p.currentStock > 0) {
        // No sales in period, check if it was stocked recently. If it's old stock, it's slow moving.
        const recentRestock = stockTransactions.find(tx => 
          tx.product_id === p.id && 
          tx.action === 'Restock' && 
          new Date(tx.date) >= new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)) // Last 30 days
        );
        return !recentRestock;
      }
      return false;
    })
    .sort((a, b) => a.averageDailySales - b.averageDailySales);
};

export const getStockoutPredictions = (analyzedProducts) => {
  return analyzedProducts
    .filter(p => p.hasSufficientData && p.riskLevel !== "SAFE")
    .sort((a, b) => a.estimatedDaysRemaining - b.estimatedDaysRemaining);
};
