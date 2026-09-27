import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Receipt, 
  Trash2, 
  Edit3, 
  BarChart3
} from 'lucide-react';
import { Expense, ShopSettings, Invoice } from '../../types/solar';
import { ProfitLossReport } from './ProfitLossReport';
import { formatCurrency, formatDate, getExpenseCategoryLabel } from '../../utils/formatters';

interface ExpenseListProps {
  expenses: Expense[];
  invoices: Invoice[];
  settings: ShopSettings;
  onOpenExpenseEditor: (expense?: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  invoices,
  settings,
  onOpenExpenseEditor,
  onDeleteExpense,
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'PNL'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch =
      exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.payee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.referenceNo && exp.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === 'ALL' || exp.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalExpenseAmount = filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            Shop Expenses & Profit / Loss
          </h1>
          <p className="text-xs text-slate-500">
            Track warehouse rent, installer wages, transport logistics, DISCOM fee permits, and tools.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Switch View Mode */}
          <div className="flex rounded border border-slate-200 bg-white p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                viewMode === 'LIST'
                  ? 'bg-amber-400 text-slate-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Expense Log</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('PNL')}
              className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                viewMode === 'PNL'
                  ? 'bg-amber-400 text-slate-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>P&L Statement</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenExpenseEditor()}
            className="flex items-center gap-1.5 rounded bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Record Expense</span>
          </button>
        </div>
      </div>

      {viewMode === 'PNL' ? (
        <ProfitLossReport expenses={expenses} invoices={invoices} settings={settings} />
      ) : (
        <>
          {/* Summary Chips */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Operating Expenses</p>
              <p className="mt-0.5 text-xl font-bold text-rose-600">
                {formatCurrency(totalExpenseAmount, settings.currency, settings.currencyPosition)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{filteredExpenses.length} Records in current view</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Labor & Technician Payroll</p>
              <p className="mt-0.5 text-xl font-bold text-slate-900">
                {formatCurrency(
                  expenses.filter(e => e.category === 'LABOR_INSTALLATION_WAGES').reduce((a, b) => a + b.amount, 0),
                  settings.currency,
                  settings.currencyPosition
                )}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Civil & Electrical Installers</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Logistics & Permits</p>
              <p className="mt-0.5 text-xl font-bold text-slate-900">
                {formatCurrency(
                  expenses.filter(e => e.category === 'TRANSPORT_FREIGHT' || e.category === 'PERMITS_NET_METERING_FEES').reduce((a, b) => a + b.amount, 0),
                  settings.currency,
                  settings.currencyPosition
                )}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Freight cranes & DISCOM filings</p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search expense description, payee, ref #..."
                className="w-full rounded border border-slate-200 bg-slate-50 pl-8 pr-3 py-1 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:border-amber-500 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="RENT">Warehouse & Office Rent</option>
              <option value="LABOR_INSTALLATION_WAGES">Installer Wages & Payroll</option>
              <option value="TRANSPORT_FREIGHT">Panel Logistics & Freight</option>
              <option value="PERMITS_NET_METERING_FEES">Permits & Inspection Fees</option>
              <option value="TOOLS_SAFETY_GEAR">Tools & Harnesses</option>
              <option value="UTILITIES">Electricity & Water</option>
              <option value="MARKETING_ADS">Marketing & Leads</option>
              <option value="MISCELLANEOUS">Miscellaneous</option>
            </select>
          </div>

          {/* Expenses Table */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
            {filteredExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center">
                <Receipt className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">No expense records found</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Click "+ Record Expense" to log operational overheads.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Date / Expense Title</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Paid To (Payee)</th>
                      <th className="py-2.5 px-3">Payment Method / Ref</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Title & Date */}
                        <td className="py-2 px-3">
                          <p className="font-bold text-slate-900">{exp.title}</p>
                          <span className="text-[10px] text-slate-400">{formatDate(exp.date)}</span>
                        </td>

                        {/* Category */}
                        <td className="py-2 px-3">
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                            {getExpenseCategoryLabel(exp.category)}
                          </span>
                        </td>

                        {/* Payee */}
                        <td className="py-2 px-3">
                          <span className="text-slate-800 font-medium">{exp.payee}</span>
                        </td>

                        {/* Payment Method */}
                        <td className="py-2 px-3">
                          <span className="text-slate-600 text-[11px]">
                            {(exp.paymentMethod || 'CASH').replace(/_/g, ' ')}
                          </span>
                          {exp.referenceNo && (
                            <span className="text-[10px] text-slate-400 font-mono block">
                              Ref: {exp.referenceNo}
                            </span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-2 px-3 text-right font-bold text-rose-600">
                          {formatCurrency(exp.amount, settings.currency, settings.currencyPosition)}
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenExpenseEditor(exp)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              title="Edit Expense"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete expense "${exp.title}"?`)) {
                                  onDeleteExpense(exp.id);
                                }
                              }}
                              className="rounded p-1 text-rose-500 hover:bg-rose-50"
                              title="Delete Expense"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
