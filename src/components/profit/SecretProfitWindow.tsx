import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Lock, 
  Unlock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Receipt, 
  PieChart, 
  Layers, 
  Download, 
  Printer, 
  X, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Filter, 
  Shield, 
  ShieldAlert, 
  Sun, 
  Zap, 
  BatteryCharging, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  HelpCircle,
  Settings as SettingsIcon,
  RefreshCw
} from 'lucide-react';
import { 
  Invoice, 
  ProductItem, 
  Expense, 
  ShopSettings, 
  Customer 
} from '../../types/solar';
import { 
  calculateInvoiceProfit, 
  calculateDailyProfits, 
  calculateCategoryProfits,
  InvoiceProfitDetail,
  DailyProfitSummary 
} from '../../utils/profitCalculator';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface SecretProfitWindowProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  products: ProductItem[];
  expenses: Expense[];
  settings: ShopSettings;
  onUpdateSettings: (newSettings: ShopSettings) => void;
}

type ProfitTab = 'TOTAL' | 'DAILY' | 'PER_INVOICE' | 'SECURITY';
type DateFilter = 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR';

export const SecretProfitWindow: React.FC<SecretProfitWindowProps> = ({
  isOpen,
  onClose,
  invoices,
  products,
  expenses,
  settings,
  onUpdateSettings,
}) => {
  // Security State
  const defaultPin = settings.ownerPin || '7788';
  const isPinRequired = settings.enableOwnerPin !== false;
  const [isAuthenticated, setIsAuthenticated] = useState(!isPinRequired);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [stealthMode, setStealthMode] = useState(false); // Mask values into •••••• for discretion

  // Navigation State
  const [activeTab, setActiveTab] = useState<ProfitTab>('TOTAL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [marginFilter, setMarginFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NEGATIVE'>('ALL');
  const [sortBy, setSortBy] = useState<'PROFIT_DESC' | 'PROFIT_ASC' | 'MARGIN_DESC' | 'MARGIN_ASC' | 'DATE_DESC' | 'REVENUE_DESC'>('PROFIT_DESC');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // PIN Change State
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);

  // Auto-focus PIN input when locked
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (!isPinRequired) {
        setIsAuthenticated(true);
      } else {
        // Reset unlock state on opening
        setEnteredPin('');
        setPinError(false);
      }
      setTimeout(() => {
        pinInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isPinRequired]);

  // Keyboard shortcut listener (Esc to stealth/close, digits for PIN)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (!stealthMode && isAuthenticated) {
          setStealthMode(true);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, stealthMode, isAuthenticated, onClose]);

  // Handle PIN button click
  const handlePinDigit = (digit: string) => {
    if (enteredPin.length < 6) {
      const nextPin = enteredPin + digit;
      setEnteredPin(nextPin);
      setPinError(false);

      if (nextPin === defaultPin) {
        setIsAuthenticated(true);
        setEnteredPin('');
      } else if (nextPin.length >= defaultPin.length) {
        setPinError(true);
      }
    }
  };

  const handlePinBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setPinError(false);
  };

  const handlePinClear = () => {
    setEnteredPin('');
    setPinError(false);
  };

  const handleManualPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin === defaultPin) {
      setIsAuthenticated(true);
      setPinError(false);
      setEnteredPin('');
    } else {
      setPinError(true);
    }
  };

  // Change PIN handler
  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError(null);
    setPinChangeSuccess(false);

    if (currentPinInput !== defaultPin) {
      setPinChangeError('Current Secret PIN is incorrect.');
      return;
    }
    if (newPinInput.length < 4) {
      setPinChangeError('New PIN must be at least 4 digits.');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setPinChangeError('New PIN and confirmation do not match.');
      return;
    }

    onUpdateSettings({
      ...settings,
      ownerPin: newPinInput,
    });
    setPinChangeSuccess(true);
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
  };

  // Filtered Invoices based on Date Range
  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return invoices.filter((inv) => {
      if (!inv.date) return true;
      const invDate = new Date(inv.date);
      const invDateStr = inv.date.slice(0, 10);

      switch (dateFilter) {
        case 'TODAY':
          return invDateStr === todayStr;
        case 'YESTERDAY':
          return invDateStr === yesterdayStr;
        case 'THIS_WEEK':
          return invDate >= sevenDaysAgo;
        case 'THIS_MONTH':
          return invDate.getFullYear() === currentYear && invDate.getMonth() === currentMonth;
        case 'LAST_MONTH': {
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          return invDate.getFullYear() === lastMonthYear && invDate.getMonth() === lastMonth;
        }
        case 'THIS_YEAR':
          return invDate.getFullYear() === currentYear;
        case 'ALL':
        default:
          return true;
      }
    });
  }, [invoices, dateFilter]);

  // Filtered Expenses based on Date Range
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return expenses.filter((exp) => {
      if (!exp.date) return true;
      const expDate = new Date(exp.date);
      const expDateStr = exp.date.slice(0, 10);

      switch (dateFilter) {
        case 'TODAY':
          return expDateStr === todayStr;
        case 'YESTERDAY':
          return expDateStr === yesterdayStr;
        case 'THIS_WEEK':
          return expDate >= sevenDaysAgo;
        case 'THIS_MONTH':
          return expDate.getFullYear() === currentYear && expDate.getMonth() === currentMonth;
        case 'LAST_MONTH': {
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          return expDate.getFullYear() === lastMonthYear && expDate.getMonth() === lastMonth;
        }
        case 'THIS_YEAR':
          return expDate.getFullYear() === currentYear;
        case 'ALL':
        default:
          return true;
      }
    });
  }, [expenses, dateFilter]);

  // Calculate detailed profits for all filtered invoices
  const invoiceProfitList: InvoiceProfitDetail[] = useMemo(() => {
    return filteredInvoices.map((inv) => calculateInvoiceProfit(inv, products));
  }, [filteredInvoices, products]);

  // Financial KPI Metrics
  const summaryMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalCogs = 0;
    let totalGrossProfit = 0;
    let totalRealizedProfit = 0;
    let totalPaidCollected = 0;
    let totalReceivables = 0;

    invoiceProfitList.forEach((p) => {
      totalRevenue += p.revenue;
      totalCogs += p.cogs;
      totalGrossProfit += p.grossProfit;
      totalRealizedProfit += p.realizedProfit;
      totalPaidCollected += p.invoice.paidAmount || 0;
      totalReceivables += p.invoice.balanceDue || 0;
    });

    const totalExpensesAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalNetProfit = totalGrossProfit - totalExpensesAmount;
    const grossMarginPercent = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
    const netMarginPercent = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCogs,
      totalGrossProfit,
      totalExpensesAmount,
      totalNetProfit,
      grossMarginPercent,
      netMarginPercent,
      totalRealizedProfit,
      totalPaidCollected,
      totalReceivables,
      invoicesCount: invoiceProfitList.length,
    };
  }, [invoiceProfitList, filteredExpenses]);

  // Daily Profit List
  const dailyProfits: DailyProfitSummary[] = useMemo(() => {
    return calculateDailyProfits(filteredInvoices, filteredExpenses, products);
  }, [filteredInvoices, filteredExpenses, products]);

  // Today and Yesterday KPI comparison
  const todayYesterdayKPI = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const todayData = dailyProfits.find((d) => d.date === todayStr);
    const yesterdayData = dailyProfits.find((d) => d.date === yesterdayStr);

    return {
      todayProfit: todayData?.netProfit || 0,
      todayRevenue: todayData?.revenue || 0,
      todayInvoices: todayData?.invoicesCount || 0,
      yesterdayProfit: yesterdayData?.netProfit || 0,
      yesterdayRevenue: yesterdayData?.revenue || 0,
    };
  }, [dailyProfits]);

  // Category Profitability Breakdown
  const categoryProfits = useMemo(() => {
    return calculateCategoryProfits(filteredInvoices, products);
  }, [filteredInvoices, products]);

  // Sorted and Searched Invoice Profit List for Table
  const tableInvoiceProfits = useMemo(() => {
    let list = invoiceProfitList.filter((p) => {
      const q = searchTerm.toLowerCase();
      const matchText = 
        p.invoice.invoiceNumber.toLowerCase().includes(q) ||
        p.invoice.customerName.toLowerCase().includes(q) ||
        (p.invoice.projectSystemCapacityKw && `${p.invoice.projectSystemCapacityKw}kw`.includes(q));

      if (!matchText) return false;

      if (marginFilter === 'HIGH') return p.profitMarginPercent >= 28;
      if (marginFilter === 'MEDIUM') return p.profitMarginPercent >= 15 && p.profitMarginPercent < 28;
      if (marginFilter === 'LOW') return p.profitMarginPercent >= 0 && p.profitMarginPercent < 15;
      if (marginFilter === 'NEGATIVE') return p.profitMarginPercent < 0;

      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'PROFIT_DESC') return b.grossProfit - a.grossProfit;
      if (sortBy === 'PROFIT_ASC') return a.grossProfit - b.grossProfit;
      if (sortBy === 'MARGIN_DESC') return b.profitMarginPercent - a.profitMarginPercent;
      if (sortBy === 'MARGIN_ASC') return a.profitMarginPercent - b.profitMarginPercent;
      if (sortBy === 'REVENUE_DESC') return b.revenue - a.revenue;
      if (sortBy === 'DATE_DESC') return new Date(b.invoice.date).getTime() - new Date(a.invoice.date).getTime();
      return 0;
    });

    return list;
  }, [invoiceProfitList, searchTerm, marginFilter, sortBy]);

  // Masking format helper
  const mask = (val: string | number | React.ReactNode): React.ReactNode => {
    if (stealthMode) {
      return <span className="font-mono tracking-widest text-slate-400 select-none">••••••</span>;
    }
    return val;
  };

  // Export CSV Handler
  const handleExportCsv = () => {
    const headers = [
      'Invoice Number',
      'Date',
      'Customer Name',
      'System Capacity (kW)',
      'Status',
      'Revenue Amount',
      'Cost of Goods (COGS)',
      'Gross Profit',
      'Profit Margin %',
      'Paid Amount',
      'Realized Profit'
    ];

    const rows = tableInvoiceProfits.map((p) => [
      `"${p.invoice.invoiceNumber}"`,
      `"${p.invoice.date}"`,
      `"${(p.invoice.customerName || 'Customer').replace(/"/g, '""')}"`,
      `"${p.invoice.projectSystemCapacityKw ? p.invoice.projectSystemCapacityKw + ' kW' : ''}"`,
      `"${p.invoice.status}"`,
      p.revenue.toFixed(2),
      p.cogs.toFixed(2),
      p.grossProfit.toFixed(2),
      p.profitMarginPercent.toFixed(2) + '%',
      (p.invoice.paidAmount || 0).toFixed(2),
      p.realizedProfit.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SolarCraft_Confidential_Profit_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  // --- PIN PAD LOCK SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
        <div className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="text-center space-y-2 mb-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 shadow-lg shadow-amber-500/20 font-bold">
              <Lock className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-extrabold text-white tracking-wide">
              Confidential Profit Vault
            </h3>
            <p className="text-xs text-slate-400">
              Enter Owner Secret PIN to unlock executive margins, daily profit, and invoice cost analysis.
            </p>
          </div>

          {/* PIN Indicator Dots */}
          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`h-4 w-4 rounded-full border-2 transition-all ${
                  enteredPin.length > idx
                    ? 'border-amber-400 bg-amber-400 scale-110 shadow-[0_0_8px_#f59e0b]'
                    : pinError
                    ? 'border-rose-500 bg-rose-500/20 animate-shake'
                    : 'border-slate-600 bg-slate-800'
                }`}
              />
            ))}
          </div>

          {pinError && (
            <p className="text-center text-xs font-semibold text-rose-400 mb-4 animate-fadeIn flex items-center justify-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Incorrect Secret PIN. Please try again.</span>
            </p>
          )}

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handlePinDigit(digit)}
                className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-amber-400 active:text-slate-950 text-base font-bold text-slate-100 transition-all cursor-pointer border border-slate-700/50 shadow-xs"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handlePinClear}
              className="h-12 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handlePinDigit('0')}
              className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-amber-400 active:text-slate-950 text-base font-bold text-slate-100 transition-all cursor-pointer border border-slate-700/50 shadow-xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={handlePinBackspace}
              className="h-12 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              ⌫
            </button>
          </div>

          {/* Hidden Keyboard Input for Hardware Keyboards */}
          <form onSubmit={handleManualPinSubmit} className="text-center">
            <input
              ref={pinInputRef}
              type="password"
              maxLength={6}
              value={enteredPin}
              onChange={(e) => {
                setEnteredPin(e.target.value);
                if (e.target.value === defaultPin) {
                  setIsAuthenticated(true);
                  setEnteredPin('');
                }
              }}
              className="opacity-0 absolute -z-10"
            />
            <p className="text-[11px] text-slate-500">
              Default Master PIN is <span className="font-mono font-bold text-amber-400/90">7788</span>. (Can be customized inside).
            </p>
          </form>
        </div>
      </div>
    );
  }

  // --- AUTHENTICATED SECRET PROFIT WINDOW ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-6xl rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Executive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-3.5 gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-slate-950 shadow-md font-bold">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-wide flex items-center gap-2">
                  <span>Executive Profit & Margin Vault</span>
                </h3>
                <span className="rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[10px] font-mono font-bold border border-emerald-500/30 flex items-center gap-1">
                  <Unlock className="h-3 w-3" /> Unlocked
                </span>
                {stealthMode && (
                  <span className="rounded bg-rose-500/20 text-rose-300 px-2 py-0.5 text-[10px] font-bold border border-rose-500/30">
                    🛡️ Stealth Mode
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Confidential financial engine: Realized profit, material COGS, and granular invoice margins
              </p>
            </div>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center gap-2">
            {/* Quick Stealth / Mask Values Toggle */}
            <button
              type="button"
              onClick={() => setStealthMode(!stealthMode)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                stealthMode 
                  ? 'bg-rose-600 text-white shadow-xs' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
              }`}
              title="Stealth Mode: Hide/Mask sensitive profit figures (Press Esc)"
            >
              {stealthMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span>{stealthMode ? 'Unmask Numbers' : 'Mask Numbers (Stealth)'}</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer"
              title="Export Confidential Profit Report"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {/* Print Statement */}
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer"
              title="Print Profit Statement"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Lock Now Button */}
            <button
              type="button"
              onClick={() => setIsAuthenticated(false)}
              className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 border border-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
              title="Lock Profit Vault immediately"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Lock</span>
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Date Filter & Section Navigation Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between border-b border-slate-800 bg-slate-900/90 px-5 py-2.5 gap-3 shrink-0">
          {/* Main Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('TOTAL')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'TOTAL'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <DollarSign className="h-3.5 w-3.5" />
              <span>1. Total Profit & Health</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('DAILY')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'DAILY'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>2. Daily Profit Ledger</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PER_INVOICE')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'PER_INVOICE'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>3. Profit Per Invoice ({invoiceProfitList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SECURITY')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'SECURITY'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>PIN Settings</span>
            </button>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5 text-xs self-end md:self-auto">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Period:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-200 focus:border-amber-400 focus:outline-none"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today Only</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="THIS_WEEK">Last 7 Days</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="THIS_YEAR">This Year</option>
            </select>
          </div>
        </div>

        {/* TAB BODY SCROLL CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* ========================================================================= */}
          {/* TAB 1: TOTAL PROFIT & EXECUTIVE HEALTH                                    */}
          {/* ========================================================================= */}
          {activeTab === 'TOTAL' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Primary KPI Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Gross Profit */}
                <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-slate-900 p-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      Total Gross Profit
                    </span>
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono font-black text-emerald-300">
                      {mask(`${summaryMetrics.grossMarginPercent.toFixed(1)}% Margin`)}
                    </span>
                  </div>
                  <h4 className="mt-2 text-2xl font-black text-white font-mono tracking-tight">
                    {mask(formatCurrency(summaryMetrics.totalGrossProfit, settings.currency, settings.currencyPosition))}
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Revenue {mask(formatCurrency(summaryMetrics.totalRevenue, settings.currency, settings.currencyPosition))} − COGS {mask(formatCurrency(summaryMetrics.totalCogs, settings.currency, settings.currencyPosition))}
                  </p>
                </div>

                {/* Net Profit (After Operating Expenses) */}
                <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-slate-900 p-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      Total Net Profit (Clean)
                    </span>
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-mono font-black text-amber-300">
                      {mask(`${summaryMetrics.netMarginPercent.toFixed(1)}% Net`)}
                    </span>
                  </div>
                  <h4 className="mt-2 text-2xl font-black text-amber-300 font-mono tracking-tight">
                    {mask(formatCurrency(summaryMetrics.totalNetProfit, settings.currency, settings.currencyPosition))}
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-400">
                    After deducting {mask(formatCurrency(summaryMetrics.totalExpensesAmount, settings.currency, settings.currencyPosition))} operating costs
                  </p>
                </div>

                {/* Realized Cash Profit */}
                <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 to-slate-900 p-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                      Realized Cash Profit
                    </span>
                    <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-mono font-black text-blue-300">
                      In Hand
                    </span>
                  </div>
                  <h4 className="mt-2 text-2xl font-black text-blue-300 font-mono tracking-tight">
                    {mask(formatCurrency(summaryMetrics.totalRealizedProfit, settings.currency, settings.currencyPosition))}
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Collected {mask(formatCurrency(summaryMetrics.totalPaidCollected, settings.currency, settings.currencyPosition))} from customers
                  </p>
                </div>

                {/* Unrealized Receivables Profit */}
                <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-950/40 to-slate-900 p-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                      Pending Unrealized
                    </span>
                    <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-mono font-black text-purple-300">
                      In Receivables
                    </span>
                  </div>
                  <h4 className="mt-2 text-2xl font-black text-purple-300 font-mono tracking-tight">
                    {mask(formatCurrency(summaryMetrics.totalGrossProfit - summaryMetrics.totalRealizedProfit, settings.currency, settings.currencyPosition))}
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-400">
                    To be collected on {mask(formatCurrency(summaryMetrics.totalReceivables, settings.currency, settings.currencyPosition))} dues
                  </p>
                </div>
              </div>

              {/* Financial Breakdown Progress Bars */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-amber-400" />
                    <span>Revenue vs Cost of Goods vs Clean Net Profit Ratio</span>
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">
                    Based on {summaryMetrics.invoicesCount} Invoices
                  </span>
                </div>

                {/* Stacked Percentage Bar */}
                <div className="h-5 w-full rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
                  <div
                    className="bg-emerald-500 h-full transition-all flex items-center justify-center text-[10px] font-black text-slate-950"
                    style={{
                      width: `${Math.max(5, Math.min(100, (summaryMetrics.totalGrossProfit / (summaryMetrics.totalRevenue || 1)) * 100))}%`,
                    }}
                    title="Gross Profit Share"
                  >
                    {!stealthMode && `${summaryMetrics.grossMarginPercent.toFixed(0)}% Profit`}
                  </div>
                  <div
                    className="bg-slate-600 h-full transition-all flex items-center justify-center text-[10px] font-bold text-white"
                    style={{
                      width: `${Math.max(5, Math.min(100, (summaryMetrics.totalCogs / (summaryMetrics.totalRevenue || 1)) * 100))}%`,
                    }}
                    title="Material Cost of Goods (COGS)"
                  >
                    {!stealthMode && `${((summaryMetrics.totalCogs / (summaryMetrics.totalRevenue || 1)) * 100).toFixed(0)}% COGS`}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                  <div className="border-l-2 border-emerald-500 pl-3">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Gross Revenue</span>
                    <span className="font-mono font-bold text-white">
                      {mask(formatCurrency(summaryMetrics.totalRevenue, settings.currency, settings.currencyPosition))}
                    </span>
                  </div>
                  <div className="border-l-2 border-slate-500 pl-3">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Material Cost (COGS)</span>
                    <span className="font-mono font-bold text-slate-300">
                      {mask(formatCurrency(summaryMetrics.totalCogs, settings.currency, settings.currencyPosition))}
                    </span>
                  </div>
                  <div className="border-l-2 border-rose-500 pl-3">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Shop & Labor Expenses</span>
                    <span className="font-mono font-bold text-rose-400">
                      {mask(formatCurrency(summaryMetrics.totalExpensesAmount, settings.currency, settings.currencyPosition))}
                    </span>
                  </div>
                  <div className="border-l-2 border-amber-400 pl-3">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Final Owner Profit</span>
                    <span className="font-mono font-bold text-amber-300">
                      {mask(formatCurrency(summaryMetrics.totalNetProfit, settings.currency, settings.currencyPosition))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Equipment Category Profitability Ranking */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="h-4 w-4 text-amber-400" />
                      <span>Profitability by Solar Equipment Category</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Identify which solar components generate the highest margins and cash profit.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryProfits.map((cat) => (
                    <div
                      key={cat.category}
                      className="rounded-lg border border-slate-800 bg-slate-900 p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-bold text-white">{cat.label}</span>
                          <p className="text-[11px] text-slate-400">
                            {cat.itemsSoldQty} units / sets billed
                          </p>
                        </div>
                        <span className={`rounded px-2 py-0.5 text-xs font-bold font-mono ${
                          cat.profitMarginPercent >= 30
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : cat.profitMarginPercent >= 15
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {mask(`${cat.profitMarginPercent.toFixed(1)}% Margin`)}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-2 text-xs font-mono">
                        <div>
                          <span className="text-[10px] uppercase text-slate-500 block">Revenue</span>
                          <span className="text-slate-300">
                            {mask(formatCurrency(cat.revenue, settings.currency, settings.currencyPosition))}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-500 block">Cost (COGS)</span>
                          <span className="text-slate-400">
                            {mask(formatCurrency(cat.cogs, settings.currency, settings.currencyPosition))}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase text-emerald-400 font-bold block">Gross Profit</span>
                          <span className="font-bold text-emerald-400">
                            +{mask(formatCurrency(cat.grossProfit, settings.currency, settings.currencyPosition))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: DAILY PROFIT LEDGER & DAY-BY-DAY BREAKDOWN                          */}
          {/* ========================================================================= */}
          {activeTab === 'DAILY' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Daily Highlights Quick Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Today */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> Today's Net Profit
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
                      {todayYesterdayKPI.todayInvoices} Invoices
                    </span>
                  </div>
                  <h4 className="mt-2 text-2xl font-black text-emerald-400 font-mono">
                    {mask(formatCurrency(todayYesterdayKPI.todayProfit, settings.currency, settings.currencyPosition))}
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Revenue Today: {mask(formatCurrency(todayYesterdayKPI.todayRevenue, settings.currency, settings.currencyPosition))}
                  </p>
                </div>

                {/* Yesterday */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                  <span className="text-xs font-bold uppercase text-slate-400 block">
                    Yesterday's Net Profit
                  </span>
                  <h4 className="mt-2 text-2xl font-black text-white font-mono">
                    {mask(formatCurrency(todayYesterdayKPI.yesterdayProfit, settings.currency, settings.currencyPosition))}
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Revenue Yesterday: {mask(formatCurrency(todayYesterdayKPI.yesterdayRevenue, settings.currency, settings.currencyPosition))}
                  </p>
                </div>

                {/* Average Daily Margin */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                  <span className="text-xs font-bold uppercase text-blue-400 block">
                    Active Days Recorded
                  </span>
                  <h4 className="mt-2 text-2xl font-black text-blue-300 font-mono">
                    {dailyProfits.length} Days
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Average Daily Profit: {mask(formatCurrency(
                      dailyProfits.length > 0 ? summaryMetrics.totalNetProfit / dailyProfits.length : 0,
                      settings.currency,
                      settings.currencyPosition
                    ))}
                  </p>
                </div>
              </div>

              {/* Day-by-Day Financial Ledger Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden shadow-lg">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-amber-400" />
                      <span>Daily Profit & Loss Ledger</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Day-by-day audit of solar invoices, material cost of goods, overhead expenses, and net profit.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-center">Invoices</th>
                        <th className="py-3 px-4 text-right">Daily Revenue</th>
                        <th className="py-3 px-4 text-right">Equipment Cost</th>
                        <th className="py-3 px-4 text-right">Expenses</th>
                        <th className="py-3 px-4 text-right">Daily Net Profit</th>
                        <th className="py-3 px-4 text-right">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {dailyProfits.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            No daily transactions found for the selected period.
                          </td>
                        </tr>
                      ) : (
                        dailyProfits.map((day) => (
                          <tr key={day.date} className="hover:bg-slate-900/60 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-200">
                              {formatDate(day.date)}
                            </td>
                            <td className="py-3 px-4 text-center font-mono">
                              <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-300">
                                {day.invoicesCount}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-200">
                              {mask(formatCurrency(day.revenue, settings.currency, settings.currencyPosition))}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-400">
                              {mask(formatCurrency(day.cogs, settings.currency, settings.currencyPosition))}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-rose-400">
                              {day.expenses > 0 ? `-${mask(formatCurrency(day.expenses, settings.currency, settings.currencyPosition))}` : '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold">
                              <span className={day.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {day.netProfit >= 0 ? '+' : ''}
                                {mask(formatCurrency(day.netProfit, settings.currency, settings.currencyPosition))}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold">
                              <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] ${
                                day.profitMarginPercent >= 25
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : day.profitMarginPercent >= 10
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}>
                                {mask(`${day.profitMarginPercent.toFixed(1)}%`)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: PROFIT PER INVOICE (GRANULAR DEEP-DIVE)                            */}
          {/* ========================================================================= */}
          {activeTab === 'PER_INVOICE' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Search, Filter & Sort Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by Invoice #, Customer, or Capacity (kW)..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs font-medium text-slate-100 placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={marginFilter}
                    onChange={(e) => setMarginFilter(e.target.value as any)}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300 focus:border-amber-400 focus:outline-none"
                  >
                    <option value="ALL">All Margins</option>
                    <option value="HIGH">🟢 High Margin (&gt; 28%)</option>
                    <option value="MEDIUM">🟡 Standard Margin (15-28%)</option>
                    <option value="LOW">⚪ Low Margin (0-15%)</option>
                    <option value="NEGATIVE">🔴 Negative (Loss)</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300 focus:border-amber-400 focus:outline-none"
                  >
                    <option value="PROFIT_DESC">Highest Profit ($)</option>
                    <option value="MARGIN_DESC">Highest Margin (%)</option>
                    <option value="REVENUE_DESC">Largest Invoice ($)</option>
                    <option value="DATE_DESC">Most Recent Date</option>
                    <option value="PROFIT_ASC">Lowest Profit</option>
                  </select>
                </div>
              </div>

              {/* Invoices Profit Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-3.5">Invoice & Customer</th>
                        <th className="py-3 px-3">System kW</th>
                        <th className="py-3 px-3 text-right">Invoiced (Revenue)</th>
                        <th className="py-3 px-3 text-right">Material Cost (COGS)</th>
                        <th className="py-3 px-3 text-right">Gross Profit</th>
                        <th className="py-3 px-3 text-center">Margin %</th>
                        <th className="py-3 px-3 text-right">Realized in Hand</th>
                        <th className="py-3 px-3 text-center">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {tableInvoiceProfits.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500">
                            No invoices match your search or filter criteria.
                          </td>
                        </tr>
                      ) : (
                        tableInvoiceProfits.map((item) => {
                          const isExpanded = expandedInvoiceId === item.invoice.id;
                          return (
                            <React.Fragment key={item.invoice.id}>
                              <tr
                                onClick={() => setExpandedInvoiceId(isExpanded ? null : item.invoice.id)}
                                className={`hover:bg-slate-900/80 cursor-pointer transition-colors ${
                                  isExpanded ? 'bg-slate-900/90' : ''
                                }`}
                              >
                                <td className="py-3 px-3.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-amber-400">
                                      {item.invoice.invoiceNumber}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {formatDate(item.invoice.date)}
                                    </span>
                                  </div>
                                  <p className="font-bold text-slate-200 mt-0.5">
                                    {item.invoice.customerName}
                                  </p>
                                </td>

                                <td className="py-3 px-3 font-mono">
                                  {item.invoice.projectSystemCapacityKw ? (
                                    <span className="rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold">
                                      ☀️ {item.invoice.projectSystemCapacityKw} kW
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 text-[10px]">-</span>
                                  )}
                                </td>

                                <td className="py-3 px-3 text-right font-mono font-bold text-slate-200">
                                  {mask(formatCurrency(item.revenue, settings.currency, settings.currencyPosition))}
                                </td>

                                <td className="py-3 px-3 text-right font-mono text-slate-400">
                                  {mask(formatCurrency(item.cogs, settings.currency, settings.currencyPosition))}
                                </td>

                                <td className="py-3 px-3 text-right font-mono font-bold">
                                  <span className={item.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                    {item.grossProfit >= 0 ? '+' : ''}
                                    {mask(formatCurrency(item.grossProfit, settings.currency, settings.currencyPosition))}
                                  </span>
                                </td>

                                <td className="py-3 px-3 text-center font-mono">
                                  <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-black ${
                                    item.profitMarginPercent >= 28
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : item.profitMarginPercent >= 15
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  }`}>
                                    {mask(`${item.profitMarginPercent.toFixed(1)}%`)}
                                  </span>
                                </td>

                                <td className="py-3 px-3 text-right font-mono text-xs text-blue-300">
                                  {mask(formatCurrency(item.realizedProfit, settings.currency, settings.currencyPosition))}
                                </td>

                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedInvoiceId(isExpanded ? null : item.invoice.id);
                                    }}
                                    className="rounded p-1 text-slate-400 hover:text-white"
                                  >
                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </button>
                                </td>
                              </tr>

                              {/* Expanded Bill of Materials (BOM) Line-Item Profit Inspection */}
                              {isExpanded && (
                                <tr className="bg-slate-950 border-t border-b border-slate-800">
                                  <td colSpan={8} className="p-4">
                                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3.5 space-y-3">
                                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                          <Layers className="h-3.5 w-3.5" />
                                          <span>Line-by-Line Equipment Cost & Margin Breakdown</span>
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          Invoice #{item.invoice.invoiceNumber}
                                        </span>
                                      </div>

                                      <div className="overflow-x-auto">
                                        <table className="w-full text-left text-[11px]">
                                          <thead className="text-[9px] uppercase font-bold text-slate-500 border-b border-slate-800">
                                            <tr>
                                              <th className="py-1.5 px-2">Equipment Description</th>
                                              <th className="py-1.5 px-2 text-center">Qty</th>
                                              <th className="py-1.5 px-2 text-right">Sale Unit Price</th>
                                              <th className="py-1.5 px-2 text-right">Cost Unit Price</th>
                                              <th className="py-1.5 px-2 text-right">Line Revenue</th>
                                              <th className="py-1.5 px-2 text-right">Line Cost</th>
                                              <th className="py-1.5 px-2 text-right">Line Profit</th>
                                              <th className="py-1.5 px-2 text-right">Margin %</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-800/60 font-mono">
                                            {item.itemProfits.map((itm) => (
                                              <tr key={itm.itemId} className="hover:bg-slate-800/50">
                                                <td className="py-2 px-2 text-slate-200 font-sans font-medium">
                                                  {itm.description}
                                                </td>
                                                <td className="py-2 px-2 text-center text-slate-300">
                                                  {itm.quantity} {itm.unit}
                                                </td>
                                                <td className="py-2 px-2 text-right text-slate-300">
                                                  {mask(formatCurrency(itm.sellingPrice, settings.currency, settings.currencyPosition))}
                                                </td>
                                                <td className="py-2 px-2 text-right text-slate-400">
                                                  {mask(formatCurrency(itm.unitCost, settings.currency, settings.currencyPosition))}
                                                </td>
                                                <td className="py-2 px-2 text-right font-bold text-slate-200">
                                                  {mask(formatCurrency(itm.totalRevenue, settings.currency, settings.currencyPosition))}
                                                </td>
                                                <td className="py-2 px-2 text-right text-slate-400">
                                                  {mask(formatCurrency(itm.totalCost, settings.currency, settings.currencyPosition))}
                                                </td>
                                                <td className="py-2 px-2 text-right font-bold text-emerald-400">
                                                  +{mask(formatCurrency(itm.grossProfit, settings.currency, settings.currencyPosition))}
                                                </td>
                                                <td className="py-2 px-2 text-right font-bold text-amber-300">
                                                  {mask(`${itm.profitMarginPercent.toFixed(1)}%`)}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: SECURITY & PIN MANAGEMENT                                          */}
          {/* ========================================================================= */}
          {activeTab === 'SECURITY' && (
            <div className="max-w-xl mx-auto space-y-6 animate-fadeIn py-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 space-y-4 shadow-xl">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-slate-950 font-bold">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">
                      Secret Profit Vault PIN Configuration
                    </h4>
                    <p className="text-xs text-slate-400">
                      Protect your business profit margins from employees and clients.
                    </p>
                  </div>
                </div>

                {pinChangeSuccess && (
                  <div className="rounded-lg bg-emerald-950/60 border border-emerald-500/40 p-3 text-xs font-semibold text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Secret PIN updated successfully! Next time use your new PIN to unlock.</span>
                  </div>
                )}

                {pinChangeError && (
                  <div className="rounded-lg bg-rose-950/60 border border-rose-500/40 p-3 text-xs font-semibold text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{pinChangeError}</span>
                  </div>
                )}

                <form onSubmit={handleChangePin} className="space-y-3.5">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-400 block">
                      Current Secret PIN
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={currentPinInput}
                      onChange={(e) => setCurrentPinInput(e.target.value)}
                      placeholder="Enter current PIN (default: 7788)"
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono font-bold text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-400 block">
                        New Secret PIN (4-6 digits)
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value)}
                        placeholder="e.g. 9922"
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono font-bold text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-400 block">
                        Confirm New PIN
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        value={confirmPinInput}
                        onChange={(e) => setConfirmPinInput(e.target.value)}
                        placeholder="Re-type new PIN"
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono font-bold text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-amber-400 hover:bg-amber-500 py-2.5 text-xs font-extrabold text-slate-950 transition-colors shadow-md cursor-pointer mt-2"
                  >
                    Update Secret PIN
                  </button>
                </form>

                <div className="border-t border-slate-800 pt-4 text-xs text-slate-400 space-y-1.5">
                  <p className="font-bold text-slate-300">💡 Quick Vault Shortcuts:</p>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                    <li>Press <kbd className="rounded bg-slate-800 px-1 py-0.5 text-amber-400 font-mono">Ctrl + Shift + P</kbd> anywhere in the app to toggle this Secret Profit Vault.</li>
                    <li>Press <kbd className="rounded bg-slate-800 px-1 py-0.5 text-amber-400 font-mono">Esc</kbd> anytime to activate Stealth Mask Mode or close window.</li>
                    <li>Click the hidden lock icon in the top navbar or sidebar to open anytime.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-5 py-2.5 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px]">Strictly Confidential Owner Financial Analytics</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
          >
            Close Vault
          </button>
        </div>

      </div>
    </div>
  );
};
