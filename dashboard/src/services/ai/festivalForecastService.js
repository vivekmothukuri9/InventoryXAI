export const getFestivalForecasts = (products) => {
  const forecasts = [];
  const currentDate = new Date();
  
  // Mock Festival Dates for 2026/2027
  const festivals = [
    { name: 'Dussehra', date: new Date('2026-10-19'), affectedCategories: ['Electronics', 'Clothing & Apparel'], multiplier: 1.3 },
    { name: 'Diwali', date: new Date('2026-11-08'), affectedCategories: ['Electronics', 'Clothing & Apparel', 'Grocery & FMCG'], multiplier: 1.5 },
    { name: 'Christmas', date: new Date('2026-12-25'), affectedCategories: ['Electronics', 'Clothing & Apparel'], multiplier: 1.2 },
    { name: 'Sankranti', date: new Date('2027-01-14'), affectedCategories: ['Clothing & Apparel', 'Grocery & FMCG'], multiplier: 1.4 },
    { name: 'Ugadi', date: new Date('2027-04-07'), affectedCategories: ['Clothing & Apparel', 'Grocery & FMCG'], multiplier: 1.25 }
  ];

  // Find upcoming festivals within the next 45 days
  const upcomingFestivals = festivals.filter(f => {
    const timeDiff = f.date.getTime() - currentDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff > 0 && daysDiff <= 45;
  });

  if (upcomingFestivals.length === 0) {
    return { upcomingFestivals: [], forecasts: [] };
  }

  // Generate forecasts for products matching festival categories
  products.forEach(product => {
    upcomingFestivals.forEach(festival => {
      if (festival.affectedCategories.includes(product.category)) {
        // Calculate predicted surge based on average sales
        const baseDemand = product.averageDailySales || 1;
        const surgedDemand = baseDemand * festival.multiplier;
        const demandIncreasePercent = ((festival.multiplier - 1) * 100).toFixed(0);
        
        // Calculate recommended additional stock for a 14-day festival period
        const additionalStockNeeded = Math.ceil((surgedDemand - baseDemand) * 14);
        
        forecasts.push({
          id: `fest-${product.id}-${festival.name}`,
          product,
          festival: festival.name,
          daysUntil: Math.ceil((festival.date.getTime() - currentDate.getTime()) / (1000 * 3600 * 24)),
          demandIncreasePercent,
          additionalStockNeeded: additionalStockNeeded > 0 ? additionalStockNeeded : 10 // minimum 10 for realism if sales are very low
        });
      }
    });
  });

  // Sort forecasts by highest demand increase, then highest additional stock
  forecasts.sort((a, b) => b.demandIncreasePercent - a.demandIncreasePercent || b.additionalStockNeeded - a.additionalStockNeeded);

  return { upcomingFestivals, forecasts };
};
