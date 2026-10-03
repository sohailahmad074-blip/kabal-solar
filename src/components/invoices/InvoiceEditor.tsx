import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Sun, 
  Save, 
  User, 
  FileText, 
  Layers,
  Send,
  Scan,
  CheckCircle2,
  MessageSquare,
  RefreshCw,
  ArrowLeftRight,
  PackagePlus,
  ShieldCheck,
  Boxes,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  Invoice, 
  InvoiceItem, 
  InvoiceTradeInItem,
  Customer, 
  ProductItem, 
  ShopSettings, 
  InvoiceType, 
  PaymentStatus, 
  PaymentMethod,
  ProductCategory
} from '../../types/solar';
import { Modal } from '../common/Modal';
import { formatCurrency } from '../../utils/formatters';
import { playScannerSuccessBeep, playScannerErrorBeep } from '../../utils/barcodeSound';
import { buildWhatsAppMessage, openWhatsApp } from '../../utils/sendDirect';
import { getAllCategories } from '../../utils/categories';

interface InvoiceEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: Invoice) => void;
  onSaveAndSend?: (invoice: Invoice) => void;
  onSaveAndWhatsApp?: (invoice: Invoice) => void;
  existingInvoice?: Invoice | null;
  customers: Customer[];
  products: ProductItem[];
  settings: ShopSettings;
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveAndSend,
  onSaveAndWhatsApp,
  existingInvoice,
  customers,
  products,
  settings,
}) => {
  const [docType, setDocType] = useState<InvoiceType>('INVOICE');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  
  // Solar Project Specs
  const [projectSystemCapacityKw, setProjectSystemCapacityKw] = useState<number | undefined>(undefined);
  const [systemType, setSystemType] = useState<'ON_GRID' | 'HYBRID' | 'OFF_GRID' | 'SOLAR_PUMP' | 'COMMERCIAL_ROOFTOP' | 'RESIDENTIAL_ROOFTOP'>('ON_GRID');
  const [installationAddress, setInstallationAddress] = useState('');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [hasTradeIn, setHasTradeIn] = useState<boolean>(false);
  const [tradeInItems, setTradeInItems] = useState<InvoiceTradeInItem[]>([]);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [shippingOrFreight, setShippingOrFreight] = useState<number>(0);
  const [installationCharge, setInstallationCharge] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [paymentRef, setPaymentRef] = useState('');

  const [termsAndConditions, setTermsAndConditions] = useState(settings.termsAndConditions);
  const [warrantyNotes, setWarrantyNotes] = useState(settings.warrantyDisclaimer);
  const [notes, setNotes] = useState('');
  const [accessoriesMode, setAccessoriesMode] = useState<'ITEMIZED' | 'LUMP_SUM'>('ITEMIZED');
  const [deductFromInventory, setDeductFromInventory] = useState<boolean>(true);
  const [submitAction, setSubmitAction] = useState<'SAVE' | 'SEND' | 'WHATSAPP'>('SAVE');
  const [barcodeScanInput, setBarcodeScanInput] = useState('');
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Scan or lookup product by barcode and add/increment in items list
  const handleScanBarcodeToInvoice = (codeToScan: string) => {
    let clean = codeToScan.trim();
    if (!clean) return;

    // Clean up QR code URLs or prefix data if scanned from URL QR
    if (clean.includes('/')) {
      const parts = clean.split('/');
      clean = parts[parts.length - 1] || clean;
    }
    const cleanLower = clean.toLowerCase();

    const found = products.find((p) => 
      p.code?.toLowerCase() === cleanLower ||
      p.barcode?.toLowerCase() === cleanLower ||
      p.model?.toLowerCase() === cleanLower ||
      p.name.toLowerCase().includes(cleanLower)
    );

    if (found) {
      playScannerSuccessBeep();
      // Check if product is already in items list
      const existingIndex = items.findIndex((itm) => itm.productId === found.id);
      if (existingIndex >= 0) {
        const newItems = [...items];
        const newQty = (newItems[existingIndex].quantity || 1) + 1;
        newItems[existingIndex].quantity = newQty;
        newItems[existingIndex].total = newQty * newItems[existingIndex].unitPrice;
        setItems(newItems);
        setScanMessage(`+1 Added: ${found.name} (Total: ${newQty} ${found.unit})`);
      } else {
        const newItem: InvoiceItem = {
          id: `item-${Date.now()}`,
          productId: found.id,
          description: found.name,
          category: found.category,
          brand: found.brand,
          specs: found.specs,
          warrantyPeriod: found.warrantyYears ? `${found.warrantyYears} Years Warranty` : '',
          unit: found.unit,
          unitPrice: found.sellingPrice,
          costPrice: found.costPrice,
          quantity: 1,
          discountPercent: 0,
          total: found.sellingPrice,
        };
        // If first item is empty, replace it
        if (items.length === 1 && !items[0].description && items[0].total === 0) {
          setItems([newItem]);
        } else {
          setItems([...items, newItem]);
        }
        setScanMessage(`Scanned: ${found.name} (${formatCurrency(found.sellingPrice, settings.currency, settings.currencyPosition)})`);
      }
      setBarcodeScanInput('');
      setTimeout(() => setScanMessage(null), 3000);
    } else {
      playScannerErrorBeep();
      setScanMessage(`Material with code "${codeToScan}" not found in catalog.`);
      setTimeout(() => setScanMessage(null), 3500);
    }
  };

  // External hardware barcode / QR scanner listener (Wedge mode: rapid keystrokes ending with Enter)
  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleHardwareScan = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // If user is focused on a standard text input/textarea other than barcode scanner input, don't capture unless keystrokes are superfast (< 40ms)
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 2) {
          handleScanBarcodeToInvoice(buffer);
          buffer = '';
          e.preventDefault();
        }
      } else if (e.key.length === 1) {
        if (timeDiff > 80) {
          buffer = e.key;
        } else {
          buffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleHardwareScan);
    return () => window.removeEventListener('keydown', handleHardwareScan);
  }, [isOpen, products, items, settings]);

  // Track open state and active invoice id so we ONLY reset when opening a new/different invoice
  const prevIsOpenRef = useRef(false);
  const activeInvoiceIdRef = useRef<string | null>(null);

  // Initialize or reset form
  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    const isDifferentInvoice = isOpen && existingInvoice && existingInvoice.id !== activeInvoiceIdRef.current;
    const isSwitchingToNew = isOpen && !existingInvoice && activeInvoiceIdRef.current !== null && activeInvoiceIdRef.current !== 'NEW_DRAFT';

    prevIsOpenRef.current = isOpen;

    if (!isOpen) {
      activeInvoiceIdRef.current = null;
      return;
    }

    if (!isOpening && !isDifferentInvoice && !isSwitchingToNew) {
      // Modal is actively open and being edited.
      // Prevent resetting the user's added items/accessories when background sync or settings change!
      return;
    }

    activeInvoiceIdRef.current = existingInvoice?.id || 'NEW_DRAFT';

    if (existingInvoice) {
      setDocType(existingInvoice.type);
      setInvoiceNumber(existingInvoice.invoiceNumber);
      setSelectedCustomerId(existingInvoice.customerId || '');
      setCustomerName(existingInvoice.customerName);
      setCustomerPhone(existingInvoice.customerPhone);
      setCustomerEmail(existingInvoice.customerEmail || '');
      setCustomerAddress(existingInvoice.customerAddress || '');
      setCustomerCity(existingInvoice.customerCity || '');
      
      setProjectSystemCapacityKw(existingInvoice.projectSystemCapacityKw);
      setSystemType(existingInvoice.systemType || 'ON_GRID');
      setInstallationAddress(existingInvoice.installationAddress || existingInvoice.customerAddress || '');

      setDate(existingInvoice.date);
      setDueDate(existingInvoice.dueDate || existingInvoice.date);
      setItems(
        existingInvoice.items && existingInvoice.items.length > 0
          ? existingInvoice.items.map((it) => ({
              ...it,
              productId: it.productId || '',
              category: it.category || 'SOLAR_PANELS',
              brand: it.brand || '',
              specs: it.specs || '',
              serialNumbers: it.serialNumbers || '',
              warrantyPeriod: it.warrantyPeriod || '',
            }))
          : [createEmptyItem()]
      );
      setHasTradeIn(Boolean(existingInvoice.hasTradeIn || (existingInvoice.tradeInItems && existingInvoice.tradeInItems.length > 0)));
      setTradeInItems(
        existingInvoice.tradeInItems && existingInvoice.tradeInItems.length > 0
          ? existingInvoice.tradeInItems
          : [createEmptyTradeInItem()]
      );
      setTaxPercent(existingInvoice.taxPercent || 0);
      setShippingOrFreight(existingInvoice.shippingOrFreight || 0);
      setInstallationCharge(existingInvoice.installationCharge || 0);
      setPaidAmount(existingInvoice.paidAmount || 0);
      setTermsAndConditions(existingInvoice.termsAndConditions || settings.termsAndConditions);
      setWarrantyNotes(existingInvoice.warrantyNotes || settings.warrantyDisclaimer);
      setNotes(existingInvoice.notes || '');
      setAccessoriesMode(existingInvoice.accessoriesMode || 'ITEMIZED');
      setDeductFromInventory(
        existingInvoice.deductFromInventory !== undefined
          ? Boolean(existingInvoice.deductFromInventory)
          : (existingInvoice.type !== 'QUOTATION')
      );
    } else {
      // Create new draft
      const prefix = docType === 'QUOTATION' ? settings.quotationPrefix : settings.invoicePrefix;
      setInvoiceNumber(`${prefix}${Math.floor(1000 + Math.random() * 9000)}`);
      setDeductFromInventory(docType !== 'QUOTATION');
      setSelectedCustomerId('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerAddress('');
      setCustomerCity('');
      setProjectSystemCapacityKw(undefined);
      setSystemType('ON_GRID');
      setInstallationAddress('');
      setDate(new Date().toISOString().split('T')[0]);
      setDueDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      
      // Default initial solar panel item
      setItems([createEmptyItem()]);
      setAccessoriesMode('ITEMIZED');
      setHasTradeIn(false);
      setTradeInItems([createEmptyTradeInItem()]);
      setTaxPercent(0);
      setShippingOrFreight(0);
      setInstallationCharge(0);
      setPaidAmount(0);
      setPaymentRef('');
      setTermsAndConditions(settings.termsAndConditions);
      setWarrantyNotes(settings.warrantyDisclaimer);
      setNotes('');
    }
  }, [existingInvoice, isOpen]);

  function createEmptyTradeInItem(): InvoiceTradeInItem {
    return {
      id: `tradein-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      description: '',
      brand: '',
      model: '',
      serialNumber: '',
      condition: 'GOOD',
      valuationPrice: 0,
      quantity: 1,
      notes: '',
    };
  }

  function createEmptyItem(category: ProductCategory = 'SOLAR_PANELS', desc = '', unit = 'Pcs'): InvoiceItem {
    return {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: '',
      description: desc,
      quantity: 1,
      unit: unit,
      unitPrice: 0,
      costPrice: 0,
      discountPercent: 0,
      total: 0,
      category: category,
      brand: '',
      specs: '',
      serialNumbers: '',
      warrantyPeriod: category === 'ACCESSORIES' ? '1-Year Standard Warranty' : '12-Year Product / 25-Year Performance',
    };
  }

  // Handle Trade-in Item Operations
  const handleAddTradeInItem = () => {
    setTradeInItems([...tradeInItems, createEmptyTradeInItem()]);
  };

  const handleTradeInChange = (index: number, field: keyof InvoiceTradeInItem, value: any) => {
    const newItems = [...tradeInItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setTradeInItems(newItems);
  };

  const handleRemoveTradeInItem = (index: number) => {
    if (tradeInItems.length <= 1) {
      setTradeInItems([createEmptyTradeInItem()]);
      setHasTradeIn(false);
      return;
    }
    setTradeInItems(tradeInItems.filter((_, i) => i !== index));
  };

  // Handle customer dropdown select
  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const found = customers.find((c) => c.id === customerId);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone);
      setCustomerEmail(found.email || '');
      setCustomerAddress(found.address || '');
      setCustomerCity(found.city || '');
      if (found.installedCapacityKw) {
        setProjectSystemCapacityKw(found.installedCapacityKw);
      }
      if (found.systemType) {
        setSystemType(found.systemType as any);
      }
      if (found.address) {
        setInstallationAddress(found.address);
      }
    }
  };

  // Add Equipment Item
  const handleAddItem = (category: ProductCategory = 'SOLAR_PANELS', desc = '', unit = 'Pcs') => {
    setItems([...items, createEmptyItem(category, desc, unit)]);
  };

  // Option 1: Add Individual Accessory (Itemized for Installer)
  const handleAddInstallerAccessory = () => {
    setItems([
      ...items,
      createEmptyItem('ACCESSORIES', '', 'Pcs'),
    ]);
  };
  const handleAddAccessory = handleAddInstallerAccessory;

  // Option 2: Add Lump Sum Accessories Package (Consolidated for Customer)
  const handleAddLumpSumAccessories = () => {
    setAccessoriesMode('LUMP_SUM');
    const existingLumpSum = items.find(
      (it) => it.category === 'ACCESSORIES' && (it.unit === 'Package' || it.description.toLowerCase().includes('lump sum') || it.description.toLowerCase().includes('package'))
    );
    if (existingLumpSum) {
      alert('A lump-sum accessories package line already exists in this invoice.');
      return;
    }
    const newLumpSumItem: InvoiceItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: '',
      description: 'Complete Solar Installation Accessories & Balance of System (BOS) Package (Cables, Breakers, SPDs, Connectors & Clamps)',
      category: 'ACCESSORIES',
      quantity: 1,
      unit: 'Package',
      unitPrice: 0,
      costPrice: 0,
      discountPercent: 0,
      total: 0,
      brand: 'Standard Solar BoS',
      specs: 'Complete DC/AC Cabling, Breaker Protection & Mounting Hardware Package',
      serialNumbers: '',
      warrantyPeriod: '1-Year Standard Installation Warranty',
    };
    setItems([...items, newLumpSumItem]);
  };

  // Select Product from Catalog
  const handleSelectProduct = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const newItems = [...items];
    const defaultQty = product.category === 'SOLAR_PANELS' ? (projectSystemCapacityKw ? Math.ceil((projectSystemCapacityKw * 1000) / (product.wattageRating || 585)) : 10) : 1;
    
    newItems[index] = {
      ...newItems[index],
      productId: product.id,
      description: product.name,
      category: product.category,
      brand: product.brand,
      specs: product.specs,
      warrantyPeriod: product.warrantyYears ? `${product.warrantyYears} Years Warranty` : '',
      unit: product.unit,
      unitPrice: product.sellingPrice,
      costPrice: product.costPrice,
      quantity: defaultQty,
      total: defaultQty * product.sellingPrice,
    };
    setItems(newItems);
  };

  // Update Item Fields
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-recalculate line total
    const qty = Number(newItems[index].quantity) || 0;
    const price = Number(newItems[index].unitPrice) || 0;
    const disc = Number(newItems[index].discountPercent) || 0;
    const itemSubtotal = qty * price;
    newItems[index].total = Math.max(0, itemSubtotal - (itemSubtotal * (disc / 100)));

    setItems(newItems);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('Invoice must have at least one line item.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Totals calculations
  const tradeInTotal = hasTradeIn 
    ? tradeInItems.reduce((acc, t) => acc + ((Number(t.valuationPrice) || 0) * (Number(t.quantity) || 1)), 0)
    : 0;

  const subtotal = items.reduce((acc, itm) => acc + (itm.quantity * itm.unitPrice), 0);
  const totalItemLevelTotal = items.reduce((acc, itm) => acc + itm.total, 0);
  const discountTotal = Math.max(0, subtotal - totalItemLevelTotal);
  const taxableBase = Math.max(0, totalItemLevelTotal - tradeInTotal);
  const taxAmount = (taxableBase * (taxPercent / 100));
  const grandTotal = Math.max(0, Math.round((totalItemLevelTotal - tradeInTotal + taxAmount + Number(shippingOrFreight || 0) + Number(installationCharge || 0)) * 100) / 100);
  const balanceDue = Math.max(0, grandTotal - paidAmount);

  let status: PaymentStatus = 'UNPAID';
  if (paidAmount >= grandTotal && grandTotal > 0) {
    status = 'PAID';
  } else if (paidAmount > 0) {
    status = 'PARTIAL';
  } else if (new Date(dueDate) < new Date()) {
    status = 'OVERDUE';
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert('Please enter or select a customer name.');
      return;
    }

    if (items.some((itm) => !itm.description.trim())) {
      alert('Please enter a description for all line items.');
      return;
    }

    // Prepare payments log
    let paymentsLog = existingInvoice?.payments || [];
    if (!existingInvoice && paidAmount > 0) {
      paymentsLog = [
        {
          id: `pay-${Date.now()}`,
          date: date,
          amount: paidAmount,
          method: paymentMethod,
          referenceNo: paymentRef || 'Advance Deposit',
          notes: 'Advance deposit during invoice creation',
        },
      ];
    } else if (existingInvoice && paidAmount > existingInvoice.paidAmount) {
      const addedAmount = paidAmount - existingInvoice.paidAmount;
      paymentsLog.push({
        id: `pay-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        amount: addedAmount,
        method: paymentMethod,
        referenceNo: paymentRef || 'Payment Adjustment',
        notes: 'Additional payment logged via invoice editor',
      });
    }

    const validTradeInItems = hasTradeIn
      ? tradeInItems.filter((t) => t.description.trim() || Number(t.valuationPrice) > 0)
      : [];

    // Sanitize line items to ensure all fields are defined strings/numbers (no undefined values)
    const sanitizedItems: InvoiceItem[] = items.map((itm) => ({
      id: itm.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: itm.productId || '',
      description: itm.description.trim(),
      category: itm.category || 'SOLAR_PANELS',
      brand: itm.brand || '',
      specs: itm.specs || '',
      serialNumbers: itm.serialNumbers || '',
      warrantyPeriod: itm.warrantyPeriod || '',
      quantity: Number(itm.quantity) || 1,
      unit: itm.unit || 'Pcs',
      unitPrice: Number(itm.unitPrice) || 0,
      costPrice: Number(itm.costPrice) || 0,
      discountPercent: Number(itm.discountPercent) || 0,
      total: Number(itm.total) || 0,
    }));

    const newInvoice: Invoice = {
      id: existingInvoice?.id || `inv-${Date.now()}`,
      invoiceNumber,
      type: docType,
      date,
      dueDate,
      customerId: selectedCustomerId || undefined,
      customerName,
      customerPhone,
      customerEmail: customerEmail || undefined,
      customerAddress: customerAddress || undefined,
      customerCity: customerCity || undefined,
      
      projectSystemCapacityKw: projectSystemCapacityKw ? Number(projectSystemCapacityKw) : undefined,
      systemType,
      installationAddress: installationAddress || customerAddress,

      items: sanitizedItems,
      hasTradeIn: hasTradeIn && validTradeInItems.length > 0,
      tradeInItems: validTradeInItems,
      tradeInTotal,

      subtotal,
      discountTotal,
      taxPercent,
      taxAmount,
      shippingOrFreight: Number(shippingOrFreight || 0),
      installationCharge: Number(installationCharge || 0),
      grandTotal,
      paidAmount,
      balanceDue,
      status,
      payments: paymentsLog,
      accessoriesMode,
      deductFromInventory,
      inventoryDeducted: existingInvoice?.inventoryDeducted,
      termsAndConditions,
      warrantyNotes,
      notes,
      createdAt: existingInvoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const handleSaveAndClose = () => {
      onSave(newInvoice);

      if (status === 'PAID') {
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#f59e0b', '#10b981', '#3b82f6', '#fbbf24'],
          });
        } catch {
          // ignore
        }
      }

      onClose();

      if (submitAction === 'WHATSAPP') {
        const msg = buildWhatsAppMessage(newInvoice, settings);
        openWhatsApp(customerPhone, msg);
        if (onSaveAndWhatsApp) {
          onSaveAndWhatsApp(newInvoice);
        }
      } else if (submitAction === 'SEND' && onSaveAndSend) {
        onSaveAndSend(newInvoice);
      }
    };

    handleSaveAndClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingInvoice ? `Edit ${existingInvoice.invoiceNumber}` : 'Create Solar Invoice / Quotation'}
      subtitle="Configure customer proposal, equipment bill of materials (BOM), and financials"
      maxWidth="5xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Document Header & Type */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Document Type
            </label>
            <select
              value={docType}
              onChange={(e) => {
                const newType = e.target.value as InvoiceType;
                setDocType(newType);
                if (!existingInvoice) {
                  const prefix = newType === 'QUOTATION' ? settings.quotationPrefix : settings.invoicePrefix;
                  setInvoiceNumber(`${prefix}${Math.floor(1000 + Math.random() * 9000)}`);
                  setDeductFromInventory(newType !== 'QUOTATION');
                }
              }}
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-none"
            >
              <option value="INVOICE">Tax / Final Invoice</option>
              <option value="QUOTATION">Solar Proposal / Quotation</option>
              <option value="PROFORMA">Proforma Invoice</option>
              <option value="WARRANTY_CERT">Installation Warranty Card</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Invoice / Quote #
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none font-mono"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Issue Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Valid Till / Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Customer & Solar Project Information */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Customer CRM section */}
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Customer Profile
                </span>
              </div>

              {customers.length > 0 && (
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-700 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">-- Quick-fill Client --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city || 'Client'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Client Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Dr. Arthur Mitchell"
                  className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Phone / WhatsApp *</label>
                  <span className="text-[9px] text-emerald-700 font-semibold">🇵🇰 Auto +92</span>
                </div>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 0300 1234567"
                  className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Email Address</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="client@email.com"
                  className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">City / Region</label>
                <input
                  type="text"
                  value={customerCity}
                  onChange={(e) => setCustomerCity(e.target.value)}
                  placeholder="e.g. Phoenix, AZ"
                  className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-500">Billing Address</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Street address, building, plot #"
                  className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Solar Project & System Specs */}
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-xs">
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Solar System Technical Details
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Array Capacity (kW)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={projectSystemCapacityKw || ''}
                  onChange={(e) => setProjectSystemCapacityKw(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="e.g. 10.5"
                  className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">System Architecture</label>
                <select
                  value={systemType}
                  onChange={(e) => setSystemType(e.target.value as any)}
                  className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
                >
                  <option value="ON_GRID">On-Grid (Grid-Tied)</option>
                  <option value="HYBRID">Hybrid (Battery Backup)</option>
                  <option value="OFF_GRID">Off-Grid (Standalone)</option>
                  <option value="SOLAR_PUMP">Solar Tubewell Pump</option>
                  <option value="COMMERCIAL_ROOFTOP">Commercial Rooftop</option>
                  <option value="RESIDENTIAL_ROOFTOP">Residential Rooftop</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Installation / Mounting Site Address
                </label>
                <input
                  type="text"
                  value={installationAddress}
                  onChange={(e) => setInstallationAddress(e.target.value)}
                  placeholder="Physical site location where panels will be installed"
                  className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Itemized Solar Bill of Materials (BOM) */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-amber-500" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                Equipment & Labor Bill of Materials (BOM)
              </h4>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Barcode Scan Input for Invoice Line Items */}
              <div className="flex items-center gap-1">
                <div className="relative">
                  <Scan className="absolute left-2 top-2 h-3.5 w-3.5 text-emerald-600" />
                  <input
                    type="text"
                    value={barcodeScanInput}
                    onChange={(e) => setBarcodeScanInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleScanBarcodeToInvoice(barcodeScanInput);
                      }
                    }}
                    placeholder="Scan SKU / Barcode..."
                    className="h-7 w-48 rounded border border-emerald-300 bg-white pl-7 pr-2 text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none shadow-2xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleScanBarcodeToInvoice(barcodeScanInput)}
                  className="h-7 rounded bg-emerald-600 px-2 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-2xs"
                  title="Scan / Lookup Item"
                >
                  Add
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleAddItem('SOLAR_PANELS')}
                className="flex items-center gap-1 rounded bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>+ Equipment</span>
              </button>

              <button
                type="button"
                onClick={handleAddInstallerAccessory}
                className="flex items-center gap-1 rounded bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 border border-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
                title="Option 1: Add individual itemized accessories for installer team"
              >
                <Plus className="h-3 w-3 text-slate-600" />
                <span>+ Installer Accessory (Itemized)</span>
              </button>

              <button
                type="button"
                onClick={handleAddLumpSumAccessories}
                className="flex items-center gap-1 rounded bg-amber-400 px-2.5 py-1 text-xs font-bold text-slate-950 hover:bg-amber-500 transition-colors cursor-pointer shadow-2xs"
                title="Option 2: Add consolidated lump sum accessories package for customer"
              >
                <PackagePlus className="h-3.5 w-3.5 text-slate-900" />
                <span>+ Customer Accessories (Lump Sum)</span>
              </button>
            </div>
          </div>

          {/* Dual Accessories Option Bar */}
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between px-3 py-2 rounded-md bg-amber-50/70 border border-amber-200/80 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-amber-950">Accessories Print Presentation:</span>
              <span className="text-[10px] text-amber-800">
                {accessoriesMode === 'LUMP_SUM' 
                  ? 'Showing consolidated lump sum package to customer' 
                  : 'Showing detailed itemized breakdown for installer'}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-amber-300 shadow-2xs">
              <button
                type="button"
                onClick={() => setAccessoriesMode('LUMP_SUM')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  accessoriesMode === 'LUMP_SUM'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Customer copy: Consolidates accessories into a single lump-sum package line"
              >
                2) Lump Sum for Customer
              </button>
              <button
                type="button"
                onClick={() => setAccessoriesMode('ITEMIZED')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  accessoriesMode === 'ITEMIZED'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Installer copy: Shows every accessory itemized with individual counts and prices"
              >
                1) Itemized for Installer
              </button>
            </div>
          </div>

          {/* Auto-Deduct Sold Stock from Solar Inventory Banner */}
          <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between px-3.5 py-2.5 rounded-lg border text-xs transition-colors shadow-2xs ${
            deductFromInventory 
              ? 'bg-emerald-50/90 border-emerald-300' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`flex h-7 w-7 items-center justify-center rounded text-white shadow-2xs shrink-0 ${
                deductFromInventory ? 'bg-emerald-600' : 'bg-slate-400'
              }`}>
                <Boxes className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">
                    Auto-Deduct Sold Stock from Solar Inventory:
                  </span>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded border ${
                    deductFromInventory 
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}>
                    {deductFromInventory ? 'ACTIVE (Will Deduct Stock)' : 'OFF (Quotation / Estimate)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {deductFromInventory 
                    ? 'Upon saving this invoice, sold equipment quantities will automatically decrease warehouse inventory and log an outbound dispatch record.'
                    : 'Quotation / Draft mode: Stock will not be deducted until confirmed as an active invoice sale.'}
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer mt-2 sm:mt-0 shrink-0">
              <input
                type="checkbox"
                checked={deductFromInventory}
                onChange={(e) => setDeductFromInventory(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Quick Scan Toast */}
          {scanMessage && (
            <div className="flex items-center gap-2 rounded bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-900 animate-fadeIn">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{scanMessage}</span>
            </div>
          )}

          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={item.id || index}
                className="rounded-md border border-slate-200 bg-white p-3 space-y-2 shadow-xs"
              >
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  {/* Quick Select from Catalog */}
                  <div className="lg:w-1/3">
                    <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">
                      Select From Catalog
                    </label>
                    <select
                      value={item.productId || ''}
                      onChange={(e) => handleSelectProduct(index, e.target.value)}
                      className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">-- Choose Equipment --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.stockQty} {p.unit}) - {formatCurrency(p.sellingPrice, settings.currency, settings.currencyPosition)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div className="flex-1">
                    <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">
                      Item Description *
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="e.g. 585W Bifacial Solar Panel Tier-1"
                      className="w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Quantity & Unit */}
                  <div className="w-20">
                    <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">
                      Qty
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-900 text-center focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Unit */}
                  <div className="w-20">
                    <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      placeholder="Pcs, kW"
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 text-center focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="w-24">
                    <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">
                      Unit Price
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-900 text-right focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Line Total */}
                  <div className="w-24 text-right">
                    <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">
                      Total
                    </label>
                    <p className="py-1 text-xs font-bold text-slate-900">
                      {formatCurrency(item.total, settings.currency, settings.currencyPosition)}
                    </p>
                  </div>

                  {/* Delete Button */}
                  <div className="pt-2 lg:pt-3">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sub-row for Category, Serial Numbers & Warranty Note */}
                <div className="grid grid-cols-1 gap-2 pt-1.5 border-t border-slate-100 sm:grid-cols-3">
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">
                      Category
                    </label>
                    <select
                      value={item.category || 'ACCESSORIES'}
                      onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                      className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-700 focus:border-amber-500 focus:outline-none"
                    >
                      {getAllCategories(settings).map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">
                      Serial Numbers (Optional)
                    </label>
                    <input
                      type="text"
                      value={item.serialNumbers || ''}
                      onChange={(e) => handleItemChange(index, 'serialNumbers', e.target.value)}
                      placeholder="e.g. SN-9988102, SN-9988103"
                      className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">
                      Warranty
                    </label>
                    <input
                      type="text"
                      value={item.warrantyPeriod || ''}
                      onChange={(e) => handleItemChange(index, 'warrantyPeriod', e.target.value)}
                      placeholder="e.g. 1-Year / 25-Year Performance"
                      className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Live Inventory Stock Status Badge */}
                {(() => {
                  const matchedProduct = products.find(
                    (p) => p.id === item.productId || (item.description && p.name.trim().toLowerCase() === item.description.trim().toLowerCase())
                  );
                  if (!matchedProduct) return null;
                  const isExceeded = (Number(item.quantity) || 0) > matchedProduct.stockQty;

                  return (
                    <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-100 text-[10px]">
                      <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded ${
                        matchedProduct.stockQty > 0 
                          ? 'bg-slate-100 text-slate-800 border border-slate-200' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        <Boxes className="h-3 w-3 text-slate-500" />
                        <span>Warehouse Stock: </span>
                        <strong className={matchedProduct.stockQty > 0 ? 'text-slate-900' : 'text-rose-600'}>
                          {matchedProduct.stockQty} {matchedProduct.unit}
                        </strong>
                      </span>

                      {deductFromInventory && (
                        <span className="text-[10px] font-medium text-emerald-700 flex items-center gap-0.5">
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                          <span>Will deduct {item.quantity || 0} {item.unit || matchedProduct.unit} from inventory</span>
                        </span>
                      )}

                      {isExceeded && deductFromInventory && (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">
                          <AlertCircle className="h-2.5 w-2.5 text-amber-600" />
                          <span>Selling qty ({item.quantity}) exceeds warehouse stock ({matchedProduct.stockQty} {matchedProduct.unit})</span>
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>

        {/* Old Equipment Exchange / Trade-In Buyback Section */}
        <div className="rounded-lg border border-amber-300 bg-amber-50/40 p-3.5 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500 text-white shadow-2xs">
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-950">
                    Old Equipment Exchange / Trade-In Buyback
                  </h4>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">
                    Client Trade-In Credit
                  </span>
                </div>
                <p className="text-[10px] text-amber-800">
                  Trade in client's old inverter, panels, or batteries and mention both new & old prices on the invoice.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasTradeIn}
                  onChange={(e) => {
                    setHasTradeIn(e.target.checked);
                    if (e.target.checked && tradeInItems.length === 0) {
                      setTradeInItems([createEmptyTradeInItem()]);
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                <span className="ml-2 text-xs font-bold text-slate-800">
                  {hasTradeIn ? 'Exchange Enabled' : 'Enable Exchange'}
                </span>
              </label>

              {hasTradeIn && (
                <button
                  type="button"
                  onClick={handleAddTradeInItem}
                  className="flex items-center gap-1 rounded bg-white px-2.5 py-1 text-xs font-bold text-amber-900 border border-amber-300 hover:bg-amber-100/80 transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Old Item</span>
                </button>
              )}
            </div>
          </div>

          {hasTradeIn && (
            <div className="space-y-2.5">
              {tradeInItems.map((trade, idx) => (
                <div
                  key={trade.id || idx}
                  className="rounded-md border border-amber-200 bg-white p-3 space-y-2 shadow-xs"
                >
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 items-end">
                    {/* Old Equipment Description */}
                    <div className="sm:col-span-4">
                      <label className="text-[9px] font-bold uppercase text-slate-600 block mb-0.5">
                        Old Equipment Description *
                      </label>
                      <input
                        type="text"
                        value={trade.description}
                        onChange={(e) => handleTradeInChange(idx, 'description', e.target.value)}
                        placeholder="e.g. Old Fronus 3.2kW Solar Inverter"
                        className="w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* Brand / Model */}
                    <div className="sm:col-span-2">
                      <label className="text-[9px] font-bold uppercase text-slate-600 block mb-0.5">
                        Brand / Model
                      </label>
                      <input
                        type="text"
                        value={trade.brand || ''}
                        onChange={(e) => handleTradeInChange(idx, 'brand', e.target.value)}
                        placeholder="e.g. Fronus / 3.2k"
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* Condition */}
                    <div className="sm:col-span-2">
                      <label className="text-[9px] font-bold uppercase text-slate-600 block mb-0.5">
                        Working Condition
                      </label>
                      <select
                        value={trade.condition || 'GOOD'}
                        onChange={(e) => handleTradeInChange(idx, 'condition', e.target.value)}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
                      >
                        <option value="WORKING">Working / Good</option>
                        <option value="EXCELLENT">Like New / Mint</option>
                        <option value="FAIR">Fair / Minor Fault</option>
                        <option value="FAULTY">Faulty / Needs Repair</option>
                        <option value="SCRAP">Scrap / Salvage</option>
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="sm:col-span-1">
                      <label className="text-[9px] font-bold uppercase text-slate-600 block mb-0.5">
                        Qty
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={trade.quantity || 1}
                        onChange={(e) => handleTradeInChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-center text-slate-900 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* Agreed Buyback / Valuation Price */}
                    <div className="sm:col-span-2">
                      <label className="text-[9px] font-bold uppercase text-emerald-800 block mb-0.5">
                        Exchange Credit Value *
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={trade.valuationPrice}
                        onChange={(e) => handleTradeInChange(idx, 'valuationPrice', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full rounded border border-emerald-300 bg-emerald-50/50 px-2 py-1 text-xs font-bold text-right text-emerald-900 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* Delete button */}
                    <div className="sm:col-span-1 flex justify-center pb-1">
                      <button
                        type="button"
                        onClick={() => handleRemoveTradeInItem(idx)}
                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Remove old trade-in equipment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sub-row for Serial Number and Notes */}
                  <div className="grid grid-cols-1 gap-2 pt-1 border-t border-slate-100 sm:grid-cols-2">
                    <div>
                      <input
                        type="text"
                        value={trade.serialNumber || ''}
                        onChange={(e) => handleTradeInChange(idx, 'serialNumber', e.target.value)}
                        placeholder="Old Serial # (e.g. SN-OLD-78219)"
                        className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={trade.notes || ''}
                        onChange={(e) => handleTradeInChange(idx, 'notes', e.target.value)}
                        placeholder="Condition notes / remarks (e.g. Tested on load, 3 years old)"
                        className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-700 placeholder-slate-400 focus:border-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Instant Exchange Impact Card */}
              <div className="flex flex-col sm:flex-row items-center justify-between rounded-lg bg-amber-100/70 border border-amber-300 px-3.5 py-2 text-xs">
                <div className="flex items-center gap-2 text-amber-950 font-medium">
                  <RefreshCw className="h-4 w-4 text-amber-700" />
                  <span>
                    New Hardware: <strong>{formatCurrency(subtotal, settings.currency, settings.currencyPosition)}</strong>
                  </span>
                  <span className="text-amber-600">➔</span>
                  <span>
                    Less Old Trade-in Credit: <strong className="text-emerald-800 font-mono">-{formatCurrency(tradeInTotal, settings.currency, settings.currencyPosition)}</strong>
                  </span>
                </div>
                <div className="text-right mt-1 sm:mt-0">
                  <span className="text-[11px] font-bold text-amber-900 uppercase">Net Equipment Cost: </span>
                  <strong className="text-xs font-black text-slate-900 font-mono">
                    {formatCurrency(Math.max(0, subtotal - tradeInTotal), settings.currency, settings.currencyPosition)}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Invoice Summary & Financial Calculation */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Notes & Terms */}
          <div className="space-y-2.5">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Payment Terms & Project Conditions
              </label>
              <textarea
                rows={2}
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                className="mt-0.5 w-full rounded border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Warranty & Commissioning Terms
              </label>
              <textarea
                rows={2}
                value={warrantyNotes}
                onChange={(e) => setWarrantyNotes(e.target.value)}
                className="mt-0.5 w-full rounded border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Totals Calculation Box */}
          <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>New Equipment Subtotal:</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(subtotal, settings.currency, settings.currencyPosition)}
              </span>
            </div>

            {discountTotal > 0 && (
              <div className="flex items-center justify-between text-xs text-emerald-600">
                <span>Total Line Discounts:</span>
                <span>-{formatCurrency(discountTotal, settings.currency, settings.currencyPosition)}</span>
              </div>
            )}

            {hasTradeIn && tradeInTotal > 0 && (
              <div className="flex items-center justify-between text-xs font-bold text-amber-900 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                <span className="flex items-center gap-1">
                  <ArrowLeftRight className="h-3 w-3 text-amber-700" />
                  <span>Less Old Equipment Exchange Credit:</span>
                </span>
                <span className="font-mono text-emerald-800">
                  -{formatCurrency(tradeInTotal, settings.currency, settings.currencyPosition)}
                </span>
              </div>
            )}

            {/* Installation Charges */}
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span>Installation & Engineering:</span>
              <div className="w-28">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={installationCharge}
                  onChange={(e) => setInstallationCharge(parseFloat(e.target.value) || 0)}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-right text-slate-900 font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Freight / Transport */}
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span>Freight & Transportation:</span>
              <div className="w-28">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={shippingOrFreight}
                  onChange={(e) => setShippingOrFreight(parseFloat(e.target.value) || 0)}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-right text-slate-900 font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Tax Rate */}
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span>Tax / VAT Rate (%):</span>
              <div className="w-20">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-right text-slate-900 font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-sm font-bold text-slate-900">
              <span>Grand Total:</span>
              <span className="text-base text-slate-900 font-extrabold">
                {formatCurrency(grandTotal, settings.currency, settings.currencyPosition)}
              </span>
            </div>

            {/* Advance / Payment Record */}
            <div className="rounded border border-slate-200 bg-slate-50 p-2.5 space-y-1.5 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Paid / Received:</span>
                <div className="w-32">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max={grandTotal}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-emerald-300 bg-white px-2 py-0.5 text-xs font-bold text-emerald-700 text-right focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {paidAmount > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-700"
                  >
                    <option value="BANK_TRANSFER">Bank Wire</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="ONLINE">Online</option>
                  </select>

                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="Ref / Trx ID"
                    className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-700"
                  />
                </div>
              )}

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                <span className="font-semibold text-slate-500">Balance Due:</span>
                <span className={`font-bold ${balanceDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {formatCurrency(balanceDue, settings.currency, settings.currencyPosition)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            onClick={() => setSubmitAction('SAVE')}
            className="flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <Save className="h-3.5 w-3.5 text-slate-600" />
            <span>Save Invoice</span>
          </button>

          <button
            type="submit"
            onClick={() => setSubmitAction('WHATSAPP')}
            className="flex items-center gap-1.5 rounded bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Save & Share via WhatsApp</span>
          </button>

          {onSaveAndSend && (
            <button
              type="submit"
              onClick={() => setSubmitAction('SEND')}
              className="flex items-center gap-1.5 rounded border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 shadow-2xs transition-colors cursor-pointer"
            >
              <Send className="h-3.5 w-3.5 text-amber-700" />
              <span>More Send Options</span>
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};
