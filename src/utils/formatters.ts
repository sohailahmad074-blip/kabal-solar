import { Currency, ProductCategory, ExpenseCategory, PaymentStatus, POStatus } from '../types/solar';

export const formatCurrency = (
  amount: number | undefined | null,
  currency: Currency = '$',
  position: 'BEFORE' | 'AFTER' = 'BEFORE'
): string => {
  const val = amount || 0;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(val);

  return position === 'BEFORE' ? `${currency} ${formatted}` : `${formatted} ${currency}`;
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const getCategoryLabel = (category: ProductCategory | string): string => {
  const map: Record<string, string> = {
    SOLAR_PANELS: 'Solar Panels',
    INVERTERS: 'Solar Inverters',
    BATTERIES: 'Energy Storage / Batteries',
    STRUCTURE_MOUNTING: 'Mounting & Structure',
    SWITCHGEAR_PROTECTION: 'Switchgear & Breakers',
    CABLES_WIRES: 'Solar DC/AC Cables',
    SOLAR_PUMPS: 'Solar Water Pumps',
    EV_CHARGERS: 'EV Charging Stations',
    SOLAR_LIGHTS: 'Solar Street & Garden Lights',
    SOLAR_WATER_HEATERS: 'Solar Geysers & Thermal Systems',
    SERVICES_LABOR: 'Labor & Engineering',
    ACCESSORIES: 'Accessories & Connectors',
  };
  return map[category] || (typeof category === 'string' ? category.replace(/_/g, ' ') : String(category || ''));
};

export const getExpenseCategoryLabel = (category: ExpenseCategory): string => {
  const map: Record<ExpenseCategory, string> = {
    SHOP_RENT: 'Shop / Warehouse Rent',
    TECHNICIAN_LABOR: 'Technician & Installer Wages',
    TRANSPORT_FREIGHT: 'Logistics & Transportation',
    TOOLS_EQUIPMENT: 'Tools & Installation Gear',
    NET_METERING_PERMITS: 'Utility & Inspection Permits',
    MARKETING_ADS: 'Marketing & Advertising',
    UTILITIES_ELECTRICITY: 'Shop Utilities (Electric/Water)',
    TAXES_LICENSES: 'Taxes & Commercial Licenses',
    OFFICE_SUPPLIES: 'Office Supplies & Software',
    MAINTENANCE_REPAIRS: 'Shop Maintenance & Repairs',
    MISCELLANEOUS: 'Miscellaneous Expenses',
  };
  return map[category] || category;
};

export const getStatusBadgeColor = (status: PaymentStatus | POStatus | string): { bg: string; text: string; border: string } => {
  switch (status) {
    case 'PAID':
    case 'RECEIVED':
    case 'COMMISSIONED':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'PARTIAL':
    case 'FEASIBILITY_APPROVED':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'UNPAID':
    case 'ORDERED':
    case 'APPLIED':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case 'OVERDUE':
    case 'CANCELLED':
      return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
    case 'DRAFT':
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
  }
};

export interface SolarSizingInputs {
  monthlyUnitsKwh?: number;
  monthlyBillAmount?: number;
  averageRatePerKwh?: number;
  targetSolarOffsetPercent?: number; // e.g. 100%
  peakSunHoursPerDay?: number; // default 4.5 - 5.5
  panelWattage?: number; // default 585
  systemType?: 'ON_GRID' | 'HYBRID' | 'OFF_GRID';
  batteryHoursBackup?: number; // for hybrid/off-grid
}

export interface SolarSizingResult {
  recommendedCapacityKw: number;
  panelCount: number;
  actualArraySizeKw: number;
  recommendedInverterKw: number;
  recommendedBatteryKwh: number;
  estimatedDailyUnitsKwh: number;
  estimatedMonthlyUnitsKwh: number;
  estimatedMonthlySavings: number;
  estimatedYearlySavings: number;
  co2ReductionTonsPerYear: number;
}

export const calculateSolarSystem = (inputs: SolarSizingInputs): SolarSizingResult => {
  const rate = inputs.averageRatePerKwh || 0.25; // default unit rate
  const sunHours = inputs.peakSunHoursPerDay || 4.8;
  const offset = (inputs.targetSolarOffsetPercent || 100) / 100;
  const panelWatts = inputs.panelWattage || 585;

  let monthlyUnits = inputs.monthlyUnitsKwh || 0;
  if (!monthlyUnits && inputs.monthlyBillAmount) {
    monthlyUnits = inputs.monthlyBillAmount / rate;
  }
  if (!monthlyUnits) monthlyUnits = 800; // default benchmark

  const dailyUnitsNeeded = (monthlyUnits / 30) * offset;
  // Derating factor for solar losses (dust, temperature, inverter efficiency ~ 0.8)
  const requiredArraySizeKw = (dailyUnitsNeeded / sunHours) / 0.80;
  
  // Panel count
  const panelCount = Math.max(2, Math.ceil((requiredArraySizeKw * 1000) / panelWatts));
  const actualArraySizeKw = (panelCount * panelWatts) / 1000;

  // Inverter selection (usually sized ~ 0.85 to 1.1x of DC array)
  const inverterSizes = [3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 50, 100];
  let recommendedInverterKw = inverterSizes.find(size => size >= actualArraySizeKw * 0.9) || Math.ceil(actualArraySizeKw);

  // Battery storage for Hybrid/Off-grid
  let recommendedBatteryKwh = 0;
  if (inputs.systemType === 'HYBRID') {
    // 50% of night load or specified backup hours
    const dailyNightUnits = dailyUnitsNeeded * 0.45;
    recommendedBatteryKwh = Math.round((dailyNightUnits / 0.9) * 10) / 10;
  } else if (inputs.systemType === 'OFF_GRID') {
    recommendedBatteryKwh = Math.round((dailyUnitsNeeded * 1.3) * 10) / 10;
  }

  const estimatedDailyUnitsKwh = Math.round(actualArraySizeKw * sunHours * 0.82 * 10) / 10;
  const estimatedMonthlyUnitsKwh = Math.round(estimatedDailyUnitsKwh * 30);
  const estimatedMonthlySavings = Math.round(estimatedMonthlyUnitsKwh * rate);
  const estimatedYearlySavings = Math.round(estimatedMonthlySavings * 12);
  const co2ReductionTonsPerYear = Math.round((estimatedMonthlyUnitsKwh * 12 * 0.7) / 1000 * 10) / 10;

  return {
    recommendedCapacityKw: Math.round(requiredArraySizeKw * 10) / 10,
    panelCount,
    actualArraySizeKw: Math.round(actualArraySizeKw * 100) / 100,
    recommendedInverterKw,
    recommendedBatteryKwh,
    estimatedDailyUnitsKwh,
    estimatedMonthlyUnitsKwh,
    estimatedMonthlySavings,
    estimatedYearlySavings,
    co2ReductionTonsPerYear,
  };
};
