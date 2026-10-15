export const analyzeSalesTrend = (sales, dataPeriodDays) => {
  const now = new Date();
  
  // Current Period
  const currentPeriodStart = new Date(now.getTime() - (dataPeriodDays * 24 * 60 * 60 * 1000));
  
  // Previous Period
  const previousPeriodStart = new Date(currentPeriodStart.getTime() - (dataPeriodDays * 24 * 60 * 60 * 1000));

  // Current Period Revenue
  const currentRevenue = sales.filter(s => 
    s.status !== 'cancelled' &&
    new Date(s.sale_date) >= currentPeriodStart &&
    new Date(s.sale_date) <= now
  ).reduce((sum, sale) => sum + (parseFloat(sale.sale_price) * sale.quantity), 0);

  // Previous Period Revenue
  const previousRevenue = sales.filter(s => 
    s.status !== 'cancelled' &&
    new Date(s.sale_date) >= previousPeriodStart &&
    new Date(s.sale_date) < currentPeriodStart
  ).reduce((sum, sale) => sum + (parseFloat(sale.sale_price) * sale.quantity), 0);

  let revenueGrowth = 0;
  let revenueTrend = "Stable trend";

  if (previousRevenue > 0) {
    revenueGrowth = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    
    if (revenueGrowth > 5) {
      revenueTrend = "Increasing trend";
    } else if (revenueGrowth < -5) {
      revenueTrend = "Decreasing trend";
    }
  } else if (currentRevenue > 0 && previousRevenue === 0) {
    revenueGrowth = 100;
    revenueTrend = "Increasing trend";
  }

  return {
    currentRevenue,
    previousRevenue,
    revenueGrowth,
    revenueTrend
  };
};
