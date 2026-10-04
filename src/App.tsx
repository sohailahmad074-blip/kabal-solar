import React, { useState, useEffect, useRef } from 'react';
import { 
  getInvoices, saveInvoices,
  getPurchaseOrders, savePurchaseOrders,
  getCustomers, saveCustomers,
  getExpenses, saveExpenses,
  getProducts, saveProducts,
  getSuppliers, saveSuppliers,
  getShopSettings, saveShopSettings,
  getStockMovements, saveStockMovements,
  resetToSampleData
} from './utils/storage';
import { 
  Invoice, 
  PurchaseOrder, 
  Customer, 
  Expense, 
  ProductItem, 
  Supplier, 
  ShopSettings, 
  TabType,
  PaymentMethod,
  PaymentRecord,
  StockMovement,
  UserRole
} from './types/solar';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { RoleSwitchModal } from './components/auth/RoleSwitchModal';

import { InvoiceList } from './components/invoices/InvoiceList';
import { InvoiceEditor } from './components/invoices/InvoiceEditor';
import { InvoicePrintView } from './components/invoices/InvoicePrintView';
import { RecordPaymentModal } from './components/invoices/RecordPaymentModal';
import { SendDirectModal } from './components/invoices/SendDirectModal';
import { CustomerPortalView } from './components/invoices/CustomerPortalView';
import { InvoiceQuickShareModal } from './components/invoices/InvoiceQuickShareModal';

import { PurchasingList } from './components/purchasing/PurchasingList';
import { PurchaseOrderEditor } from './components/purchasing/PurchaseOrderEditor';
import { SupplierModal } from './components/purchasing/SupplierModal';

import { CustomerList } from './components/customers/CustomerList';
import { CustomerEditorModal } from './components/customers/CustomerEditorModal';
import { CustomerDetailModal } from './components/customers/CustomerDetailModal';
import { CustomerStatementPrintView } from './components/customers/CustomerStatementPrintView';

import { ExpenseList } from './components/expenses/ExpenseList';
import { ExpenseEditorModal } from './components/expenses/ExpenseEditorModal';

import { InventoryList } from './components/inventory/InventoryList';
import { ProductEditorModal } from './components/inventory/ProductEditorModal';
import { BarcodeScannerModal } from './components/inventory/BarcodeScannerModal';

import { SolarSystemEstimator } from './components/calculator/SolarSystemEstimator';
import { SalesReportView } from './components/reports/SalesReportView';
import { SettingsView } from './components/settings/SettingsView';
import { SecretProfitWindow } from './components/profit/SecretProfitWindow';
import { CloudSyncModal } from './components/sync/CloudSyncModal';
import { GitHubPublishModal } from './components/sync/GitHubPublishModal';
import { 
  pushFullStateToCloud, 
  pushToServerRelay,
  fetchCloudState, 
  subscribeToCloudWorkspace, 
  SyncStatus, 
  getDeviceId,
  getDeviceName,
  getDeviceType,
  checkStoredQuotaStatus,
  isQuotaExceeded,
  resetQuotaExceededFlag,
  FIREBASE_CONSOLE_UPGRADE_URL,
  broadcastLocalState,
  computeDataSignature,
  setLastAppliedHash,
  mergeInvoicesWithLocal
} from './services/cloudSync';

