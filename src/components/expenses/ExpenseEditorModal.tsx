import React, { useState, useEffect } from 'react';
import { Receipt, Save } from 'lucide-react';
import { Expense, ExpenseCategory, PaymentMethod, Customer, ShopSettings } from '../../types/solar';
import { Modal } from '../common/Modal';

interface ExpenseEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Expense) => void;
  existingExpense?: Expense | null;
  customers: Customer[];
  settings: ShopSettings;
}

export const ExpenseEditorModal: React.FC<ExpenseEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingExpense,
  customers,
  settings,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<ExpenseCategory>('LABOR_INSTALLATION_WAGES');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [payee, setPayee] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [taxDeductible, setTaxDeductible] = useState(true);
  const [relatedCustomerId, setRelatedCustomerId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (existingExpense) {
      setTitle(existingExpense.title);
      setAmount(existingExpense.amount);
      setCategory(existingExpense.category);
      setDate(existingExpense.date);
      setPaymentMethod(existingExpense.paymentMethod);
      setPayee(existingExpense.payee);
      setReferenceNo(existingExpense.referenceNo || '');
      setTaxDeductible(existingExpense.taxDeductible);
      setRelatedCustomerId(existingExpense.relatedCustomerId || '');
      setNotes(existingExpense.notes || '');
    } else {
      setTitle('');
      setAmount(0);
      setCategory('LABOR_INSTALLATION_WAGES');
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('BANK_TRANSFER');
      setPayee('');
      setReferenceNo('');
      setTaxDeductible(true);
      setRelatedCustomerId('');
      setNotes('');
    }
  }, [existingExpense, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0 || !payee.trim()) {
      alert('Please fill out expense title, amount, and payee.');
      return;
    }

    const matchedCustomer = customers.find((c) => c.id === relatedCustomerId);

    const newExpense: Expense = {
      id: existingExpense?.id || `exp-${Date.now()}`,
      date,
      category,
      title: title.trim(),
      amount: Number(amount),
      paymentMethod,
      payee: payee.trim(),
      referenceNo: referenceNo.trim() || undefined,
      taxDeductible,
      relatedCustomerId: relatedCustomerId || undefined,
      relatedCustomerName: matchedCustomer?.name,
      notes: notes.trim() || undefined,
      createdAt: existingExpense?.createdAt || new Date().toISOString(),
    };

    onSave(newExpense);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingExpense ? 'Edit Expense Record' : 'Record Solar Shop Expense'}
      subtitle="Log warehouse overhead, installer wages, transportation crane, permits, and tools"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Expense Title / Description *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Crane Rental for 20kW Rooftop Panel Lifting"
            className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Amount ({settings.currency}) *
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="mt-1 w-full rounded border border-rose-300 bg-white px-2.5 py-1.5 text-xs font-bold text-rose-600 focus:border-rose-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Expense Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
            >
              <option value="RENT">Warehouse & Office Rent</option>
              <option value="LABOR_INSTALLATION_WAGES">Installer Wages & Technician Payroll</option>
              <option value="TRANSPORT_FREIGHT">Logistics, Crane & Transport</option>
              <option value="PERMITS_NET_METERING_FEES">Permits & Inspection Fees</option>
              <option value="TOOLS_SAFETY_GEAR">Tools, Ladders & Safety Gear</option>
              <option value="UTILITIES">Electricity & Office Bills</option>
              <option value="MARKETING_ADS">Marketing & Customer Leads</option>
              <option value="MISCELLANEOUS">Miscellaneous / Petty Cash</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Expense Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
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
              Paid To (Payee) *
            </label>
            <input
              type="text"
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              placeholder="e.g. Eagle Crane Services"
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Reference / Receipt #
            </label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. REC-88291"
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Link to specific solar client project */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Link to Solar Client Project (Optional)
          </label>
          <select
            value={relatedCustomerId}
            onChange={(e) => setRelatedCustomerId(e.target.value)}
            className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
          >
            <option value="">-- General Operational Overhead --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.installedCapacityKw ? `${c.installedCapacityKw} kW` : c.city})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Notes & Remarks
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional details, vendor invoice link, project milestone details"
            className="mt-1 w-full rounded border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* Footer Actions */}
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
            className="flex items-center gap-1.5 rounded bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 shadow-xs transition-colors cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Expense</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
