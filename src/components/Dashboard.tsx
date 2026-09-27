import React, { useState } from 'react';
import { 
  DollarSign, 
  Sun, 
  TrendingUp, 
  Package, 
  FileText, 
  Receipt, 
  Users, 
  AlertTriangle, 
  Plus, 
  Building, 
  Home, 
  Droplets, 
  CheckCircle2, 
  Calculator, 
  ArrowRight, 
  Send, 
  Lock,
  BarChart3,
  Zap,
  MessageCircle
} from 'lucide-react';
import { 
  Invoice, 
  PurchaseOrder, 
  Customer, 
  Expense, 
  ProductItem, 
  ShopSettings 
} from '../types/solar';
import { StatsCard } from './common/StatsCard';
import { Badge } from './common/Badge';
import { formatCurrency, formatDate } from '../utils/formatters';
import { buildWhatsAppMessage, openWhatsApp, buildCustomerBalanceReminderMessage } from '../utils/sendDirect';
import { BulkBalanceReminderModal } from './customers/BulkBalanceReminderModal';

interface DashboardProps {
  invoices: Invoice[];
  purchaseOrders: PurchaseOrder[];
  customers: Customer[];
  expenses: Expense[];
  products: ProductItem[];
  settings: ShopSettings;
  setActiveTab?: (tab: string) => void;
  onOpenNewInvoice?: () => void;
  onOpenNewPO?: () => void;
  onOpenEstimator?: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onViewLowStock?: () => void;
  onOpenInvoiceEditor?: (invoice?: Invoice) => void;
  onOpenExpenseEditor?: () => void;
  onOpenCustomerEditor?: () => void;
  onSendInvoice?: (invoice: Invoice) => void;
  onOpenSecretProfit?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  invoices,
  purchaseOrders,
  customers,
  expenses,
  products,
  settings,
  setActiveTab,
  onOpenNewInvoice,
  onOpenNewPO,
  onOpenEstimator,
  onViewInvoice,
  onViewLowStock,
  onOpenInvoiceEditor,
  onOpenExpenseEditor,
  onSendInvoice,
  onOpenSecretProfit,
}) => {
  const [isBulkReminderOpen, setIsBulkReminderOpen] = useState(false);

  // Financial calculations
  const totalInvoiced = invoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
  const totalCollected = invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
  const totalReceivables = invoices.reduce((acc, inv) => acc + inv.balanceDue, 0);
  const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  
  // Cost of Goods for invoiced products
  const estimatedCOGS = invoices.reduce((acc, inv) => {
    return acc + inv.items.reduce((itemAcc, itm) => itemAcc + ((itm.costPrice || 0) * itm.quantity), 0);
  }, 0);

  const estimatedGrossProfit = totalInvoiced - estimatedCOGS;
  const netProfit = totalCollected - totalExpenses;

  // Solar Metrics
  const totalKwInstalled = customers.reduce((acc, c) => acc + (c.installedCapacityKw || 0), 0);
  const totalInventoryValue = products.reduce((acc, p) => acc + (p.stockQty * p.costPrice), 0);
  
  // Stock alert items
  const lowStockItems = products.filter(p => p.category !== 'SERVICES_LABOR' && p.stockQty <= p.minStockAlert);
  const pendingInvoices = invoices.filter(i => i.balanceDue > 0);

  // System type distribution
  const residentialCount = customers.filter(c => c.customerType === 'RESIDENTIAL').length;
  const commercialCount = customers.filter(c => c.customerType === 'COMMERCIAL' || c.customerType === 'INDUSTRIAL').length;
  const agriCount = customers.filter(c => c.customerType === 'AGRICULTURAL').length;

  // Customer-wise pending balance summary
  const customersWithPendingDue = customers
    .filter(c => (c.balanceDue || 0) > 0)
    .sort((a, b) => (b.balanceDue || 0) - (a.balanceDue || 0));

  const handleCreateInvoice = onOpenNewInvoice || (onOpenInvoiceEditor ? () => onOpenInvoiceEditor() : undefined);
  const handleOpenEstimator = onOpenEstimator || (() => setActiveTab && setActiveTab('ESTIMATOR'));
  const handleOpenInventory = onViewLowStock || (() => setActiveTab && setActiveTab('INVENTORY'));

  return (
    <div className="space-y-4">
      {/* Low Stock Warning Banner if any */}
      {lowStockItems.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-slate-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-200/80 text-amber-900">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                Low Inventory Alert: {lowStockItems.length} Solar Equipment Items Need Reordering
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {lowStockItems.map(p => `${p.name} (${p.stockQty} ${p.unit} left)`).slice(0, 3).join(', ')}
                {lowStockItems.length > 3 && ` and ${lowStockItems.length - 3} more...`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenNewPO || (() => setActiveTab && setActiveTab('PURCHASING'))}
            className="shrink-0 rounded bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-amber-500 shadow-xs transition-colors"
          >
            + Create Purchase Order
          </button>
        </div>
      )}

      {/* 4 Top KPI Stat Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Sales Revenue"
          value={formatCurrency(totalInvoiced, settings.currency, settings.currencyPosition)}
          subtitle={`${invoices.length} Invoices • View Reports →`}
          icon={<BarChart3 className="h-4 w-4" />}
          trend={{ value: 'Daily/Mo/Yr', isPositive: true }}
          accentColor="amber"
          onClick={() => setActiveTab && setActiveTab('REPORTS')}
        />

        <StatsCard
          title="Active Solar Capacity"
          value={`${totalKwInstalled.toFixed(1)} kW`}
          subtitle={`${customers.length} Installed Clients`}
          icon={<Sun className="h-4 w-4" />}
          trend={{ value: '8.2%', isPositive: true }}
          accentColor="emerald"
          onClick={() => setActiveTab && setActiveTab('CUSTOMERS')}
        />

        <StatsCard
          title="Pending Receivables"
          value={formatCurrency(totalReceivables, settings.currency, settings.currencyPosition)}
          subtitle={`${pendingInvoices.length} Invoices Pending Due`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          trend={{ value: `${pendingInvoices.length} Due`, isPositive: false }}
          accentColor="blue"
          onClick={() => setActiveTab && setActiveTab('INVOICES')}
        />

        <StatsCard
          title="Total Operating Expenses"
          value={formatCurrency(totalExpenses, settings.currency, settings.currencyPosition)}
          subtitle={`${expenses.length} Expense logs recorded`}
          icon={<Receipt className="h-4 w-4" />}
          trend={{ value: '4.2%', isPositive: false }}
          accentColor="rose"
          onClick={() => setActiveTab && setActiveTab('EXPENSES')}
        />
      </div>

      {/* Main High Density 3-Column Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Col 1 & 2: Recent Solar Invoices Table */}
        <div className="lg:col-span-2 flex flex-col bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-xs sm:text-sm text-slate-800">Recent Solar Invoices</h2>
              <span className="text-[11px] text-slate-500">Latest client installations and billings</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab && setActiveTab('INVOICES')}
              className="text-xs text-amber-600 font-bold hover:underline"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-2">ID / Date</th>
                  <th className="px-3.5 py-2">Customer</th>
                  <th className="px-3.5 py-2">Service / Capacity</th>
                  <th className="px-3.5 py-2 text-right">Amount</th>
                  <th className="px-3.5 py-2 text-center">Status</th>
                  <th className="px-3.5 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-400">
                      No invoices created yet. Click "+ Create Invoice" to get started.
                    </td>
                  </tr>
                ) : (
                  invoices.slice(0, 6).map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 cursor-pointer transition-colors">
                      <td className="px-3.5 py-2 font-mono text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span className="font-semibold text-slate-900">{inv.invoiceNumber}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{formatDate(inv.date)}</span>
                      </td>
                      <td className="px-3.5 py-2">
                        <p className="font-medium text-slate-900">{inv.customerName}</p>
                        <p className="text-[10px] text-slate-500">{inv.customerCity || 'On-site'}</p>
                      </td>
                      <td className="px-3.5 py-2 text-slate-600">
                        {inv.projectSystemCapacityKw ? (
                          <span className="font-semibold text-slate-800">{inv.projectSystemCapacityKw} kW Array</span>
                        ) : (
                          inv.items[0]?.description ? (
                            <span className="truncate block max-w-[140px]">{inv.items[0].description}</span>
                          ) : 'Solar Service'
                        )}
                        <span className="block text-[10px] text-slate-400">{inv.systemType?.replace('_', ' ') || 'ON GRID'}</span>
                      </td>
                      <td className="px-3.5 py-2 text-right font-bold text-slate-900">
                        {formatCurrency(inv.grandTotal, settings.currency, settings.currencyPosition)}
                        {inv.balanceDue > 0 && (
                          <span className="block text-[10px] text-amber-600 font-medium">
                            Due: {formatCurrency(inv.balanceDue, settings.currency, settings.currencyPosition)}
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2 text-center">
                        <Badge status={inv.status} size="sm" />
                      </td>
                      <td className="px-3.5 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Instant 1-Click WhatsApp */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const text = buildWhatsAppMessage(inv, settings);
                              openWhatsApp(inv.customerPhone || '', text);
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded transition-colors cursor-pointer"
                            title="Instant WhatsApp to Customer"
                          >
                            <span>💬</span>
                            <span className="hidden sm:inline">WhatsApp</span>
                          </button>

                          {onSendInvoice && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSendInvoice(inv);
                              }}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded transition-colors"
                              title="Send Options (Email, SMS, Link)"
                            >
                              <Send className="h-2.5 w-2.5 text-amber-700" />
                              <span>Options</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewInvoice(inv);
                            }}
                            className="px-2 py-1 text-[10px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Col 3: Customer Pending Dues & Inventory & Monthly Flow */}
        <div className="flex flex-col gap-4">
          {/* Card 1: Customer-Wise Pending Receivables */}
          <div className="flex flex-col bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-rose-50/40 flex justify-between items-center gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Users className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                <h2 className="font-bold text-[11px] uppercase tracking-wider text-rose-900 truncate">
                  Customer Pending Dues
                </h2>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {customersWithPendingDue.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsBulkReminderOpen(true)}
                    className="flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-0.5 rounded shadow-2xs transition-colors cursor-pointer"
                    title="Automatically send WhatsApp / SMS payment reminders to all pending customers"
                  >
                    <Zap className="h-2.5 w-2.5 fill-white" />
                    <span>Remind All ({customersWithPendingDue.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab && setActiveTab('CUSTOMERS')}
                  className="text-[10px] font-bold text-rose-700 hover:underline cursor-pointer"
                >
                  All →
                </button>
              </div>
            </div>

            <div className="p-3.5 space-y-2.5">
              {customersWithPendingDue.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-800">All Balances Cleared</p>
                  <p className="text-[10px] text-slate-500">No customers currently have overdue milestones.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customersWithPendingDue.slice(0, 4).map((c) => {
                    const targetPhone = c.whatsapp || c.phone || '';
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-2 rounded-md bg-slate-50 hover:bg-rose-50/50 border border-slate-100 transition-colors"
                      >
                        <div 
                          onClick={() => setActiveTab && setActiveTab('CUSTOMERS')}
                          className="min-w-0 pr-2 cursor-pointer flex-1"
                        >
                          <p className="text-xs font-bold text-slate-900 truncate hover:text-amber-700">{c.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{c.phone || c.city || 'Solar Client'}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <p className="text-xs font-black font-mono text-rose-600">
                              {formatCurrency(c.balanceDue, settings.currency, settings.currencyPosition)}
                            </p>
                            <span className="text-[9px] font-bold text-rose-500 uppercase">Pending</span>
                          </div>

                          {targetPhone && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const msg = buildCustomerBalanceReminderMessage(c, settings, 'FRIENDLY');
                                openWhatsApp(targetPhone, msg);
                              }}
                              className="p-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors cursor-pointer"
                              title={`Send WhatsApp balance reminder to ${c.name}`}
                            >
                              <MessageCircle className="h-3.5 w-3.5 text-emerald-700" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {customersWithPendingDue.length > 4 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab && setActiveTab('CUSTOMERS')}
                      className="w-full text-center py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 rounded transition-colors"
                    >
                      + View {customersWithPendingDue.length - 4} more pending customers
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Inventory & Purchasing */}
          <div className="flex flex-col bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
              <h2 className="font-bold text-[11px] uppercase tracking-wider text-slate-600">
                Inventory & Equipment
              </h2>
              {lowStockItems.length > 0 && (
                <span className="text-[10px] bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded">
                  {lowStockItems.length} Low
                </span>
              )}
            </div>

            <div className="p-3.5 space-y-3">
              {products.slice(0, 4).map((prod) => {
                const isLow = prod.stockQty <= prod.minStockAlert;
                const percent = Math.min(100, Math.round((prod.stockQty / (prod.minStockAlert * 3 || 10)) * 100));

                return (
                  <div key={prod.id} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 font-medium truncate max-w-[160px]" title={prod.name}>
                        {prod.name}
                      </span>
                      <span className={`font-bold ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                        {prod.stockQty} {prod.unit}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          isLow ? 'bg-rose-500' : percent > 50 ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.max(8, percent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={onOpenNewPO || (() => setActiveTab && setActiveTab('PURCHASING'))}
                  className="flex-1 py-1.5 border border-slate-200 text-slate-700 rounded text-xs hover:bg-slate-50 font-semibold transition-colors text-center"
                >
                  + Purchase Order
                </button>
                <button
                  type="button"
                  onClick={handleOpenInventory}
                  className="px-2.5 py-1.5 border border-slate-200 text-slate-500 rounded text-xs hover:bg-slate-50 font-medium transition-colors"
                  title="View Full Warehouse Inventory"
                >
                  Stock
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Financial Mix & Profit Health */}
          <div className="flex flex-col bg-white border border-slate-200 rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
              <h2 className="font-bold text-[11px] uppercase tracking-wider text-slate-600">
                Operating Financial Flow
              </h2>
              <span className="text-xs font-bold text-emerald-600">
                Gross Margin: {totalInvoiced > 0 ? `${Math.round((estimatedGrossProfit / totalInvoiced) * 100)}%` : '0%'}
              </span>
            </div>

            <div className="pt-3 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Gross Hardware Profit:</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(estimatedGrossProfit, settings.currency, settings.currencyPosition)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Shop Operating Expenses:</span>
                <span className="font-bold text-rose-600">
                  -{formatCurrency(totalExpenses, settings.currency, settings.currencyPosition)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 font-bold text-slate-900 bg-slate-50 px-2 rounded">
                <span className="text-slate-700">Net Operating Flow:</span>
                <span className={netProfit >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                  {formatCurrency(netProfit, settings.currency, settings.currencyPosition)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-2 text-center text-[10px]">
                <div className="bg-slate-50 border border-slate-100 rounded p-1.5">
                  <span className="text-slate-400 block">Residential</span>
                  <span className="font-bold text-slate-800">{residentialCount}</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded p-1.5">
                  <span className="text-slate-400 block">Commercial</span>
                  <span className="font-bold text-slate-800">{commercialCount}</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded p-1.5">
                  <span className="text-slate-400 block">Solar Pump</span>
                  <span className="font-bold text-slate-800">{agriCount}</span>
                </div>
              </div>

              {onOpenSecretProfit && (
                <button
                  type="button"
                  onClick={onOpenSecretProfit}
                  className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  <Lock className="h-3.5 w-3.5 text-amber-600" />
                  <span>Open Secret Profit Vault (PIN Protected)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <BulkBalanceReminderModal
        isOpen={isBulkReminderOpen}
        onClose={() => setIsBulkReminderOpen(false)}
        customers={customers}
        settings={settings}
      />
    </div>
  );
};
