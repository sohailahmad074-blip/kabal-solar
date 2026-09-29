export type Currency = '$' | '€' | '£' | 'Rs.' | 'PKR' | 'INR' | 'AED' | 'SAR' | 'ZAR' | 'AUD' | 'CAD';

export type InvoiceType = 'INVOICE' | 'QUOTATION' | 'PROFORMA' | 'WARRANTY_CERT';
export type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'CHEQUE' | 'ONLINE';

export type ProductCategory = 
  | 'SOLAR_PANELS'
  | 'INVERTERS'
  | 'BATTERIES'
  | 'STRUCTURE_MOUNTING'
  | 'SWITCHGEAR_PROTECTION'
  | 'CABLES_WIRES'
  | 'SOLAR_PUMPS'
  | 'EV_CHARGERS'
  | 'SOLAR_LIGHTS'
  | 'SOLAR_WATER_HEATERS'
  | 'SERVICES_LABOR'
  | 'ACCESSORIES'
  | (string & {});

export type UserRole = 'OWNER' | 'PARTNER';

export interface ProductItem {
  id: string;
  code: string; // e.g. SP-585-LONG
  barcode?: string; // EAN, UPC, Code128, or custom QR/barcode
  name: string;
  category: ProductCategory;
  brand: string;
  model: string;
  specs: string; // e.g. "585W Bifacial N-Type TOPCon Mono Tier-1" or "10kW On-Grid 3-Phase Dual MPPT"
  unit: string; // Pcs, Watts, Sets, Meters, Pallet, Job
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  minStockAlert: number;
  wattageRating?: number; // for panels/inverters
  capacityKwh?: number; // for batteries
  warrantyYears?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  category?: ProductCategory;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  referenceNo?: string;
  customerId?: string;
  customerName?: string;
  supplierId?: string;
  supplierName?: string;
  unitCost?: number;
  batchOrSerial?: string;
  scannedBy?: string;
  date: string;
  notes?: string;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  description: string;
  category?: ProductCategory;
  brand?: string;
  specs?: string;
  serialNumbers?: string; // Comma-separated serial numbers for panels/inverters
  warrantyPeriod?: string; // e.g. "12 Years Product, 25 Years Performance"
  quantity: number;
  unit: string;
  unitPrice: number;
  costPrice?: number; // For profit calculation
  discountPercent: number;
  total: number;
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  referenceNo?: string;
  notes?: string;
  recordedBy?: string;
}

export interface InvoiceTradeInItem {
  id: string;
  description: string; // e.g. "Old 5kW Off-Grid Inverter"
  brand?: string;
  model?: string;
  serialNumber?: string;
  condition?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'FAULTY' | 'SCRAP' | string;
  valuationPrice: number; // The exchange buyback / credit value deducted from total
  quantity?: number;
  notes?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. INV-2026-001 or QT-2026-001
  type: InvoiceType;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  customerCity?: string;
  
  // Solar Project Details
  projectSystemCapacityKw?: number; // e.g. 10.5 kW
  systemType?: 'ON_GRID' | 'HYBRID' | 'OFF_GRID' | 'SOLAR_PUMP' | 'COMMERCIAL_ROOFTOP' | 'RESIDENTIAL_ROOFTOP';
  installationAddress?: string;
  netMeteringApplied?: boolean;
  
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  
  // Accessories Presentation: 'ITEMIZED' (full breakdown for installer) or 'LUMP_SUM' (single package for customer)
  accessoriesMode?: 'ITEMIZED' | 'LUMP_SUM';
  
  // Equipment Exchange / Trade-In Buyback
  hasTradeIn?: boolean;
  tradeInItems?: InvoiceTradeInItem[];
  tradeInTotal?: number; // Total exchange valuation amount deducted from grandTotal

  subtotal: number;
  discountTotal: number;
  taxPercent: number;
  taxAmount: number;
  shippingOrFreight: number;
  installationCharge: number;
  grandTotal: number;
  
  paidAmount: number;
  balanceDue: number;
  status: PaymentStatus;
  
  payments: PaymentRecord[];
  
  termsAndConditions?: string;
  warrantyNotes?: string;
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

export type POStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'PARTIAL' | 'CANCELLED';

export interface PurchaseOrderItem {
  id: string;
  productId?: string;
  name: string;
  category: ProductCategory;
  brand: string;
  specs: string;
  quantity: number;
  unit: string;
  unitCost: number;
  total: number;
  receivedQty?: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string; // e.g. PO-2026-004
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  supplierEmail?: string;
  supplierAddress?: string;
  
