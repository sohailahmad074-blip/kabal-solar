import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Download, 
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  Sun, 
  Zap, 
  Package, 
  Users, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  CheckCircle2,
  Clock,
  PieChart,
  Layers,
  FileSpreadsheet,
  Eye,
  Building,
  RotateCcw,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
  Wallet,
  Landmark,
  Receipt,
  UserCheck,
  Phone,
  MapPin,
  Sparkles
} from 'lucide-react';
import { Invoice, Expense, ProductItem, ShopSettings, ProductCategory, PaymentRecord } from '../../types/solar';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../common/Badge';

interface SalesReportViewProps {
  invoices: Invoice[];
  expenses: Expense[];
  products: ProductItem[];
  settings: ShopSettings;
  onViewInvoice?: (invoice: Invoice) => void;
  onOpenInvoiceEditor?: (invoice?: Invoice) => void;
}

type MainViewMode = 'OVERVIEW' | 'CUSTOMER_WISE' | 'PAYMENT_WISE';
type ReportPeriod = 'DAILY' | 'MONTHLY' | 'ANNUALLY' | 'CUSTOM' | 'ALL_TIME';

const CATEGORY_LABELS: Record<string, string> = {
  SOLAR_PANELS: 'Solar Panels',
  INVERTERS: 'Solar Inverters',
  BATTERIES: 'Energy Storage & Batteries',
  STRUCTURE_MOUNTING: 'Mounting & Framing',
  SWITCHGEAR_PROTECTION: 'Switchgear & DB Protection',
  CABLES_WIRES: 'DC/AC Solar Cables',
  SOLAR_PUMPS: 'Solar Water Pumps & VFD',
  EV_CHARGERS: 'EV Charging Stations',
  SOLAR_LIGHTS: 'Solar Street & Garden Lights',
  SOLAR_WATER_HEATERS: 'Solar Geysers & Thermal',
  SERVICES_LABOR: 'Labor & Engineering Services',
  ACCESSORIES: 'Accessories & Misc Hardware',
};

const CATEGORY_COLORS: Record<string, string> = {
  SOLAR_PANELS: 'bg-amber-500',
  INVERTERS: 'bg-blue-500',
  BATTERIES: 'bg-emerald-500',
  STRUCTURE_MOUNTING: 'bg-orange-500',
  SWITCHGEAR_PROTECTION: 'bg-purple-500',
  CABLES_WIRES: 'bg-rose-500',
  SOLAR_PUMPS: 'bg-cyan-500',
  EV_CHARGERS: 'bg-teal-500',
  SOLAR_LIGHTS: 'bg-yellow-500',
  SOLAR_WATER_HEATERS: 'bg-red-500',
  SERVICES_LABOR: 'bg-indigo-500',
  ACCESSORIES: 'bg-slate-500',
};

