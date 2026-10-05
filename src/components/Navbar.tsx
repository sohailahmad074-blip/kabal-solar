import React from 'react';
import { 
  Search, 
  Plus, 
  ShoppingCart, 
  Calculator, 
  Bell, 
  Scan, 
  Lock, 
  Cloud,
  Users,
  ShieldCheck,
  UserCheck,
  Github,
  FileSpreadsheet
} from 'lucide-react';
import { ShopSettings, ProductItem, UserRole } from '../types/solar';
import { SyncStatus } from '../services/cloudSync';

interface NavbarProps {
  settings: ShopSettings;
  activeTab?: string;
  setActiveTab?: (tab: any) => void;
  currentRole?: UserRole;
  onOpenRoleSwitch?: () => void;
  onLockSoftware?: () => void;
  onOpenEstimator?: () => void;
  onOpenNewInvoice?: () => void;
  onOpenNewQuotation?: () => void;
  onOpenNewPO?: () => void;
  onOpenQuickInvoice?: () => void;
  onOpenQuickExpense?: () => void;
  onOpenQuickCustomer?: () => void;
  onOpenQuickPO?: () => void;
  onOpenBarcodeScanner?: (mode?: 'STOCK_IN' | 'STOCK_OUT' | 'LOG' | 'LABELS') => void;
  onOpenSecretProfit?: () => void;
  onOpenCloudSync?: () => void;
  onOpenGitHub?: () => void;
  syncStatus?: SyncStatus;
  products?: ProductItem[];
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  currentRole = 'OWNER',
  onOpenRoleSwitch,
  onLockSoftware,
  onOpenEstimator,
  onOpenNewInvoice,
  onOpenNewQuotation,
  onOpenNewPO,
  onOpenQuickInvoice,
  onOpenQuickExpense,
  onOpenQuickCustomer,
  onOpenQuickPO,
  onOpenBarcodeScanner,
  onOpenSecretProfit,
  onOpenCloudSync,
  onOpenGitHub,
  syncStatus = 'connected',
  setActiveTab,
  products = [],
}) => {
  const isPartner = currentRole === 'PARTNER';
  const triggerInvoice = !isPartner ? (onOpenNewInvoice || onOpenQuickInvoice) : undefined;
  const triggerPO = onOpenNewPO || onOpenQuickPO;
  const triggerEstimator = !isPartner ? (onOpenEstimator || (() => setActiveTab && setActiveTab('ESTIMATOR'))) : undefined;

  const lowStockCount = products.filter(p => p.category !== 'SERVICES_LABOR' && p.stockQty <= p.minStockAlert).length;

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shrink-0 select-none">
      {/* Search Input in Header */}
      <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={
              isPartner 
                ? "Search inventory products, stock codes, purchase orders, or suppliers..."
                : "Search solar projects, invoices, clients, or inventory..."
            }
            className="w-full bg-slate-100 border border-slate-200/80 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Action Buttons & Shop Identity */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Role Switcher Pill / Trigger */}
        {onOpenRoleSwitch && (
          <button
            type="button"
            onClick={onOpenRoleSwitch}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full border transition-all cursor-pointer shadow-2xs ${
              isPartner
                ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
            title="Click to Switch Role / Unlock Admin"
          >
            {isPartner ? (
              <>
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="hidden sm:inline">🤝 Partner Mode</span>
                <span className="sm:hidden">Partner</span>
                <span className="text-[10px] bg-blue-200/80 text-blue-900 px-1 rounded ml-0.5">Unlock</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="hidden sm:inline">👑 Master Admin</span>
                <span className="sm:hidden">Owner</span>
              </>
            )}
          </button>
        )}

        {/* Lock Software Button */}
        {onLockSoftware && (
          <button
            type="button"
            onClick={onLockSoftware}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-slate-700 hover:text-rose-700 transition-all cursor-pointer shadow-2xs"
            title="Lock Private Software (Requires PIN to re-enter)"
          >
            <Lock className="h-3.5 w-3.5 text-slate-500 hover:text-rose-600" />
            <span className="hidden md:inline">Lock ERP</span>
          </button>
        )}

        {/* Barcode Scanner Trigger Button */}
        {onOpenBarcodeScanner && (
          <button
            type="button"
            onClick={() => onOpenBarcodeScanner('STOCK_IN')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
            title="Scan Barcodes for Material In/Out"
          >
            <Scan className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden md:inline">📷 Barcode In/Out</span>
            <span className="md:hidden">Scan</span>
          </button>
        )}

        {/* Sizing tool quick button (Owner only) */}
        {!isPartner && triggerEstimator && (
          <button
            type="button"
            onClick={triggerEstimator}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            title="Solar System Sizer"
          >
            <Calculator className="h-3.5 w-3.5 text-amber-500" />
            <span>System Sizer</span>
          </button>
        )}

        {/* Create PO Quick button (Prominent for both Partner and Owner) */}
        {triggerPO && (
          <button
            type="button"
            onClick={triggerPO}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded transition-colors cursor-pointer shadow-xs ${
              isPartner 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100'
            }`}
            title="Create Supplier Purchase Order (PO)"
          >
            <ShoppingCart className={`h-3.5 w-3.5 ${isPartner ? 'text-white' : 'text-blue-500'}`} />
            <span>+ Create PO</span>
          </button>
        )}

        {/* Secret Profit Vault Trigger (Owner only) */}
        {!isPartner && onOpenSecretProfit && (
          <button
            type="button"
            onClick={onOpenSecretProfit}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-100/90 border border-amber-300 rounded hover:bg-amber-200 transition-all cursor-pointer shadow-2xs group"
            title="Confidential Profit Vault (Shortcut: Ctrl+Shift+P)"
          >
            <Lock className="h-3.5 w-3.5 text-amber-700 group-hover:rotate-12 transition-transform" />
            <span className="hidden md:inline">🔒 Secret Profit</span>
            <span className="md:hidden">Profit</span>
          </button>
        )}

        {/* Action: Create Quotation / Proposal (Owner only) */}
        {!isPartner && onOpenNewQuotation && (
          <button
            type="button"
            onClick={onOpenNewQuotation}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded shadow-xs transition-colors cursor-pointer"
            title="Make Solar Quotation / Estimate (Add manual items; zero stock deducted)"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">+ Quotation</span>
            <span className="sm:hidden">+ Quote</span>
          </button>
        )}

        {/* Primary Action: Create Invoice (Owner only) */}
        {!isPartner && triggerInvoice && (
          <button
            type="button"
            onClick={triggerInvoice}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-400 text-slate-900 rounded hover:bg-amber-500 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">+ Create Invoice</span>
            <span className="sm:hidden">+ Invoice</span>
          </button>
        )}

        {/* Cloud Sync Status Indicator */}
        {onOpenCloudSync && (
          <button
            type="button"
            onClick={onOpenCloudSync}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs ${
              syncStatus === 'live_1s' || syncStatus === 'connected'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400'
                : syncStatus === 'syncing'
                ? 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100'
                : syncStatus === 'quota_exceeded'
                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
            }`}
            title="Real-Time 1-Second Laptop & Mobile Live Sync (Click to pair or view status)"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                syncStatus === 'live_1s' || syncStatus === 'connected' ? 'bg-emerald-500' : syncStatus === 'syncing' ? 'bg-blue-500' : syncStatus === 'quota_exceeded' ? 'bg-amber-500' : 'bg-rose-500'
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                syncStatus === 'live_1s' || syncStatus === 'connected' ? 'bg-emerald-500 ring-2 ring-emerald-200' : syncStatus === 'syncing' ? 'bg-blue-500' : syncStatus === 'quota_exceeded' ? 'bg-amber-500' : 'bg-rose-500'
              }`} />
            </span>
            <span className="hidden sm:inline">
              {syncStatus === 'live_1s' ? '⚡ 1s Live Sync' : syncStatus === 'connected' ? '⚡ Live Sync' : syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'quota_exceeded' ? 'Local Safe' : 'Offline'}
            </span>
            <span className="sm:hidden">
              {syncStatus === 'live_1s' || syncStatus === 'connected' ? '⚡ 1s' : 'Sync'}
            </span>
          </button>
        )}

        {/* GitHub Deploy & Publish Modal Trigger */}
        {onOpenGitHub && (
          <button
            type="button"
            onClick={onOpenGitHub}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-all cursor-pointer shadow-2xs"
            title="Deploy to GitHub & Publish to GitHub Pages"
          >
            <Github className="h-3.5 w-3.5 text-slate-900" />
            <span className="hidden lg:inline">GitHub</span>
          </button>
        )}

        {/* Low Stock or System Notifications */}
        <div className="flex items-center border-l border-slate-200 pl-2 ml-0.5">
          <button
            type="button"
            onClick={() => setActiveTab && setActiveTab('INVENTORY')}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded relative hover:bg-slate-100 transition-colors"
            title={lowStockCount > 0 ? `${lowStockCount} items low on stock` : 'No inventory alerts'}
          >
            <Bell className="h-4 w-4" />
            {lowStockCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
