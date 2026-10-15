export const generateRecommendations = (analyzedProducts, demandData, salesTrendData, festivalData = { forecasts: [] }) => {
  const recommendations = [];

  // Add Festival Forecast Alerts (High Priority Event Recommendations)
  festivalData.forecasts.forEach(forecast => {
    recommendations.push({
      id: forecast.id,
      type: 'Festival',
      priority: 'HIGH',
      title: `${forecast.festival} Demand Surge for ${forecast.product.name}`,
      product: forecast.product,
      festival: forecast.festival,
      daysUntil: forecast.daysUntil,
      demandIncreasePercent: forecast.demandIncreasePercent,
      recommendedRestockQuantity: forecast.additionalStockNeeded,
      reason: `${forecast.festival} is coming in ${forecast.daysUntil} days. Expected demand increase of ${forecast.demandIncreasePercent}% for ${forecast.product.category}.`,
      action: `Stock up an additional ${forecast.additionalStockNeeded} units to meet the festival demand.`
    });
  });

  // Combine data to generate recommendations
  analyzedProducts.forEach(product => {
    const demandInfo = demandData.find(d => d.id === product.id) || {};
    
    // Safety Stock calculation: 3 days of average sales
    const safetyStock = Math.ceil(product.averageDailySales * 3);
    
    // Predicted Demand calculation for the next 14 days
    const predictedDemand = Math.ceil(product.averageDailySales * 14);

    let recommendedRestockQuantity = 0;
    
    // If stock is below required levels, generate restock quantity
    if (product.currentStock < (predictedDemand + safetyStock)) {
      recommendedRestockQuantity = Math.max(0, predictedDemand + safetyStock - product.currentStock);
      // Round up to nearest 5 or 10 for wholesale realism
      recommendedRestockQuantity = Math.ceil(recommendedRestockQuantity / 5) * 5;
    }

    // 1. Restock Recommendation
    if (recommendedRestockQuantity > 0 && product.hasSufficientData) {
      // Avoid duplicate restock recommendation if there's already a festival one for this product
      const hasFestivalAlert = festivalData.forecasts.some(f => f.product.id === product.id);
      if (!hasFestivalAlert) {
        recommendations.push({
          id: `restock-${product.id}`,
          type: 'Restock',
          priority: product.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          title: `Restock Recommended for ${product.name}`,
          product,
          recommendedRestockQuantity,
          safetyStock,
          predictedDemand,
          reason: "Sales are consistent and current stock may not meet the expected demand.",
          action: `Consider restocking ${recommendedRestockQuantity} units.`
        });
      }
    }

    // 2. High Demand + Low Stock Alert (CRITICAL priority)
    if (demandInfo.demandStatus === 'Increasing Demand' && product.riskLevel === 'CRITICAL') {
      recommendations.push({
        id: `alert-${product.id}`,
        type: 'Alert',
        priority: 'CRITICAL',
        title: `High Demand, Low Stock: ${product.name}`,
        product,
        demandInfo,
        reason: "High demand detected while stock may run out soon.",
        action: "Restock immediately to avoid potential stockouts."
      });
    }

    // 3. Slow Moving Alert (MEDIUM priority)
    if (product.hasSufficientData && product.averageDailySales < 0.2 && product.currentStock > 10) {
       recommendations.push({
        id: `slow-${product.id}`,
        type: 'Action',
        priority: 'MEDIUM',
        title: `Slow Moving: ${product.name}`,
        product,
        reason: "Sales activity is low compared to inventory size.",
        action: "Consider reducing future purchases or applying a discount."
      });
    }
  });

  // Business Level Recommendations
  if (salesTrendData.revenueTrend === 'Increasing trend') {
    recommendations.push({
      id: `biz-sales-up`,
      type: 'Business',
      priority: 'POSITIVE',
      title: "Sales are Growing",
      reason: `Sales have increased by ${salesTrendData.revenueGrowth.toFixed(1)}% compared with the previous period.`,
      action: "Review top selling products to ensure sufficient inventory is maintained."
    });
  } else if (salesTrendData.revenueTrend === 'Decreasing trend') {
    recommendations.push({
      id: `biz-sales-down`,
      type: 'Business',
      priority: 'INFO',
      title: "Sales have Decreased",
      reason: `Sales decreased by ${Math.abs(salesTrendData.revenueGrowth).toFixed(1)}% compared with the previous period.`,
      action: "Review slow moving inventory or consider promotions to boost sales."
    });
  }

  // Sort recommendations by Priority
  const priorityOrder = { 'CRITICAL': 1, 'HIGH': 2, 'MEDIUM': 3, 'POSITIVE': 4, 'INFO': 5 };
  
  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
};
