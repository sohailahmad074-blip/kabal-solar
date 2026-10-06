import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  ShoppingCart, 
  Users, 
  Receipt, 
  Package, 
  Calculator, 
  Settings, 
  Scan, 
  Lock, 
  Cloud, 
  BarChart3,
  ShieldCheck,
  UserCheck,
  KeyRound,
  Github,
  FileSpreadsheet
} from 'lucide-react';
import { TabType, UserRole, ShopSettings } from '../types/solar';
import { SyncStatus } from '../services/cloudSync';

interface SidebarProps {
  activeTab: TabType | string;
  setActiveTab: (tab: TabType) => void;
  lowStockCount?: number;
  pendingInvoicesCount?: number;
  invoiceCount?: number;
  customerCount?: number;
  poCount?: number;
  expenseCount?: number;
  currentRole?: UserRole;
  onOpenRoleSwitch?: () => void;
  onLockSoftware?: () => void;
  onOpenNewQuotation?: () => void;
  onOpenSettings?: () => void;
  settings?: ShopSettings;
  onOpenBarcodeScanner?: (mode?: 'STOCK_IN' | 'STOCK_OUT' | 'LOG' | 'LABELS') => void;
  onOpenSecretProfit?: () => void;
  onOpenCloudSync?: () => void;
  onOpenGitHub?: () => void;
  syncStatus?: SyncStatus;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  lowStockCount = 0,
  pendingInvoicesCount = 0,
  currentRole = 'OWNER',
  onOpenRoleSwitch,
  onLockSoftware,
  onOpenNewQuotation,
  onOpenSettings,
  settings,
  onOpenBarcodeScanner,
  onOpenSecretProfit,
  onOpenCloudSync,
  onOpenGitHub,
  syncStatus = 'connected',
}) => {
  const isPartner = currentRole === 'PARTNER';

  // Partner Navigation (Only Inventory & Purchasing)
  const partnerNav: { id: TabType; label: string; icon: any; badge?: string | number | null }[] = [
    {
      id: 'INVENTORY',
      label: 'Solar Inventory & Stock',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount} low` : null,
    },
    {
      id: 'PURCHASING',
      label: 'Purchasing & POs',
      icon: ShoppingCart,
      badge: null,
    },
  ];

  // Full Owner Operations Navigation
  const operationsNav: { id: TabType; label: string; icon: any; badge?: string | number | null }[] = [
    {
      id: 'DASHBOARD',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'REPORTS',
      label: 'Sales Reports',
      icon: BarChart3,
      badge: 'Daily/Mo',
    },
    {
      id: 'INVOICES',
      label: 'Invoicing & Quotes',
      icon: FileText,
      badge: pendingInvoicesCount > 0 ? `${pendingInvoicesCount}` : null,
    },
    {
      id: 'PURCHASING',
      label: 'Purchasing (POs)',
      icon: ShoppingCart,
      badge: null,
    },
    {
      id: 'ESTIMATOR',
      label: 'Solar System Sizer',
      icon: Calculator,
      badge: 'Auto',
    },
  ];

  // Full Owner Management Navigation
  const managementNav: { id: TabType; label: string; icon: any; badge?: string | number | null }[] = [
    {
      id: 'CUSTOMERS',
      label: 'Customers & CRM',
      icon: Users,
      badge: null,
    },
    {
      id: 'INVENTORY',
      label: 'Solar Inventory',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount} low` : null,
    },
    {
      id: 'EXPENSES',
      label: 'Expenses & P&L',
      icon: Receipt,
      badge: null,
    },
    {
      id: 'SETTINGS',
      label: 'Shop Settings',
      icon: Settings,
      badge: null,
    },
  ];

  const renderNavGroup = (items: typeof operationsNav) => (
    <div className="space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setActiveTab(item.id);
              if (item.id === 'SETTINGS' && onOpenSettings) {
                onOpenSettings();
              }
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              isActive
                ? 'bg-slate-800 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? 'text-amber-400' : 'text-slate-400'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </div>

            {item.badge && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  isActive
                    ? 'bg-amber-400 text-slate-900'
                    : typeof item.badge === 'string' && item.badge.includes('low')
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <aside className="w-56 bg-slate-900 text-white flex flex-col shrink-0 h-full border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-2.5">
        <div className="w-7 h-7 bg-amber-400 rounded-full flex items-center justify-center text-slate-900 font-bold text-xs shadow-xs">
          S
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold tracking-tight text-xs uppercase text-white truncate">SOLARCRAFT CRM</span>
          <span className="text-[10px] text-slate-400 truncate">
            {isPartner ? 'Partner Procurement' : 'Solar ERP & Billing'}
          </span>
        </div>
      </div>

      {/* Role State Banner */}
      <div className="px-3 pt-3">
        {isPartner ? (
          <div className="bg-blue-950/80 border border-blue-700/60 rounded-lg p-2 flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
              <div className="truncate">
                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">Partner Access</p>
                <p className="text-[9px] text-blue-300 truncate">Inventory & POs</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onLockSoftware && (
                <button
                  type="button"
                  onClick={onLockSoftware}
                  className="text-[9px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-0.5"
                  title="Lock Software"
                >
                  <Lock className="h-2.5 w-2.5" />
                  <span>Lock</span>
                </button>
              )}
              {onOpenRoleSwitch && (
                <button
                  type="button"
                  onClick={onOpenRoleSwitch}
                  className="text-[9px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition-colors shrink-0 cursor-pointer"
                  title="Switch to Owner with PIN"
                >
                  Unlock
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-2 flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              <div className="truncate">
                <p className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">👑 Master Admin</p>
                <p className="text-[9px] text-slate-400 truncate">{settings?.ownerName || 'Full Access'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onLockSoftware && (
                <button
                  type="button"
                  onClick={onLockSoftware}
                  className="text-[9px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-1.5 py-1 rounded transition-colors shrink-0 cursor-pointer flex items-center gap-0.5"
                  title="Lock Software (Private Mode)"
                >
                  <Lock className="h-2.5 w-2.5" />
                  <span>Lock</span>
                </button>
              )}
              {onOpenRoleSwitch && (
                <button
                  type="button"
                  onClick={onOpenRoleSwitch}
                  className="text-[9px] font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1 rounded transition-colors shrink-0 cursor-pointer"
                  title="Manage Partner & Team Access"
                >
                  Roles
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Nav Content */}
      <nav className="flex-1 p-2.5 space-y-4 overflow-y-auto">
        {isPartner ? (
          <div>
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Inventory & Purchasing
            </div>
            {renderNavGroup(partnerNav)}

            {/* Restricted Area Notice */}
            <div className="mt-4 p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[10px] uppercase">
                <Lock className="h-3 w-3" />
                <span>Restricted Workspace</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Billing invoices, client CRM, profit margins, and financial reports are protected by Owner Master PIN.
              </p>
              {onOpenRoleSwitch && (
                <button
                  type="button"
                  onClick={onOpenRoleSwitch}
                  className="w-full mt-1.5 py-1 text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <KeyRound className="h-3 w-3 text-amber-400" />
                  <span>Enter Owner PIN</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Operations
              </div>
              {renderNavGroup(operationsNav)}
            </div>

            <div>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Management
              </div>
              {renderNavGroup(managementNav)}
            </div>
          </>
        )}

        {/* Quick Quotation Launcher (Owner Only) */}
        {!isPartner && onOpenNewQuotation && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onOpenNewQuotation}
              className="w-full flex items-center justify-between gap-2 rounded-lg bg-blue-500/15 border border-blue-500/30 px-3 py-2 text-xs font-bold text-blue-300 hover:bg-blue-500/25 hover:text-blue-100 transition-all cursor-pointer shadow-xs group"
              title="Create a Solar Quotation / Estimate (No stock deducted; custom items allowed)"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-blue-400 group-hover:scale-110 transition-transform" />
                <span>+ Make Quotation</span>
              </div>
              <span className="rounded bg-blue-500 text-white px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider">
                Quote
              </span>
            </button>
          </div>
        )}

        {/* Quick Barcode Scanner Launcher */}
        {onOpenBarcodeScanner && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => onOpenBarcodeScanner('STOCK_IN')}
              className="w-full flex items-center justify-between gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2">
                <Scan className="h-4 w-4 text-emerald-400" />
                <span>Scan Barcodes</span>
              </div>
              <span className="rounded bg-emerald-400 text-slate-950 px-1.5 py-0.2 text-[9px] font-black">
                IN / OUT
              </span>
            </button>
          </div>
        )}

        {/* Secret Profit Vault Launcher (Owner Only) */}
        {!isPartner && onOpenSecretProfit && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onOpenSecretProfit}
              className="w-full flex items-center justify-between gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 transition-all cursor-pointer shadow-xs group"
              title="Secret Owner Profit Vault (Ctrl+Shift+P)"
            >
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-400 group-hover:rotate-12 transition-transform" />
                <span>Secret Profit Vault</span>
              </div>
              <span className="rounded bg-amber-400 text-slate-950 px-1.5 py-0.2 text-[9px] font-black">
                PIN
              </span>
            </button>
          </div>
        )}

        {/* Cloud Sync & Mobile Access Launcher */}
        {onOpenCloudSync && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onOpenCloudSync}
              className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all cursor-pointer shadow-xs border ${
                syncStatus === 'live_1s' || syncStatus === 'connected'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 hover:text-emerald-200'
                  : 'bg-sky-500/10 border-sky-500/30 text-sky-300 hover:bg-sky-500/20 hover:text-sky-200'
              }`}
              title="1-Second Laptop & Mobile Real-Time Sync"
            >
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-emerald-400" />
                <span>⚡ 1s Live Sync & Mobile</span>
              </div>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  syncStatus === 'live_1s' || syncStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
                }`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  syncStatus === 'live_1s' || syncStatus === 'connected' ? 'bg-emerald-400 ring-2 ring-emerald-300/40' : 'bg-amber-400'
                }`} />
              </span>
            </button>
          </div>
        )}

        {/* GitHub Deploy & Publish Launcher */}
        {onOpenGitHub && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onOpenGitHub}
              className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all cursor-pointer shadow-xs border bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
              title="Deploy to GitHub & Publish to GitHub Pages"
            >
              <div className="flex items-center gap-2">
                <Github className="h-4 w-4 text-slate-300" />
                <span>Deploy to GitHub</span>
              </div>
              <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                Pages
              </span>
            </button>
          </div>
        )}
      </nav>

      {/* Bottom User / Shop Identity Card */}
      <div className="p-3 border-t border-slate-800 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
              isPartner ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-400/20 text-amber-400'
            }`}>
              {isPartner ? 'PO' : 'SC'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-slate-200 truncate">
                {isPartner ? (settings?.partnerName || 'Procurement Partner') : (settings?.ownerName || 'Solar Master')}
              </span>
              <span className="text-[10px] text-slate-400 truncate">
                {isPartner ? 'Inventory & POs Only' : 'Master Admin'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {!isPartner && onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-1.5 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Shop Settings Window"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            )}

            {onOpenRoleSwitch && (
              <button
                type="button"
                onClick={onOpenRoleSwitch}
                className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Switch User Role"
              >
                <Users className="h-3.5 w-3.5" />
              </button>
            )}

            {onLockSoftware && (
              <button
                type="button"
                onClick={onLockSoftware}
                className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Lock Private System (Exit to Lock Screen)"
              >
                <Lock className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