export const SalesReportView: React.FC<SalesReportViewProps> = ({
  invoices,
  expenses,
  products,
  settings,
  onViewInvoice,
  onOpenInvoiceEditor,
}) => {
  // Navigation view mode: General sales overview, customer-wise breakdown, or payment-wise collection ledger
  const [viewMode, setViewMode] = useState<MainViewMode>('OVERVIEW');
  const [period, setPeriod] = useState<ReportPeriod>('MONTHLY');
  
  // Date states
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INVOICE' | 'QUOTATION'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Customer-wise tab filters
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerBalanceFilter, setCustomerBalanceFilter] = useState<'ALL' | 'WITH_BALANCE' | 'CLEARED'>('ALL');
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);

  // Payment-wise tab filters
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([new Date().getFullYear()]);
    invoices.forEach((inv) => {
      if (inv.date) {
        const y = new Date(inv.date).getFullYear();
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [invoices]);

  // Filter invoices according to selected period & date bounds
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (!inv.date) return false;
      const invDate = new Date(inv.date);
      if (isNaN(invDate.getTime())) return false;

      // Status & Type Filter
      if (typeFilter !== 'ALL' && inv.type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;

      if (period === 'ALL_TIME') {
        return true;
      }

      if (period === 'DAILY') {
        const invDateStr = inv.date.split('T')[0];
        return invDateStr === selectedDate;
      }

      if (period === 'MONTHLY') {
        return (
          invDate.getFullYear() === selectedYear &&
          invDate.getMonth() === selectedMonth
        );
      }

      if (period === 'ANNUALLY') {
        return invDate.getFullYear() === selectedYear;
      }

      if (period === 'CUSTOM') {
        const invDateStr = inv.date.split('T')[0];
        return invDateStr >= customStartDate && invDateStr <= customEndDate;
      }

      return true;
    });
  }, [invoices, period, selectedDate, selectedMonth, selectedYear, customStartDate, customEndDate, typeFilter, statusFilter]);

  // Filter expenses for the same timeframe to calculate true Net Profit
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (!exp.date) return false;
      const expDate = new Date(exp.date);
      if (isNaN(expDate.getTime())) return false;

      if (period === 'ALL_TIME') return true;

      if (period === 'DAILY') {
        const expDateStr = exp.date.split('T')[0];
        return expDateStr === selectedDate;
      }

      if (period === 'MONTHLY') {
        return (
          expDate.getFullYear() === selectedYear &&
          expDate.getMonth() === selectedMonth
        );
      }

      if (period === 'ANNUALLY') {
        return expDate.getFullYear() === selectedYear;
      }

      if (period === 'CUSTOM') {
        const expDateStr = exp.date.split('T')[0];
        return expDateStr >= customStartDate && expDateStr <= customEndDate;
      }

      return true;
    });
  }, [expenses, period, selectedDate, selectedMonth, selectedYear, customStartDate, customEndDate]);

  // Core Financial Aggregates
  const totalInvoiced = useMemo(() => {
    return filteredInvoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
  }, [filteredInvoices]);

  const totalCollected = useMemo(() => {
    return filteredInvoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
  }, [filteredInvoices]);

  const totalReceivables = useMemo(() => {
    return filteredInvoices.reduce((acc, inv) => acc + (inv.balanceDue || 0), 0);
  }, [filteredInvoices]);

  const totalExpensesAmount = useMemo(() => {
    return filteredExpenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);
  }, [filteredExpenses]);

  // Cost of Goods Sold (COGS)
  const totalCOGS = useMemo(() => {
    return filteredInvoices.reduce((acc, inv) => {
      const invCOGS = (inv.items || []).reduce((itemAcc, item) => {
        const unitCost = item.costPrice || 0;
        return itemAcc + unitCost * item.quantity;
      }, 0);
      return acc + invCOGS;
    }, 0);
  }, [filteredInvoices]);

  const grossProfit = totalInvoiced - totalCOGS;
  const grossMarginPercent = totalInvoiced > 0 ? (grossProfit / totalInvoiced) * 100 : 0;
  const netProfit = totalCollected - totalExpensesAmount;

  // Solar Installed Capacity (kW)
  const totalKwSold = useMemo(() => {
    return filteredInvoices.reduce((acc, inv) => {
      if (inv.projectSystemCapacityKw) {
        return acc + inv.projectSystemCapacityKw;
      }
      const panelWatts = (inv.items || []).reduce((pAcc, itm) => {
        if (itm.category === 'SOLAR_PANELS' && itm.specs) {
          const match = itm.specs.match(/(\d+)\s*W/i);
          if (match) {
            return pAcc + (parseInt(match[1], 10) * itm.quantity);
          }
        }
        return pAcc;
      }, 0);
      return acc + (panelWatts / 1000);
    }, 0);
  }, [filteredInvoices]);

  const avgOrderValue = filteredInvoices.length > 0 ? totalInvoiced / filteredInvoices.length : 0;

  // Category Breakdown Analysis
  const categoryStats = useMemo(() => {
    const map: Record<string, { name: string; category: ProductCategory; revenue: number; quantity: number }> = {};

    filteredInvoices.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        const cat = item.category || 'ACCESSORIES';
        if (!map[cat]) {
          map[cat] = {
            name: CATEGORY_LABELS[cat] || cat,
            category: cat,
            revenue: 0,
            quantity: 0,
          };
        }
        map[cat].revenue += item.total || (item.unitPrice * item.quantity);
        map[cat].quantity += item.quantity;
      });
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredInvoices]);

  // Payment Method Breakdown Analysis
  const paymentMethodStats = useMemo(() => {
    const methods: Record<string, number> = {
      CASH: 0,
      BANK_TRANSFER: 0,
      CREDIT_CARD: 0,
      CHEQUE: 0,
      ONLINE: 0,
    };

    filteredInvoices.forEach((inv) => {
      (inv.payments || []).forEach((pmt) => {
        const m = pmt.method || 'CASH';
        methods[m] = (methods[m] || 0) + (pmt.amount || 0);
      });
    });

    return methods;
  }, [filteredInvoices]);

  // Top Selling Solar Products / Equipment
  const topProducts = useMemo(() => {
    const map: Record<string, { description: string; category?: ProductCategory; brand?: string; quantity: number; revenue: number }> = {};

    filteredInvoices.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        const key = item.description.trim().toLowerCase();
        if (!map[key]) {
          map[key] = {
            description: item.description,
            category: item.category,
            brand: item.brand,
            quantity: 0,
            revenue: 0,
          };
        }
        map[key].quantity += item.quantity;
        map[key].revenue += item.total || (item.unitPrice * item.quantity);
      });
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [filteredInvoices]);

  // ==========================================
  // CUSTOMER-WISE REPORT DATA & AGGREGATION
  // ==========================================
  interface CustomerReportItem {
    id: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    customerCity?: string;
    customerAddress?: string;
    totalInvoices: number;
    totalCapacityKw: number;
    totalBilled: number;
    totalPaid: number;
    totalBalanceDue: number;
    lastSaleDate?: string;
    invoices: Invoice[];
  }

  const customerReportData = useMemo(() => {
    const map: Record<string, CustomerReportItem> = {};

    filteredInvoices.forEach((inv) => {
      const key = (inv.customerId || inv.customerName || 'Walk-in Customer').trim().toLowerCase();
      if (!map[key]) {
        map[key] = {
          id: inv.customerId || key,
          customerName: inv.customerName || 'Walk-in Customer',
          customerPhone: inv.customerPhone || '',
          customerEmail: inv.customerEmail || '',
          customerCity: inv.customerCity || '',
          customerAddress: inv.customerAddress || '',
          totalInvoices: 0,
          totalCapacityKw: 0,
          totalBilled: 0,
          totalPaid: 0,
          totalBalanceDue: 0,
          lastSaleDate: inv.date,
          invoices: [],
        };
      }

      const item = map[key];
      item.totalInvoices += 1;
      item.totalCapacityKw += (inv.projectSystemCapacityKw || 0);
      item.totalBilled += (inv.grandTotal || 0);
      item.totalPaid += (inv.paidAmount || 0);
      item.totalBalanceDue += (inv.balanceDue || 0);
      item.invoices.push(inv);

      if (inv.date && (!item.lastSaleDate || inv.date > item.lastSaleDate)) {
        item.lastSaleDate = inv.date;
      }
    });

    let list = Object.values(map);

    // Apply Search
    if (customerSearch.trim()) {
      const q = customerSearch.toLowerCase();
      list = list.filter(
        (c) =>
          c.customerName.toLowerCase().includes(q) ||
          (c.customerPhone && c.customerPhone.toLowerCase().includes(q)) ||
          (c.customerCity && c.customerCity.toLowerCase().includes(q))
      );
    }

    // Apply Balance filter
    if (customerBalanceFilter === 'WITH_BALANCE') {
      list = list.filter((c) => c.totalBalanceDue > 0);
    } else if (customerBalanceFilter === 'CLEARED') {
      list = list.filter((c) => c.totalBalanceDue <= 0);
    }

    // Sort by highest billed amount descending
    return list.sort((a, b) => b.totalBilled - a.totalBilled);
  }, [filteredInvoices, customerSearch, customerBalanceFilter]);

  // Customer Summary KPI Cards
  const totalCustomerCount = customerReportData.length;
  const customersWithDues = customerReportData.filter((c) => c.totalBalanceDue > 0).length;

  // ==========================================
  // PAYMENT-WISE REPORT DATA & FLATTENED LIST
  // ==========================================
  interface PaymentReportItem {
    id: string;
    invoiceId: string;
    invoiceNumber: string;
    customerName: string;
    customerPhone?: string;
    date: string;
    amount: number;
    method: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'CHEQUE' | 'ONLINE';
    referenceNumber?: string;
    notes?: string;
    receivedBy?: string;
    invoiceGrandTotal: number;
    invoiceBalanceDue: number;
  }

  const paymentReportData = useMemo(() => {
    const list: PaymentReportItem[] = [];

    filteredInvoices.forEach((inv) => {
      // If invoice has explicit payment items logged in payments[]
      if (inv.payments && inv.payments.length > 0) {
        inv.payments.forEach((pmt, pIdx) => {
          list.push({
            id: pmt.id || `${inv.id}-pmt-${pIdx}`,
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customerName || 'Walk-in Customer',
            customerPhone: inv.customerPhone,
            date: pmt.date || inv.date,
            amount: pmt.amount || 0,
            method: (pmt.method as any) || 'CASH',
            referenceNumber: pmt.referenceNumber,
            notes: pmt.notes,
            receivedBy: pmt.receivedBy,
            invoiceGrandTotal: inv.grandTotal,
            invoiceBalanceDue: inv.balanceDue,
          });
        });
      } else if (inv.paidAmount && inv.paidAmount > 0) {
        // Fallback if paid at creation
        list.push({
          id: `${inv.id}-pmt-initial`,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName || 'Walk-in Customer',
          customerPhone: inv.customerPhone,
          date: inv.date,
          amount: inv.paidAmount,
          method: 'CASH',
          referenceNumber: 'INITIAL-PAYMENT',
          notes: 'Recorded upon invoice issuance',
          invoiceGrandTotal: inv.grandTotal,
          invoiceBalanceDue: inv.balanceDue,
        });
      }
    });

    let results = list;

    // Filter by Payment Method
    if (paymentMethodFilter !== 'ALL') {
      results = results.filter((p) => p.method === paymentMethodFilter);
    }

    // Filter by Search Query
    if (paymentSearch.trim()) {
      const q = paymentSearch.toLowerCase();
      results = results.filter(
        (p) =>
          p.customerName.toLowerCase().includes(q) ||
          p.invoiceNumber.toLowerCase().includes(q) ||
          (p.referenceNumber && p.referenceNumber.toLowerCase().includes(q)) ||
          (p.notes && p.notes.toLowerCase().includes(q))
      );
    }

    // Sort by latest payment date first
    return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredInvoices, paymentMethodFilter, paymentSearch]);

  const totalFilteredPaymentsAmount = useMemo(() => {
    return paymentReportData.reduce((acc, p) => acc + p.amount, 0);
  }, [paymentReportData]);

  // Timeline Breakdown
  const timelineBreakdown = useMemo(() => {
    if (period === 'ANNUALLY') {
      return months.map((mName, index) => {
        const monthInvs = filteredInvoices.filter((inv) => {
          const d = new Date(inv.date);
          return d.getMonth() === index;
        });
        const revenue = monthInvs.reduce((a, b) => a + (b.grandTotal || 0), 0);
        const collected = monthInvs.reduce((a, b) => a + (b.paidAmount || 0), 0);
        const count = monthInvs.length;
        return { label: mName.substring(0, 3), fullLabel: mName, revenue, collected, count };
      });
    }

    if (period === 'MONTHLY') {
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const dailyData = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayInvs = filteredInvoices.filter((inv) => inv.date?.startsWith(dayStr));
        const revenue = dayInvs.reduce((a, b) => a + (b.grandTotal || 0), 0);
        const collected = dayInvs.reduce((a, b) => a + (b.paidAmount || 0), 0);
        const count = dayInvs.length;
        dailyData.push({
          label: `${day}`,
          fullLabel: `${months[selectedMonth]} ${day}, ${selectedYear}`,
          revenue,
          collected,
          count,
        });
      }
      return dailyData;
    }

    if (period === 'DAILY') {
      return filteredInvoices.map((inv, idx) => ({
        label: `#${idx + 1}`,
        fullLabel: `${inv.invoiceNumber} - ${inv.customerName}`,
        revenue: inv.grandTotal,
        collected: inv.paidAmount,
        count: 1,
      }));
    }

    return filteredInvoices.slice(0, 15).map((inv, idx) => ({
      label: inv.invoiceNumber,
      fullLabel: `${formatDate(inv.date)} - ${inv.customerName}`,
      revenue: inv.grandTotal,
      collected: inv.paidAmount,
      count: 1,
    }));
  }, [filteredInvoices, period, selectedMonth, selectedYear, months]);

  const maxTimelineRevenue = Math.max(...timelineBreakdown.map((t) => t.revenue), 1);

  // Navigation handlers
  const handlePrevious = () => {
    if (period === 'DAILY') {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 1);
      setSelectedDate(d.toISOString().split('T')[0]);
    } else if (period === 'MONTHLY') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear((y) => y - 1);
      } else {
        setSelectedMonth((m) => m - 1);
      }
    } else if (period === 'ANNUALLY') {
      setSelectedYear((y) => y - 1);
    }
  };

  const handleNext = () => {
    if (period === 'DAILY') {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + 1);
      setSelectedDate(d.toISOString().split('T')[0]);
    } else if (period === 'MONTHLY') {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear((y) => y + 1);
      } else {
        setSelectedMonth((m) => m + 1);
      }
    } else if (period === 'ANNUALLY') {
      setSelectedYear((y) => y + 1);
    }
  };

  const handleSetToday = () => {
    const now = new Date();
    setSelectedDate(now.toISOString().split('T')[0]);
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
  };

  // CSV Export (Dispatches based on viewMode)
  const handleExportCSV = () => {
    if (viewMode === 'CUSTOMER_WISE') {
      const headers = [
        'Customer Name',
        'Phone',
        'City',
        'Address',
        'Invoices Count',
        'Total Solar kW',
        'Total Billed (Sales)',
        'Total Paid (Collected)',
        'Outstanding Balance Due',
        'Status',
        'Last Transaction Date',
      ];

      const rows = customerReportData.map((c) => [
        `"${(c.customerName || 'Customer').replace(/"/g, '""')}"`,
        `"${c.customerPhone || ''}"`,
        `"${c.customerCity || ''}"`,
        `"${(c.customerAddress || '').replace(/"/g, '""')}"`,
        c.totalInvoices,
        c.totalCapacityKw.toFixed(1),
        c.totalBilled,
        c.totalPaid,
        c.totalBalanceDue,
        c.totalBalanceDue > 0 ? 'PENDING BALANCE' : 'CLEARED',
        `"${c.lastSaleDate ? c.lastSaleDate.split('T')[0] : ''}"`,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `SolarCraft_Customer_Sales_Report_${todayStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (viewMode === 'PAYMENT_WISE') {
      const headers = [
        'Payment Date',
        'Invoice #',
        'Customer Name',
        'Customer Phone',
        'Payment Method',
        'Amount Collected',
        'Reference / Cheque #',
        'Notes',
        'Invoice Total',
        'Remaining Balance Due',
      ];

      const rows = paymentReportData.map((p) => [
        `"${p.date ? p.date.split('T')[0] : ''}"`,
        `"${p.invoiceNumber || ''}"`,
        `"${(p.customerName || 'Customer').replace(/"/g, '""')}"`,
        `"${p.customerPhone || ''}"`,
        `"${p.method || 'CASH'}"`,
        p.amount,
        `"${(p.referenceNumber || '').replace(/"/g, '""')}"`,
        `"${(p.notes || '').replace(/"/g, '""')}"`,
        p.invoiceGrandTotal,
        p.invoiceBalanceDue,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `SolarCraft_Payment_Collections_Report_${todayStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Default Overview CSV
    const headers = [
      'Invoice #',
      'Date',
      'Type',
      'Customer Name',
      'Phone',
      'City',
      'System Capacity (kW)',
      'System Type',
      'Subtotal',
      'Discount',
      'Tax Amount',
      'Freight/Shipping',
      'Grand Total',
      'Paid Amount',
      'Balance Due',
      'Status',
    ];

    const rows = filteredInvoices.map((inv) => [
      `"${inv.invoiceNumber}"`,
      `"${inv.date ? inv.date.split('T')[0] : ''}"`,
      `"${inv.type}"`,
      `"${(inv.customerName || '').replace(/"/g, '""')}"`,
      `"${inv.customerPhone || ''}"`,
      `"${inv.customerCity || ''}"`,
      inv.projectSystemCapacityKw || 0,
      `"${inv.systemType || ''}"`,
      inv.subtotal || 0,
      inv.discountTotal || 0,
      inv.taxAmount || 0,
      inv.shippingOrFreight || 0,
      inv.grandTotal || 0,
      inv.paidAmount || 0,
      inv.balanceDue || 0,
      `"${inv.status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SolarCraft_Sales_Report_${period}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const getPeriodTitle = () => {
    if (period === 'ALL_TIME') {
      return 'All-Time Historical Sales Performance';
    }
    if (period === 'DAILY') {
      return `Daily Sales Report: ${formatDate(selectedDate)}`;
    }
    if (period === 'MONTHLY') {
      return `Monthly Sales Performance: ${months[selectedMonth]} ${selectedYear}`;
    }
    if (period === 'ANNUALLY') {
      return `Annual Financial & Sales Audit: Year ${selectedYear}`;
    }
    return `Custom Sales Period (${formatDate(customStartDate)} - ${formatDate(customEndDate)})`;
  };

  return (
    <div className="space-y-5 print:space-y-3">
      {/* Top Header & Main Navigation Tabs */}
      <div className="print:hidden flex flex-col gap-3.5 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-amber-400/20 text-amber-600 flex items-center justify-center font-bold shadow-2xs">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Sales & Financial Reports
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  ERP Intelligence
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Daily, Monthly & Annual Sales Performance, Customer-Wise Ledgers & Payment Collections
              </p>
            </div>
          </div>

          {/* Export & Print actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
              title="Download CSV Spreadsheet"
            >
              <Download className="h-3.5 w-3.5 text-amber-600" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
              title="Print Sales Report"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* 3 Main Report Perspectives (Overview vs Customer-Wise vs Payment-Wise) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('OVERVIEW')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                viewMode === 'OVERVIEW'
                  ? 'bg-amber-400 text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>General Sales Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('CUSTOMER_WISE')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                viewMode === 'CUSTOMER_WISE'
                  ? 'bg-amber-400 text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Customer-Wise Sales & Dues</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 text-white font-mono">
                {totalCustomerCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('PAYMENT_WISE')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                viewMode === 'PAYMENT_WISE'
                  ? 'bg-amber-400 text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Payment-Wise Collection Log</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-600 text-white font-mono">
                {paymentReportData.length}
              </span>
            </button>
          </div>

          {/* Timeframe Scope Selector Tabs (Daily, Monthly, Annually, Custom, All-Time) */}
          <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setPeriod('DAILY')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                period === 'DAILY' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setPeriod('MONTHLY')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                period === 'MONTHLY' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setPeriod('ANNUALLY')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                period === 'ANNUALLY' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annually
            </button>
            <button
              type="button"
              onClick={() => setPeriod('CUSTOM')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                period === 'CUSTOM' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom
            </button>
            <button
              type="button"
              onClick={() => setPeriod('ALL_TIME')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                period === 'ALL_TIME' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All-Time
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Navigator & Filter Sub-Bar */}
      <div className="print:hidden bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        {/* Date Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {period !== 'CUSTOM' && period !== 'ALL_TIME' && (
            <div className="flex items-center bg-white rounded-lg border border-slate-300 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevious}
                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                title="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 text-xs font-bold text-slate-800 select-none min-w-36 text-center">
                {period === 'DAILY' && formatDate(selectedDate)}
                {period === 'MONTHLY' && `${months[selectedMonth]} ${selectedYear}`}
                {period === 'ANNUALLY' && `Year ${selectedYear}`}
              </span>
              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                title="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Daily Date Picker */}
          {period === 'DAILY' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
            />
          )}

          {/* Monthly Selectors */}
          {period === 'MONTHLY' && (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Annually Selector */}
          {period === 'ANNUALLY' && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          )}

          {/* Custom Date Range */}
          {period === 'CUSTOM' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-800"
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-800"
              />
            </div>
          )}

          {period !== 'ALL_TIME' && (
            <button
              type="button"
              onClick={handleSetToday}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
            >
              Today
            </button>
          )}
        </div>

        {/* Global Document Type & Status Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white text-slate-800 focus:outline-hidden"
            >
              <option value="ALL">All Documents</option>
              <option value="INVOICE">Invoices Only</option>
              <option value="QUOTATION">Quotations Only</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white text-slate-800 focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">Paid in Full</option>
              <option value="PARTIAL">Partially Paid</option>
              <option value="UNPAID">Unpaid / Due</option>
            </select>
          </div>
        </div>
      </div>

      {/* Printable Corporate Report Header (Only visible on print / top of statement) */}
      <div className="border-b border-slate-300 pb-3 hidden print:block">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{settings.shopName || 'SolarCraft Energy Solutions'}</h1>
            <p className="text-xs text-slate-600">{settings.address || 'Commercial Solar Engineering & Inverter Sales'}</p>
            <p className="text-xs text-slate-600">Phone/WhatsApp: {settings.phone} | NTN/Tax ID: {settings.taxRegistrationNumber || 'N/A'}</p>
          </div>
          <div className="text-right">
            <span className="inline-block bg-slate-900 text-white font-mono font-bold text-xs px-2 py-1 rounded">
              {viewMode === 'CUSTOMER_WISE' ? 'CUSTOMER-WISE SALES & BALANCES REPORT' : viewMode === 'PAYMENT_WISE' ? 'PAYMENT & COLLECTION LEDGER REPORT' : 'EXECUTIVE SALES REPORT'}
            </span>
            <p className="text-xs font-bold text-slate-900 mt-1">{getPeriodTitle()}</p>
            <p className="text-[10px] text-slate-500">Generated on {formatDate(new Date().toISOString())}</p>
          </div>
        </div>
      </div>

      {/* 4 Core Financial KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Gross Sales */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {period === 'DAILY' ? "Today's Gross Sales" : period === 'MONTHLY' ? 'Monthly Gross Sales' : 'Gross Billed Sales'}
            </span>
            <span className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {formatCurrency(totalInvoiced, settings.currency, settings.currencyPosition)}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{filteredInvoices.length} Orders</span>
            <span>•</span>
            <span>Avg {formatCurrency(avgOrderValue, settings.currency, settings.currencyPosition)}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400" />
        </div>

        {/* Total Collected Cash */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Net Cash & Bank Collected
            </span>
            <span className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">
            {formatCurrency(totalCollected, settings.currency, settings.currencyPosition)}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <span className="font-semibold text-emerald-600">
              {totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0}% Realized
            </span>
            <span>•</span>
            <span className="text-rose-600 font-semibold">{formatCurrency(totalReceivables, settings.currency, settings.currencyPosition)} Due</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
        </div>

        {/* Solar Capacity Installed */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Solar Capacity Sold
            </span>
            <span className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Sun className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-blue-900 mt-2 font-mono">
            {totalKwSold.toFixed(1)} <span className="text-base font-bold text-blue-600">kW</span>
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <span>{totalKwSold >= 1000 ? `${(totalKwSold / 1000).toFixed(2)} MW Deployed` : `${Math.round(totalKwSold * 1.8)} Units/Day Est.`}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
        </div>

        {/* Active Customer Ledgers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Customer Accounts
            </span>
            <span className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-indigo-900 mt-2 font-mono">
            {totalCustomerCount} <span className="text-base font-bold text-indigo-500">Clients</span>
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <span className={customersWithDues > 0 ? 'text-amber-700 font-semibold' : 'text-emerald-600 font-semibold'}>
              {customersWithDues} with balance
            </span>
            <span>•</span>
            <span>{paymentReportData.length} payments</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: GENERAL OVERVIEW (KPIs, TIMELINE BARS, CATEGORIES, PRODUCTS, INVOICES) */}
      {/* ========================================================================= */}
      {viewMode === 'OVERVIEW' && (
        <div className="space-y-5">
          {/* Visual Timeline & Sales Progression Chart / Bars */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-amber-500" />
                  {period === 'ANNUALLY' && 'Month-by-Month Annual Sales Progression'}
                  {period === 'MONTHLY' && `Daily Sales Timeline for ${months[selectedMonth]} ${selectedYear}`}
                  {period === 'DAILY' && `Transaction Ledger for ${formatDate(selectedDate)}`}
                  {period === 'CUSTOM' && 'Custom Date Range Timeline'}
                  {period === 'ALL_TIME' && 'Historical Revenue Trend Overview'}
                </h3>
                <p className="text-xs text-slate-500">
                  Visual sales revenue (amber) vs actual collected cash payments (green)
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-xs bg-amber-400"></span>
                  <span className="text-slate-600 font-medium">Billed Revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-xs bg-emerald-500"></span>
                  <span className="text-slate-600 font-medium">Collected Cash</span>
                </div>
              </div>
            </div>

            {/* Timeline Visual Bars */}
            {timelineBreakdown.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No sales or invoices recorded for this selected time period.
              </div>
            ) : (
              <div className="space-y-2.5 pt-2">
                <div className="grid grid-cols-12 gap-1 sm:gap-2 items-end h-44 border-b border-slate-200 pb-2 px-1">
                  {timelineBreakdown.map((item, idx) => {
                    const heightPct = Math.max(4, Math.round((item.revenue / maxTimelineRevenue) * 100));
                    const collectedPct = Math.max(2, Math.round((item.collected / maxTimelineRevenue) * 100));

                    return (
                      <div
                        key={idx}
                        className="flex flex-col items-center justify-end h-full group relative"
                        title={`${item.fullLabel}: Invoiced ${formatCurrency(item.revenue, settings.currency, settings.currencyPosition)} | Collected ${formatCurrency(item.collected, settings.currency, settings.currencyPosition)}`}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center pointer-events-none">
                          <div className="bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap">
                            <p className="font-bold">{item.fullLabel}</p>
                            <p className="text-amber-300">Invoiced: {formatCurrency(item.revenue, settings.currency, settings.currencyPosition)}</p>
                            <p className="text-emerald-300">Paid: {formatCurrency(item.collected, settings.currency, settings.currencyPosition)}</p>
                          </div>
                          <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1"></div>
                        </div>

                        <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full">
                          {/* Billed Bar */}
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full max-w-4 rounded-t-xs transition-all duration-300 ${
                              item.revenue > 0 ? 'bg-amber-400 group-hover:bg-amber-500' : 'bg-slate-100'
                            }`}
                          />
                          {/* Collected Bar */}
                          <div
                            style={{ height: `${collectedPct}%` }}
                            className={`w-full max-w-4 rounded-t-xs transition-all duration-300 ${
                              item.collected > 0 ? 'bg-emerald-500 group-hover:bg-emerald-600' : 'bg-slate-100'
                            }`}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 mt-1 truncate max-w-full">
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Grid: Category Breakdown + Top Selling Equipment + Payment Channels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 1. Solar Category Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-amber-500" />
                  Category Share
                </h3>
                <span className="text-xs font-bold text-slate-500">{categoryStats.length} Categories</span>
              </div>

              {categoryStats.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No category sales data</p>
              ) : (
                <div className="space-y-2.5">
                  {categoryStats.map((cat) => {
                    const pct = totalInvoiced > 0 ? Math.round((cat.revenue / totalInvoiced) * 100) : 0;
                    return (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 truncate max-w-44">
                            {cat.name}
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            {formatCurrency(cat.revenue, settings.currency, settings.currencyPosition)} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className={`h-full ${CATEGORY_COLORS[cat.category] || 'bg-amber-400'} rounded-full transition-all duration-500`}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Total Quantity Sold: {cat.quantity} units
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Top Selling Solar Equipment Models */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-blue-500" />
                  Top Selling Hardware
                </h3>
                <span className="text-xs font-bold text-slate-500">By Revenue</span>
              </div>

              {topProducts.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No product data for this period</p>
              ) : (
                <div className="space-y-2.5">
                  {topProducts.map((prod, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-4 w-4 items-center justify-center rounded bg-slate-200 text-[10px] font-bold text-slate-700">
                            {idx + 1}
                          </span>
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {prod.description}
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {prod.quantity} units sold {prod.brand ? `• ${prod.brand}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold font-mono text-slate-900">
                          {formatCurrency(prod.revenue, settings.currency, settings.currencyPosition)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Payment Method & Cash Realization */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-emerald-500" />
                    Payment Channels
                  </h3>
                  <button
                    type="button"
                    onClick={() => setViewMode('PAYMENT_WISE')}
                    className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
                  >
                    View All Logs →
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Cash in Hand */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-emerald-500" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Cash in Hand (Counter)</p>
                        <p className="text-[10px] text-slate-500">Physical showroom currency</p>
                      </div>
                    </div>
                    <p className="text-xs font-bold font-mono text-slate-900">
                      {formatCurrency(paymentMethodStats.CASH, settings.currency, settings.currencyPosition)}
                    </p>
                  </div>

                  {/* Bank Transfer / Wire */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-blue-500" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Bank Transfer / IBAN</p>
                        <p className="text-[10px] text-slate-500">Direct wire & online banking</p>
                      </div>
                    </div>
                    <p className="text-xs font-bold font-mono text-slate-900">
                      {formatCurrency(paymentMethodStats.BANK_TRANSFER, settings.currency, settings.currencyPosition)}
                    </p>
                  </div>

                  {/* Cheque & Credit Cards */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-purple-500" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Cheque & Cards</p>
                        <p className="text-[10px] text-slate-500">Commercial clearing cheques</p>
                      </div>
                    </div>
                    <p className="text-xs font-bold font-mono text-slate-900">
                      {formatCurrency(paymentMethodStats.CHEQUE + paymentMethodStats.CREDIT_CARD + paymentMethodStats.ONLINE, settings.currency, settings.currencyPosition)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs">
                <div className="flex justify-between items-center text-slate-800 font-semibold mb-1">
                  <span>Collection Recovery Rate:</span>
                  <span className="font-bold text-amber-900">
                    {totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  {totalReceivables > 0
                    ? `${formatCurrency(totalReceivables, settings.currency, settings.currencyPosition)} currently outstanding across customer accounts.`
                    : 'All customer sales are 100% paid and cleared!'}
                </p>
              </div>
            </div>
          </div>

          {/* Itemized Sales Transaction Ledger Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Itemized Sales & Invoices ({filteredInvoices.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Detailed records matching selected date range: {getPeriodTitle()}
                </p>
              </div>
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No transaction records found for this timeframe. Try selecting another date or filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-3.5 py-2.5">Invoice #</th>
                      <th className="px-3.5 py-2.5">Date</th>
                      <th className="px-3.5 py-2.5">Customer / Project</th>
                      <th className="px-3.5 py-2.5">Solar kW</th>
                      <th className="px-3.5 py-2.5 text-right">Items Billed</th>
                      <th className="px-3.5 py-2.5 text-right">Grand Total</th>
                      <th className="px-3.5 py-2.5 text-right">Paid</th>
                      <th className="px-3.5 py-2.5 text-right">Balance Due</th>
                      <th className="px-3.5 py-2.5 text-center">Status</th>
                      <th className="px-3.5 py-2.5 text-right print:hidden">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                          {inv.invoiceNumber}
                          {inv.type === 'QUOTATION' && (
                            <span className="ml-1 text-[9px] bg-slate-200 text-slate-700 px-1 py-0.5 rounded font-sans">
                              QUOTE
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600 whitespace-nowrap">
                          {formatDate(inv.date)}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <p className="font-semibold text-slate-800">{inv.customerName}</p>
                          <p className="text-[10px] text-slate-500">{inv.customerCity || inv.customerPhone}</p>
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-blue-600">
                          {inv.projectSystemCapacityKw ? `${inv.projectSystemCapacityKw} kW` : '-'}
                        </td>
                        <td className="px-3.5 py-2.5 text-right text-slate-600">
                          {inv.items?.length || 0} items
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(inv.grandTotal, settings.currency, settings.currencyPosition)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-emerald-600">
                          {formatCurrency(inv.paidAmount, settings.currency, settings.currencyPosition)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-rose-600">
                          {formatCurrency(inv.balanceDue, settings.currency, settings.currencyPosition)}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'PARTIAL' ? 'warning' : 'danger'}>
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="px-3.5 py-2.5 text-right print:hidden">
                          <button
                            type="button"
                            onClick={() => onViewInvoice && onViewInvoice(inv)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-slate-700 hover:bg-slate-200 font-semibold transition-colors cursor-pointer"
                            title="View / Print Invoice"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100/80 font-bold text-slate-900 border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={3} className="px-3.5 py-3 text-xs uppercase">
                        Summary Total ({filteredInvoices.length} Invoices)
                      </td>
                      <td className="px-3.5 py-3 text-blue-700">
                        {totalKwSold.toFixed(1)} kW
                      </td>
                      <td className="px-3.5 py-3 text-right text-slate-600">
                        -
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-slate-900 text-sm">
                        {formatCurrency(totalInvoiced, settings.currency, settings.currencyPosition)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-emerald-700 text-sm">
                        {formatCurrency(totalCollected, settings.currency, settings.currencyPosition)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-rose-700 text-sm">
                        {formatCurrency(totalReceivables, settings.currency, settings.currencyPosition)}
                      </td>
                      <td colSpan={2} className="px-3.5 py-3 text-center text-xs text-slate-500 print:hidden">
                        {grossMarginPercent.toFixed(1)}% Margin
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: CUSTOMER-WISE SALES & BALANCE RECOVERY LEDGER                     */}
      {/* ========================================================================= */}
      {viewMode === 'CUSTOMER_WISE' && (
        <div className="space-y-4">
          {/* Customer Search & Balance Filters */}
          <div className="print:hidden bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by customer name, phone number, city..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Balance Status:</span>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setCustomerBalanceFilter('ALL')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    customerBalanceFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({customerReportData.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerBalanceFilter('WITH_BALANCE')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    customerBalanceFilter === 'WITH_BALANCE' ? 'bg-rose-500 text-white shadow-2xs font-bold' : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  Pending Balance ({customersWithDues})
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerBalanceFilter('CLEARED')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    customerBalanceFilter === 'CLEARED' ? 'bg-emerald-600 text-white shadow-2xs font-bold' : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  Fully Cleared
                </button>
              </div>
            </div>
          </div>

          {/* Customer Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-600" />
                  Customer Sales & Outstanding Balance Ledgers ({customerReportData.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Comprehensive accounts breakdown: total solar kW purchased, revenue generated, cash collected & balance due
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 hidden sm:inline">
                Click any row to expand invoice history
              </span>
            </div>

            {customerReportData.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No customer sales found matching the current search or date filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Customer Details</th>
                      <th className="px-3.5 py-3 text-center">Invoices</th>
                      <th className="px-3.5 py-3 text-center">Capacity (kW)</th>
                      <th className="px-3.5 py-3 text-right">Total Billed</th>
                      <th className="px-3.5 py-3 text-right">Total Paid</th>
                      <th className="px-3.5 py-3 text-right">Balance Due</th>
                      <th className="px-3.5 py-3 text-center">Status</th>
                      <th className="px-3.5 py-3 text-right print:hidden">Ledger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customerReportData.map((c) => {
                      const isExpanded = expandedCustomerId === c.id;
                      return (
                        <React.Fragment key={c.id}>
                          <tr
                            onClick={() => setExpandedCustomerId(isExpanded ? null : c.id)}
                            className={`cursor-pointer transition-colors ${
                              isExpanded ? 'bg-amber-50/60' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                                  {c.customerName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 text-xs">{c.customerName}</p>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                    {c.customerPhone && (
                                      <span className="flex items-center gap-0.5">
                                        <Phone className="h-2.5 w-2.5" />
                                        {c.customerPhone}
                                      </span>
                                    )}
                                    {c.customerCity && (
                                      <span className="flex items-center gap-0.5">
                                        <MapPin className="h-2.5 w-2.5" />
                                        {c.customerCity}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-3.5 py-3 text-center font-semibold text-slate-700">
                              <span className="bg-slate-100 px-2 py-0.5 rounded font-mono">
                                {c.totalInvoices}
                              </span>
                            </td>

                            <td className="px-3.5 py-3 text-center font-bold text-blue-600 font-mono">
                              {c.totalCapacityKw > 0 ? `${c.totalCapacityKw.toFixed(1)} kW` : '-'}
                            </td>

                            <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(c.totalBilled, settings.currency, settings.currencyPosition)}
                            </td>

                            <td className="px-3.5 py-3 text-right font-mono font-semibold text-emerald-700">
                              {formatCurrency(c.totalPaid, settings.currency, settings.currencyPosition)}
                            </td>

                            <td className="px-3.5 py-3 text-right font-mono font-bold text-rose-600">
                              {formatCurrency(c.totalBalanceDue, settings.currency, settings.currencyPosition)}
                            </td>

                            <td className="px-3.5 py-3 text-center">
                              {c.totalBalanceDue > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                                  <AlertCircle className="h-3 w-3" />
                                  Due
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Cleared
                                </span>
                              )}
                            </td>

                            <td className="px-3.5 py-3 text-right print:hidden">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedCustomerId(isExpanded ? null : c.id);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-slate-600 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
                              >
                                <span>{isExpanded ? 'Hide' : 'Invoices'}</span>
                                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Invoices Sub-table for this Customer */}
                          {isExpanded && (
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <td colSpan={8} className="p-4">
                                <div className="rounded-lg bg-white border border-slate-200 p-3 shadow-2xs">
                                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                      <FileText className="h-3.5 w-3.5 text-amber-500" />
                                      Transaction History for {c.customerName}
                                    </h4>
                                    <span className="text-[11px] text-slate-500 font-semibold">
                                      Recovery Rate: {c.totalBilled > 0 ? Math.round((c.totalPaid / c.totalBilled) * 100) : 0}%
                                    </span>
                                  </div>

                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                                      <tr>
                                        <th className="py-1.5 px-2">Invoice #</th>
                                        <th className="py-1.5 px-2">Date</th>
                                        <th className="py-1.5 px-2">Solar Capacity</th>
                                        <th className="py-1.5 px-2 text-right">Invoice Total</th>
                                        <th className="py-1.5 px-2 text-right">Paid</th>
                                        <th className="py-1.5 px-2 text-right">Due Balance</th>
                                        <th className="py-1.5 px-2 text-center">Status</th>
                                        <th className="py-1.5 px-2 text-right print:hidden">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {c.invoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-slate-50">
                                          <td className="py-1.5 px-2 font-mono font-bold text-slate-900">
                                            {inv.invoiceNumber}
                                          </td>
                                          <td className="py-1.5 px-2 text-slate-600">
                                            {formatDate(inv.date)}
                                          </td>
                                          <td className="py-1.5 px-2 font-semibold text-blue-600">
                                            {inv.projectSystemCapacityKw ? `${inv.projectSystemCapacityKw} kW` : '-'}
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                                            {formatCurrency(inv.grandTotal, settings.currency, settings.currencyPosition)}
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-mono font-semibold text-emerald-600">
                                            {formatCurrency(inv.paidAmount, settings.currency, settings.currencyPosition)}
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-mono font-semibold text-rose-600">
                                            {formatCurrency(inv.balanceDue, settings.currency, settings.currencyPosition)}
                                          </td>
                                          <td className="py-1.5 px-2 text-center">
                                            <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'PARTIAL' ? 'warning' : 'danger'}>
                                              {inv.status}
                                            </Badge>
                                          </td>
                                          <td className="py-1.5 px-2 text-right print:hidden">
                                            <button
                                              type="button"
                                              onClick={() => onViewInvoice && onViewInvoice(inv)}
                                              className="text-amber-700 hover:text-amber-900 font-bold text-[11px] underline cursor-pointer"
                                            >
                                              Open Invoice
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <tr>
                      <td className="px-4 py-3 text-xs uppercase">
                        Total {customerReportData.length} Customers
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        {customerReportData.reduce((a, b) => a + b.totalInvoices, 0)} Invoices
                      </td>
                      <td className="px-3.5 py-3 text-center text-blue-700">
                        {customerReportData.reduce((a, b) => a + b.totalCapacityKw, 0).toFixed(1)} kW
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-sm">
                        {formatCurrency(
                          customerReportData.reduce((a, b) => a + b.totalBilled, 0),
                          settings.currency,
                          settings.currencyPosition
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-emerald-700 text-sm">
                        {formatCurrency(
                          customerReportData.reduce((a, b) => a + b.totalPaid, 0),
                          settings.currency,
                          settings.currencyPosition
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-rose-700 text-sm">
                        {formatCurrency(
                          customerReportData.reduce((a, b) => a + b.totalBalanceDue, 0),
                          settings.currency,
                          settings.currencyPosition
                        )}
                      </td>
                      <td colSpan={2} className="px-3.5 py-3 text-center text-xs text-slate-500">
                        Summary Ledger
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: PAYMENT-WISE COLLECTION LOG (CHRONOLOGICAL RECEIPTS & CHANNELS)   */}
      {/* ========================================================================= */}
      {viewMode === 'PAYMENT_WISE' && (
        <div className="space-y-4">
          {/* Payment Method Stat Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-bold text-slate-500 uppercase">Cash at Counter</span>
              </div>
              <p className="text-lg font-black text-slate-900 mt-1 font-mono">
                {formatCurrency(paymentMethodStats.CASH, settings.currency, settings.currencyPosition)}
              </p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-[11px] font-bold text-slate-500 uppercase">Bank Wire / IBAN</span>
              </div>
              <p className="text-lg font-black text-slate-900 mt-1 font-mono">
                {formatCurrency(paymentMethodStats.BANK_TRANSFER, settings.currency, settings.currencyPosition)}
              </p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-purple-500" />
                <span className="text-[11px] font-bold text-slate-500 uppercase">Cheques Received</span>
              </div>
              <p className="text-lg font-black text-slate-900 mt-1 font-mono">
                {formatCurrency(paymentMethodStats.CHEQUE, settings.currency, settings.currencyPosition)}
              </p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-indigo-500" />
                <span className="text-[11px] font-bold text-slate-500 uppercase">Card & Online</span>
              </div>
              <p className="text-lg font-black text-slate-900 mt-1 font-mono">
                {formatCurrency(paymentMethodStats.CREDIT_CARD + paymentMethodStats.ONLINE, settings.currency, settings.currencyPosition)}
              </p>
            </div>
          </div>

          {/* Payment Search & Filter Controls */}
          <div className="print:hidden bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                placeholder="Search payments by customer, invoice #, cheque / ref #..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Method:</span>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              >
                <option value="ALL">All Payment Methods</option>
                <option value="CASH">Cash in Hand</option>
                <option value="BANK_TRANSFER">Bank Transfer / IBAN</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CREDIT_CARD">Credit / Debit Card</option>
                <option value="ONLINE">Online Portal</option>
              </select>
            </div>
          </div>

          {/* Payment Transactions Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  Itemized Payment Collection Receipts ({paymentReportData.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Chronological payment stream matching timeframe: {getPeriodTitle()}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-700 font-mono">
                  Total Collected: {formatCurrency(totalFilteredPaymentsAmount, settings.currency, settings.currencyPosition)}
                </span>
              </div>
            </div>

            {paymentReportData.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No payment transactions found matching the selected timeframe or filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-3.5 py-3">Date</th>
                      <th className="px-3.5 py-3">Invoice #</th>
                      <th className="px-3.5 py-3">Customer</th>
                      <th className="px-3.5 py-3">Payment Method</th>
                      <th className="px-3.5 py-3">Ref / Cheque #</th>
                      <th className="px-3.5 py-3 text-right">Amount Received</th>
                      <th className="px-3.5 py-3 text-right">Invoice Balance</th>
                      <th className="px-3.5 py-3 text-right print:hidden">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentReportData.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-2.5 text-slate-700 whitespace-nowrap font-medium">
                          {formatDate(p.date)}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                          {p.invoiceNumber}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <p className="font-bold text-slate-800">{p.customerName}</p>
                          {p.customerPhone && <p className="text-[10px] text-slate-400">{p.customerPhone}</p>}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.method === 'CASH'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.method === 'BANK_TRANSFER'
                                ? 'bg-blue-100 text-blue-800'
                                : p.method === 'CHEQUE'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {p.method === 'CASH' && <Wallet className="h-3 w-3" />}
                            {p.method === 'BANK_TRANSFER' && <Landmark className="h-3 w-3" />}
                            {p.method === 'CHEQUE' && <Receipt className="h-3 w-3" />}
                            {(p.method || 'CASH').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-600">
                          {p.referenceNumber ? p.referenceNumber : <span className="text-slate-300">-</span>}
                          {p.notes && <p className="text-[10px] text-slate-400 font-sans truncate max-w-40">{p.notes}</p>}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-700 text-sm">
                          {formatCurrency(p.amount, settings.currency, settings.currencyPosition)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono text-slate-600">
                          {p.invoiceBalanceDue > 0 ? (
                            <span className="text-rose-600 font-semibold">
                              {formatCurrency(p.invoiceBalanceDue, settings.currency, settings.currencyPosition)}
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-semibold">Cleared</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-right print:hidden">
                          <button
                            type="button"
                            onClick={() => {
                              const found = invoices.find((inv) => inv.id === p.invoiceId);
                              if (found && onViewInvoice) {
                                onViewInvoice(found);
                              }
                            }}
                            className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Invoice</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={5} className="px-3.5 py-3 text-xs uppercase">
                        Total Payment Receipts ({paymentReportData.length} Transactions)
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-emerald-700 text-sm">
                        {formatCurrency(totalFilteredPaymentsAmount, settings.currency, settings.currencyPosition)}
                      </td>
                      <td colSpan={2} className="px-3.5 py-3 text-center text-xs text-slate-500">
                        Net Cash & Bank Cleared
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Signature & Audit Closing Box for Formal Reports (Visible when printed) */}
      <div className="hidden print:grid grid-cols-3 gap-8 pt-8 text-center text-xs text-slate-700">
        <div>
          <div className="border-b border-slate-400 h-12"></div>
          <p className="mt-1 font-bold">Prepared By (Sales Officer)</p>
        </div>
        <div>
          <div className="border-b border-slate-400 h-12"></div>
          <p className="mt-1 font-bold">Verified By (Chief Accountant)</p>
        </div>
        <div>
          <div className="border-b border-slate-400 h-12"></div>
          <p className="mt-1 font-bold">Approved By (Managing Director)</p>
        </div>
      </div>
    </div>
  );
};
