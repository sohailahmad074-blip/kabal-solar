import React from 'react';
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
  ExternalLink
} from 'lucide-react';
import { Customer, Invoice, ShopSettings } from '../../types/solar';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { formatWhatsAppNumber, openWhatsApp } from '../../utils/sendDirect';

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
}) => {
  if (!customer) return null;

  const customerInvoices = invoices.filter((i) => i.customerId === customer.id);
  const totalInvoiced = customer.totalInvoiced || customerInvoices.reduce((acc, i) => acc + (i.grandTotal || 0), 0);
  const totalPaid = customer.totalPaid || customerInvoices.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
  const balanceDue = customer.balanceDue || Math.max(0, totalInvoiced - totalPaid);
  const paidPct = totalInvoiced > 0 ? Math.min(100, Math.round((totalPaid / totalInvoiced) * 100)) : 100;
  const hasDue = balanceDue > 0;

  const handleSendWhatsAppReminder = () => {
    const targetPhone = customer.whatsapp || customer.phone || '';
    const amountStr = formatCurrency(balanceDue, settings.currency, settings.currencyPosition);
    const shop = settings.shopName || 'SolarCrafter';
    
    const message = `Hello ${customer.name}! Hope you are having a wonderful day. 😊\n\nThis is a friendly update regarding your account with *${shop}*.\n\n` +
      `📊 *Account Summary:*\n` +
      `• Total Billed: ${formatCurrency(totalInvoiced, settings.currency, settings.currencyPosition)}\n` +
      `• Total Paid: ${formatCurrency(totalPaid, settings.currency, settings.currencyPosition)}\n` +
      `• *Pending Balance: ${amountStr}*\n\n` +
      `Please let us know if you have any questions or need assistance. Thank you for choosing *${shop}*! ☀️`;

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
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[11px] text-rose-700 font-medium">
                {hasDue ? 'Milestone Due' : 'All Clear! 🎉'}
              </span>
              {hasDue && (
                <button
                  type="button"
                  onClick={handleSendWhatsAppReminder}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-1.5 py-0.5 rounded transition-colors"
                >
                  <MessageCircle className="h-3 w-3" />
                  Reminder
                </button>
              )}
            </div>
          </div>
        </div>

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
          <div className="flex items-center gap-2">
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
                onClick={handleSendWhatsAppReminder}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Send WhatsApp Reminder</span>
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
