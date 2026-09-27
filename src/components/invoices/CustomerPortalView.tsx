import React, { useRef } from 'react';
import { 
  Sun, 
  Printer, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  Building2, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  MessageSquare, 
  Copy, 
  ArrowLeft,
  Calendar,
  Zap,
  Download,
  ArrowLeftRight
} from 'lucide-react';
import { Invoice, ShopSettings } from '../../types/solar';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { formatWhatsAppNumber } from '../../utils/sendDirect';

interface CustomerPortalViewProps {
  invoice: Invoice;
  settings: ShopSettings;
  onBackToAdmin?: () => void;
  isAdmin?: boolean;
}

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  invoice,
  settings,
  onBackToAdmin,
  isAdmin = true,
}) => {
  const documentRef = useRef<HTMLDivElement>(null);
  const [copiedBank, setCopiedBank] = React.useState(false);

  const isQuote = invoice.type === 'QUOTATION' || invoice.type === 'PROFORMA';
  const docTitle = isQuote 
    ? (invoice.type === 'PROFORMA' ? 'PROFORMA COMMERCIAL INVOICE' : 'SOLAR PROPOSAL & QUOTATION')
    : (invoice.type === 'WARRANTY_CERT' ? 'SYSTEM COMMISSIONING & WARRANTY CERTIFICATE' : 'COMMERCIAL TAX INVOICE');

  const handlePrint = () => {
    window.print();
  };

  const handleCopyBank = () => {
    if (!settings.bankAccountNumber) return;
    const text = `Bank: ${settings.bankName}\nAccount Title: ${settings.bankAccountTitle}\nAccount #: ${settings.bankAccountNumber}${settings.ibanOrSwift ? `\nIBAN: ${settings.ibanOrSwift}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2500);
  };

  const cleanPhone = (settings?.phone || '').replace(/[^0-9+]/g, '');

  return (
    <div className="min-h-screen bg-slate-100/70 pb-12 pt-4 px-2 sm:px-6 font-sans">
      {/* Top Banner for Admin Navigation if inside app */}
      {isAdmin && onBackToAdmin && (
        <div className="no-print mx-auto max-w-4xl mb-3 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-medium">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Customer Portal Mode: Previewing document as seen by <strong>{invoice.customerName}</strong></span>
          </div>
          <button
            type="button"
            onClick={onBackToAdmin}
            className="flex items-center gap-1 font-bold text-amber-900 hover:text-amber-950 bg-white border border-amber-300 px-2.5 py-1 rounded shadow-xs cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Admin Console</span>
          </button>
        </div>
      )}

      {/* Customer Quick Action Bar */}
      <div className="no-print mx-auto max-w-4xl mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400 text-slate-900 shadow-xs font-bold">
            <Sun className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">{settings.shopName}</h1>
            <p className="text-[11px] text-slate-500">Official Customer Document Portal</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {settings.phone && (
            <a
              href={`https://wa.me/${formatWhatsAppNumber(settings.phone)}?text=${encodeURIComponent(`Hello ${settings.shopName}, I have a question regarding my document ${invoice.invoiceNumber}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>WhatsApp Us</span>
            </a>
          )}

          {settings.phone && (
            <a
              href={`tel:${cleanPhone}`}
              className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
            >
              <Phone className="h-3.5 w-3.5 text-amber-600" />
              <span>Call Us</span>
            </a>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded bg-amber-400 px-4 py-1.5 text-xs font-bold text-slate-900 hover:bg-amber-500 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Main Document Body */}
      <div
        ref={documentRef}
        className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 sm:p-9 text-slate-900 shadow-sm printable-document"
        style={{ color: '#0f172a' }}
      >
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between border-b-2 border-slate-900 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sun className="h-6 w-6 text-amber-500" />
              <h2 className="text-xl font-black tracking-tight">{settings.shopName}</h2>
            </div>
            {settings.tagline && (
              <p className="text-xs text-slate-500 italic mt-0.5">{settings.tagline}</p>
            )}
            <div className="mt-2 space-y-0.5 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-slate-400" />
                <span>{settings.address}, {settings.city} {settings.country ? `• ${settings.country}` : ''}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 text-slate-400" />
                <span>{settings.phone}</span>
                {settings.email && (
                  <>
                    <span className="text-slate-300">|</span>
                    <Mail className="h-3 w-3 text-slate-400" />
                    <span>{settings.email}</span>
                  </>
                )}
              </div>
              {settings.taxRegistrationNumber && (
                <p className="text-[11px] text-slate-500 font-mono">
                  TAX REG / GST / NTN: <strong>{settings.taxRegistrationNumber}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right">
            <h3 className="text-base font-black uppercase text-slate-900">
              {docTitle}
            </h3>
            <p className="text-sm font-bold text-amber-600 font-mono mt-0.5">
              {invoice.invoiceNumber}
            </p>
            <div className="mt-2 text-xs text-slate-600 space-y-0.5">
              <p>
                <span className="font-semibold">Date: </span>
                {formatDate(invoice.date)}
              </p>
              <p>
                <span className="font-semibold">Valid / Due Until: </span>
                {formatDate(invoice.dueDate)}
              </p>
              <div className="pt-1">
                {invoice.status === 'PAID' ? (
                  <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-800 border border-emerald-300">
                    PAID IN FULL
                  </span>
                ) : invoice.status === 'PARTIAL' ? (
                  <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800 border border-amber-300">
                    PARTIALLY PAID
                  </span>
                ) : (
                  <span className="inline-block rounded bg-rose-100 px-2 py-0.5 text-xs font-black text-rose-800 border border-rose-300">
                    PAYMENT DUE
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Client & Project Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
          <div className="rounded bg-slate-50 p-3 border border-slate-100">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-500 mb-1">
              Client & Bill To:
            </h4>
            <p className="text-sm font-bold text-slate-900">{invoice.customerName}</p>
            {invoice.customerAddress && <p className="text-slate-600 mt-0.5">{invoice.customerAddress}</p>}
            <p className="text-slate-600">{invoice.customerPhone} {invoice.customerEmail ? `• ${invoice.customerEmail}` : ''}</p>
          </div>

          <div className="rounded bg-slate-50 p-3 border border-slate-100">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-500 mb-1">
              Solar Installation Site:
            </h4>
            {invoice.projectSystemCapacityKw ? (
              <div className="flex items-center gap-1.5 font-bold text-amber-700 text-xs mb-1">
                <Sun className="h-3.5 w-3.5" />
                <span>{invoice.projectSystemCapacityKw} kW Solar PV System ({invoice.systemType ? invoice.systemType.replace(/_/g, ' ') : 'Grid-Tied'})</span>
              </div>
            ) : (
              <p className="font-medium text-slate-800 mb-1">Solar Hardware & Equipment Order</p>
            )}
            {invoice.installationAddress && (
              <p className="text-slate-600 text-xs">
                <strong>Site:</strong> {invoice.installationAddress}
              </p>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-100 text-[10px] uppercase tracking-wider text-slate-700">
                <th className="py-2 px-2 text-center w-8">#</th>
                <th className="py-2 px-3">Item Description & Specifications</th>
                <th className="py-2 px-2 text-center">Warranty</th>
                <th className="py-2 px-2 text-center">Qty</th>
                <th className="py-2 px-3 text-right">Unit Price</th>
                <th className="py-2 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items.map((item, index) => (
                <tr key={item.id || index} className="hover:bg-slate-50/50">
                  <td className="py-2 px-2 text-center text-slate-400 font-mono text-[11px]">
                    {index + 1}
                  </td>
                  <td className="py-2 px-3">
                    <p className="font-bold text-slate-900">{item.description}</p>
                    {item.specs && (
                      <p className="text-[10px] text-slate-500">{item.specs}</p>
                    )}
                    {item.serialNumbers && (
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                        S/N: {item.serialNumbers}
                      </p>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center text-[10px] text-slate-600">
                    {item.warrantyPeriod || '1-Year'}
                  </td>
                  <td className="py-2 px-2 text-center font-semibold text-slate-800">
                    {item.quantity} <span className="text-[10px] text-slate-400 font-normal">{item.unit || 'Pcs'}</span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700">
                    {formatCurrency(item.unitPrice, settings.currency, settings.currencyPosition)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold font-mono text-slate-900">
                    {formatCurrency(item.total, settings.currency, settings.currencyPosition)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Old Equipment Exchange / Trade-In Section */}
        {invoice.hasTradeIn && invoice.tradeInItems && invoice.tradeInItems.length > 0 && (
          <div className="my-3 rounded-lg border border-amber-300 bg-amber-50/50 p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs uppercase tracking-wider">
                <ArrowLeftRight className="h-3.5 w-3.5 text-amber-700" />
                <span>Old Equipment Exchange / Client Trade-In Buyback:</span>
              </div>
              <span className="text-[10px] font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                Deducted from Invoice Total
              </span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-amber-300 text-[9px] font-extrabold uppercase tracking-wider text-amber-900">
                  <th className="py-1 px-1">#</th>
                  <th className="py-1 px-2">Old Equipment / Model</th>
                  <th className="py-1 px-2 text-center">Condition</th>
                  <th className="py-1 px-2 text-center">Qty</th>
                  <th className="py-1 px-2 text-right">Agreed Valuation</th>
                  <th className="py-1 pr-1 text-right">Total Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-200/70">
                {invoice.tradeInItems.map((trade, tIdx) => (
                  <tr key={trade.id || tIdx} className="align-top">
                    <td className="py-1.5 px-1 font-semibold text-amber-800">{tIdx + 1}</td>
                    <td className="py-1.5 px-2">
                      <p className="font-bold text-slate-900">{trade.description}</p>
                      {(trade.brand || trade.model) && (
                        <p className="text-[10px] text-slate-600">
                          {[trade.brand, trade.model].filter(Boolean).join(' ')}
                        </p>
                      )}
                      {trade.serialNumber && (
                        <p className="text-[9px] font-mono text-slate-500">
                          Old S/N: {trade.serialNumber}
                        </p>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white border border-amber-200 text-amber-900">
                        {trade.condition || 'GOOD'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-center font-semibold text-slate-800">
                      {trade.quantity || 1}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                      {formatCurrency(trade.valuationPrice, settings.currency, settings.currencyPosition)}
                    </td>
                    <td className="py-1.5 pr-1 text-right font-bold font-mono text-emerald-800">
                      -{formatCurrency((trade.valuationPrice || 0) * (trade.quantity || 1), settings.currency, settings.currencyPosition)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-2 pt-1.5 border-t border-amber-300 flex justify-between items-center text-xs font-bold text-amber-950">
              <span>Total Old Equipment Buyback Credit:</span>
              <span className="text-sm font-black text-emerald-800 font-mono">
                -{formatCurrency(invoice.tradeInTotal || 0, settings.currency, settings.currencyPosition)}
              </span>
            </div>
          </div>
        )}

        {/* Calculations and Bank Details Block */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t-2 border-slate-900 pt-4 text-xs">
          {/* Left Column: Bank details & Payment status */}
          <div className="space-y-3">
            {settings.bankAccountNumber && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Building2 className="h-3.5 w-3.5 text-amber-600" />
                    <span>Official Bank Payment Details:</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyBank}
                    className="no-print flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                  >
                    {copiedBank ? (
                      <span className="text-emerald-700">✓ Account Copied</span>
                    ) : (
                      <>
                        <Copy className="h-2.5 w-2.5" />
                        <span>Copy Account #</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="text-[11px] text-slate-700 space-y-0.5">
                  <p><span className="text-slate-500">Bank Name:</span> <strong>{settings.bankName}</strong></p>
                  <p><span className="text-slate-500">Account Title:</span> <strong>{settings.bankAccountTitle}</strong></p>
                  <p><span className="text-slate-500">Account Number:</span> <strong className="font-mono">{settings.bankAccountNumber}</strong></p>
                  {settings.ibanOrSwift && (
                    <p><span className="text-slate-500">IBAN / SWIFT:</span> <strong className="font-mono">{settings.ibanOrSwift}</strong></p>
                  )}
                </div>
              </div>
            )}

            {invoice.payments && invoice.payments.length > 0 && (
              <div className="rounded border border-emerald-200 bg-emerald-50/50 p-2.5">
                <p className="font-bold text-emerald-900 text-[11px] mb-1">
                  Recorded Client Payment Receipts:
                </p>
                <div className="divide-y divide-emerald-100 text-[10px] text-emerald-800">
                  {invoice.payments.map((p, idx) => (
                    <div key={p.id || idx} className="flex justify-between py-0.5">
                      <span>{formatDate(p.date)} ({(p.method || 'CASH').replace(/_/g, ' ')})</span>
                      <span className="font-bold font-mono">
                        {formatCurrency(p.amount, settings.currency, settings.currencyPosition)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Financial Totals */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-slate-600 py-0.5">
              <span>New Equipment Subtotal:</span>
              <span className="font-mono">{formatCurrency(invoice.subtotal, settings.currency, settings.currencyPosition)}</span>
            </div>

            {invoice.discountTotal > 0 && (
              <div className="flex justify-between text-rose-600 py-0.5">
                <span>Contract Discount:</span>
                <span className="font-mono">-{formatCurrency(invoice.discountTotal, settings.currency, settings.currencyPosition)}</span>
              </div>
            )}

            {invoice.hasTradeIn && (invoice.tradeInTotal || 0) > 0 && (
              <div className="flex justify-between text-amber-950 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                <span className="flex items-center gap-1">
                  <ArrowLeftRight className="h-3 w-3 text-amber-700" />
                  <span>Less Exchange Credit:</span>
                </span>
                <span className="font-mono text-emerald-800">-{formatCurrency(invoice.tradeInTotal || 0, settings.currency, settings.currencyPosition)}</span>
              </div>
            )}

            {invoice.taxAmount > 0 && (
              <div className="flex justify-between text-slate-600 py-0.5">
                <span>Sales Tax ({invoice.taxPercent}%):</span>
                <span className="font-mono">{formatCurrency(invoice.taxAmount, settings.currency, settings.currencyPosition)}</span>
              </div>
            )}

            {invoice.installationCharge > 0 && (
              <div className="flex justify-between text-slate-600 py-0.5">
                <span>Civil & Electrical Installation:</span>
                <span className="font-mono">{formatCurrency(invoice.installationCharge, settings.currency, settings.currencyPosition)}</span>
              </div>
            )}

            {invoice.shippingOrFreight > 0 && (
              <div className="flex justify-between text-slate-600 py-0.5">
                <span>Freight & Transport:</span>
                <span className="font-mono">{formatCurrency(invoice.shippingOrFreight, settings.currency, settings.currencyPosition)}</span>
              </div>
            )}

            <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-sm font-black text-slate-900">
              <span>Grand Total:</span>
              <span className="font-mono text-base">{formatCurrency(invoice.grandTotal, settings.currency, settings.currencyPosition)}</span>
            </div>

            <div className="flex justify-between text-emerald-700 font-semibold py-0.5">
              <span>Amount Paid:</span>
              <span className="font-mono">{formatCurrency(invoice.paidAmount, settings.currency, settings.currencyPosition)}</span>
            </div>

            <div className="flex justify-between border-t border-slate-200 pt-1 text-sm font-bold text-rose-600">
              <span>Balance Due:</span>
              <span className="font-mono">{formatCurrency(invoice.balanceDue, settings.currency, settings.currencyPosition)}</span>
            </div>
          </div>
        </div>

        {/* Terms & Warranty Disclaimers */}
        <div className="mt-6 border-t border-slate-200 pt-4 space-y-3 text-[11px] text-slate-600">
          {(invoice.termsAndConditions || settings.termsAndConditions) && (
            <div>
              <p className="font-bold uppercase text-[10px] text-slate-700">Terms & Conditions:</p>
              <p className="whitespace-pre-line mt-0.5">
                {invoice.termsAndConditions || settings.termsAndConditions}
              </p>
            </div>
          )}

          {(invoice.warrantyNotes || settings.warrantyDisclaimer) && (
            <div className="rounded bg-amber-50/60 p-2 border border-amber-200/60 text-amber-900">
              <p className="font-bold uppercase text-[10px] text-amber-800">System Warranty Policy:</p>
              <p className="mt-0.5">{invoice.warrantyNotes || settings.warrantyDisclaimer}</p>
            </div>
          )}
        </div>

        {/* Footer with Signatures */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
          <div>
            <p className="font-semibold text-slate-700">Thank you for your business!</p>
            <p className="text-[10px]">For questions regarding this document, contact {settings.email} or {settings.phone}</p>
          </div>

          <div className="text-right">
            <div className="h-10 border-b border-slate-400 w-44 ml-auto" />
            <p className="mt-1 font-bold text-slate-900 text-xs">{settings.ownerName || settings.shopName}</p>
            <p className="text-[10px] text-slate-500">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
};
