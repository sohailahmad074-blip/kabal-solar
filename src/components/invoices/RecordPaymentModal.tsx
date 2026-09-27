import React, { useState } from 'react';
import { DollarSign, CheckCircle2, CreditCard } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Invoice, PaymentMethod, ShopSettings } from '../../types/solar';
import { Modal } from '../common/Modal';
import { formatCurrency } from '../../utils/formatters';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  settings: ShopSettings;
  onSavePayment: (invoiceId: string, amount: number, method: PaymentMethod, referenceNo: string, notes: string) => void;
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
  const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('Payment settlement');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    if (amount > invoice.balanceDue) {
      if (!window.confirm(`The amount (${formatCurrency(amount, settings.currency)}) is greater than the outstanding balance (${formatCurrency(invoice.balanceDue, settings.currency)}). Do you want to proceed?`)) {
        return;
      }
    }

    onSavePayment(invoice.id, amount, method, referenceNo, notes);

    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10b981', '#f59e0b', '#3b82f6'],
      });
    } catch {
      // ignore
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Customer Payment"
      subtitle={`Receive payment for Invoice ${invoice.invoiceNumber} (${invoice.customerName})`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        {/* Invoice details summary */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Invoice Total:</span>
            <span className="font-semibold text-slate-900">
              {formatCurrency(invoice.grandTotal, settings.currency, settings.currencyPosition)}
            </span>
          </div>
          <div className="flex justify-between text-emerald-700">
            <span>Already Collected:</span>
            <span className="font-semibold">
              {formatCurrency(invoice.paidAmount, settings.currency, settings.currencyPosition)}
            </span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1.5 text-rose-600 font-bold text-sm">
            <span>Outstanding Due:</span>
            <span>{formatCurrency(invoice.balanceDue, settings.currency, settings.currencyPosition)}</span>
          </div>
        </div>

        {/* Payment amount */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Payment Amount Received ({settings.currency}) *
          </label>
          <div className="relative mt-1">
            <input
              type="number"
              step="any"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full rounded border border-emerald-400 bg-white px-3 py-2 text-base font-bold text-emerald-700 focus:border-emerald-500 focus:outline-none"
              required
            />
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

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Confirm & Record</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
