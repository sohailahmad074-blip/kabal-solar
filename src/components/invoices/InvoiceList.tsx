import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Printer, 
  CreditCard, 
  Trash2, 
  Edit3, 
  Sun,
  Eye,
  CheckCircle2,
  Send,
  BarChart3,
  ArrowRightLeft
} from 'lucide-react';
import { Invoice, ShopSettings } from '../../types/solar';
import { Badge } from '../common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { buildWhatsAppMessage, openWhatsApp } from '../../utils/sendDirect';

interface InvoiceListProps {
  invoices: Invoice[];
  settings: ShopSettings;
  onOpenInvoiceEditor?: (invoice?: Invoice) => void;
  onOpenEditor?: (invoice?: Invoice) => void;
  onViewInvoicePrint?: (invoice: Invoice) => void;
  onViewInvoice?: (invoice: Invoice) => void;
  onRecordPayment: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onSendInvoice?: (invoice: Invoice) => void;
  onOpenReports?: () => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  settings,
  onOpenInvoiceEditor,
  onOpenEditor,
  onViewInvoicePrint,
  onViewInvoice,
  onRecordPayment,
  onDeleteInvoice,
  onSendInvoice,
  onOpenReports,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const handleEdit = onOpenInvoiceEditor || onOpenEditor || (() => {});
  const handlePrint = onViewInvoicePrint || onViewInvoice || (() => {});

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerPhone.includes(searchTerm) ||
      (inv.customerCity && inv.customerCity.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || inv.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const totalInvoiced = filteredInvoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
  const totalPaid = filteredInvoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
  const totalDue = filteredInvoices.reduce((acc, inv) => acc + inv.balanceDue, 0);

  return (
    <div className="space-y-4">
      {/* Header & Title */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            Solar Invoices & Quotations
          </h1>
          <p className="text-xs text-slate-500">
            Manage customer quotations, official commercial tax invoices, milestone billings, and warranty documentation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenReports && (
            <button
              type="button"
              onClick={onOpenReports}
              className="flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <BarChart3 className="h-3.5 w-3.5 text-amber-500" />
              <span>📊 Daily / Monthly Reports</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              handleEdit({
                hasTradeIn: true,
                tradeInItems: [
                  {
                    id: `tradein-${Date.now()}`,
                    description: '',
                    brand: '',
                    condition: 'USED_WORKING',
                    quantity: 1,
                    valuationPrice: 0,
                  }
                ]
              } as any);
            }}
            className="flex items-center gap-1.5 rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900 shadow-xs hover:bg-emerald-100 transition-colors cursor-pointer"
            title="Create an invoice exchanging old customer solar material for new equipment with trade-in deduction"
          >
            <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline">+ Old Material Exchange</span>
            <span className="sm:hidden">Exchange</span>
          </button>

          <button
            type="button"
            onClick={() => handleEdit()}
            className="flex items-center gap-1.5 rounded bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-xs hover:bg-amber-500 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Create Invoice / Quote</span>
          </button>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Billed</p>
          <p className="mt-0.5 text-xl font-bold text-slate-900">
            {formatCurrency(totalInvoiced, settings.currency, settings.currencyPosition)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">{filteredInvoices.length} invoices displayed</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Total Collected</p>
          <p className="mt-0.5 text-xl font-bold text-emerald-700">
            {formatCurrency(totalPaid, settings.currency, settings.currencyPosition)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Cleared in bank / cash</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Outstanding Balance</p>
          <p className="mt-0.5 text-xl font-bold text-amber-700">
            {formatCurrency(totalDue, settings.currency, settings.currencyPosition)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Pending customer milestones</p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by invoice #, client name, phone, city..."
            className="w-full rounded border border-slate-200 bg-slate-50 pl-8 pr-3 py-1 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:border-amber-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PARTIAL">Partial</option>
            <option value="UNPAID">Unpaid</option>
            <option value="OVERDUE">Overdue</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:border-amber-500 focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="INVOICE">Tax Invoices</option>
            <option value="QUOTATION">Quotations</option>
            <option value="PROFORMA">Proforma</option>
            <option value="WARRANTY_CERT">Warranty Cert</option>
          </select>
        </div>
      </div>

      {/* Invoice Table Card */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <FileText className="h-10 w-10 text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-700">No invoices or quotations found</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or status filter.'
                : 'Click "+ Create Invoice / Quote" to create your first solar client proposal.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Doc # / Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">System Sizing</th>
                  <th className="py-2.5 px-3 text-right">Grand Total</th>
                  <th className="py-2.5 px-3 text-right">Paid / Balance</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Invoice ID & Date */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="font-bold text-slate-900">{inv.invoiceNumber}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                        <span className="font-semibold text-[9px] bg-slate-100 px-1 py-0.2 rounded text-slate-600">
                          {inv.type}
                        </span>
                        <span>{formatDate(inv.date)}</span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-2 px-3">
                      <p className="font-semibold text-slate-900">{inv.customerName}</p>
                      <p className="text-[10px] text-slate-500">{inv.customerPhone} {inv.customerCity ? `• ${inv.customerCity}` : ''}</p>
                    </td>

                    {/* Solar System Size */}
                    <td className="py-2 px-3">
                      {inv.projectSystemCapacityKw ? (
                        <div>
                          <div className="flex items-center gap-1 font-bold text-amber-600">
                            <Sun className="h-3 w-3" />
                            <span>{inv.projectSystemCapacityKw} kW</span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {inv.systemType ? inv.systemType.replace(/_/g, ' ') : 'Solar System'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Equipment Sale</span>
                      )}
                    </td>

                    {/* Total Amount */}
                    <td className="py-2 px-3 text-right">
                      <p className="font-bold text-slate-900">
                        {formatCurrency(inv.grandTotal, settings.currency, settings.currencyPosition)}
                      </p>
                      <p className="text-[10px] text-slate-400">{inv.items.length} items</p>
                    </td>

                    {/* Paid & Due Balance */}
                    <td className="py-2 px-3 text-right">
                      <p className="font-semibold text-emerald-700">
                        {formatCurrency(inv.paidAmount, settings.currency, settings.currencyPosition)}
                      </p>
                      {inv.balanceDue > 0 ? (
                        <p className="text-[10px] font-semibold text-rose-600">
                          Due: {formatCurrency(inv.balanceDue, settings.currency, settings.currencyPosition)}
                        </p>
                      ) : (
                        <p className="text-[10px] text-emerald-600">Settled in Full</p>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Badge status={inv.status} size="sm" />
                        {inv.inventoryDeducted && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded" title="Material was automatically deducted from solar inventory">
                            📦 Stock Deducted
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onSendInvoice && (
                          <div className="flex items-center gap-1">
                            {/* 1-Click Direct WhatsApp Action */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const text = buildWhatsAppMessage(inv, settings);
                                openWhatsApp(inv.customerPhone || '', text);
                              }}
                              className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 border border-emerald-300 shadow-2xs transition-colors cursor-pointer"
                              title="Instant 1-Click Send via WhatsApp to Customer"
                            >
                              <span className="text-xs">💬</span>
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>

                            {/* Full Send Options Dialog */}
                            <button
                              type="button"
                              onClick={() => onSendInvoice(inv)}
                              className="flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 border border-amber-200 shadow-2xs transition-colors cursor-pointer"
                              title="Direct Send Hub (WhatsApp, Email, SMS, Link)"
                            >
                              <Send className="h-3 w-3 text-amber-700" />
                              <span className="hidden sm:inline">Options</span>
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handlePrint(inv)}
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          title="Print / Export PDF"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onRecordPayment(inv)}
                          className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                          title="Record Payment"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEdit(inv)}
                          className="rounded p-1 text-amber-600 hover:bg-amber-50"
                          title="Edit Document"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete invoice ${inv.invoiceNumber}?`)) {
                              onDeleteInvoice(inv.id);
                            }
                          }}
                          className="rounded p-1 text-rose-500 hover:bg-rose-50"
                          title="Delete Invoice"
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
    </div>
  );
};
