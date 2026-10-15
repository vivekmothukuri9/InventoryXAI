export const analyzeProfit = (products, salesData, dataPeriodDays) => {
  if (!salesData || salesData.length === 0) {
    return {
      currentRevenue: 0,
      currentCost: 0,
      currentProfit: 0,
      predictedRevenue: 0,
      predictedCost: 0,
      predictedProfit: 0,
      trendMessage: "Not enough data to predict future profit.",
      projectedDays: dataPeriodDays
    };
  }

  let currentRevenue = 0;
  let currentCost = 0;

  const productMap = {};
  products.forEach(p => {
    productMap[p.id] = {
      base_price: parseFloat(p.base_price) || 0,
      cost_price: parseFloat(p.cost_price) || (parseFloat(p.base_price) * 0.7) || 0 // Default 70% cost if missing
    };
  });

  salesData.forEach(sale => {
    const qty = parseInt(sale.quantity, 10);
    const salePrice = parseFloat(sale.sale_price);
    const p = productMap[sale.product_id];
    
    currentRevenue += salePrice * qty;
    if (p) {
      currentCost += p.cost_price * qty;
    } else {
      currentCost += (salePrice * 0.7) * qty;
    }
  });

  const currentProfit = currentRevenue - currentCost;
  
  const dailyRevenue = currentRevenue / dataPeriodDays;
  const dailyProfit = currentProfit / dataPeriodDays;
  const dailyCost = currentCost / dataPeriodDays;

  // AI Projection: 5% growth if currently profitable, else slight decrease
  const growthFactor = currentProfit > 0 ? 1.05 : 0.95;

  const predictedRevenue = dailyRevenue * dataPeriodDays * growthFactor;
  const predictedProfit = dailyProfit * dataPeriodDays * growthFactor;
  const predictedCost = dailyCost * dataPeriodDays * growthFactor;

  let trendMessage = "";
  if (currentProfit > 0 && predictedProfit > currentProfit) {
    const percent = ((predictedProfit - currentProfit) / currentProfit * 100).toFixed(1);
    trendMessage = `AI predicts a ${percent}% increase in profit over the next ${dataPeriodDays} days based on current momentum.`;
  } else if (currentProfit > 0 && predictedProfit < currentProfit) {
    trendMessage = `Profit might decrease in the next ${dataPeriodDays} days. Consider reviewing pricing.`;
  } else if (currentProfit <= 0) {
    trendMessage = `You are currently operating at a loss or break-even. AI recommends reviewing product costs and margins.`;
  } else {
    trendMessage = `Profit is expected to remain stable for the next ${dataPeriodDays} days.`;
  }

  return {
    currentRevenue,
    currentCost,
    currentProfit,
    predictedRevenue,
    predictedCost,
    predictedProfit,
    trendMessage,
    projectedDays: dataPeriodDays
  };
};
