import React, { useRef } from 'react';
import { 
  Printer, 
  Sun
} from 'lucide-react';
import { Invoice, Expense, ShopSettings, ExpenseCategory } from '../../types/solar';
import { formatCurrency, getExpenseCategoryLabel } from '../../utils/formatters';

interface ProfitLossReportProps {
  invoices: Invoice[];
  expenses: Expense[];
  settings: ShopSettings;
}

export const ProfitLossReport: React.FC<ProfitLossReportProps> = ({
  invoices,
  expenses,
  settings,
}) => {
  const pnlRef = useRef<HTMLDivElement>(null);

  // 1. Revenue
  const totalInvoicedRevenue = invoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
  const totalCollectedRevenue = invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
  const totalPendingReceivables = invoices.reduce((acc, inv) => acc + inv.balanceDue, 0);

  // 2. Cost of Goods Sold (COGS)
  const totalCOGS = invoices.reduce((acc, inv) => {
    return acc + inv.items.reduce((itemAcc, itm) => itemAcc + ((itm.costPrice || 0) * itm.quantity), 0);
  }, 0);

  // 3. Gross Profit
  const grossProfit = totalInvoicedRevenue - totalCOGS;
  const grossMarginPercent = totalInvoicedRevenue > 0 ? (grossProfit / totalInvoicedRevenue) * 100 : 0;

  // 4. Operating Expenses by Category
  const expenseByCategory = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<ExpenseCategory, number>);

  const totalOperatingExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

  // 5. Net Profit
  const netProfitAccrual = grossProfit - totalOperatingExpenses;
  const netMarginPercent = totalInvoicedRevenue > 0 ? (netProfitAccrual / totalInvoicedRevenue) * 100 : 0;

  const handlePrintPnl = () => {
    window.print();
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Top Banner & Print Trigger */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Solar Business Profit & Loss Statement</h3>
          <p className="text-xs text-slate-500">
            Comprehensive financial breakdown of solar turnkey sales, cost of goods, and shop overhead
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrintPnl}
          className="flex items-center gap-1.5 rounded bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-slate-900 hover:bg-amber-500 shadow-xs transition-colors cursor-pointer"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>Print / Export P&L</span>
        </button>
      </div>

      {/* P&L Financial Cards Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Billed Revenue</span>
          <p className="mt-0.5 text-xl font-bold text-slate-900">
            {formatCurrency(totalInvoicedRevenue, settings.currency, settings.currencyPosition)}
          </p>
          <p className="text-[10px] text-slate-400">{invoices.length} Client Installations</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cost of Goods (COGS)</span>
          <p className="mt-0.5 text-xl font-bold text-slate-600">
            {formatCurrency(totalCOGS, settings.currency, settings.currencyPosition)}
          </p>
          <p className="text-[10px] text-slate-400">Panels, Inverters, Battery procurement</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Gross Profit</span>
          <p className="mt-0.5 text-xl font-bold text-emerald-700">
            {formatCurrency(grossProfit, settings.currency, settings.currencyPosition)}
          </p>
          <p className="text-[10px] text-emerald-600 font-semibold">{grossMarginPercent.toFixed(1)}% Gross Margin</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Net Clean Profit</span>
          <p className={`mt-0.5 text-xl font-bold ${netProfitAccrual >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {formatCurrency(netProfitAccrual, settings.currency, settings.currencyPosition)}
          </p>
          <p className="text-[10px] text-slate-500">{netMarginPercent.toFixed(1)}% Net Margin</p>
        </div>
      </div>

      {/* Printable Statement Sheet */}
      <div
        ref={pnlRef}
        className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 sm:p-9 text-slate-900 shadow-sm printable-document"
        style={{ color: '#0f172a' }}
      >
        {/* PnL Sheet Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sun className="h-6 w-6 text-amber-500" />
              <h2 className="text-lg font-black">{settings.shopName}</h2>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">INCOME STATEMENT & PROFIT/LOSS REPORT</p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p>Period: All-Time Financial Overview</p>
            <p className="text-[10px] text-slate-400">Generated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Breakdown sections */}
        <div className="space-y-4">
          {/* Revenue */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-1 rounded">
              1. Operating Solar Revenue
            </h4>
            <div className="mt-1 divide-y divide-slate-100">
              <div className="flex justify-between py-1.5 px-2 text-xs">
                <span>Total Billed Customer Contracts (Accrual)</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(totalInvoicedRevenue, settings.currency, settings.currencyPosition)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 px-2 text-xs text-emerald-700">
                <span>&bull; Cash & Bank Collections Cleared</span>
                <span className="font-semibold">
                  {formatCurrency(totalCollectedRevenue, settings.currency, settings.currencyPosition)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 px-2 text-xs text-rose-600">
                <span>&bull; Uncollected Receivables Balance Due</span>
                <span>
                  {formatCurrency(totalPendingReceivables, settings.currency, settings.currencyPosition)}
                </span>
              </div>
            </div>
          </div>

          {/* COGS */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-1 rounded">
              2. Direct Cost of Solar Equipment (COGS)
            </h4>
            <div className="mt-1 divide-y divide-slate-100">
              <div className="flex justify-between py-1.5 px-2 text-xs">
                <span>Total Hardware Cost (Panels, Inverters, Battery Banks, Structure)</span>
                <span className="font-semibold text-rose-600">
                  -{formatCurrency(totalCOGS, settings.currency, settings.currencyPosition)}
                </span>
              </div>
              <div className="flex justify-between py-2 px-2 text-xs font-bold bg-slate-50 border-t border-slate-200">
                <span>Gross Solar Profit</span>
                <span className="text-emerald-700">
                  {formatCurrency(grossProfit, settings.currency, settings.currencyPosition)} ({grossMarginPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Operating Overheads */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-1 rounded">
              3. Operating Expenses (OPEX)
            </h4>
            <div className="mt-1 divide-y divide-slate-100">
              {Object.entries(expenseByCategory).map(([categoryKey, catAmount]) => (
                <div key={categoryKey} className="flex justify-between py-1.5 px-2 text-xs">
                  <span className="text-slate-700">{getExpenseCategoryLabel(categoryKey as ExpenseCategory)}</span>
                  <span className="font-medium text-slate-800">
                    -{formatCurrency(Number(catAmount || 0), settings.currency, settings.currencyPosition)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between py-1.5 px-2 text-xs font-bold text-slate-900 border-t border-slate-200">
                <span>Total Operating Overhead</span>
                <span className="text-rose-600">
                  -{formatCurrency(totalOperatingExpenses, settings.currency, settings.currencyPosition)}
                </span>
              </div>
            </div>
          </div>

          {/* Final Net Profit */}
          <div className="border-t-2 border-slate-900 pt-3">
            <div className="flex justify-between items-center py-2 px-3 rounded bg-slate-50 border border-slate-200 text-sm font-black">
              <span>NET OPERATING INCOME / PROFIT:</span>
              <span className={`text-base ${netProfitAccrual >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {formatCurrency(netProfitAccrual, settings.currency, settings.currencyPosition)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
