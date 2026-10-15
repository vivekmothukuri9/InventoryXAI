export const analyzeDemand = (products, sales, dataPeriodDays) => {
  const now = new Date();
  
  // Current Period
  const currentPeriodStart = new Date(now.getTime() - (dataPeriodDays * 24 * 60 * 60 * 1000));
  
  // Previous Period (same length)
  const previousPeriodStart = new Date(currentPeriodStart.getTime() - (dataPeriodDays * 24 * 60 * 60 * 1000));

  return products.map(product => {
    // Current Period Sales
    const currentSales = sales.filter(s => 
      s.product_id === product.id && 
      s.status !== 'cancelled' &&
      new Date(s.sale_date) >= currentPeriodStart &&
      new Date(s.sale_date) <= now
    ).reduce((sum, sale) => sum + sale.quantity, 0);

    // Previous Period Sales
    const previousSales = sales.filter(s => 
      s.product_id === product.id && 
      s.status !== 'cancelled' &&
      new Date(s.sale_date) >= previousPeriodStart &&
      new Date(s.sale_date) < currentPeriodStart
    ).reduce((sum, sale) => sum + sale.quantity, 0);

    let demandGrowth = 0;
    let demandStatus = "Stable Demand";

    if (previousSales > 0) {
      demandGrowth = ((currentSales - previousSales) / previousSales) * 100;
      
      if (demandGrowth > 10) {
        demandStatus = "Increasing Demand";
      } else if (demandGrowth < -10) {
        demandStatus = "Decreasing Demand";
      }
    } else if (currentSales > 0 && previousSales === 0) {
      demandGrowth = 100; // Just represent as 100% growth if there were no previous sales
      demandStatus = "Increasing Demand";
    } else {
      demandGrowth = 0;
      demandStatus = "Stable Demand";
    }

    return {
      ...product,
      currentSales,
      previousSales,
      demandGrowth,
      demandStatus,
      hasDemandData: currentSales > 0 || previousSales > 0
    };
  });
};
