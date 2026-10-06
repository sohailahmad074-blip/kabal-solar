import React, { useRef, useState } from 'react';
import { 
  Printer, 
  ArrowLeft, 
  Sun, 
  CreditCard, 
  Edit3, 
  ShieldCheck, 
  Phone, 
  Mail, 
  MapPin,
  Send,
  SlidersHorizontal,
  MessageSquare,
  ArrowLeftRight,
  RefreshCw
} from 'lucide-react';
import { Invoice, InvoiceItem, ShopSettings } from '../../types/solar';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { buildWhatsAppMessage, openWhatsApp } from '../../utils/sendDirect';

interface InvoicePrintViewProps {
  invoice: Invoice;
  settings: ShopSettings;
  onBack: () => void;
  onEdit: (invoice: Invoice) => void;
  onRecordPayment: (invoice: Invoice) => void;
  onSend?: (invoice: Invoice) => void;
}

export const InvoicePrintView: React.FC<InvoicePrintViewProps> = ({
  invoice,
  settings,
  onBack,
  onEdit,
  onRecordPayment,
  onSend,
}) => {
  const printContainerRef = useRef<HTMLDivElement>(null);
  const [showSystemSpecs, setShowSystemSpecs] = useState<boolean>(false);
  const [accessoriesMode, setAccessoriesMode] = useState<'ITEMIZED' | 'LUMP_SUM'>(
    invoice.accessoriesMode || 'ITEMIZED'
  );

  const accessoryItems = invoice.items.filter(
    (i) => i.category === 'ACCESSORIES' || i.description.toLowerCase().includes('accessories') || i.description.toLowerCase().includes('balance of system') || i.description.toLowerCase().includes('bos')
  );

  const displayItems = React.useMemo(() => {
    // If not in LUMP_SUM mode or there are <= 1 accessory items, show list as-is
    if (accessoriesMode !== 'LUMP_SUM' || accessoryItems.length <= 1) {
      return invoice.items;
    }

    const nonAccessoryItems = invoice.items.filter(
      (i) => !accessoryItems.includes(i)
    );

    const lumpSumTotal = accessoryItems.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
    const includedPartsList = accessoryItems.map(it => it.description).filter(Boolean).join(', ');

    const consolidatedLumpSumItem: InvoiceItem = {
      id: 'lump-sum-accessories-pkg',
      description: 'Complete Solar Installation Accessories & Balance of System (BOS) Package',
      category: 'ACCESSORIES',
      quantity: 1,
      unit: 'Package',
      unitPrice: lumpSumTotal,
      discountPercent: 0,
      total: lumpSumTotal,
      specs: includedPartsList 
        ? `Includes turnkey installation hardware (${includedPartsList.length > 100 ? includedPartsList.substring(0, 97) + '...' : includedPartsList})` 
        : 'Turnkey Cabling, Breakers, SPDs, Connectors & Mounting Hardware',
      warrantyPeriod: accessoryItems.find(a => a.warrantyPeriod)?.warrantyPeriod || '1-Year Standard BoS Warranty',
      serialNumbers: undefined,
    };

    return [...nonAccessoryItems, consolidatedLumpSumItem];
  }, [invoice.items, accessoriesMode, accessoryItems]);

  const handlePrint = () => {
    window.print();
  };

  const getDocTitle = () => {
    switch (invoice.type) {
      case 'QUOTATION':
        return 'SOLAR PROPOSAL & QUOTATION';
      case 'PROFORMA':
        return 'PROFORMA COMMERCIAL INVOICE';
      case 'WARRANTY_CERT':
        return 'SYSTEM COMMISSIONING & WARRANTY CERTIFICATE';
      case 'INVOICE':
      default:
        return 'TAX INVOICE';
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Top Action Bar (Hidden in Print) */}
      <div className="no-print flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Invoices</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Direct WhatsApp Action */}
          <button
            type="button"
            onClick={() => {
              const msg = buildWhatsAppMessage(invoice, settings);
              openWhatsApp(invoice.customerPhone || '', msg);
            }}
            className="flex items-center gap-1.5 rounded bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Share via WhatsApp</span>
          </button>

          {onSend && (
            <button
              type="button"
              onClick={() => onSend(invoice)}
              className="flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Send className="h-3.5 w-3.5 text-amber-500" />
              <span>More Send Options</span>
            </button>
          )}

          {invoice.balanceDue > 0 && (
            <button
              type="button"
              onClick={() => onRecordPayment(invoice)}
              className="flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Record Payment</span>
            </button>
          )}

          {/* Dual Accessories Mode Toggle: Customer Lump Sum vs Installer Itemized */}
          {accessoryItems.length > 0 && (
            <div className="flex items-center rounded border border-slate-300 bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setAccessoriesMode('LUMP_SUM')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                  accessoriesMode === 'LUMP_SUM'
                    ? 'bg-amber-400 text-slate-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Customer Copy: Consolidates accessories into a single lump sum package"
              >
                <span>Customer (Lump Sum)</span>
              </button>
              <button
                type="button"
                onClick={() => setAccessoriesMode('ITEMIZED')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                  accessoriesMode === 'ITEMIZED'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Installer Copy: Shows complete itemized accessories breakdown"
              >
                <span>Installer (Itemized)</span>
              </button>
            </div>
          )}

          {/* Toggle System Profile on Invoice */}
          <button
            type="button"
            onClick={() => setShowSystemSpecs(!showSystemSpecs)}
            className={`flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              showSystemSpecs
                ? 'border-amber-400 bg-amber-50 text-amber-900'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle whether installed solar system profile appears on printed invoice"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{showSystemSpecs ? 'System Profile: ON' : 'System Profile: OFF'}</span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(invoice)}
            className="flex items-center gap-1 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Edit Document</span>
          </button>

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

      {/* Printable Invoice Container */}
      <div
        ref={printContainerRef}
        className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 sm:p-9 text-slate-900 shadow-sm printable-document"
        style={{ color: '#0f172a' }}
      >
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 border-b-2 border-slate-900 pb-5">
          {/* Solar Company Info */}
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
                  Tax / Reg ID: {settings.taxRegistrationNumber}
                </p>
              )}
            </div>
          </div>

          {/* Invoice Meta */}
          <div className="sm:text-right space-y-0.5">
            <span className="inline-block rounded bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-900 border border-amber-300">
              {getDocTitle()}
            </span>
            <p className="text-lg font-mono font-black text-slate-900">{invoice.invoiceNumber}</p>
            <div className="text-xs text-slate-600 space-y-0.5 pt-0.5">
              <p>
                <span className="font-semibold text-slate-700">Date: </span>
                {formatDate(invoice.date)}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Valid Until: </span>
                {formatDate(invoice.dueDate)}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Status: </span>
                <span className={`font-bold ${
                  invoice.status === 'PAID' ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {invoice.status}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Customer & Billing Details Grid */}
        <div className={`grid gap-4 py-4 border-b border-slate-200 ${showSystemSpecs && (invoice.projectSystemCapacityKw || invoice.installationAddress) ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Bill To */}
          <div className="space-y-0.5 text-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Customer / Bill To:
            </p>
            <p className="text-sm font-bold text-slate-900">{invoice.customerName}</p>
            <p className="text-slate-700">{invoice.customerPhone}</p>
            {invoice.customerEmail && <p className="text-slate-600">{invoice.customerEmail}</p>}
            <p className="text-slate-600">{invoice.customerAddress || invoice.customerCity}</p>
          </div>

          {/* Solar Installation Site Details (Only if toggled ON) */}
          {showSystemSpecs && (invoice.projectSystemCapacityKw || invoice.installationAddress) && (
            <div className="space-y-0.5 text-xs rounded-lg bg-amber-50/70 p-3 border border-amber-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                <Sun className="h-3 w-3 text-amber-600" />
                Solar Installation Parameters
              </p>
              {invoice.projectSystemCapacityKw && (
                <p className="font-bold text-slate-900">
                  System Capacity: <span className="text-amber-900 font-extrabold">{invoice.projectSystemCapacityKw} kW DC Array</span>
                </p>
              )}
              <p className="text-slate-700">
                System Type: {invoice.systemType ? invoice.systemType.replace(/_/g, ' ') : 'Turnkey Solar Installation'}
              </p>
              {invoice.installationAddress && (
                <p className="text-slate-600">
                  <span className="font-semibold">Site Address:</span> {invoice.installationAddress}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Line Items Table */}
        <div className="py-4 overflow-x-auto">
          <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                New Equipment & Materials Supplied
              </h3>
              {accessoryItems.length > 0 && (
                accessoriesMode === 'LUMP_SUM' ? (
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded print:border-slate-300 print:text-slate-800 print:bg-slate-100">
                    Customer Copy: Lump Sum Accessories Package
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-800 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded">
                    Installer Copy: Itemized Accessories Breakdown
                  </span>
                )
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              {displayItems.length} {displayItems.length === 1 ? 'Line Item' : 'Line Items'}
            </span>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-900 text-[10px] font-extrabold uppercase tracking-wider text-slate-800 bg-slate-50/70">
                <th className="py-2 px-2">#</th>
                <th className="py-2 px-2">Description & Specifications</th>
                <th className="py-2 px-2 text-center">Qty</th>
                <th className="py-2 px-2 text-right">Unit Price</th>
                <th className="py-2 pr-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayItems.map((item, index) => (
                <tr key={item.id || index} className="align-top">
                  <td className="py-2 px-2 font-semibold text-slate-500">{index + 1}</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-slate-900">{item.description}</p>
                      {item.id === 'lump-sum-accessories-pkg' ? (
                        <span className="text-[9px] font-bold text-amber-900 bg-amber-200/90 border border-amber-400 px-1.5 py-0.2 rounded print:border-slate-400 print:text-slate-900 print:bg-slate-200">
                          Consolidated Package
                        </span>
                      ) : item.category === 'ACCESSORIES' ? (
                        <span className="text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded print:border-slate-400 print:text-slate-800 print:bg-slate-100">
                          Accessory
                        </span>
                      ) : null}
                    </div>
                    {item.specs && <p className="text-[11px] text-slate-600">{item.specs}</p>}
                    {item.serialNumbers && (
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                        <span className="font-semibold text-slate-700">S/N: </span>
                        {item.serialNumbers}
                      </p>
                    )}
                    {item.warrantyPeriod && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded mt-0.5">
                        <ShieldCheck className="h-2.5 w-2.5" />
                        {item.warrantyPeriod}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center font-medium text-slate-800">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-2 px-2 text-right font-medium text-slate-800">
                    {formatCurrency(item.unitPrice, settings.currency, settings.currencyPosition)}
                  </td>
                  <td className="py-2 pr-2 text-right font-bold text-slate-900">
                    {formatCurrency(item.total, settings.currency, settings.currencyPosition)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Old Equipment Exchange / Trade-In Section (if applicable) */}
        {invoice.hasTradeIn && invoice.tradeInItems && invoice.tradeInItems.length > 0 && (
          <div className="my-2 py-3 px-3.5 rounded-lg border border-amber-300 bg-amber-50/50">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ArrowLeftRight className="h-3.5 w-3.5 text-amber-700" />
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-950">
                  Old Equipment Exchange / Client Trade-In Buyback
                </h4>
              </div>
              <span className="text-[10px] font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                Deducted from Invoice Total
              </span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-amber-300 text-[9px] font-extrabold uppercase tracking-wider text-amber-900">
                  <th className="py-1.5 px-1">#</th>
                  <th className="py-1.5 px-2">Old Equipment / Make & Model</th>
                  <th className="py-1.5 px-2 text-center">Condition</th>
                  <th className="py-1.5 px-2 text-center">Qty</th>
                  <th className="py-1.5 px-2 text-right">Agreed Value</th>
                  <th className="py-1.5 pr-1 text-right">Total Credit</th>
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
                      {trade.notes && (
                        <p className="text-[9px] italic text-slate-500">{trade.notes}</p>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white border border-amber-200 text-amber-900">
                        {trade.condition || 'GOOD'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-center font-medium text-slate-800">
                      {trade.quantity || 1}
                    </td>
                    <td className="py-1.5 px-2 text-right font-medium text-slate-800">
                      {formatCurrency(trade.valuationPrice, settings.currency, settings.currencyPosition)}
                    </td>
                    <td className="py-1.5 pr-1 text-right font-bold text-emerald-800">
                      -{formatCurrency((trade.valuationPrice || 0) * (trade.quantity || 1), settings.currency, settings.currencyPosition)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-2 pt-2 border-t border-amber-300 flex justify-between items-center text-xs font-bold text-amber-950">
              <span>Total Old Equipment Buyback Credit:</span>
              <span className="text-sm font-black text-emerald-800 font-mono">
                -{formatCurrency(invoice.tradeInTotal || 0, settings.currency, settings.currencyPosition)}
              </span>
            </div>
          </div>
        )}

        {/* Calculation & Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-t-2 border-slate-900">
          {/* Bank Wire Details & Terms */}
          <div className="space-y-3">
            {(settings.bankName || settings.bankAccountNumber || settings.bankDetails) && (
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Bank Wire / Remittance Details
                </p>
                <p className="font-bold text-slate-900">{settings.bankName || settings.bankDetails?.bankName}</p>
                <p className="text-slate-700">Account Name: {settings.bankAccountTitle || settings.bankDetails?.accountName}</p>
                <p className="font-mono text-slate-900 font-semibold">Account #: {settings.bankAccountNumber || settings.bankDetails?.accountNumber}</p>
                {(settings.ibanOrSwift || settings.bankDetails?.iban) && (
                  <p className="font-mono text-slate-700 text-[10px]">IBAN / SWIFT: {settings.ibanOrSwift || settings.bankDetails?.iban}</p>
                )}
                {settings.bankDetails?.branchCode && (
                  <p className="text-slate-500 text-[10px]">Branch: {settings.bankDetails.branchCode}</p>
                )}
              </div>
            )}

            {invoice.termsAndConditions && (
              <div className="text-[10px] text-slate-600 space-y-0.5">
                <p className="font-bold uppercase tracking-wider text-slate-700">Terms & Conditions:</p>
                <p className="whitespace-pre-line leading-relaxed">{invoice.termsAndConditions}</p>
              </div>
            )}
          </div>

          {/* Totals Table */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600">
              <span>New Equipment Subtotal:</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(invoice.subtotal, settings.currency, settings.currencyPosition)}
              </span>
            </div>

            {(invoice.discountTotal || (invoice as any).discountAmount) ? (
              <div className="flex justify-between py-1 border-b border-slate-200 text-emerald-700">
                <span>
                  {invoice.specialDiscount && invoice.specialDiscount > 0
                    ? `Total Discount ${invoice.specialDiscountType === 'PERCENT' ? `(${invoice.specialDiscount}%)` : ''}${invoice.specialDiscountReason ? ` [${invoice.specialDiscountReason}]` : ''}:`
                    : 'Total Discounts:'}
                </span>
                <span>-{formatCurrency((invoice.discountTotal || (invoice as any).discountAmount || 0), settings.currency, settings.currencyPosition)}</span>
              </div>
            ) : null}

            {invoice.hasTradeIn && (invoice.tradeInTotal || 0) > 0 && (
              <div className="flex justify-between py-1 border-b border-amber-200 bg-amber-50/80 px-1.5 rounded font-bold text-amber-950">
                <span className="flex items-center gap-1">
                  <ArrowLeftRight className="h-3 w-3 text-amber-700" />
                  <span>Less Exchange Credit:</span>
                </span>
                <span className="text-emerald-800 font-mono">
                  -{formatCurrency(invoice.tradeInTotal || 0, settings.currency, settings.currencyPosition)}
                </span>
              </div>
            )}

            {invoice.installationCharge ? (
              <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600">
                <span>Installation & Engineering:</span>
                <span>{formatCurrency(invoice.installationCharge, settings.currency, settings.currencyPosition)}</span>
              </div>
            ) : null}

            {invoice.shippingOrFreight ? (
              <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600">
                <span>Logistics & Freight:</span>
                <span>{formatCurrency(invoice.shippingOrFreight, settings.currency, settings.currencyPosition)}</span>
              </div>
            ) : null}

            {invoice.taxAmount ? (
              <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600">
                <span>Sales Tax ({invoice.taxPercent}%):</span>
                <span>{formatCurrency(invoice.taxAmount, settings.currency, settings.currencyPosition)}</span>
              </div>
            ) : null}

            <div className="flex justify-between py-2 border-b-2 border-slate-900 text-sm font-black text-slate-900">
              <span>Grand Total:</span>
              <span className="text-base font-extrabold text-slate-900">
                {formatCurrency(invoice.grandTotal, settings.currency, settings.currencyPosition)}
              </span>
            </div>

            <div className="flex justify-between py-1 text-emerald-700 font-bold">
              <span>Amount Paid:</span>
              <span>{formatCurrency(invoice.paidAmount, settings.currency, settings.currencyPosition)}</span>
            </div>

            <div className="flex justify-between py-1 border-t border-slate-200 text-xs font-extrabold">
              <span className="text-slate-700">Balance Due:</span>
              <span className={invoice.balanceDue > 0 ? 'text-rose-600 font-bold' : 'text-emerald-700'}>
                {formatCurrency(invoice.balanceDue, settings.currency, settings.currencyPosition)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Signature & Stamp area */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs">
          <div className="space-y-1 text-slate-500 text-[10px]">
            <p>Authorized Solar Engineering Representative</p>
            <p>Thank you for choosing renewable solar energy.</p>
          </div>

          <div className="text-center w-52 space-y-1">
            <div className="border-b border-slate-400 h-10 w-full" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
              Authorized Signature & Stamp
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
