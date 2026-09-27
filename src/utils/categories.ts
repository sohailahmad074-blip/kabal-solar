import { ProductCategory, ShopSettings } from '../types/solar';

export interface CategoryInfo {
  id: ProductCategory;
  label: string;
  isCustom?: boolean;
  iconName?: string;
  badgeColor?: string;
}

export const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  SOLAR_PANELS: 'Solar Panels (PV)',
  INVERTERS: 'Solar Inverters',
  BATTERIES: 'Energy Storage & Batteries',
  STRUCTURE_MOUNTING: 'Mounting & Framing',
  SWITCHGEAR_PROTECTION: 'Switchgear & DB Protection',
  CABLES_WIRES: 'DC/AC Solar Cables',
  SOLAR_PUMPS: 'Solar Water Pumps & VFD',
  EV_CHARGERS: 'EV Charging Stations',
  SOLAR_LIGHTS: 'Solar Street & Garden Lights',
  SOLAR_WATER_HEATERS: 'Solar Geysers & Thermal Systems',
  SERVICES_LABOR: 'Labor & Engineering Services',
  ACCESSORIES: 'Accessories & Misc Hardware',
};

export const getCategoryLabel = (category?: ProductCategory | string): string => {
  if (!category) return 'Hardware & Accessories';
  if (DEFAULT_CATEGORY_LABELS[category]) {
    return DEFAULT_CATEGORY_LABELS[category];
  }
  // Format custom category (e.g. CUSTOM_HYBRID or "Solar Street Lights")
  return category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const getAllCategories = (settings?: ShopSettings): CategoryInfo[] => {
  const base: CategoryInfo[] = [
    { id: 'SOLAR_PANELS', label: 'Solar Panels (PV)' },
    { id: 'INVERTERS', label: 'Solar Inverters (Hybrid/On-Grid)' },
    { id: 'BATTERIES', label: 'Energy Storage & LiFePO4 Batteries' },
    { id: 'STRUCTURE_MOUNTING', label: 'Mounting & Framing Structure' },
    { id: 'SWITCHGEAR_PROTECTION', label: 'Switchgear & Breaker Protection' },
    { id: 'CABLES_WIRES', label: 'DC/AC Solar Cables & Wires' },
    { id: 'SOLAR_PUMPS', label: 'Solar Water Pumps & VFD Drives' },
    { id: 'EV_CHARGERS', label: 'EV Charging Stations' },
    { id: 'SOLAR_LIGHTS', label: 'Solar Street Lights & Fixtures' },
    { id: 'SOLAR_WATER_HEATERS', label: 'Solar Geysers & Thermal' },
    { id: 'ACCESSORIES', label: 'Accessories & Misc Connectors' },
    { id: 'SERVICES_LABOR', label: 'Labor & Installation Services' },
  ];

  if (settings?.customCategories && Array.isArray(settings.customCategories)) {
    settings.customCategories.forEach((cat) => {
      if (cat && !base.some((b) => b.id === cat)) {
        base.push({
          id: cat,
          label: getCategoryLabel(cat),
          isCustom: true,
        });
      }
    });
  }

  return base;
};
