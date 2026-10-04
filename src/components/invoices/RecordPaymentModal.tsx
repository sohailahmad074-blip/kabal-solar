import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  CheckCircle2, 
  CreditCard, 
  Tag, 
  MessageSquare, 
  Send, 
  Percent, 
  Sparkles,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { Copy, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Invoice, PaymentMethod, ShopSettings, PaymentReceiptMessageType } from '../../types/solar';
import { Modal } from '../common/Modal';
import { formatCurrency } from '../../utils/formatters';
import { buildPaymentReceivedReceiptMessage, openWhatsApp } from '../../utils/sendDirect';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  settings: ShopSettings;
  onSavePayment: (
    invoiceId: string, 
    amount: number, 
    method: PaymentMethod, 
    referenceNo: string, 
    notes: string,
    discount?: number
  ) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  settings,
  onSavePayment,
}) => {
  if (!invoice) return null;

  const [amount, setAmount] = useState<number>(invoice.balanceDue);
  const [discount, setDiscount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('Payment settlement');
  const [sendWhatsAppReceipt, setSendWhatsAppReceipt] = useState<boolean>(true);
  const [receiptType, setReceiptType] = useState<PaymentReceiptMessageType>('OFFICIAL_RECEIPT');
  const [showMessagePreview, setShowMessagePreview] = useState<boolean>(false);
  const [copiedReceipt, setCopiedReceipt] = useState<boolean>(false);

  // Sync state whenever invoice changes
  useEffect(() => {
    if (invoice) {
      setAmount(invoice.balanceDue);
      setDiscount(0);
      setMethod('BANK_TRANSFER');
      setReferenceNo('');
      setNotes('Payment collection & clearance');
      setReceiptType(invoice.balanceDue <= 0 ? 'FULL_SETTLEMENT' : 'OFFICIAL_RECEIPT');
    }
  }, [invoice, isOpen]);

  // Derived financial computations
  const totalSettled = Number(((amount || 0) + (discount || 0)).toFixed(2));
  const remainingDue = Math.max(0, Number((invoice.balanceDue - totalSettled).toFixed(2)));
  const isSettlingInFull = remainingDue === 0;

  // Auto-switch template to FULL_SETTLEMENT if cleared
  useEffect(() => {
    if (isSettlingInFull) {
      setReceiptType('FULL_SETTLEMENT');
    } else if (receiptType === 'FULL_SETTLEMENT') {
      setReceiptType('OFFICIAL_RECEIPT');
    }
  }, [isSettlingInFull]);

  // Quick discount helper
  const handleApplyQuickDiscount = (discVal: number) => {
    const validDisc = Math.min(invoice.balanceDue, Math.max(0, discVal));
    setDiscount(validDisc);
    setAmount(Math.max(0, Number((invoice.balanceDue - validDisc).toFixed(2))));
  };

  // Preview message
  const previewReceiptMessage = buildPaymentReceivedReceiptMessage(
    {
      ...invoice,
      paidAmount: invoice.paidAmount + (amount || 0),
      balanceDue: remainingDue,
    },
    {
      amount: amount || 0,
      discount: discount || 0,
      method,
      referenceNo,
      notes,
    },
    settings,
    receiptType
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 && discount <= 0) {
      alert('Please enter a payment amount or a settlement discount.');
      return;
    }

    if (totalSettled > invoice.balanceDue) {
      if (!window.confirm(`Total credit (Payment: ${formatCurrency(amount, settings.currency)} + Discount: ${formatCurrency(discount, settings.currency)}) is greater than the outstanding balance (${formatCurrency(invoice.balanceDue, settings.currency)}). Do you want to proceed?`)) {
        return;
      }
    }

    onSavePayment(invoice.id, amount, method, referenceNo, notes, discount);

    if (isSettlingInFull) {
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#f59e0b', '#3b82f6', '#fbbf24'],
        });
      } catch {
        // ignore
      }
    }

    // Auto-dispatch WhatsApp receipt if enabled
    if (sendWhatsAppReceipt && invoice.customerPhone) {
      openWhatsApp(invoice.customerPhone, previewReceiptMessage);
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Customer Payment & Grant Discount"
      subtitle={`Receive payment for Invoice ${invoice.invoiceNumber} (${invoice.customerName})`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Invoice Summary Box */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span>Invoice Total Billed:</span>
            <span className="font-semibold text-slate-900 font-mono">
              {formatCurrency(invoice.grandTotal, settings.currency, settings.currencyPosition)}
            </span>
          </div>
          <div className="flex items-center justify-between text-emerald-700">
            <span>Already Collected to Date:</span>
            <span className="font-semibold font-mono">
              {formatCurrency(invoice.paidAmount, settings.currency, settings.currencyPosition)}
            </span>
          </div>
          {(invoice.settlementDiscountTotal || 0) > 0 && (
            <div className="flex items-center justify-between text-amber-700 text-[11px]">
              <span>Prior Settlement Discounts:</span>
              <span className="font-semibold font-mono">
                -{formatCurrency(invoice.settlementDiscountTotal || 0, settings.currency, settings.currencyPosition)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-rose-600 font-bold text-sm">
            <span>Current Outstanding Balance:</span>
            <span className="font-mono text-base">
              {formatCurrency(invoice.balanceDue, settings.currency, settings.currencyPosition)}
            </span>
          </div>
        </div>

        {/* Payment Amount & Settlement Discount Row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Payment Amount Collected */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Cash / Payment Received *</span>
              <span className="text-emerald-700 font-mono font-normal">Amount ({settings.currency})</span>
            </label>
            <div className="relative mt-1">
              <input
                type="number"
                step="any"
                min="0"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-emerald-400 bg-white px-3 py-2 text-base font-black text-emerald-700 focus:border-emerald-600 focus:outline-none font-mono"
                required
              />
            </div>
            <p className="mt-0.5 text-[10px] text-slate-500">Actual amount received from client</p>
          </div>

          {/* Settlement Discount / Waiver */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3 text-amber-600" />
                Settlement Discount / Waiver
              </span>
              <span className="text-amber-700 font-mono font-normal">Waived ({settings.currency})</span>
            </label>
            <div className="relative mt-1">
              <input
                type="number"
                step="any"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-amber-300 bg-amber-50/50 px-3 py-2 text-base font-black text-amber-900 focus:border-amber-500 focus:outline-none font-mono"
                placeholder="0"
              />
            </div>

            {/* Quick Discount Presets */}
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <span className="text-[9px] text-slate-400">Quick:</span>
              <button
                type="button"
                onClick={() => handleApplyQuickDiscount(500)}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 hover:bg-amber-100 hover:text-amber-800 transition-colors"
              >
                +500
              </button>
              <button
                type="button"
                onClick={() => handleApplyQuickDiscount(1000)}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 hover:bg-amber-100 hover:text-amber-800 transition-colors"
              >
                +1,000
              </button>
              <button
                type="button"
                onClick={() => handleApplyQuickDiscount(2000)}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 hover:bg-amber-100 hover:text-amber-800 transition-colors"
              >
                +2,000
              </button>
              <button
                type="button"
                onClick={() => handleApplyQuickDiscount(5000)}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 hover:bg-amber-100 hover:text-amber-800 transition-colors"
              >
                +5,000
              </button>
              {invoice.balanceDue > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => handleApplyQuickDiscount(Math.round(invoice.balanceDue * 0.05))}
                    className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-900 hover:bg-amber-100 transition-colors"
                    title="Waive 5% of balance"
                  >
                    5%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyQuickDiscount(Math.round(invoice.balanceDue * 0.10))}
                    className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-900 hover:bg-amber-100 transition-colors"
                    title="Waive 10% of balance"
                  >
                    10%
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const remainder = invoice.balanceDue % 1000;
                      if (remainder > 0) handleApplyQuickDiscount(remainder);
                      else handleApplyQuickDiscount(1000);
                    }}
                    className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-900 hover:bg-amber-200 transition-colors"
                    title="Waive odd change to make round figure"
                  >
                    Round Change
                  </button>
                </>
              )}
              {discount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDiscount(0);
                    setAmount(invoice.balanceDue);
                  }}
                  className="rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live Settlement Calculation Preview Banner */}
        <div className={`rounded-lg border p-3 transition-colors ${
          isSettlingInFull 
            ? 'bg-emerald-50 border-emerald-300' 
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-center">
            <div>
              <span className="text-[9px] font-bold uppercase text-slate-500">Collected</span>
              <p className="text-xs font-bold text-slate-800 font-mono">
                {formatCurrency(amount, settings.currency, settings.currencyPosition)}
              </p>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase text-amber-700">Discount Waived</span>
              <p className="text-xs font-bold text-amber-700 font-mono">
                +{formatCurrency(discount, settings.currency, settings.currencyPosition)}
              </p>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase text-slate-500">Total Cleared</span>
              <p className="text-xs font-bold text-slate-900 font-mono">
                ={formatCurrency(totalSettled, settings.currency, settings.currencyPosition)}
              </p>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase text-slate-500">New Balance Due</span>
              <p className={`text-xs font-black font-mono ${isSettlingInFull ? 'text-emerald-700' : 'text-rose-600'}`}>
                {isSettlingInFull ? '✅ ZERO DUE (CLEARED)' : formatCurrency(remainingDue, settings.currency, settings.currencyPosition)}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Method & Reference */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Payment Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
            >
              <option value="BANK_TRANSFER">Bank Wire / Transfer</option>
              <option value="CASH">Cash in Hand</option>
              <option value="CHEQUE">Bank Cheque</option>
              <option value="CREDIT_CARD">Credit / Debit Card</option>
              <option value="ONLINE">Online Portal</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Reference / Trx ID
            </label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. Wire Ref #889910"
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Payment Notes / Remarks
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 50% advance before inverter dispatch"
            className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* --- DIFFERENT MESSAGE TYPES FOR RECEIVED PAYMENT --- */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-emerald-700" />
              <span className="font-bold text-emerald-950">WhatsApp Payment Receipt Message:</span>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sendWhatsAppReceipt}
                onChange={(e) => setSendWhatsAppReceipt(e.target.checked)}
                className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-[11px] font-bold text-emerald-900">Send on WhatsApp</span>
            </label>
          </div>

          {sendWhatsAppReceipt && (
            <div className="space-y-2">
              {/* Select Message Type */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setReceiptType('OFFICIAL_RECEIPT')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    receiptType === 'OFFICIAL_RECEIPT'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  🧾 Official Receipt
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptType('MILESTONE_CONFIRMED')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    receiptType === 'MILESTONE_CONFIRMED'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  ⚡ Milestone Confirmed
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptType('FULL_SETTLEMENT')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    receiptType === 'FULL_SETTLEMENT'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  🏆 100% Full Settled
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptType('URDU_RECEIPT')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    receiptType === 'URDU_RECEIPT'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  🇵🇰 Urdu وصولی رسید
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptType('SHORT_RECEIPT')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    receiptType === 'SHORT_RECEIPT'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  📱 Short SMS Receipt
                </button>
              </div>

              {/* Collapsible Message Preview & Copy */}
              <div className="pt-1">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowMessagePreview(!showMessagePreview)}
                    className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform ${showMessagePreview ? 'rotate-180' : ''}`} />
                    <span>{showMessagePreview ? 'Hide Receipt Preview' : 'Show Receipt Preview'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(previewReceiptMessage);
                      setCopiedReceipt(true);
                      setTimeout(() => setCopiedReceipt(false), 2000);
                    }}
                    className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-white border border-emerald-200 px-2 py-0.5 rounded hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    {copiedReceipt ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Receipt</span>
                      </>
                    )}
                  </button>
                </div>

                {showMessagePreview && (
                  <pre className="mt-1.5 max-h-36 overflow-y-auto whitespace-pre-wrap rounded-lg bg-white p-2.5 text-[10px] text-slate-800 font-mono border border-emerald-200 shadow-2xs leading-relaxed">
                    {previewReceiptMessage}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Confirm & Record Payment</span>
              {sendWhatsAppReceipt && <Send className="h-3 w-3 ml-0.5" />}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
