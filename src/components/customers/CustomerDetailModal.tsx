import React, { useState } from 'react';
import { 
  Phone, 
  MapPin, 
  Sun, 
  FileText, 
  Printer,
  Plus,
  Send,
  MessageCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  DollarSign,
  ChevronDown,
  Tag,
  Copy,
  Check
} from 'lucide-react';
import { Customer, Invoice, ShopSettings, PaymentRequestMessageType } from '../../types/solar';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { formatWhatsAppNumber, openWhatsApp, buildPaymentRequestMessage } from '../../utils/sendDirect';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  invoices: Invoice[];
  settings: ShopSettings;
  onViewInvoice: (invoice: Invoice) => void;
  onOpenInvoiceEditor: (invoice?: Invoice) => void;
  onSendInvoice?: (invoice: Invoice) => void;
  onPrintCustomerStatement?: (customer: Customer) => void;
  onOpenRecordPayment?: (invoice: Invoice) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customer,
  invoices,
  settings,
  onViewInvoice,
  onOpenInvoiceEditor,
  onSendInvoice,
  onPrintCustomerStatement,
  onOpenRecordPayment,
}) => {
  if (!customer) return null;

  const [reminderMessageType, setReminderMessageType] = useState<PaymentRequestMessageType>('FRIENDLY');
  const [showReminderOptions, setShowReminderOptions] = useState<boolean>(false);
  const [reminderCustomNote, setReminderCustomNote] = useState<string>('');

  const customerInvoices = invoices.filter((i) => i.customerId === customer.id);
  const actualInvoices = customerInvoices.filter((i) => i.type !== 'QUOTATION');
  const totalInvoiced = actualInvoices.reduce((acc, i) => acc + (i.grandTotal || 0), 0);
  const totalPaid = actualInvoices.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
  const balanceDue = Math.max(0, totalInvoiced - totalPaid);
  const paidPct = totalInvoiced > 0 ? Math.min(100, Math.round((totalPaid / totalInvoiced) * 100)) : 100;
  const hasDue = balanceDue > 0;
  const pendingInvoices = actualInvoices.filter((i) => i.balanceDue > 0);
  const primaryPendingInvoice = pendingInvoices[0] || actualInvoices[0];

  const handleSendWhatsAppReminder = () => {
    const targetPhone = customer.whatsapp || customer.phone || '';
    const amountStr = formatCurrency(balanceDue, settings.currency, settings.currencyPosition);
    const shop = settings.shopName || 'SolarCraft ERP';

    let message = '';
    if (primaryPendingInvoice) {
      message = buildPaymentRequestMessage(
        {
          ...primaryPendingInvoice,
          balanceDue: balanceDue,
        },
        settings,
        reminderMessageType,
        reminderCustomNote
      );
    } else {
      message = `☀️ *${shop}* - Customer Balance Statement\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Dear *${customer.name}*,\n\n` +
        `This is an account summary update from *${shop}*:\n` +
        `• Total Billed: ${formatCurrency(totalInvoiced, settings.currency, settings.currencyPosition)}\n` +
        `• Total Paid: ${formatCurrency(totalPaid, settings.currency, settings.currencyPosition)}\n` +
        `• 🔴 *Current Balance Due: ${amountStr}*\n\n` +
        (reminderCustomNote ? `📝 Note: ${reminderCustomNote}\n\n` : '') +
        `Thank you for choosing *${shop}*! ☀️\n📞 ${settings.phone}`;
    }

    openWhatsApp(targetPhone, message);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer.name}
      subtitle={`Solar Client Account & Ledger (${(customer.customerType || 'RESIDENTIAL').replace(/_/g, ' ')})`}
      maxWidth="4xl"
    >
      <div className="space-y-4 text-xs">
        {/* Customer Top Summary Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Billed</span>
            <p className="mt-0.5 text-xl font-black text-slate-900 font-mono">
              {formatCurrency(totalInvoiced, settings.currency, settings.currencyPosition)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{customerInvoices.length} Documents Logged</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Total Received</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <p className="mt-0.5 text-xl font-black text-emerald-700 font-mono">
              {formatCurrency(totalPaid, settings.currency, settings.currencyPosition)}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-emerald-200 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all"
                  style={{ width: `${paidPct}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-emerald-800 font-mono">{paidPct}%</span>
            </div>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Pending Balance</span>
              <Clock className="h-3.5 w-3.5 text-rose-600" />
            </div>
            <p className="mt-0.5 text-xl font-black text-rose-600 font-mono">
              {formatCurrency(balanceDue, settings.currency, settings.currencyPosition)}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-rose-200">
              <span className="text-[11px] text-rose-700 font-medium">
                {hasDue ? 'Milestone Due' : 'All Clear! 🎉'}
              </span>
              <div className="flex items-center gap-1">
                {hasDue && onOpenRecordPayment && primaryPendingInvoice && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenRecordPayment(primaryPendingInvoice);
                    }}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-0.5 rounded shadow-2xs transition-colors cursor-pointer"
                  >
                    <DollarSign className="h-3 w-3" />
                    Receive Pay
                  </button>
                )}
                {hasDue && (
                  <button
                    type="button"
                    onClick={() => setShowReminderOptions(!showReminderOptions)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                  >
                    <MessageCircle className="h-3 w-3" />
                    <span>WhatsApp</span>
                    <ChevronDown className={`h-2.5 w-2.5 transition-transform ${showReminderOptions ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Due Message Types Box (CRM WhatsApp Dispatcher) */}
        {showReminderOptions && hasDue && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3.5 space-y-2.5 animate-fadeIn shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-emerald-700" />
                <span className="font-bold text-xs text-emerald-950">
                  Select WhatsApp Payment Request Template:
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowReminderOptions(false)}
                className="text-[10px] text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Template Selector Pills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setReminderMessageType('FRIENDLY')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  reminderMessageType === 'FRIENDLY'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                🌿 Friendly Reminder
              </button>
              <button
                type="button"
                onClick={() => setReminderMessageType('COMMERCIAL')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  reminderMessageType === 'COMMERCIAL'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                💼 Commercial & Bank Details
              </button>
              <button
                type="button"
                onClick={() => setReminderMessageType('SOLAR_MILESTONE')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  reminderMessageType === 'SOLAR_MILESTONE'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                ⚡ Solar Milestone Call
              </button>
              <button
                type="button"
                onClick={() => setReminderMessageType('URDU_ENG')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  reminderMessageType === 'URDU_ENG'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                🇵🇰 Urdu یاددہانی
              </button>
              <button
                type="button"
                onClick={() => setReminderMessageType('URGENT')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  reminderMessageType === 'URGENT'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'bg-white text-rose-800 border border-rose-200 hover:bg-rose-50'
                }`}
              >
                🚨 Urgent Overdue Notice
              </button>
              <button
                type="button"
                onClick={() => setReminderMessageType('SHORT_SMS')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  reminderMessageType === 'SHORT_SMS'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                📱 Short SMS
              </button>
            </div>

            {/* Custom note */}
            <div>
              <input
                type="text"
                value={reminderCustomNote}
                onChange={(e) => setReminderCustomNote(e.target.value)}
                placeholder="Optional custom remark / payment instructions (e.g. Please clear before dispatch tomorrow)"
                className="w-full rounded border border-emerald-300 bg-white px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Live Message Preview & Action */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 border-t border-emerald-200">
              <span className="text-[10px] text-emerald-800">
                Will send to: <strong>{customer.phone || customer.whatsapp}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = primaryPendingInvoice
                      ? buildPaymentRequestMessage(
                          { ...primaryPendingInvoice, balanceDue },
                          settings,
                          reminderMessageType,
                          reminderCustomNote
                        )
                      : `☀️ *${settings.shopName || 'SolarCraft ERP'}* - Customer Balance Statement\n\nDear *${customer.name}*,\nBalance Due: ${formatCurrency(balanceDue, settings.currency, settings.currencyPosition)}\n📞 ${settings.phone}`;
                    navigator.clipboard.writeText(text);
                    setReminderCustomNote((prev) => prev); // keep
                    alert('Reminder message copied to clipboard!');
                  }}
                  className="flex items-center justify-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer"
                  title="Copy reminder message to clipboard"
                >
                  <Copy className="h-3 w-3" />
                  <span>Copy Text</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsAppReminder}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
                >
                  <Send className="h-3 w-3" />
                  <span>Send {reminderMessageType.replace(/_/g, ' ')} Request on WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Site & System Specs */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Solar Project Specification */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 shadow-2xs">
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Installed Solar System Profile
              </h4>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">System Capacity:</span>
                <span className="font-bold text-amber-600">
                  {customer.installedCapacityKw ? `${customer.installedCapacityKw} kW DC Array` : 'In Design / Hardware Purchase'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">System Architecture:</span>
                <span className="font-medium text-slate-800">
                  {customer.systemType ? customer.systemType.replace(/_/g, ' ') : 'Turnkey Setup'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Inverter Serial:</span>
                <span className="font-mono text-slate-800">
                  {customer.inverterSerial || 'Pending Commissioning'}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-slate-500">Panel Specs:</span>
                <span className="text-slate-800">
                  {customer.panelBrandModel || 'Tier-1 Mono PERC / TOPCon'}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Details & Site Address */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 shadow-2xs">
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <MapPin className="h-3.5 w-3.5 text-amber-500" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Contact & Site Address
              </h4>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <a 
                  href={`tel:${customer.phone}`}
                  className="flex items-center gap-1.5 font-bold text-slate-900 hover:text-amber-600 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{customer.phone}</span>
                </a>
                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-colors"
                  >
                    Call
                  </a>
                  {customer.whatsapp && (
                    <a
                      href={`https://wa.me/${formatWhatsAppNumber(customer.whatsapp)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded transition-colors inline-flex items-center gap-1"
                    >
                      <MessageCircle className="h-2.5 w-2.5" />
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>

              {customer.email && (
                <p className="text-slate-600">✉️ {customer.email}</p>
              )}

              <p className="text-slate-700">
                📍 {customer.address ? `${customer.address}, ${customer.city}` : customer.city}
              </p>

              {customer.consumerNumber && (
                <p className="font-mono text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100">
                  ⚡ Utility Consumer #: <span className="font-bold text-slate-900">{customer.consumerNumber}</span>
                </p>
              )}

              {customer.notes && (
                <div className="rounded bg-amber-50/50 p-2 border border-amber-100 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-700">Site Notes: </span>
                  {customer.notes}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice & Proposal History for this Client */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-amber-500" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Billing & Document History ({customerInvoices.length})
              </h4>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenInvoiceEditor();
              }}
              className="flex items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-1 text-xs font-bold text-slate-900 hover:bg-amber-500 transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>Create Document</span>
            </button>
          </div>

          {customerInvoices.length === 0 ? (
            <p className="text-[11px] text-slate-400 py-4 text-center">
              No invoices or quotations logged yet for this client.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase bg-slate-50">
                  <tr>
                    <th className="py-2.5 px-2">Doc #</th>
                    <th className="py-2.5 px-2">Type / Date</th>
                    <th className="py-2.5 px-2 text-right">Total</th>
                    <th className="py-2.5 px-2 text-right">Paid</th>
                    <th className="py-2.5 px-2 text-right">Due</th>
                    <th className="py-2.5 px-2 text-center">Status</th>
                    <th className="py-2.5 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-2 font-bold text-slate-900 font-mono">{inv.invoiceNumber}</td>
                      <td className="py-2 px-2">
                        <span className="text-[10px] text-slate-500">{inv.type} • {formatDate(inv.date)}</span>
                      </td>
                      <td className="py-2 px-2 text-right font-semibold text-slate-900">
                        {formatCurrency(inv.grandTotal, settings.currency, settings.currencyPosition)}
                      </td>
                      <td className="py-2 px-2 text-right font-medium text-emerald-700">
                        {formatCurrency(inv.paidAmount, settings.currency, settings.currencyPosition)}
                      </td>
                      <td className="py-2 px-2 text-right font-medium text-rose-600">
                        {formatCurrency(inv.balanceDue, settings.currency, settings.currencyPosition)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <Badge status={inv.status} size="sm" />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {inv.balanceDue > 0 && onOpenRecordPayment && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenRecordPayment(inv);
                              }}
                              className="rounded bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 flex items-center gap-0.5 cursor-pointer"
                              title="Receive Payment & Grant Discount"
                            >
                              <DollarSign className="h-3 w-3 text-emerald-600" />
                              <span>Receive</span>
                            </button>
                          )}
                          {onSendInvoice && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onSendInvoice(inv);
                              }}
                              className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                              title="Send to Customer"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onViewInvoice(inv);
                            }}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title="View / Print Document"
                          >
                            <Printer className="h-3.5 w-3.5" />
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

        {/* Modal Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {hasDue && onOpenRecordPayment && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  const targetInv = primaryPendingInvoice || {
                    id: `inv-ledger-${customer.id}`,
                    invoiceNumber: `BAL-${customer.id.slice(-6).toUpperCase()}`,
                    type: 'INVOICE' as const,
                    customerId: customer.id,
                    customerName: customer.name,
                    customerPhone: customer.phone,
                    customerEmail: customer.email,
                    customerAddress: customer.address,
                    customerCity: customer.city,
                    date: new Date().toISOString().split('T')[0],
                    dueDate: new Date().toISOString().split('T')[0],
                    items: [
                      {
                        id: `item-bal-${Date.now()}`,
                        description: 'Account Outstanding Dues / Milestone',
                        quantity: 1,
                        unitPrice: balanceDue,
                        total: balanceDue,
                        category: 'SERVICES_LABOR' as any,
                      }
                    ],
                    subtotal: balanceDue,
                    taxRate: 0,
                    taxTotal: 0,
                    discountTotal: 0,
                    grandTotal: balanceDue,
                    paidAmount: 0,
                    balanceDue: balanceDue,
                    status: 'UNPAID' as const,
                    payments: [],
                    createdAt: customer.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  onOpenRecordPayment(targetInv as Invoice);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
              >
                <DollarSign className="h-3.5 w-3.5" />
                <span>Receive Payment & Discount</span>
              </button>
            )}

            {onPrintCustomerStatement && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPrintCustomerStatement(customer);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-slate-900 hover:bg-amber-500 shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Customer Ledger / Statement</span>
              </button>
            )}

            {hasDue && (
              <button
                type="button"
                onClick={() => setShowReminderOptions(!showReminderOptions)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-900 shadow-xs transition-colors cursor-pointer"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>WhatsApp Payment Notices</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
