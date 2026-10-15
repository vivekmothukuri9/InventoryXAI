export const mockSalesOverview = {
  todaySales: 24500,
  todayGrowth: 12.5,
  monthlySales: 480000,
  monthlyGrowth: 18.5,
  productsSold: 742,
  productsSoldGrowth: 5.2,
  totalOrders: 186,
  totalOrdersGrowth: 10.4,
};

export const mockSalesPerformanceData = [
  { name: 'Jan', revenue: 320000, orders: 120 },
  { name: 'Feb', revenue: 380000, orders: 145 },
  { name: 'Mar', revenue: 480000, orders: 186 },
  { name: 'Apr', revenue: 410000, orders: 160 },
  { name: 'May', revenue: 520000, orders: 210 },
  { name: 'Jun', revenue: 610000, orders: 250 },
];

export const mockInventorySummary = {
  totalProducts: 896,
  inStock: 856,
  lowStock: 32,
  outOfStock: 8,
};

export const mockProducts = [
  {
    id: 1,
    name: "Samsung 65W Charger",
    sku: "SAM65W01",
    category: "Accessories",
    price: 999,
    currentStock: 25,
    sold: 145,
    revenue: 72500,
    salesTrend: "up",
    dailySales: 6,
    status: "Low Stock",
    searches: 248,
  },
  {
    id: 2,
    name: "USB-C to C Cable (2m)",
    sku: "USBC001",
    category: "Accessories",
    price: 399,
    currentStock: 18,
    sold: 120,
    revenue: 23800,
    salesTrend: "up",
    dailySales: 5,
    status: "Low Stock",
    searches: 165,
  },
  {
    id: 3,
    name: "Mi Power Bank 20000mAh",
    sku: "PB20K",
    category: "Power",
    price: 1999,
    currentStock: 12,
    sold: 86,
    revenue: 68800,
    salesTrend: "up",
    dailySales: 2,
    status: "Low Stock",
    searches: 192,
  },
  {
    id: 4,
    name: "Old Bluetooth Speaker",
    sku: "OBS01",
    category: "Audio",
    price: 1499,
    currentStock: 45,
    sold: 2,
    revenue: 2998,
    salesTrend: "down",
    dailySales: 0.1,
    status: "In Stock",
    searches: 12,
  },
  {
    id: 5,
    name: "SanDisk 32GB MicroSD",
    sku: "SD32G",
    category: "Storage",
    price: 450,
    currentStock: 60,
    sold: 5,
    revenue: 2250,
    salesTrend: "down",
    dailySales: 0.2,
    status: "In Stock",
    searches: 34,
  },
];

export const mockRecentSales = [
  { id: "#INV1024", product: "Samsung 65W Charger", quantity: 2, amount: 1998, date: "Today", status: "Completed" },
  { id: "#INV1023", product: "Mi Power Bank 20000mAh", quantity: 1, amount: 1999, date: "Today", status: "Completed" },
  { id: "#INV1022", product: "USB-C to C Cable (2m)", quantity: 3, amount: 1197, date: "Yesterday", status: "Completed" },
];

export const mockPendingPurchases = [
  { product: "Samsung 65W Charger", quantity: 40, supplier: "ABC Electronics", expected: "2 days" },
  { product: "Mi Power Bank 20000mAh", quantity: 20, supplier: "PowerTech India", expected: "3 days" },
];