export function App() {
  // User Role & Access State (Owner vs Partner)
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const roleParam = urlParams.get('role');
      if (roleParam === 'partner') return 'PARTNER';
      if (roleParam === 'owner') return 'OWNER';
      const saved = localStorage.getItem('solarcraft_active_role');
      if (saved === 'PARTNER') return 'PARTNER';
    } catch {
      // ignore
    }
    return 'OWNER';
  });
  const [isRoleSwitchModalOpen, setIsRoleSwitchModalOpen] = useState(false);

  // Main Navigation state (defaults to INVENTORY if Partner)
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('role') === 'partner') return 'INVENTORY';
      const saved = localStorage.getItem('solarcraft_active_role');
      if (saved === 'PARTNER') return 'INVENTORY';
    } catch {}
    return 'DASHBOARD';
  });

  // Partner Navigation Guard: Partner can ONLY access INVENTORY and PURCHASING
  useEffect(() => {
    if (currentRole === 'PARTNER' && activeTab !== 'INVENTORY' && activeTab !== 'PURCHASING') {
      setActiveTab('INVENTORY');
    }
  }, [currentRole, activeTab]);

  const handleSelectRole = (role: UserRole) => {
    setCurrentRole(role);
    try {
      localStorage.setItem('solarcraft_active_role', role);
      const url = new URL(window.location.href);
      if (role === 'PARTNER') {
        url.searchParams.set('role', 'partner');
      } else {
        url.searchParams.delete('role');
      }
      window.history.replaceState({}, '', url.toString());
    } catch {}

    if (role === 'PARTNER' && activeTab !== 'INVENTORY' && activeTab !== 'PURCHASING') {
      setActiveTab('INVENTORY');
    }
  };

  // Business Data states
  const [invoices, setInvoices] = useState<Invoice[]>(() => getInvoices());
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => getPurchaseOrders());
  const [customers, setCustomers] = useState<Customer[]>(() => getCustomers());
  const [expenses, setExpenses] = useState<Expense[]>(() => getExpenses());
  const [products, setProducts] = useState<ProductItem[]>(() => getProducts());
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => getSuppliers());
  const [settings, setSettings] = useState<ShopSettings>(() => getShopSettings());
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => getStockMovements());

  // Sub-views & Modals state
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);
  const [printingCustomerStatement, setPrintingCustomerStatement] = useState<Customer | null>(null);
  const [isInvoiceEditorOpen, setIsInvoiceEditorOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [quickShareInvoice, setQuickShareInvoice] = useState<Invoice | null>(null);
  const [isQuickShareOpen, setIsQuickShareOpen] = useState(false);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  const [isPOEditorOpen, setIsPOEditorOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [isCustomerEditorOpen, setIsCustomerEditorOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [isCustomerDetailOpen, setIsCustomerDetailOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

  const [isExpenseEditorOpen, setIsExpenseEditorOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [isProductEditorOpen, setIsProductEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [productEditorPrefillCode, setProductEditorPrefillCode] = useState<string | undefined>(undefined);

  // Barcode Scanner Modal State
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [barcodeScannerInitialMode, setBarcodeScannerInitialMode] = useState<'STOCK_IN' | 'STOCK_OUT' | 'LOG' | 'LABELS'>('STOCK_IN');

  // Secret Owner Profit Vault Modal State
  const [isSecretProfitOpen, setIsSecretProfitOpen] = useState(false);

  // GitHub Deploy & Publish Modal State
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);

  // Cloud Database & Multi-Device Real-Time Sync State
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('live_1s');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());
  const [isQuotaBannerDismissed, setIsQuotaBannerDismissed] = useState(false);
  const [livePingToast, setLivePingToast] = useState<{ fromDevice: string; message: string } | null>(null);
  const isInitialCloudSyncRef = useRef(true);
  const lastSyncedSignatureRef = useRef<string>('');

  // Subscribe to High-Speed Server Live Stream + Cloud Database for continuous 1-second sync
  useEffect(() => {
    resetQuotaExceededFlag();

    const unsubscribe = subscribeToCloudWorkspace(
      (cloudData, source) => {
        const sig = computeDataSignature(cloudData);
        lastSyncedSignatureRef.current = sig;
        setLastAppliedHash(sig);

        if (cloudData.settings) setSettings(cloudData.settings);
        if (cloudData.products) setProducts(cloudData.products);
        if (cloudData.customers) setCustomers(cloudData.customers);
        if (cloudData.invoices) {
          setInvoices((prev) => mergeInvoicesWithLocal(prev, cloudData.invoices!));
        }
        if (cloudData.purchaseOrders) setPurchaseOrders(cloudData.purchaseOrders);
        if (cloudData.expenses) setExpenses(cloudData.expenses);
        if (cloudData.suppliers) setSuppliers(cloudData.suppliers);
        if (cloudData.stockMovements) setStockMovements(cloudData.stockMovements);
        
        setLastSyncTime(new Date());
        setSyncStatus('live_1s');
      },
      (status) => {
        setSyncStatus(status);
      },
      (fromDevice, pingMsg) => {
        setLivePingToast({ fromDevice, message: pingMsg });
        setTimeout(() => setLivePingToast(null), 4000);
      }
    );
    return () => unsubscribe();
  }, []);

  // Instant continuous sync to server relay + cloud backup on local edits
  useEffect(() => {
    const currentSig = computeDataSignature({
      invoices,
      products,
      customers,
      suppliers,
      purchaseOrders,
      expenses,
      stockMovements,
      settings,
    });

    // Skip if incoming update from remote device or no actual data change
    if (currentSig === lastSyncedSignatureRef.current) return;

    const payload = {
      settings,
      products,
      customers,
      invoices,
      purchaseOrders,
      expenses,
      suppliers,
      stockMovements,
    };

    if (isInitialCloudSyncRef.current) {
      isInitialCloudSyncRef.current = false;
      lastSyncedSignatureRef.current = currentSig;

      // Seed server relay & cloud if currently empty, or apply cloud state if remote has latest data
      fetchCloudState().then((state) => {
        if (state && (state.invoices?.length || state.products?.length || state.customers?.length)) {
          const cloudSig = computeDataSignature(state);
          if (cloudSig !== currentSig) {
            lastSyncedSignatureRef.current = cloudSig;
            setLastAppliedHash(cloudSig);
            if (state.settings) setSettings(state.settings);
            if (state.products) setProducts(state.products);
            if (state.customers) setCustomers(state.customers);
            if (state.invoices) setInvoices((prev) => mergeInvoicesWithLocal(prev, state.invoices!));
            if (state.purchaseOrders) setPurchaseOrders(state.purchaseOrders);
            if (state.expenses) setExpenses(state.expenses);
            if (state.suppliers) setSuppliers(state.suppliers);
            if (state.stockMovements) setStockMovements(state.stockMovements);
            setLastSyncTime(new Date());
            setSyncStatus('live_1s');
          }
        } else if (!state) {
          pushToServerRelay(payload);
          pushFullStateToCloud(payload);
        }
      });
      return;
    }

    // Fast 250ms debounce for ultra-responsive live sync to Mobile
    const timer = setTimeout(() => {
      lastSyncedSignatureRef.current = currentSig;
      setLastAppliedHash(currentSig);

      // Instant local tab broadcast
      broadcastLocalState(payload);

      // Instant push to Server Live Relay (receives sub-second on mobile)
      pushToServerRelay(payload).then((res) => {
        if (res.success) {
          setLastSyncTime(new Date());
          setSyncStatus('live_1s');
        }
      });

      // Background cloud persistence to Firestore
      pushFullStateToCloud(payload).then((res) => {
        if (res.success) {
          setLastSyncTime(new Date());
        }
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [invoices, products, customers, suppliers, purchaseOrders, expenses, stockMovements, settings]);

  const handleForcePushCloud = async () => {
    setSyncStatus('syncing');
    const payload = {
      settings,
      products,
      customers,
      invoices,
      purchaseOrders,
      expenses,
      suppliers,
      stockMovements,
    };
    const serverRes = await pushToServerRelay(payload);
    const cloudRes = await pushFullStateToCloud(payload);
    setLastSyncTime(new Date());
    setSyncStatus('live_1s');
    return serverRes.success || cloudRes.success;
  };

  const handleForcePullCloud = async () => {
    setSyncStatus('syncing');
    const cloudData = await fetchCloudState();
    if (cloudData) {
      const sig = computeDataSignature(cloudData);
      lastSyncedSignatureRef.current = sig;
      setLastAppliedHash(sig);

      if (cloudData.settings) setSettings(cloudData.settings);
      if (cloudData.products) setProducts(cloudData.products);
      if (cloudData.customers) setCustomers(cloudData.customers);
      if (cloudData.invoices) {
        setInvoices((prev) => mergeInvoicesWithLocal(prev, cloudData.invoices!));
      }
      if (cloudData.purchaseOrders) setPurchaseOrders(cloudData.purchaseOrders);
      if (cloudData.expenses) setExpenses(cloudData.expenses);
      if (cloudData.suppliers) setSuppliers(cloudData.suppliers);
      if (cloudData.stockMovements) setStockMovements(cloudData.stockMovements);
      setLastSyncTime(new Date());
      setSyncStatus('live_1s');
      return true;
    }
    setSyncStatus('live_1s');
    return false;
  };

  // Global Secret Shortcut listener (Ctrl+Shift+P / Cmd+Shift+P / Alt+P)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Toggle Secret Profit Vault with Ctrl+Shift+P or Cmd+Shift+P or Alt+P
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) || 
          (e.altKey && (e.key === 'P' || e.key === 'p'))) {
        e.preventDefault();
        setIsSecretProfitOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, []);

  // Direct Customer Sharing & Portal states
  const [isSendDirectOpen, setIsSendDirectOpen] = useState(false);
  const [sendDirectInvoice, setSendDirectInvoice] = useState<Invoice | null>(null);
  const [customerPortalInvoice, setCustomerPortalInvoice] = useState<Invoice | null>(null);

  // Check URL params for direct customer portal link
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const docId = urlParams.get('doc');
      if (docId) {
        const found = invoices.find((i) => i.id === docId || i.invoiceNumber.toLowerCase() === docId.toLowerCase());
        if (found) {
          setCustomerPortalInvoice(found);
        }
      }
    } catch {
      // ignore
    }
  }, [invoices]);

  // Synchronize states to localStorage
  useEffect(() => {
    saveInvoices(invoices);
  }, [invoices]);

  useEffect(() => {
    savePurchaseOrders(purchaseOrders);
  }, [purchaseOrders]);

  useEffect(() => {
    saveCustomers(customers);
  }, [customers]);

  useEffect(() => {
    saveExpenses(expenses);
  }, [expenses]);

  useEffect(() => {
    saveProducts(products);
  }, [products]);

  useEffect(() => {
    saveSuppliers(suppliers);
  }, [suppliers]);

  useEffect(() => {
    saveShopSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveStockMovements(stockMovements);
  }, [stockMovements]);

  // Recalculate customer totals whenever invoices change
  const refreshCustomerBalances = (currentInvoices: Invoice[]) => {
    setCustomers((prevCustomers) =>
      prevCustomers.map((cust) => {
        const custInvoices = currentInvoices.filter((i) => i.customerId === cust.id);
        const totalInvoiced = custInvoices.reduce((acc, i) => acc + i.grandTotal, 0);
        const totalPaid = custInvoices.reduce((acc, i) => acc + i.paidAmount, 0);
        const balanceDue = custInvoices.reduce((acc, i) => acc + i.balanceDue, 0);
        return {
          ...cust,
          totalInvoiced,
          totalPaid,
          balanceDue,
        };
      })
    );
  };

  // --- INVOICE HANDLERS ---
  const handleSaveInvoice = (newInvoice: Invoice) => {
    let updatedInvoices: Invoice[];
    const existingIndex = invoices.findIndex((i) => i.id === newInvoice.id);
    const existingInvoice = existingIndex >= 0 ? invoices[existingIndex] : null;

    // --- AUTOMATIC SOLAR INVENTORY STOCK DEDUCTION ---
    let updatedProducts = [...products];
    let updatedMovements = [...stockMovements];
    const timestamp = new Date().toISOString();
    const actionDate = newInvoice.date || timestamp.split('T')[0];

    // 1. If an existing invoice had previously deducted inventory, restore that old inventory first
    if (existingInvoice && existingInvoice.inventoryDeducted) {
      for (const oldItem of existingInvoice.items) {
        const qty = Number(oldItem.quantity) || 0;
        if (qty <= 0) continue;
        const targetId = oldItem.productId || updatedProducts.find((p) => p.name.trim().toLowerCase() === oldItem.description.trim().toLowerCase())?.id;
        if (!targetId) continue;

        const pIndex = updatedProducts.findIndex((p) => p.id === targetId);
        if (pIndex >= 0) {
          const p = updatedProducts[pIndex];
          const restoredQty = p.stockQty + qty;
          updatedProducts[pIndex] = {
            ...p,
            stockQty: restoredQty,
            updatedAt: timestamp,
          };
        }
      }
    }

    // 2. Determine if the new/edited invoice should deduct inventory
    // Default is true for sales invoices (Tax Invoices, Proforma, Warranty Certs)
    // For quotations, only deduct if user explicitly toggled deductFromInventory === true
    const isQuotation = newInvoice.type === 'QUOTATION';
    const shouldDeduct = newInvoice.deductFromInventory !== undefined
      ? Boolean(newInvoice.deductFromInventory)
      : !isQuotation;

    if (shouldDeduct) {
      for (const newItem of newInvoice.items) {
        const qty = Number(newItem.quantity) || 0;
        if (qty <= 0) continue;

        // Find product by ID or name matching
        const targetId = newItem.productId || updatedProducts.find((p) => p.name.trim().toLowerCase() === newItem.description.trim().toLowerCase())?.id;
        if (!targetId) continue;

        const pIndex = updatedProducts.findIndex((p) => p.id === targetId);
        if (pIndex >= 0) {
          const p = updatedProducts[pIndex];
          const prevStock = p.stockQty;
          const newStock = Math.max(0, p.stockQty - qty);

          updatedProducts[pIndex] = {
            ...p,
            stockQty: newStock,
            updatedAt: timestamp,
          };

          // Generate automated outbound stock movement audit record
          const movement: StockMovement = {
            id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            productId: p.id,
            productCode: p.code,
            productName: p.name,
            category: p.category,
            type: 'OUT',
            quantity: qty,
            previousStock: prevStock,
            newStock: newStock,
            reason: `Sold via Invoice #${newInvoice.invoiceNumber}`,
            referenceNo: newInvoice.invoiceNumber,
            customerId: newInvoice.customerId,
            customerName: newInvoice.customerName,
            performedBy: currentRole,
            date: actionDate,
            notes: `Auto stock deduction from Invoice #${newInvoice.invoiceNumber} (${newItem.description})`,
          };
          updatedMovements = [movement, ...updatedMovements];
        }
      }
      newInvoice.inventoryDeducted = true;
      newInvoice.deductFromInventory = true;
    } else {
      newInvoice.inventoryDeducted = false;
      newInvoice.deductFromInventory = false;
    }

    if (existingIndex >= 0) {
      updatedInvoices = invoices.map((i) => (i.id === newInvoice.id ? newInvoice : i));
    } else {
      updatedInvoices = [newInvoice, ...invoices];
    }

    const updatedCustomers = customers.map((cust) => {
      const custInvoices = updatedInvoices.filter((i) => i.customerId === cust.id);
      const totalInvoiced = custInvoices.reduce((acc, i) => acc + (Number(i.grandTotal) || 0), 0);
      const totalPaid = custInvoices.reduce((acc, i) => acc + (Number(i.paidAmount) || 0), 0);
      const balanceDue = custInvoices.reduce((acc, i) => acc + (Number(i.balanceDue) || 0), 0);
      return {
        ...cust,
        totalInvoiced,
        totalPaid,
        balanceDue,
      };
    });

    // Save all datasets to local storage
    saveInvoices(updatedInvoices);
    saveCustomers(updatedCustomers);
    saveProducts(updatedProducts);
    saveStockMovements(updatedMovements);

    // Update React states
    setInvoices(updatedInvoices);
    setCustomers(updatedCustomers);
    setProducts(updatedProducts);
    setStockMovements(updatedMovements);

    const payload = {
      settings,
      products: updatedProducts,
      customers: updatedCustomers,
      invoices: updatedInvoices,
      purchaseOrders,
      expenses,
      suppliers,
      stockMovements: updatedMovements,
    };

    const newSig = computeDataSignature(payload);
    lastSyncedSignatureRef.current = newSig;
    setLastAppliedHash(newSig);

    broadcastLocalState(payload);
    pushToServerRelay(payload).then((res) => {
      if (res.success) {
        setLastSyncTime(new Date());
        setSyncStatus('live_1s');
      }
    }).catch(() => {});
    pushFullStateToCloud(payload).then((res) => {
      if (res.success) {
        setLastSyncTime(new Date());
      }
    }).catch(() => {});

    // If print mode was open for this invoice, keep it updated
    if (printingInvoice?.id === newInvoice.id) {
      setPrintingInvoice(newInvoice);
    }

    // Prompt immediate quick share via WhatsApp or print as soon as invoice is made/saved
    setQuickShareInvoice(newInvoice);
    setIsQuickShareOpen(true);
  };

  const handleDeleteInvoice = (id: string) => {
    const invToDelete = invoices.find((i) => i.id === id);
    const updatedInvoices = invoices.filter((i) => i.id !== id);

    let updatedProducts = [...products];
    let updatedMovements = [...stockMovements];
    const timestamp = new Date().toISOString();
    const actionDate = timestamp.split('T')[0];

    // If deleted invoice had deducted inventory, restore all items back to warehouse stock!
    if (invToDelete && invToDelete.inventoryDeducted) {
      for (const item of invToDelete.items) {
        const qty = Number(item.quantity) || 0;
        if (qty <= 0) continue;

        const targetId = item.productId || updatedProducts.find((p) => p.name.trim().toLowerCase() === item.description.trim().toLowerCase())?.id;
        if (!targetId) continue;

        const pIndex = updatedProducts.findIndex((p) => p.id === targetId);
        if (pIndex >= 0) {
          const p = updatedProducts[pIndex];
          const prevStock = p.stockQty;
          const newStock = p.stockQty + qty;

          updatedProducts[pIndex] = {
            ...p,
            stockQty: newStock,
            updatedAt: timestamp,
          };

          const movement: StockMovement = {
            id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            productId: p.id,
            productCode: p.code,
            productName: p.name,
            category: p.category,
            type: 'IN',
            quantity: qty,
            previousStock: prevStock,
            newStock: newStock,
            reason: `Restored - Deleted Invoice #${invToDelete.invoiceNumber}`,
            referenceNo: invToDelete.invoiceNumber,
            customerId: invToDelete.customerId,
            customerName: invToDelete.customerName,
            performedBy: currentRole,
            date: actionDate,
            notes: `Inventory returned to warehouse upon invoice deletion`,
          };
          updatedMovements = [movement, ...updatedMovements];
        }
      }
    }

    const updatedCustomers = customers.map((cust) => {
      const custInvoices = updatedInvoices.filter((i) => i.customerId === cust.id);
      const totalInvoiced = custInvoices.reduce((acc, i) => acc + (Number(i.grandTotal) || 0), 0);
      const totalPaid = custInvoices.reduce((acc, i) => acc + (Number(i.paidAmount) || 0), 0);
      const balanceDue = custInvoices.reduce((acc, i) => acc + (Number(i.balanceDue) || 0), 0);
      return {
        ...cust,
        totalInvoiced,
        totalPaid,
        balanceDue,
      };
    });

    saveInvoices(updatedInvoices);
    saveCustomers(updatedCustomers);
    saveProducts(updatedProducts);
    saveStockMovements(updatedMovements);

    setInvoices(updatedInvoices);
    setCustomers(updatedCustomers);
    setProducts(updatedProducts);
    setStockMovements(updatedMovements);

    const payload = {
      settings,
      products: updatedProducts,
      customers: updatedCustomers,
      invoices: updatedInvoices,
      purchaseOrders,
      expenses,
      suppliers,
      stockMovements: updatedMovements,
    };

    const newSig = computeDataSignature(payload);
    lastSyncedSignatureRef.current = newSig;
    setLastAppliedHash(newSig);

    broadcastLocalState(payload);
    pushToServerRelay(payload).catch(() => {});
    pushFullStateToCloud(payload).catch(() => {});

    if (printingInvoice?.id === id) {
      setPrintingInvoice(null);
    }
  };

  const handleRecordPayment = (
    invoiceId: string,
    amount: number,
    method: PaymentMethod,
    referenceNo: string,
    notes: string,
    discount: number = 0
  ) => {
    const paidVal = Math.max(0, Number(amount) || 0);
    const discountVal = Math.max(0, Number(discount) || 0);
    const totalCredit = Number((paidVal + discountVal).toFixed(2));

    const existingInv = invoices.find((inv) => inv.id === invoiceId);
    let updatedInvoices: Invoice[];

    if (existingInv) {
      updatedInvoices = invoices.map((inv) => {
        if (inv.id !== invoiceId) return inv;

        const newPaid = Number((inv.paidAmount + paidVal).toFixed(2));
        const newSettlementDiscounts = Number(((inv.settlementDiscountTotal || 0) + discountVal).toFixed(2));

        // Balance due is reduced by both cash paid and settlement discount granted
        const newBalance = Math.max(0, Number((inv.balanceDue - totalCredit).toFixed(2)));
        const newStatus = newBalance === 0 ? 'PAID' : 'PARTIAL';

        const newPayment: PaymentRecord = {
          id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          date: new Date().toISOString().split('T')[0],
          amount: paidVal,
          discount: discountVal > 0 ? discountVal : undefined,
          method,
          referenceNo,
          notes,
          recordedBy: currentRole,
        };

        const updated: Invoice = {
          ...inv,
          paidAmount: newPaid,
          balanceDue: newBalance,
          settlementDiscountTotal: newSettlementDiscounts,
          status: newStatus as any,
          payments: [...(inv.payments || []), newPayment],
          updatedAt: new Date().toISOString(),
        };

        if (printingInvoice?.id === invoiceId) {
          setPrintingInvoice(updated);
        }
        return updated;
      });
    } else {
      // Fallback for direct customer ledger payment or opening balance
      const targetCustId = invoiceId.replace('inv-ledger-', '');
      const cust = customers.find(c => c.id === targetCustId);
      const initialBalance = cust ? (cust.balanceDue || totalCredit) : totalCredit;
      const newBalance = Math.max(0, Number((initialBalance - totalCredit).toFixed(2)));

      const newPayment: PaymentRecord = {
        id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        date: new Date().toISOString().split('T')[0],
        amount: paidVal,
        discount: discountVal > 0 ? discountVal : undefined,
        method,
        referenceNo,
        notes,
        recordedBy: currentRole,
      };

      const ledgerInv: Invoice = {
        id: invoiceId,
        invoiceNumber: `REC-${Date.now().toString().slice(-6)}`,
        type: 'INVOICE',
        customerId: targetCustId,
        customerName: cust?.name || 'Customer Account',
        customerPhone: cust?.phone,
        customerEmail: cust?.email,
        customerAddress: cust?.address,
        customerCity: cust?.city,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        items: [
          {
            id: `item-${Date.now()}`,
            description: 'Customer Account Balance Settlement',
            quantity: 1,
            unitPrice: initialBalance,
            unit: 'Job',
            discountPercent: 0,
            total: initialBalance,
            category: 'SERVICES_LABOR',
          }
        ],
        subtotal: initialBalance,
        taxPercent: 0,
        taxAmount: 0,
        shippingOrFreight: 0,
        installationCharge: 0,
        discountTotal: 0,
        settlementDiscountTotal: discountVal,
        grandTotal: initialBalance,
        paidAmount: paidVal,
        balanceDue: newBalance,
        status: newBalance === 0 ? 'PAID' : 'PARTIAL',
        payments: [newPayment],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedInvoices = [ledgerInv, ...invoices];
    }

    // Immediately recalculate customer balance totals
    const updatedCustomers = customers.map((cust) => {
      const custInvoices = updatedInvoices.filter((i) => i.customerId === cust.id);
      const totalInvoiced = custInvoices.reduce((acc, i) => acc + (Number(i.grandTotal) || 0), 0);
      const totalPaid = custInvoices.reduce((acc, i) => acc + (Number(i.paidAmount) || 0), 0);
      const balanceDue = custInvoices.reduce((acc, i) => acc + (Number(i.balanceDue) || 0), 0);
      return {
        ...cust,
        totalInvoiced,
        totalPaid,
        balanceDue,
      };
    });

    // Synchronous local persistence to prevent any loss
    saveInvoices(updatedInvoices);
    saveCustomers(updatedCustomers);

    setInvoices(updatedInvoices);
    setCustomers(updatedCustomers);

    // Immediate authoritative cloud & relay sync
    const payload = {
      settings,
      products,
      customers: updatedCustomers,
      invoices: updatedInvoices,
      purchaseOrders,
      expenses,
      suppliers,
      stockMovements,
    };

    const newSig = computeDataSignature(payload);
    lastSyncedSignatureRef.current = newSig;
    setLastAppliedHash(newSig);

    broadcastLocalState(payload);
    pushToServerRelay(payload).then((res) => {
      if (res.success) {
        setLastSyncTime(new Date());
        setSyncStatus('live_1s');
      }
    }).catch(() => {});
    pushFullStateToCloud(payload).then((res) => {
      if (res.success) {
        setLastSyncTime(new Date());
      }
    }).catch(() => {});
  };

  // --- PURCHASING HANDLERS ---
  const handleSavePO = (po: PurchaseOrder) => {
    let updated: PurchaseOrder[];
    const exists = purchaseOrders.some((p) => p.id === po.id);
    if (exists) {
      updated = purchaseOrders.map((p) => (p.id === po.id ? po : p));
    } else {
      updated = [po, ...purchaseOrders];
    }
    setPurchaseOrders(updated);
  };

  const handleReceivePO = (po: PurchaseOrder) => {
    // 1. Mark PO as received
    const updatedPOs = purchaseOrders.map((p) => {
      if (p.id === po.id) {
        return {
          ...p,
          status: 'RECEIVED' as const,
          receivedDate: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    setPurchaseOrders(updatedPOs);

    // 2. Increment stock in Products inventory
    setProducts((prevProducts) => {
      const updatedProds = [...prevProducts];
      po.items.forEach((item) => {
        const prodIndex = updatedProds.findIndex(
          (p) => (item.productId && p.id === item.productId) || p.name.toLowerCase() === item.name.toLowerCase()
        );
        if (prodIndex >= 0) {
          updatedProds[prodIndex] = {
            ...updatedProds[prodIndex],
            stockQty: updatedProds[prodIndex].stockQty + item.quantity,
          };
        }
      });
      return updatedProds;
    });

    alert(`Purchase Order ${po.poNumber} marked as RECEIVED. Equipment inventory updated!`);
  };

  const handleDeletePO = (id: string) => {
    setPurchaseOrders(purchaseOrders.filter((p) => p.id !== id));
  };

  // --- SUPPLIER HANDLERS ---
  const handleSaveSupplier = (sup: Supplier) => {
    const exists = suppliers.some((s) => s.id === sup.id);
    if (exists) {
      setSuppliers(suppliers.map((s) => (s.id === sup.id ? sup : s)));
    } else {
      setSuppliers([...suppliers, sup]);
    }
  };

  // --- CUSTOMER HANDLERS ---
  const handleSaveCustomer = (cust: Customer) => {
    const exists = customers.some((c) => c.id === cust.id);
    if (exists) {
      setCustomers(customers.map((c) => (c.id === cust.id ? cust : c)));
    } else {
      setCustomers([cust, ...customers]);
    }
  };

  const handleDeleteCustomer = (id: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      setCustomers(customers.filter((c) => c.id !== id));
    }
  };

  // --- EXPENSE HANDLERS ---
  const handleSaveExpense = (exp: Expense) => {
    const exists = expenses.some((e) => e.id === exp.id);
    if (exists) {
      setExpenses(expenses.map((e) => (e.id === exp.id ? exp : e)));
    } else {
      setExpenses([exp, ...expenses]);
    }
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  // --- INVENTORY & BARCODE SCANNER HANDLERS ---
  const handleOpenBarcodeScanner = (mode: 'STOCK_IN' | 'STOCK_OUT' | 'LOG' | 'LABELS' = 'STOCK_IN') => {
    setBarcodeScannerInitialMode(mode);
    setIsBarcodeScannerOpen(true);
  };

  const handleStockMovement = (movement: StockMovement) => {
    setStockMovements((prev) => [movement, ...prev]);

    // Update product stock quantity in products catalog
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        if (p.id === movement.productId) {
          const newQty = movement.type === 'IN' 
            ? p.stockQty + movement.quantity 
            : Math.max(0, p.stockQty - movement.quantity);
          return {
            ...p,
            stockQty: newQty,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );
  };

  const handleSaveProduct = (prod: ProductItem) => {
    const exists = products.some((p) => p.id === prod.id);
    if (exists) {
      setProducts(products.map((p) => (p.id === prod.id ? prod : p)));
    } else {
      setProducts([prod, ...products]);
    }
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  const handleUpdateStock = (id: string, newStock: number) => {
    setProducts(
      products.map((p) => (p.id === id ? { ...p, stockQty: newStock, updatedAt: new Date().toISOString() } : p))
    );
  };

  // --- ESTIMATOR CONVERSION HANDLER ---
  const handleGenerateQuoteFromEstimate = (estimateData: {
    systemCapacityKw: number;
    systemType: 'ON_GRID' | 'HYBRID' | 'OFF_GRID' | 'SOLAR_PUMP';
    panelCount: number;
    inverterKw: number;
    batteryKwh: number;
    estimatedCost: number;
  }) => {
    // Create pre-filled draft invoice
    const draftInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `${settings.invoicePrefix}${Math.floor(100 + Math.random() * 900)}`,
      type: 'QUOTATION',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'UNPAID',
      customerId: '',
      customerName: 'Prospective Solar Client',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      customerCity: settings.city,
      projectSystemCapacityKw: estimateData.systemCapacityKw,
      systemType: estimateData.systemType,
      items: [
        {
          id: `item-1`,
          description: `Tier-1 High-Efficiency 585W TOPCon Bifacial Solar Panels`,
          category: 'SOLAR_PANELS',
          brand: 'Longi / Canadian Solar',
          specs: '585W N-Type Bifacial, 22.6% Efficiency',
          quantity: estimateData.panelCount,
          unit: 'Pieces',
          unitPrice: 125,
          discountPercent: 0,
          total: estimateData.panelCount * 125,
          costPrice: 95,
          warrantyPeriod: '25 Years Linear Performance',
        },
        {
          id: `item-2`,
          description: `${estimateData.inverterKw} kW 3-Phase Smart Solar Inverter`,
          category: 'INVERTERS',
          brand: 'Deye / Growatt / Huawei',
          specs: 'Dual MPPT, IP65 Waterproof, Built-in WiFi Monitoring',
          quantity: 1,
          unit: 'Unit',
          unitPrice: estimateData.inverterKw * 140,
          discountPercent: 0,
          total: estimateData.inverterKw * 140,
          costPrice: estimateData.inverterKw * 105,
          warrantyPeriod: '5 Years Replacement Warranty',
        },
        ...(estimateData.batteryKwh > 0
          ? [
              {
                id: `item-3`,
                description: `LiFePO4 Lithium Battery Bank (${estimateData.batteryKwh} kWh Storage)`,
                category: 'BATTERIES' as const,
                brand: 'Pylontech / Narada',
                specs: '6000 Cycles @ 90% DoD, Smart BMS',
                quantity: Math.max(1, Math.round(estimateData.batteryKwh / 5)),
                unit: 'Sets',
                unitPrice: estimateData.batteryKwh * 320,
                discountPercent: 0,
                total: estimateData.batteryKwh * 320,
                costPrice: estimateData.batteryKwh * 240,
                warrantyPeriod: '10 Years Warranty',
              },
            ]
          : []),
        {
          id: `item-4`,
          description: `Custom Heavy-Duty Elevated Aluminium & GI Mounting Structure`,
          category: 'STRUCTURE_MOUNTING',
          brand: 'SolarCraft Heavy Framing',
          specs: 'Wind resistant up to 140 km/h, corrosion-resistant',
          quantity: estimateData.panelCount,
          unit: 'Structure Units',
          unitPrice: 35,
          discountPercent: 0,
          total: estimateData.panelCount * 35,
          costPrice: 22,
          warrantyPeriod: '10 Years Structural Warranty',
        },
        {
          id: `item-5`,
          description: `DC/AC Protection DB Boxes, DC Surge Arrestors (SPD) & Cabling`,
          category: 'SWITCHGEAR_PROTECTION',
          brand: 'Schneider / Suntree',
          specs: 'DC Circuit Breakers, Type 2 SPDs, 6mm² pure copper solar cables',
          quantity: 1,
          unit: 'Package',
          unitPrice: 280,
          discountPercent: 0,
          total: 280,
          costPrice: 190,
          warrantyPeriod: '2 Years Protection Warranty',
        },
      ],
      subtotal: estimateData.estimatedCost,
      discountTotal: 0,
      installationCharge: Math.round(estimateData.systemCapacityKw * 45),
      shippingOrFreight: 80,
      taxPercent: 0,
      taxAmount: 0,
      grandTotal: estimateData.estimatedCost + Math.round(estimateData.systemCapacityKw * 45) + 80,
      paidAmount: 0,
      balanceDue: estimateData.estimatedCost + Math.round(estimateData.systemCapacityKw * 45) + 80,
      payments: [],
      termsAndConditions: settings.termsAndConditions || settings.defaultTerms,
      warrantyNotes: settings.warrantyDisclaimer || settings.defaultWarrantyTerms,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setEditingInvoice(draftInvoice);
    setIsInvoiceEditorOpen(true);
  };

  // --- RESET & IMPORT DATA ---
  const handleResetData = () => {
    resetToSampleData();
    setInvoices(getInvoices());
    setPurchaseOrders(getPurchaseOrders());
    setCustomers(getCustomers());
    setExpenses(getExpenses());
    setProducts(getProducts());
    setSuppliers(getSuppliers());
    setSettings(getShopSettings());
    setPrintingInvoice(null);
  };

  const handleImportData = (data: any) => {
    if (data.invoices) setInvoices(data.invoices);
    if (data.purchaseOrders) setPurchaseOrders(data.purchaseOrders);
    if (data.customers) setCustomers(data.customers);
    if (data.expenses) setExpenses(data.expenses);
    if (data.products) setProducts(data.products);
    if (data.suppliers) setSuppliers(data.suppliers);
    if (data.settings) setSettings(data.settings);
  };

  const allAppData = {
    invoices,
    purchaseOrders,
    customers,
    expenses,
    products,
    suppliers,
    settings,
  };

  // Badge notifications
  const lowStockBadgeCount = products.filter(
    (p) => p.category !== 'SERVICES_LABOR' && p.stockQty <= p.minStockAlert
  ).length;
  const pendingInvoicesCount = invoices.filter((i) => i.balanceDue > 0).length;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 antialiased font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setPrintingInvoice(null);
          setActiveTab(tab);
        }}
        lowStockCount={lowStockBadgeCount}
        pendingInvoicesCount={pendingInvoicesCount}
        currentRole={currentRole}
        onOpenRoleSwitch={() => setIsRoleSwitchModalOpen(true)}
        settings={settings}
        onOpenBarcodeScanner={handleOpenBarcodeScanner}
        onOpenSecretProfit={() => setIsSecretProfitOpen(true)}
        onOpenCloudSync={() => setIsCloudSyncModalOpen(true)}
        onOpenGitHub={() => setIsGitHubModalOpen(true)}
        syncStatus={syncStatus}
      />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <Navbar
          settings={settings}
          currentRole={currentRole}
          onOpenRoleSwitch={() => setIsRoleSwitchModalOpen(true)}
          onOpenEstimator={() => setActiveTab('ESTIMATOR')}
          onOpenNewInvoice={() => {
            setEditingInvoice(null);
            setIsInvoiceEditorOpen(true);
          }}
          onOpenNewPO={() => {
            setEditingPO(null);
            setIsPOEditorOpen(true);
          }}
          onOpenBarcodeScanner={handleOpenBarcodeScanner}
          onOpenSecretProfit={() => setIsSecretProfitOpen(true)}
          onOpenCloudSync={() => setIsCloudSyncModalOpen(true)}
          onOpenGitHub={() => setIsGitHubModalOpen(true)}
          syncStatus={syncStatus}
          products={products}
        />

        {/* Real-time Device Ping Notification Toast */}
        {livePingToast && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 shadow-lg flex items-center justify-between text-xs font-bold animate-in slide-in-from-top duration-200 sticky top-14 z-30">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-white animate-ping" />
              <span>⚡ Live Sync Received: <strong>{livePingToast.message}</strong> from {livePingToast.fromDevice}</span>
            </div>
            <button
              onClick={() => setLivePingToast(null)}
              className="text-white/80 hover:text-white p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Mobile Device Live Sync Active Bar */}
        <div className="sm:hidden bg-emerald-50 border-b border-emerald-200/80 px-3 py-1.5 flex items-center justify-between text-[11px] text-emerald-950 font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Live 1s Sync with Laptop Active</span>
          </div>
          <button
            type="button"
            onClick={() => setIsCloudSyncModalOpen(true)}
            className="text-[10px] text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded font-bold transition-colors cursor-pointer"
          >
            Pair / Details
          </button>
        </div>

        {/* Dynamic Main Body Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {customerPortalInvoice ? (
            /* Customer Document Portal Direct Web View */
            <CustomerPortalView
              invoice={customerPortalInvoice}
              settings={settings}
              isAdmin={true}
              onBackToAdmin={() => {
                setCustomerPortalInvoice(null);
                // Clean up query param if present
                try {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('doc');
                  window.history.replaceState({}, '', url.toString());
                } catch {
                  // ignore
                }
              }}
            />
          ) : printingCustomerStatement ? (
            /* Dedicated High-Fidelity Customer Total Record & Statement Printable View */
            <CustomerStatementPrintView
              customer={printingCustomerStatement}
              invoices={invoices}
              settings={settings}
              onBack={() => setPrintingCustomerStatement(null)}
            />
          ) : printingInvoice ? (
            /* Dedicated High-Fidelity Printable View */
            <InvoicePrintView
              invoice={printingInvoice}
              settings={settings}
              onBack={() => setPrintingInvoice(null)}
              onEdit={(inv) => {
                setEditingInvoice(inv);
                setIsInvoiceEditorOpen(true);
              }}
              onRecordPayment={(inv) => {
                setPaymentInvoice(inv);
                setIsPaymentModalOpen(true);
              }}
              onSend={(inv) => {
                setSendDirectInvoice(inv);
                setIsSendDirectOpen(true);
              }}
            />
          ) : (
            <>
              {/* TAB 1: DASHBOARD */}
              {activeTab === 'DASHBOARD' && (
                <Dashboard
                  invoices={invoices}
                  purchaseOrders={purchaseOrders}
                  customers={customers}
                  expenses={expenses}
                  products={products}
                  settings={settings}
                  onOpenNewInvoice={() => {
                    setEditingInvoice(null);
                    setIsInvoiceEditorOpen(true);
                  }}
                  onOpenNewPO={() => {
                    setEditingPO(null);
                    setIsPOEditorOpen(true);
                  }}
                  onOpenEstimator={() => setActiveTab('ESTIMATOR')}
                  onViewInvoice={(inv) => setPrintingInvoice(inv)}
                  onViewLowStock={() => setActiveTab('INVENTORY')}
                  onSendInvoice={(inv) => {
                    setSendDirectInvoice(inv);
                    setIsSendDirectOpen(true);
                  }}
                  onOpenSecretProfit={() => setIsSecretProfitOpen(true)}
                />
              )}

              {/* TAB 2: INVOICES & PROPOSALS */}
              {activeTab === 'INVOICES' && (
                <InvoiceList
                  invoices={invoices}
                  settings={settings}
                  onOpenInvoiceEditor={(inv) => {
                    setEditingInvoice(inv || null);
                    setIsInvoiceEditorOpen(true);
                  }}
                  onViewInvoicePrint={(inv) => setPrintingInvoice(inv)}
                  onRecordPayment={(inv) => {
                    setPaymentInvoice(inv);
                    setIsPaymentModalOpen(true);
                  }}
                  onDeleteInvoice={handleDeleteInvoice}
                  onSendInvoice={(inv) => {
                    setSendDirectInvoice(inv);
                    setIsSendDirectOpen(true);
                  }}
                  onOpenReports={() => setActiveTab('REPORTS')}
                />
              )}

              {/* TAB 3: PURCHASING & SUPPLIERS */}
              {activeTab === 'PURCHASING' && (
                <PurchasingList
                  purchaseOrders={purchaseOrders}
                  suppliers={suppliers}
                  products={products}
                  settings={settings}
                  onOpenPOEditor={(po) => {
                    setEditingPO(po || null);
                    setIsPOEditorOpen(true);
                  }}
                  onOpenSupplierModal={(sup) => {
                    setEditingSupplier(sup || null);
                    setIsSupplierModalOpen(true);
                  }}
                  onReceivePO={handleReceivePO}
                  onDeletePO={handleDeletePO}
                />
              )}

              {/* TAB 4: CUSTOMERS CRM */}
              {activeTab === 'CUSTOMERS' && (
                <CustomerList
                  customers={customers}
                  invoices={invoices}
                  settings={settings}
                  onOpenCustomerEditor={(cust) => {
                    setEditingCustomer(cust || null);
                    setIsCustomerEditorOpen(true);
                  }}
                  onViewCustomerDetail={(cust) => {
                    setDetailCustomer(cust);
                    setIsCustomerDetailOpen(true);
                  }}
                  onDeleteCustomer={handleDeleteCustomer}
                  onPrintCustomerStatement={(cust) => {
                    setPrintingCustomerStatement(cust);
                  }}
                  onRecordPayment={(inv) => {
                    setPaymentInvoice(inv);
                    setIsPaymentModalOpen(true);
                  }}
                  onOpenInvoiceForCustomer={(cust) => {
                    const newInv: Partial<Invoice> = {
                      customerId: cust.id,
                      customerName: cust.name,
                      customerPhone: cust.phone,
                      customerEmail: cust.email,
                      customerAddress: cust.address,
                      customerCity: cust.city,
                      projectSystemCapacityKw: cust.installedCapacityKw,
                      systemType: cust.systemType || 'ON_GRID',
                    };
                    setEditingInvoice(newInv as Invoice);
                    setIsInvoiceEditorOpen(true);
                  }}
                />
              )}

              {/* TAB 5: EXPENSES & P&L */}
              {activeTab === 'EXPENSES' && (
                <ExpenseList
                  expenses={expenses}
                  invoices={invoices}
                  settings={settings}
                  onOpenExpenseEditor={(exp) => {
                    setEditingExpense(exp || null);
                    setIsExpenseEditorOpen(true);
                  }}
                  onDeleteExpense={handleDeleteExpense}
                />
              )}

              {/* TAB 6: INVENTORY */}
              {activeTab === 'INVENTORY' && (
                <InventoryList
                  products={products}
                  settings={settings}
                  currentRole={currentRole}
                  onOpenProductEditor={(prod, prefill) => {
                    setEditingProduct(prod || null);
                    setProductEditorPrefillCode(prefill);
                    setIsProductEditorOpen(true);
                  }}
                  onDeleteProduct={handleDeleteProduct}
                  onUpdateStock={handleUpdateStock}
                  onOpenBarcodeScanner={handleOpenBarcodeScanner}
                />
              )}

              {/* TAB 7: SOLAR SIZING & QUOTE GENERATOR */}
              {activeTab === 'ESTIMATOR' && (
                <SolarSystemEstimator
                  settings={settings}
                  products={products}
                  onGenerateQuote={handleGenerateQuoteFromEstimate}
                />
              )}

              {/* TAB: DAILY, MONTHLY & ANNUAL SALES REPORTS */}
              {activeTab === 'REPORTS' && (
                <SalesReportView
                  invoices={invoices}
                  expenses={expenses}
                  products={products}
                  settings={settings}
                  onViewInvoice={(inv) => setPrintingInvoice(inv)}
                  onOpenInvoiceEditor={(inv) => {
                    setEditingInvoice(inv || null);
                    setIsInvoiceEditorOpen(true);
                  }}
                />
              )}

              {/* TAB 8: SETTINGS & BACKUP */}
              {activeTab === 'SETTINGS' && (
                <SettingsView
                  settings={settings}
                  onSaveSettings={(newSettings) => setSettings(newSettings)}
                  onResetData={handleResetData}
                  allAppData={allAppData}
                  onImportData={handleImportData}
                  onOpenCloudSync={() => setIsCloudSyncModalOpen(true)}
                  onOpenGitHub={() => setIsGitHubModalOpen(true)}
                  onSwitchRole={handleSelectRole}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* --- ALL SYSTEM MODALS --- */}

      {/* Role & Partner Access Management Modal */}
      <RoleSwitchModal
        isOpen={isRoleSwitchModalOpen}
        onClose={() => setIsRoleSwitchModalOpen(false)}
        currentRole={currentRole}
        onSelectRole={handleSelectRole}
        settings={settings}
      />

      {/* Invoice Editor Modal */}
      <InvoiceEditor
        isOpen={isInvoiceEditorOpen}
        onClose={() => {
          setIsInvoiceEditorOpen(false);
          setEditingInvoice(null);
        }}
        onSave={handleSaveInvoice}
        onSaveAndSend={(inv) => {
          setSendDirectInvoice(inv);
          setIsSendDirectOpen(true);
        }}
        existingInvoice={editingInvoice}
        customers={customers}
        products={products}
        settings={settings}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentInvoice(null);
        }}
        invoice={paymentInvoice}
        settings={settings}
        onSavePayment={handleRecordPayment}
      />

      {/* Purchase Order Editor Modal */}
      <PurchaseOrderEditor
        isOpen={isPOEditorOpen}
        onClose={() => {
          setIsPOEditorOpen(false);
          setEditingPO(null);
        }}
        onSave={handleSavePO}
        existingPO={editingPO}
        suppliers={suppliers}
        products={products}
        settings={settings}
        currentRole={currentRole}
      />

      {/* Supplier Modal */}
      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => {
          setIsSupplierModalOpen(false);
          setEditingSupplier(null);
        }}
        onSave={handleSaveSupplier}
        existingSupplier={editingSupplier}
      />

      {/* Customer Editor Modal */}
      <CustomerEditorModal
        isOpen={isCustomerEditorOpen}
        onClose={() => {
          setIsCustomerEditorOpen(false);
          setEditingCustomer(null);
        }}
        onSave={handleSaveCustomer}
        existingCustomer={editingCustomer}
      />

      {/* Customer 360° Detail Modal */}
      <CustomerDetailModal
        isOpen={isCustomerDetailOpen}
        onClose={() => {
          setIsCustomerDetailOpen(false);
          setDetailCustomer(null);
        }}
        customer={detailCustomer}
        invoices={invoices}
        settings={settings}
        onViewInvoice={(inv) => {
          setIsCustomerDetailOpen(false);
          setPrintingInvoice(inv);
        }}
        onOpenInvoiceEditor={(inv) => {
          setIsCustomerDetailOpen(false);
          setEditingInvoice(inv || null);
          setIsInvoiceEditorOpen(true);
        }}
        onSendInvoice={(inv) => {
          setIsCustomerDetailOpen(false);
          setSendDirectInvoice(inv);
          setIsSendDirectOpen(true);
        }}
        onPrintCustomerStatement={(cust) => {
          setIsCustomerDetailOpen(false);
          setPrintingCustomerStatement(cust);
        }}
        onOpenRecordPayment={(inv) => {
          setIsCustomerDetailOpen(false);
          setPaymentInvoice(inv);
          setIsPaymentModalOpen(true);
        }}
      />

      {/* Expense Editor Modal */}
      <ExpenseEditorModal
        isOpen={isExpenseEditorOpen}
        onClose={() => {
          setIsExpenseEditorOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        existingExpense={editingExpense}
        customers={customers}
        settings={settings}
      />

      {/* Product SKU Editor Modal */}
      <ProductEditorModal
        isOpen={isProductEditorOpen}
        onClose={() => {
          setIsProductEditorOpen(false);
          setEditingProduct(null);
          setProductEditorPrefillCode(undefined);
        }}
        onSave={handleSaveProduct}
        existingProduct={editingProduct}
        prefillCode={productEditorPrefillCode}
        settings={settings}
        onUpdateSettings={(newSettings) => setSettings(newSettings)}
        currentRole={currentRole}
      />

      {/* Barcode Scanner & Material Dispatch In/Out Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        products={products}
        movements={stockMovements}
        customers={customers}
        suppliers={suppliers}
        settings={settings}
        currentRole={currentRole}
        onRecordMovement={handleStockMovement}
        onOpenCreateProduct={(scannedCode) => {
          setIsBarcodeScannerOpen(false);
          setEditingProduct(null);
          setProductEditorPrefillCode(scannedCode);
          setIsProductEditorOpen(true);
        }}
        initialMode={barcodeScannerInitialMode}
      />

      {/* Direct Customer Sharing Suite (WhatsApp, Email, SMS, Web Portal) */}
      <SendDirectModal
        isOpen={isSendDirectOpen}
        onClose={() => {
          setIsSendDirectOpen(false);
          setSendDirectInvoice(null);
        }}
        invoice={sendDirectInvoice}
        settings={settings}
        onOpenCustomerPortal={(inv) => {
          setIsSendDirectOpen(false);
          setCustomerPortalInvoice(inv);
        }}
      />

      {/* Immediate Post-Creation WhatsApp Quick Share Prompt */}
      <InvoiceQuickShareModal
        isOpen={isQuickShareOpen}
        onClose={() => {
          setIsQuickShareOpen(false);
          setQuickShareInvoice(null);
        }}
        invoice={quickShareInvoice}
        settings={settings}
        onViewPrint={(inv) => {
          setIsQuickShareOpen(false);
          setPrintingInvoice(inv);
        }}
        onOpenSendSuite={(inv) => {
          setIsQuickShareOpen(false);
          setSendDirectInvoice(inv);
          setIsSendDirectOpen(true);
        }}
      />

      {/* Secret Owner Profit Vault Modal (Total, Daily & Per Invoice Profit) */}
      <SecretProfitWindow
        isOpen={isSecretProfitOpen}
        onClose={() => setIsSecretProfitOpen(false)}
        invoices={invoices}
        products={products}
        expenses={expenses}
        settings={settings}
        onUpdateSettings={setSettings}
      />

      {/* Real-time Firebase Cloud Sync & Multi-Device Mobile Portal */}
      <CloudSyncModal
        isOpen={isCloudSyncModalOpen}
        onClose={() => setIsCloudSyncModalOpen(false)}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        onForcePush={handleForcePushCloud}
        onForcePull={handleForcePullCloud}
        counts={{
          invoices: invoices.length,
          products: products.length,
          customers: customers.length,
          suppliers: suppliers.length,
          expenses: expenses.length,
          stockMovements: stockMovements.length,
        }}
      />

      {/* GitHub Repository Deploy & Publishing Suite */}
      <GitHubPublishModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
      />
    </div>
  );
}

export default App;
