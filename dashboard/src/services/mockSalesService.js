/**
 * Realistic Mock Sales Data Generator
 * Provides realistic sales transactions tied to real inventory products
 * to power AI Stock Predictions, Sales Charts, and Analytics when DB has sparse/empty sales data.
 */

const CUSTOMER_NAMES = [
  'Ramesh Kumar', 'Priya Sharma', 'Anil Reddy', 'Sneha Patel', 
  'Vikram Malhotra', 'Deepa Nair', 'Suresh Babu', 'Kavitha Rao',
  'Mohammad Farooq', 'Pooja Verma', 'Rajesh Gupta', 'Lakshmi Narayana'
];

export const generateMockSales = (products = [], dealerId = 'mock-dealer', days = 30) => {
  const sales = [];
  const now = new Date();
  
  // Default sample products if none provided
  const validProducts = (products && products.length > 0) ? products : [
    { id: 'prod-1', name: '24-inch Monitor', sku: 'MON-24', base_price: 4500, cost_price: 3200, category: 'Electronics', stock_quantity: 10, min_stock_level: 20 },
    { id: 'prod-2', name: 'Smart Watch Band', sku: 'SWB-01', base_price: 699, cost_price: 350, category: 'Accessories', stock_quantity: 14, min_stock_level: 20 },
    { id: 'prod-3', name: 'Samsung 65W Charger', sku: 'SAM65W01', base_price: 1499, cost_price: 950, category: 'Accessories', stock_quantity: 28, min_stock_level: 20 },
    { id: 'prod-4', name: 'USB-C to C Cable', sku: 'USBC001', base_price: 299, cost_price: 120, category: 'Accessories', stock_quantity: 68, min_stock_level: 20 },
    { id: 'prod-5', name: 'Power Bank 20000mAh', sku: 'PB20K', base_price: 1499, cost_price: 1050, category: 'Power', stock_quantity: 122, min_stock_level: 20 },
    { id: 'prod-6', name: 'Wireless Bluetooth Earbuds', sku: 'WBE-09', base_price: 1899, cost_price: 1100, category: 'Audio', stock_quantity: 131, min_stock_level: 20 },
  ];

  let saleCounter = 1;

  // Identify low stock products to guarantee healthy daily turnover so days remaining is < 10 days
  const lowStockProds = validProducts.filter(p => {
    const qty = p.stock_quantity ?? p.quantity ?? 50;
    const min = p.min_stock_level ?? p.min_stock ?? 20;
    return qty <= min || qty <= 15;
  });

  // Generate sales day by day for the requested period
  for (let dayOffset = days; dayOffset >= 0; dayOffset--) {
    const saleDate = new Date(now);
    saleDate.setDate(now.getDate() - dayOffset);
    
    // Vary transactions per day (weekends have higher traffic)
    const dayOfWeek = saleDate.getDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    const numTransactions = isWeekend ? (5 + (dayOffset % 4)) : (3 + (dayOffset % 3));

    // Guarantee that low stock items sell every 1-2 days
    if (lowStockProds.length > 0 && dayOffset % 2 === 0) {
      lowStockProds.forEach((lsp, idx) => {
        const prodPrice = parseFloat(lsp.base_price || lsp.price || 999);
        const costPrice = parseFloat(lsp.cost_price || (prodPrice * 0.7));
        const prodName = lsp.name || lsp.product_name || `Product ${idx + 1}`;
        const txDate = new Date(saleDate);
        txDate.setHours(11 + idx * 2, (idx * 23) % 60, 0, 0);

        sales.push({
          id: `mock-sale-low-${dayOffset}-${idx}-${saleCounter++}`,
          dealer_id: dealerId,
          product_id: lsp.id,
          quantity: 2,
          sale_price: prodPrice,
          cost_price: costPrice,
          status: 'completed',
          customer_name: CUSTOMER_NAMES[(idx + dayOffset) % CUSTOMER_NAMES.length],
          customer_phone: `98490${1000 + (idx * 43 + dayOffset * 19) % 9000}`,
          sale_date: txDate.toISOString(),
          product: {
            id: lsp.id,
            name: prodName,
            sku: lsp.sku || `SKU-${idx + 1}`,
            category: lsp.category || 'General',
            base_price: prodPrice
          },
          products: {
            id: lsp.id,
            name: prodName,
            sku: lsp.sku || `SKU-${idx + 1}`,
            category: lsp.category || 'General',
            base_price: prodPrice
          }
        });
      });
    }

    for (let t = 0; t < numTransactions; t++) {
      const prodIndex = (dayOffset * 3 + t * 2) % validProducts.length;
      const product = validProducts[prodIndex];
      const prodName = product.name || product.product_name || `Product ${prodIndex + 1}`;
      const prodPrice = parseFloat(product.base_price || product.price || 999);
      const costPrice = parseFloat(product.cost_price || (prodPrice * 0.7));

      // Hourly distribution throughout the day (9am to 9pm)
      const hour = 9 + ((t * 3 + dayOffset) % 12);
      const minute = (t * 17) % 60;
      const txDate = new Date(saleDate);
      txDate.setHours(hour, minute, 0, 0);

      // Quantity sold per sale (1 to 3 units)
      const qty = (prodPrice > 5000) ? 1 : (1 + ((t + dayOffset) % 3));

      const customerName = CUSTOMER_NAMES[(t + dayOffset) % CUSTOMER_NAMES.length];
      const phoneEnd = (1000 + (t * 31 + dayOffset * 17) % 9000);

      const prodObj = {
        id: product.id || `prod-${prodIndex + 1}`,
        name: prodName,
        sku: product.sku || `SKU-${prodIndex + 1}`,
        category: product.category || 'General',
        base_price: prodPrice
      };

      sales.push({
        id: `mock-sale-${dayOffset}-${t}-${saleCounter++}`,
        dealer_id: dealerId,
        product_id: product.id || `prod-${prodIndex + 1}`,
        quantity: qty,
        sale_price: prodPrice,
        cost_price: costPrice,
        status: 'completed',
        customer_name: customerName,
        customer_phone: `98490${phoneEnd}`,
        sale_date: txDate.toISOString(),
        product: prodObj,
        products: prodObj
      });
    }
  }

  // Sort descending by date
  return sales.sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date));
};
