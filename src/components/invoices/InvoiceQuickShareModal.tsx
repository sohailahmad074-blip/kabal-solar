import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  MessageSquare, 
  Printer, 
  Send, 
  Copy, 
  Check, 
  X, 
  ExternalLink,
  Phone,
  FileText
} from 'lucide-react';
import { Invoice, ShopSettings } from '../../types/solar';
import { formatCurrency } from '../../utils/formatters';
import { buildWhatsAppMessage, openWhatsApp, sanitizePhoneNumber } from '../../utils/sendDirect';

interface InvoiceQuickShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  settings: ShopSettings;
  onViewPrint?: (invoice: Invoice) => void;
  onOpenSendSuite?: (invoice: Invoice) => void;
}

export const InvoiceQuickShareModal: React.FC<InvoiceQuickShareModalProps> = ({
  isOpen,
  onClose,
  invoice,
  settings,
  onViewPrint,
  onOpenSendSuite,
}) => {
  const [phone, setPhone] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (invoice && isOpen) {
      setPhone(invoice.customerPhone || '');
      setCopied(false);
    }
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  const isQuote = invoice.type === 'QUOTATION' || invoice.type === 'PROFORMA';
  const docLabel = isQuote ? 'Quotation' : 'Invoice';
  const whatsappMessage = buildWhatsAppMessage(invoice, settings);

  const handleShareWhatsApp = () => {
    openWhatsApp(phone || invoice.customerPhone || '', whatsappMessage);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Success Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {docLabel} Saved Successfully!
            </h3>
            <p className="text-xs text-slate-500">
              {invoice.invoiceNumber} • {invoice.customerName}
            </p>
          </div>
        </div>

        {/* Invoice Summary Card */}
        <div className="my-4 rounded-lg bg-slate-50 p-3.5 border border-slate-200/80 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span>Customer:</span>
            <span className="font-bold text-slate-900">{invoice.customerName}</span>
          </div>

          <div className="flex justify-between items-center text-slate-600">
            <span>Grand Total:</span>
            <span className="font-extrabold text-slate-900">
              {formatCurrency(invoice.grandTotal, settings.currency, settings.currencyPosition)}
            </span>
          </div>

          {invoice.balanceDue > 0 ? (
            <div className="flex justify-between items-center text-rose-600 font-semibold">
              <span>Pending Balance:</span>
              <span>{formatCurrency(invoice.balanceDue, settings.currency, settings.currencyPosition)}</span>
            </div>
          ) : (
            <div className="flex justify-between items-center text-emerald-700 font-semibold">
              <span>Status:</span>
              <span>Paid in Full ✓</span>
            </div>
          )}

          {/* WhatsApp Phone field */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Customer WhatsApp Number:
              </label>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                🇵🇰 PK 03xx Auto (+92)
              </span>
            </div>
            <div className="relative">
              <Phone className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0300 1234567 (No country code needed)"
                className="w-full rounded border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Primary Action: 1-Click WhatsApp Share */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 px-4 text-xs font-bold text-white shadow-md hover:bg-emerald-700 active:scale-[0.99] transition-all cursor-pointer"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Share with Client via WhatsApp</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-80" />
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-bold">Copied Text!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  <span>Copy Message</span>
                </>
              )}
            </button>

            {onViewPrint && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewPrint(invoice);
                }}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5 text-slate-500" />
                <span>View & Print</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          {onOpenSendSuite ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSendSuite(invoice);
              }}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <Send className="h-3.5 w-3.5 text-amber-500" />
              <span>More Options (Email, SMS, Portal Link)</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1 font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
