import React, { useRef } from 'react';
import {
  Printer,
  ArrowLeft,
  Sun,
  MapPin,
  Phone,
  Mail,
  Zap,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  Share2
} from 'lucide-react';
import { Customer, Invoice, ShopSettings } from '../../types/solar';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { openWhatsApp } from '../../utils/sendDirect';

interface CustomerStatementPrintViewProps {
  customer: Customer;
  invoices: Invoice[];
  settings: ShopSettings;
  onBack: () => void;
}

export const CustomerStatementPrintView: React.FC<CustomerStatementPrintViewProps> = ({
  customer,
  invoices,
  settings,
  onBack,
}) => {
  const printContainerRef = useRef<HTMLDivElement>(null);

  const customerInvoices = invoices.filter((i) => i.customerId === customer.id);
  
  // Sort invoices chronologically
  const sortedInvoices = [...customerInvoices].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Only actual commercial invoices (not quotations) represent customer billed debits & dues
  const actualInvoices = sortedInvoices.filter((inv) => inv.type !== 'QUOTATION');
  const totalInvoiced = actualInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalPaid = actualInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalBalanceDue = Math.max(0, totalInvoiced - totalPaid);

  // Extract all payment transactions across invoices
  const allPayments = sortedInvoices.flatMap((inv) =>
    (inv.payments || []).map((p) => ({
      ...p,
      invoiceNumber: inv.invoiceNumber,
      invoiceType: inv.type,
    }))
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    let text = `*Customer Statement & Account Summary - ${settings.shopName}*\n\n` +
      `👤 *Client:* ${customer.name}\n`;
    if (customer.installedCapacityKw) {
      text += `⚡ *System:* ${customer.installedCapacityKw} kW (${(customer.systemType || 'Solar PV').replace(/_/g, ' ')})\n`;
    }
    text += `📊 *Total Billed:* ${formatCurrency(totalInvoiced, settings.currency, settings.currencyPosition)}\n` +
      `✅ *Total Paid:* ${formatCurrency(totalPaid, settings.currency, settings.currencyPosition)}\n` +
      `🔴 *Balance Due:* ${formatCurrency(totalBalanceDue, settings.currency, settings.currencyPosition)}\n\n` +
      `📞 Contact ${settings.shopName}: ${settings.phone}`;
    
    openWhatsApp(customer.whatsapp || customer.phone || '', text);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Top Action Bar (Hidden in Print) */}
      <div className="no-print flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Solar Clients</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex items-center gap-1.5 rounded bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share Summary via WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded bg-amber-400 px-4 py-1.5 text-xs font-bold text-slate-900 hover:bg-amber-500 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Customer Ledger Document */}
      <div
        ref={printContainerRef}
        className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 sm:p-9 text-slate-900 shadow-sm printable-document"
        style={{ color: '#0f172a' }}
      >
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 border-b-2 border-slate-900 pb-5">
          {/* Company Brand */}
          <div className="space-y-1 max-w-md">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-slate-950 font-bold shadow-xs">
                <Sun className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-slate-900">
                  {settings.shopName}
                </h1>
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                  {settings.tagline}
                </p>
              </div>
            </div>

            <div className="pt-1.5 text-xs text-slate-600 space-y-0.5">
              <p className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                <span>{settings.address}, {settings.city}</span>
              </p>
              <p className="flex items-center gap-1">
                <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                <span>{settings.phone}</span>
                <span className="mx-1">•</span>
                <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                <span>{settings.email}</span>
              </p>
              {settings.taxRegistrationNumber && (
                <p className="text-[10px] font-bold text-slate-700">
                  NTN / Tax ID: {settings.taxRegistrationNumber}
                </p>
              )}
            </div>
          </div>

          {/* Statement Document Meta */}
          <div className="sm:text-right space-y-1">
            <span className="inline-block rounded bg-amber-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-950 border border-amber-300">
              CUSTOMER STATEMENT & TOTAL RECORD
            </span>
            <p className="text-xs font-mono font-bold text-slate-700 pt-1">
              Statement Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
            <p className="text-[11px] text-slate-500">
              Account ID: <span className="font-mono font-bold text-slate-800">{customer.id.toUpperCase()}</span>
            </p>
          </div>
        </div>

        {/* Client & Solar Site Profile Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-slate-200">
          {/* Customer Details */}
          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Client & Billing Information
            </span>
            <h2 className="text-base font-bold text-slate-900">{customer.name}</h2>
            <div className="space-y-1 text-xs text-slate-700">
              <p className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-semibold">{customer.phone}</span>
                {customer.whatsapp && (
                  <span className="text-[10px] text-emerald-700 font-medium bg-emerald-100/80 px-1.5 py-0.5 rounded">
                    WA: {customer.whatsapp}
                  </span>
                )}
              </p>
              {customer.email && (
                <p className="flex items-center gap-1.5 text-slate-600">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>{customer.email}</span>
                </p>
              )}
              <p className="flex items-start gap-1.5 text-slate-700">
                <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                <span>{customer.address ? `${customer.address}, ${customer.city}` : customer.city || 'Installation Site'}</span>
              </p>
              {customer.nationalIdOrTax && (
                <p className="text-[11px] text-slate-600 font-mono">
                  CNIC / NTN: {customer.nationalIdOrTax}
                </p>
              )}
            </div>
          </div>

          {/* Solar Plant Specifications */}
          <div className="bg-amber-50/60 rounded-lg p-3.5 border border-amber-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                Solar Power Plant Profile
              </span>
              <span className="text-[10px] font-semibold bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded">
                {(customer.customerType || 'RESIDENTIAL').replace(/_/g, ' ')}
              </span>
            </div>

            <div className="space-y-1 text-xs text-slate-800">
              <div className="flex justify-between py-0.5 border-b border-amber-200/60">
                <span className="text-slate-600">Installed Capacity:</span>
                <span className="font-bold text-amber-800">
                  {customer.installedCapacityKw ? `${customer.installedCapacityKw} kW DC Array` : 'Custom Solar System'}
                </span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-amber-200/60">
                <span className="text-slate-600">System Architecture:</span>
                <span className="font-semibold text-slate-800">
                  {customer.systemType ? customer.systemType.replace(/_/g, ' ') : 'Turnkey Setup'}
                </span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-amber-200/60">
                <span className="text-slate-600">Inverter S/N:</span>
                <span className="font-mono font-medium text-slate-800">
                  {customer.inverterSerial || 'On Record / Commissioned'}
                </span>
              </div>
              {customer.consumerNumber && (
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Utility Consumer #:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {customer.consumerNumber}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Financial Overview Cards */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="p-3 rounded-lg border border-slate-200 bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Lifetime Total Invoiced
            </span>
            <p className="mt-0.5 text-lg font-black text-slate-900">
              {formatCurrency(totalInvoiced, settings.currency, settings.currencyPosition)}
            </p>
            <p className="text-[10px] text-slate-500">{sortedInvoices.length} Total Billing Documents</p>
          </div>

          <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Total Amount Received
            </span>
            <p className="mt-0.5 text-lg font-black text-emerald-700">
              {formatCurrency(totalPaid, settings.currency, settings.currencyPosition)}
            </p>
            <p className="text-[10px] text-emerald-700">Verified Cleared Receipts</p>
          </div>

          <div className={`p-3 rounded-lg border ${totalBalanceDue > 0 ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-white'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${totalBalanceDue > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
              Net Outstanding Balance
            </span>
            <p className={`mt-0.5 text-lg font-black ${totalBalanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {formatCurrency(totalBalanceDue, settings.currency, settings.currencyPosition)}
            </p>
            <p className="text-[10px] text-slate-500">
              {totalBalanceDue > 0 ? 'Pending Settlement' : 'All Dues Fully Cleared'}
            </p>
          </div>
        </div>

        {/* Section 1: Complete Invoices & Quotations History */}
        <div className="my-5 space-y-2">
          <div className="flex items-center justify-between pb-1 border-b-2 border-slate-900">
            <h3 className="font-extrabold text-slate-900 uppercase text-xs tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4 text-amber-600" />
              <span>1. Complete Invoice & Quotation Ledger</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-semibold">
              {sortedInvoices.length} Records
            </span>
          </div>

          {sortedInvoices.length === 0 ? (
            <p className="text-center py-4 text-slate-400 text-xs italic">
              No invoices or quotations have been created for this client yet.
            </p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase border-b border-slate-200">
                  <th className="py-2 px-2.5">Date</th>
                  <th className="py-2 px-2.5">Document #</th>
                  <th className="py-2 px-2.5">Type</th>
                  <th className="py-2 px-2.5 text-right">Invoiced Amount</th>
                  <th className="py-2 px-2.5 text-right">Paid</th>
                  <th className="py-2 px-2.5 text-right">Balance Due</th>
                  <th className="py-2 px-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-medium text-slate-700">{formatDate(inv.date)}</td>
                    <td className="py-2 px-2.5 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="py-2 px-2.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        inv.type === 'QUOTATION'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'text-slate-600 bg-slate-100'
                      }`}>
                        {inv.type === 'QUOTATION' ? 'Quotation (Est.)' : inv.type}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-right font-bold text-slate-900">
                      {formatCurrency(inv.grandTotal, settings.currency, settings.currencyPosition)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-medium text-emerald-700">
                      {inv.type === 'QUOTATION' ? '—' : formatCurrency(inv.paidAmount, settings.currency, settings.currencyPosition)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-bold">
                      {inv.type === 'QUOTATION' ? (
                        <span className="text-slate-400 font-normal text-[11px]">— (Quote)</span>
                      ) : (
                        <span className="text-rose-600">
                          {formatCurrency(inv.balanceDue, settings.currency, settings.currencyPosition)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                        inv.type === 'QUOTATION'
                          ? 'bg-blue-100 text-blue-900'
                          : inv.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-900'
                          : inv.status === 'PARTIAL'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-rose-100 text-rose-900'
                      }`}>
                        {inv.type === 'QUOTATION' ? 'PROPOSAL' : inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/80 font-black text-slate-900 border-t-2 border-slate-900">
                  <td colSpan={3} className="py-2 px-2.5 text-right uppercase text-[10px] tracking-wider">
                    Total Account Balance:
                  </td>
                  <td className="py-2 px-2.5 text-right">
                    {formatCurrency(totalInvoiced, settings.currency, settings.currencyPosition)}
                  </td>
                  <td className="py-2 px-2.5 text-right text-emerald-700">
                    {formatCurrency(totalPaid, settings.currency, settings.currencyPosition)}
                  </td>
                  <td className="py-2 px-2.5 text-right text-rose-600">
                    {formatCurrency(totalBalanceDue, settings.currency, settings.currencyPosition)}
                  </td>
                  <td className="py-2 px-2.5" />
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Section 2: Detailed Payment Receipts Ledger */}
        {allPayments.length > 0 && (
          <div className="my-5 space-y-2">
            <div className="flex items-center justify-between pb-1 border-b-2 border-slate-900">
              <h3 className="font-extrabold text-slate-900 uppercase text-xs tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>2. Payment Receipts & Verification History</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-semibold">
                {allPayments.length} Transactions
              </span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase border-b border-slate-200">
                  <th className="py-2 px-2.5">Date</th>
                  <th className="py-2 px-2.5">Against Document</th>
                  <th className="py-2 px-2.5">Payment Method</th>
                  <th className="py-2 px-2.5">Reference / Cheque #</th>
                  <th className="py-2 px-2.5 text-right">Amount Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {allPayments.map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-medium text-slate-700">{formatDate(p.date)}</td>
                    <td className="py-2 px-2.5 font-mono font-bold text-slate-900">{p.invoiceNumber}</td>
                    <td className="py-2 px-2.5">
                      <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {p.method.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600">
                      {p.referenceNo || p.notes || '—'}
                    </td>
                    <td className="py-2 px-2.5 text-right font-bold text-emerald-700">
                      + {formatCurrency(p.amount, settings.currency, settings.currencyPosition)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50/80 font-black text-emerald-950 border-t-2 border-emerald-800">
                  <td colSpan={4} className="py-2 px-2.5 text-right uppercase text-[10px] tracking-wider">
                    Total Collections Received:
                  </td>
                  <td className="py-2 px-2.5 text-right text-emerald-800 text-sm">
                    {formatCurrency(totalPaid, settings.currency, settings.currencyPosition)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Bank & Payment Settlement Instructions */}
        {settings.bankDetails && totalBalanceDue > 0 && (
          <div className="mt-5 p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Official Bank Settlement Account
            </span>
            <p className="text-xs text-slate-800 font-mono whitespace-pre-line leading-relaxed">
              {settings.bankDetails}
            </p>
          </div>
        )}

        {/* Signatures & Verification Footer */}
        <div className="mt-10 pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="h-10 border-b border-dashed border-slate-400 mx-auto w-48 mb-1" />
            <p className="font-bold text-slate-800">{customer.name}</p>
            <p className="text-[10px] text-slate-500">Client / Site Authorized Signatory</p>
          </div>

          <div>
            <div className="h-10 border-b border-dashed border-slate-400 mx-auto w-48 mb-1" />
            <p className="font-bold text-slate-800">{settings.shopName}</p>
            <p className="text-[10px] text-slate-500">Authorized Accounts & Solar Engineering Dept.</p>
          </div>
        </div>

        <div className="mt-6 text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
          This document is a computerized account statement & customer record generated by {settings.shopName}.
        </div>
      </div>
    </div>
  );
};