  orderDate: string;
  expectedDate?: string;
  receivedDate?: string;
  status: POStatus;
  
  items: PurchaseOrderItem[];
  subtotal: number;
  taxAmount: number;
  shippingFreight: number;
  grandTotal: number;
  
  paidAmount: number;
  balanceDue: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  payments: PaymentRecord[];
  
  trackingNo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  taxNumber?: string;
  suppliedCategories: ProductCategory[];
  rating?: number;
  bankDetails?: string;
  notes?: string;
  totalPurchased: number;
  totalOutstanding: number;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  customerType: 'RESIDENTIAL' | 'COMMERCIAL' | 'AGRICULTURAL' | 'INDUSTRIAL' | 'RESELLER';
  phone: string;
  whatsapp?: string;
  email?: string;
  address: string;
  city: string;
  nationalIdOrTax?: string;
  
  // Solar site info
  sanctionedLoadKw?: number;
  utilityDiscom?: string; // e.g. Utility electricity provider
  consumerNumber?: string; // Reference # on electric bill
  installedCapacityKw?: number; // Total kW installed
  systemType?: 'ON_GRID' | 'HYBRID' | 'OFF_GRID' | 'SOLAR_PUMP';
  inverterSerial?: string;
  panelBrandModel?: string;
  installationDate?: string;
  warrantyExpiryDate?: string;
  netMeteringStatus?: 'NOT_APPLICABLE' | 'APPLIED' | 'FEASIBILITY_APPROVED' | 'METER_INSTALLED' | 'COMMISSIONED';
  
  totalInvoiced: number;
  totalPaid: number;
  balanceDue: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseCategory = 
  | 'SHOP_RENT'
  | 'TECHNICIAN_LABOR'
  | 'TRANSPORT_FREIGHT'
  | 'TOOLS_EQUIPMENT'
  | 'NET_METERING_PERMITS'
  | 'MARKETING_ADS'
  | 'UTILITIES_ELECTRICITY'
  | 'TAXES_LICENSES'
  | 'OFFICE_SUPPLIES'
  | 'MAINTENANCE_REPAIRS'
  | 'MISCELLANEOUS';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  paymentMethod: PaymentMethod;
  payee: string; // e.g. "Civil Installer Crew", "Landlord", "Delivery Express"
  referenceNo?: string;
  taxDeductible: boolean;
  relatedCustomerId?: string;
  relatedCustomerName?: string;
  receiptImage?: string;
  notes?: string;
  createdAt: string;
}

export type TabType = 
  | 'DASHBOARD'
  | 'INVOICES'
  | 'PURCHASING'
  | 'CUSTOMERS'
  | 'EXPENSES'
  | 'INVENTORY'
  | 'ESTIMATOR'
  | 'REPORTS'
  | 'SETTINGS';

export interface ShopSettings {
  shopName: string;
  tagline: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  taxRegistrationNumber: string; // NTN / GST / VAT / Sales Tax
  currency: Currency;
  currencyPosition: 'BEFORE' | 'AFTER';
  defaultTaxRate?: number; // e.g. 0% or 18%
  defaultTaxPercent?: number; // alias
  
  // Banking for invoices
  bankName: string;
  bankAccountTitle: string;
  bankAccountNumber: string;
  ibanOrSwift: string;
  
  // Customization
  invoicePrefix: string;
  quotationPrefix: string;
  poPrefix: string;
  termsAndConditions?: string;
  defaultTerms?: string;
  warrantyDisclaimer?: string;
  defaultWarrantyTerms?: string;
  logoUrl?: string;
  showSignatureStamp: boolean;
  ownerPin?: string; // Secret PIN for confidential profit window (default: 7788)
  enableOwnerPin?: boolean;
  
  // Partner / Purchasing & Inventory Access
  partnerName?: string; // e.g. "Farhan / Procurement Partner"
  partnerPin?: string; // Secret PIN for partner role access (default: 1234)
  partnerPhone?: string;
  partnerEmail?: string;
  enablePartnerMode?: boolean;

  // Custom Product Categories
  customCategories?: string[];
}
