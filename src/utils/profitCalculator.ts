import { Invoice, ProductItem, Expense, ProductCategory } from '../types/solar';

export interface InvoiceProfitDetail {
  invoice: Invoice;
  revenue: number; // Subtotal - discounts + charges (before tax)
  cogs: number; // Cost of Goods Sold
  grossProfit: number;
  profitMarginPercent: number;
  realizedProfit: number; // Based on paid portion
  unrealizedProfit: number;
  itemProfits: {
    itemId: string;
    description: string;
    category?: ProductCategory;
    quantity: number;
    unit: string;
    sellingPrice: number;
    unitCost: number;
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    profitMarginPercent: number;
  }[];
}

export interface DailyProfitSummary {
  date: string; // YYYY-MM-DD
  invoicesCount: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  profitMarginPercent: number;
  invoices: Invoice[];
}

export interface CategoryProfitSummary {
  category: ProductCategory;
  label: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  profitMarginPercent: number;
  itemsSoldQty: number;
}

/**
 * Calculate detailed profit analysis for a single invoice
 */
export const calculateInvoiceProfit = (
  invoice: Invoice,
  products: ProductItem[]
): InvoiceProfitDetail => {
  let totalCogs = 0;

  const itemProfits = invoice.items.map((item) => {
    // Find cost price from item or fallback to products catalog
    let unitCost = item.costPrice;
    if (unitCost === undefined || unitCost === null || isNaN(unitCost)) {
      const matchedProd = products.find(
        (p) => p.id === item.productId || p.code === item.productId || p.name.toLowerCase() === item.description.toLowerCase()
      );
      unitCost = matchedProd ? matchedProd.costPrice : 0;
    }

    const itemRevenue = item.total || (item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100));
    const itemCost = item.quantity * unitCost;
    const itemGrossProfit = itemRevenue - itemCost;
    const itemMargin = itemRevenue > 0 ? (itemGrossProfit / itemRevenue) * 100 : 0;

    totalCogs += itemCost;

    return {
      itemId: item.id,
      description: item.description,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      sellingPrice: item.unitPrice,
      unitCost,
      totalRevenue: itemRevenue,
      totalCost: itemCost,
      grossProfit: itemGrossProfit,
      profitMarginPercent: itemMargin,
    };
  });

  // Total invoice revenue without tax (or grand total minus tax)
  const revenueBeforeTax = (invoice.subtotal || 0) - (invoice.discountTotal || 0) + (invoice.installationCharge || 0) + (invoice.shippingOrFreight || 0);
  const revenue = revenueBeforeTax > 0 ? revenueBeforeTax : (invoice.grandTotal - (invoice.taxAmount || 0));
  
  const grossProfit = revenue - totalCogs;
  const profitMarginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  const paidRatio = invoice.grandTotal > 0 ? Math.min(1, Math.max(0, invoice.paidAmount / invoice.grandTotal)) : 1;
  const realizedProfit = grossProfit * paidRatio;
  const unrealizedProfit = grossProfit - realizedProfit;

  return {
    invoice,
    revenue,
    cogs: totalCogs,
    grossProfit,
    profitMarginPercent,
    realizedProfit,
    unrealizedProfit,
    itemProfits,
  };
};

/**
 * Aggregate daily profits from invoices and expenses
 */
export const calculateDailyProfits = (
  invoices: Invoice[],
  expenses: Expense[],
  products: ProductItem[]
): DailyProfitSummary[] => {
  const dailyMap: { [dateStr: string]: { invoices: Invoice[]; expenses: number } } = {};

  // Group invoices by date (YYYY-MM-DD)
  invoices.forEach((inv) => {
    const d = inv.date ? inv.date.slice(0, 10) : new Date().toISOString().slice(0, 10);
    if (!dailyMap[d]) {
      dailyMap[d] = { invoices: [], expenses: 0 };
    }
    dailyMap[d].invoices.push(inv);
  });

  // Group expenses by date
  expenses.forEach((exp) => {
    const d = exp.date ? exp.date.slice(0, 10) : new Date().toISOString().slice(0, 10);
    if (!dailyMap[d]) {
      dailyMap[d] = { invoices: [], expenses: 0 };
    }
    dailyMap[d].expenses += exp.amount || 0;
  });

  const results: DailyProfitSummary[] = Object.keys(dailyMap).map((dateStr) => {
    const dayData = dailyMap[dateStr];
    let dayRevenue = 0;
    let dayCogs = 0;

    dayData.invoices.forEach((inv) => {
      const p = calculateInvoiceProfit(inv, products);
      dayRevenue += p.revenue;
      dayCogs += p.cogs;
    });

    const grossProfit = dayRevenue - dayCogs;
    const netProfit = grossProfit - dayData.expenses;
    const profitMarginPercent = dayRevenue > 0 ? (grossProfit / dayRevenue) * 100 : 0;

    return {
      date: dateStr,
      invoicesCount: dayData.invoices.length,
      revenue: dayRevenue,
      cogs: dayCogs,
      grossProfit,
      expenses: dayData.expenses,
      netProfit,
      profitMarginPercent,
      invoices: dayData.invoices,
    };
  });

  // Sort descending by date (most recent first)
  return results.sort((a, b) => b.date.localeCompare(a.date));
};

/**
 * Category breakdown profit analysis
 */
export const calculateCategoryProfits = (
  invoices: Invoice[],
  products: ProductItem[]
): CategoryProfitSummary[] => {
  const catMap: { [key: string]: { revenue: number; cogs: number; qty: number } } = {};

  invoices.forEach((inv) => {
    const profitDetail = calculateInvoiceProfit(inv, products);
    profitDetail.itemProfits.forEach((itm) => {
      const cat = itm.category || 'ACCESSORIES';
      if (!catMap[cat]) {
        catMap[cat] = { revenue: 0, cogs: 0, qty: 0 };
      }
      catMap[cat].revenue += itm.totalRevenue;
      catMap[cat].cogs += itm.totalCost;
      catMap[cat].qty += itm.quantity;
    });
  });

  const categoryLabels: Record<string, string> = {
    SOLAR_PANELS: 'Solar PV Panels',
    INVERTERS: 'Solar Inverters & VFDs',
    BATTERIES: 'Lithium & Gel Batteries',
    STRUCTURE_MOUNTING: 'Rooftop & Ground Mounting',
    SWITCHGEAR_PROTECTION: 'DC/AC Switchgear & SPDs',
    CABLES_WIRES: 'Solar DC & AC Cables',
    SOLAR_PUMPS: 'Solar Water Pumps',
    EV_CHARGERS: 'EV Charging Stations',
    SOLAR_LIGHTS: 'Solar Street Lights',
    SOLAR_WATER_HEATERS: 'Solar Geysers & Thermal Systems',
    SERVICES_LABOR: 'Turnkey Installation & Labor',
    ACCESSORIES: 'Hardware & Accessories',
  };

  return Object.keys(catMap).map((catKey) => {
    const data = catMap[catKey];
    const grossProfit = data.revenue - data.cogs;
    const profitMarginPercent = data.revenue > 0 ? (grossProfit / data.revenue) * 100 : 0;

    return {
      category: catKey as ProductCategory,
      label: categoryLabels[catKey as ProductCategory] || (catKey ? catKey.replace(/_/g, ' ') : 'Hardware & Components'),
      revenue: data.revenue,
      cogs: data.cogs,
      grossProfit,
      profitMarginPercent,
      itemsSoldQty: data.qty,
    };
  }).sort((a, b) => b.grossProfit - a.grossProfit);
};
