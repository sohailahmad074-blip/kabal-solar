import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  Sun, 
  Eye, 
  Edit3, 
  Trash2, 
  FileText,
  Printer,
  CheckCircle2,
  Clock,
  MessageCircle,
  TrendingUp,
  Sparkles,
  Zap,
  Send,
  DollarSign,
  Copy,
  Check,
  X,
  Tag
} from 'lucide-react';
import { Customer, ShopSettings, Invoice, PaymentRequestMessageType } from '../../types/solar';
import { formatCurrency } from '../../utils/formatters';
import { 
  formatWhatsAppNumber, 
  openWhatsApp, 
  buildPaymentRequestMessage, 
  buildCustomerBalanceReminderMessage 
} from '../../utils/sendDirect';
import { BulkBalanceReminderModal } from './BulkBalanceReminderModal';

interface CustomerListProps {
  customers: Customer[];
  invoices: Invoice[];
  settings: ShopSettings;
  onOpenCustomerEditor: (customer?: Customer) => void;
  onViewCustomerDetail: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onOpenInvoiceForCustomer: (customer: Customer) => void;
  onPrintCustomerStatement?: (customer: Customer) => void;
  onRecordPayment?: (invoice: Invoice) => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  invoices = [],
  settings,
  onOpenCustomerEditor,
  onViewCustomerDetail,
  onDeleteCustomer,
  onOpenInvoiceForCustomer,
  onPrintCustomerStatement,
  onRecordPayment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [balanceFilter, setBalanceFilter] = useState<'ALL' | 'WITH_BALANCE' | 'CLEARED'>('ALL');
  const [isBulkReminderOpen, setIsBulkReminderOpen] = useState(false);
  const [reminderCustomer, setReminderCustomer] = useState<Customer | null>(null);
  const [reminderMessageType, setReminderMessageType] = useState<PaymentRequestMessageType>('FRIENDLY');
  const [reminderCustomNote, setReminderCustomNote] = useState<string>('');
  const [copiedReminder, setCopiedReminder] = useState<boolean>(false);

  const getCustomerReminderMessage = (cust: Customer) => {
    const custInvoices = invoices.filter((i) => i.customerId === cust.id && i.balanceDue > 0);
    const primaryInvoice = custInvoices[0] || invoices.find((i) => i.customerId === cust.id);
    if (primaryInvoice) {
      return buildPaymentRequestMessage(
        { ...primaryInvoice, balanceDue: cust.balanceDue || primaryInvoice.balanceDue },
        settings,
        reminderMessageType,
        reminderCustomNote
      );
    }
    return buildCustomerBalanceReminderMessage(cust, settings, reminderMessageType as any, reminderCustomNote);
  };

  const handleOpenReminderModal = (cust: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setReminderCustomer(cust);
    setReminderMessageType('FRIENDLY');
    setReminderCustomNote('');
    setCopiedReminder(false);
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.city && c.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.consumerNumber && c.consumerNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'ALL' || c.customerType === typeFilter;
    
    let matchesBalance = true;
    if (balanceFilter === 'WITH_BALANCE') {
      matchesBalance = (c.balanceDue || 0) > 0;
    } else if (balanceFilter === 'CLEARED') {
      matchesBalance = (c.balanceDue || 0) <= 0;
    }

    return matchesSearch && matchesType && matchesBalance;
  });

  const totalKw = customers.reduce((acc, c) => acc + (c.installedCapacityKw || 0), 0);
  const totalBilled = customers.reduce((acc, c) => acc + (c.totalInvoiced || 0), 0);
  const totalReceived = customers.reduce((acc, c) => acc + (c.totalPaid || 0), 0);
  const totalOutstanding = customers.reduce((acc, c) => acc + (c.balanceDue || 0), 0);
  const customersWithBalance = customers.filter((c) => (c.balanceDue || 0) > 0);
  const overallPaidPercentage = totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 100;

  // Filtered totals
  const filteredBilled = filteredCustomers.reduce((acc, c) => acc + (c.totalInvoiced || 0), 0);
  const filteredReceived = filteredCustomers.reduce((acc, c) => acc + (c.totalPaid || 0), 0);
  const filteredOutstanding = filteredCustomers.reduce((acc, c) => acc + (c.balanceDue || 0), 0);

  // Friendly WhatsApp Reminder Generator
  const handleSendWhatsAppReminder = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetPhone = customer.whatsapp || customer.phone || '';
    const amountStr = formatCurrency(customer.balanceDue, settings.currency, settings.currencyPosition);
    const shop = settings.shopName || 'SolarCrafter';
    
    const message = `Hello ${customer.name}! Hope you are doing well. 😊\n\nThis is a friendly update regarding your account with *${shop}*.\n\n` +
      `📊 *Account Summary:*\n` +
      `• Total Billed: ${formatCurrency(customer.totalInvoiced, settings.currency, settings.currencyPosition)}\n` +
      `• Total Paid: ${formatCurrency(customer.totalPaid, settings.currency, settings.currencyPosition)}\n` +
      `• *Pending Balance: ${amountStr}*\n\n` +
      `Please let us know if you have any questions or need assistance. Thank you for your business! ☀️`;

    openWhatsApp(targetPhone, message);
  };

  return (
    <div className="space-y-4">
      {/* Friendly Header Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 rounded-xl border border-amber-200/60 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-slate-900 shadow-2xs">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl flex items-center gap-2">
                Clients & Receivables
                <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                  {customers.length} {customers.length === 1 ? 'Client' : 'Clients'}
                </span>
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Track customer accounts, solar installations, payment milestones, and pending balances customer-wise.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {customersWithBalance.length > 0 && (
            <button
              type="button"
              onClick={() => setIsBulkReminderOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all cursor-pointer hover:shadow-sm"
              title="Automatically send WhatsApp / SMS payment reminders to all clients with pending dues"
            >
              <Zap className="h-4 w-4 fill-white" />
              <span>Remind Pending Dues ({customersWithBalance.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenCustomerEditor()}
            className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3.5 py-2 text-xs font-bold text-slate-900 shadow-xs hover:bg-amber-500 transition-all cursor-pointer hover:shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Client</span>
          </button>
        </div>
      </div>

      {/* Friendly KPI Stats Cards: Customer-wise Financial Overview */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Installed */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Installed Capacity</p>
            <span className="p-1 rounded-md bg-amber-100/80 text-amber-700">
              <Sun className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 text-xl font-black text-amber-600 font-mono">{totalKw.toFixed(1)} kW</p>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="font-semibold text-slate-700">{customers.length}</span> active solar sites
          </p>
        </div>

        {/* Total Invoiced */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Total Billed</p>
            <span className="p-1 rounded-md bg-slate-100 text-slate-700">
              <TrendingUp className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 text-xl font-black text-slate-900 font-mono">
            {formatCurrency(totalBilled, settings.currency, settings.currencyPosition)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Total project value</p>
        </div>

        {/* Total Received */}
        <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/50 p-3.5 shadow-2xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Total Received</p>
            <span className="p-1 rounded-md bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 text-xl font-black text-emerald-700 font-mono">
            {formatCurrency(totalReceived, settings.currency, settings.currencyPosition)}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-emerald-200 overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(overallPaidPercentage, 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-emerald-800 font-mono">{overallPaidPercentage}% Paid</span>
          </div>
        </div>

        {/* Pending Receivables */}
        <div className="rounded-xl border border-rose-200/90 bg-rose-50/50 p-3.5 shadow-2xs hover:border-rose-300 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Total Pending Dues</p>
              <span className="p-1 rounded-md bg-rose-100 text-rose-700">
                <Clock className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="mt-1 text-xl font-black text-rose-600 font-mono">
              {formatCurrency(totalOutstanding, settings.currency, settings.currencyPosition)}
            </p>
          </div>

          <div className="mt-2 flex items-center justify-between gap-1 border-t border-rose-200/60 pt-2">
            <p className="text-[11px] text-rose-700 font-medium truncate">
              {customersWithBalance.length === 0 ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> All cleared!
                </span>
              ) : (
                <span>{customersWithBalance.length} {customersWithBalance.length === 1 ? 'client owes dues' : 'clients owe dues'}</span>
              )}
            </p>
            {customersWithBalance.length > 0 && (
              <button
                type="button"
                onClick={() => setIsBulkReminderOpen(true)}
                className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-200/70 hover:bg-rose-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
              >
                <Zap className="h-2.5 w-2.5 fill-rose-700" />
                <span>Remind All</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Friendly Search and Filters Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by client name, mobile number, city, or consumer ref #..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-amber-500 focus:outline-none transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Friendly Balance Filter Toggle */}
          <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200/80 text-xs">
            <button
              type="button"
              onClick={() => setBalanceFilter('ALL')}
              className={`px-2.5 py-1 font-semibold rounded-md transition-all cursor-pointer ${
                balanceFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Clients ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setBalanceFilter('WITH_BALANCE')}
              className={`px-2.5 py-1 font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                balanceFilter === 'WITH_BALANCE' ? 'bg-rose-500 text-white shadow-2xs font-bold' : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <span>Pending Dues</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${balanceFilter === 'WITH_BALANCE' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-800'}`}>
                {customersWithBalance.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setBalanceFilter('CLEARED')}
              className={`px-2.5 py-1 font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                balanceFilter === 'CLEARED' ? 'bg-emerald-600 text-white shadow-2xs font-bold' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span>Cleared</span>
            </button>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-amber-500 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="RESIDENTIAL">Residential (Homes)</option>
            <option value="COMMERCIAL">Commercial (Offices/Plazas)</option>
            <option value="AGRICULTURAL">Agricultural (Tubewells/Farms)</option>
            <option value="INDUSTRIAL">Industrial (Factories)</option>
          </select>
        </div>
      </div>

      {/* Customer Table */}
      {filteredCustomers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-2xs">
          {balanceFilter === 'WITH_BALANCE' ? (
            <div className="space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-1">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">All Client Balances Cleared! 🎉</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                None of your clients have pending dues right now. Great job keeping receivables up to date!
              </p>
              <button
                type="button"
                onClick={() => setBalanceFilter('ALL')}
                className="mt-2 text-xs font-bold text-amber-700 hover:underline cursor-pointer"
              >
                View all clients →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Users className="mx-auto h-8 w-8 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No matching clients found</p>
              <p className="text-xs text-slate-500">Try adjusting your search terms or filter selections.</p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 inline-block rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Clear Search Filter
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-[10px] text-slate-600">
                <tr>
                  <th className="py-3 px-3.5">Client & System</th>
                  <th className="py-3 px-3.5">Contact Details</th>
                  <th className="py-3 px-3.5 text-right">Total Invoiced</th>
                  <th className="py-3 px-3.5 text-right">Total Received</th>
                  <th className="py-3 px-3.5 text-right">Pending Balance</th>
                  <th className="py-3 px-3.5 text-center">Payment Status</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCustomers.map((customer) => {
                  const hasDue = (customer.balanceDue || 0) > 0;
                  const billed = customer.totalInvoiced || 0;
                  const paid = customer.totalPaid || Math.max(0, billed - (customer.balanceDue || 0));
                  const paidPct = billed > 0 ? Math.min(100, Math.round((paid / billed) * 100)) : 100;

                  return (
                    <tr 
                      key={customer.id} 
                      onClick={() => onViewCustomerDetail(customer)}
                      className={`hover:bg-amber-50/40 transition-colors cursor-pointer ${hasDue ? 'bg-rose-50/15' : ''}`}
                    >
                      {/* Name & System */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-start gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 font-bold text-xs mt-0.5">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm hover:text-amber-700 transition-colors">{customer.name}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] font-semibold bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 border border-slate-200/50">
                                {customer.customerType}
                              </span>
                              {customer.installedCapacityKw ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  <Sun className="h-2.5 w-2.5" />
                                  {customer.installedCapacityKw} kW
                                </span>
                              ) : null}
                              {customer.consumerNumber && (
                                <span className="text-[10px] text-slate-400 font-mono">Ref: {customer.consumerNumber}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td className="py-3 px-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${customer.phone}`}
                              className="font-semibold text-slate-900 hover:text-amber-600 transition-colors inline-flex items-center gap-1"
                              title="Click to call"
                            >
                              <Phone className="h-3 w-3 text-slate-400" />
                              {customer.phone}
                            </a>
                            {customer.whatsapp && (
                              <a
                                href={`https://wa.me/${formatWhatsAppNumber(customer.whatsapp)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[9px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-1.5 py-0.2 rounded transition-colors"
                                title="Open WhatsApp Chat"
                              >
                                WA
                              </a>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1 truncate max-w-[160px]">
                            <MapPin className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                            {customer.city ? customer.city : customer.address || 'Site Location'}
                          </p>
                        </div>
                      </td>

                      {/* Total Invoiced */}
                      <td className="py-3 px-3.5 text-right font-mono font-semibold text-slate-800">
                        {formatCurrency(billed, settings.currency, settings.currencyPosition)}
                      </td>

                      {/* Total Received */}
                      <td className="py-3 px-3.5 text-right font-mono font-semibold text-emerald-700">
                        {formatCurrency(paid, settings.currency, settings.currencyPosition)}
                      </td>

                      {/* Pending Due Customer-wise */}
                      <td className="py-3 px-3.5 text-right font-mono">
                        {hasDue ? (
                          <div className="inline-block text-right">
                            <span className="inline-block px-2.5 py-1 rounded-md font-black text-rose-700 bg-rose-100 border border-rose-200 text-xs shadow-2xs">
                              {formatCurrency(customer.balanceDue, settings.currency, settings.currencyPosition)}
                            </span>
                          </div>
                        ) : (
                          <div className="inline-block text-right">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-emerald-700 bg-emerald-50 text-[11px] border border-emerald-200/50">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              {formatCurrency(0, settings.currency, settings.currencyPosition)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Payment Status & Progress */}
                      <td className="py-3 px-3.5 text-center min-w-[120px]">
                        <div className="space-y-1 inline-block text-center w-full max-w-[120px]">
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                            <div 
                              className={`h-full rounded-full transition-all ${hasDue ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${paidPct}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 px-0.5">
                            <span className={hasDue ? 'text-amber-700' : 'text-emerald-700'}>
                              {paidPct}% Paid
                            </span>
                            <span>{hasDue ? 'Milestone Due' : 'All Clear'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Friendly Actions */}
                      <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Receive Payment & Grant Discount button */}
                          {hasDue && onRecordPayment && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const custInvoices = invoices.filter(i => i.customerId === customer.id && i.balanceDue > 0);
                                const targetInvoice = custInvoices[0] || invoices.find(i => i.customerId === customer.id);
                                if (targetInvoice) {
                                  onRecordPayment(targetInvoice);
                                } else {
                                  const bal = customer.balanceDue || 0;
                                  const ledgerInvoice: any = {
                                    id: `inv-ledger-${customer.id}`,
                                    invoiceNumber: `BAL-${customer.id.slice(-6).toUpperCase()}`,
                                    type: 'INVOICE',
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
                                        unitPrice: bal,
                                        total: bal,
                                        category: 'SERVICES_LABOR',
                                      }
                                    ],
                                    subtotal: bal,
                                    taxRate: 0,
                                    taxTotal: 0,
                                    discountTotal: 0,
                                    grandTotal: bal,
                                    paidAmount: 0,
                                    balanceDue: bal,
                                    status: 'UNPAID',
                                    payments: [],
                                    createdAt: customer.createdAt || new Date().toISOString(),
                                    updatedAt: new Date().toISOString(),
                                  };
                                  onRecordPayment(ledgerInvoice);
                                }
                              }}
                              className="rounded-lg px-2 py-1 text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition-colors shadow-2xs inline-flex items-center gap-1 font-bold text-xs cursor-pointer"
                              title="Receive Payment & Grant Settlement Discount"
                            >
                              <DollarSign className="h-3.5 w-3.5 text-emerald-700" />
                              <span className="hidden xl:inline text-[10px]">Receive Pay</span>
                            </button>
                          )}

                          {/* Friendly WhatsApp Reminder button for outstanding balance */}
                          {hasDue && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenReminderModal(customer, e)}
                              className="rounded-lg p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                              title="Send WhatsApp Payment Notice (Choose Template)"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {onPrintCustomerStatement && (
                            <button
                              type="button"
                              onClick={() => onPrintCustomerStatement(customer)}
                              className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Print Customer Ledger & Statement"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenInvoiceForCustomer(customer)}
                            className="rounded-lg p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors shadow-2xs"
                            title="New Invoice or Proposal"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onViewCustomerDetail(customer)}
                            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
                            title="View Full Profile"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenCustomerEditor(customer)}
                            className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit Customer Info"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to remove client "${customer.name}"?`)) {
                                onDeleteCustomer(customer.id);
                              }
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Customer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer Summary Row */}
              <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-xs text-slate-800">
                <tr>
                  <td colSpan={2} className="py-3 px-3.5 text-slate-700 font-bold">
                    Total for {filteredCustomers.length} displayed {filteredCustomers.length === 1 ? 'client' : 'clients'}:
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono text-slate-900 font-bold">
                    {formatCurrency(filteredBilled, settings.currency, settings.currencyPosition)}
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono text-emerald-800 font-bold">
                    {formatCurrency(filteredReceived, settings.currency, settings.currencyPosition)}
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono text-rose-700 text-sm font-black">
                    {formatCurrency(filteredOutstanding, settings.currency, settings.currencyPosition)}
                  </td>
                  <td className="text-center py-3 px-3.5 text-[10px] text-slate-500 font-mono">
                    {filteredBilled > 0 ? `${Math.round((filteredReceived / filteredBilled) * 100)}% Collected` : '100%'}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
      {/* Bulk Customer Balance Reminder Engine Modal */}
      <BulkBalanceReminderModal
        isOpen={isBulkReminderOpen}
        onClose={() => setIsBulkReminderOpen(false)}
        customers={customers}
        settings={settings}
      />

      {/* Individual Customer WhatsApp Payment Notice Modal with Template Selector */}
      {reminderCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-2xl my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    WhatsApp Payment Notice
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {reminderCustomer.name} • 📞 {reminderCustomer.phone || reminderCustomer.whatsapp}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReminderCustomer(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Summary */}
            <div className="my-3 rounded-lg bg-rose-50/70 p-3 border border-rose-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                  Outstanding Balance Due:
                </span>
                <p className="text-base font-black text-rose-700 font-mono">
                  {formatCurrency(reminderCustomer.balanceDue, settings.currency, settings.currencyPosition)}
                </p>
              </div>
              <div className="text-right text-[11px] text-slate-600">
                <p>Billed: {formatCurrency(reminderCustomer.totalInvoiced, settings.currency, settings.currencyPosition)}</p>
                <p className="text-emerald-700 font-semibold">Paid: {formatCurrency(reminderCustomer.totalPaid, settings.currency, settings.currencyPosition)}</p>
              </div>
            </div>

            {/* Message Template Type Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Select Payment Message Type:
              </label>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setReminderMessageType('FRIENDLY')}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    reminderMessageType === 'FRIENDLY'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  🌿 Friendly Reminder
                </button>
                <button
                  type="button"
                  onClick={() => setReminderMessageType('COMMERCIAL')}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    reminderMessageType === 'COMMERCIAL'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  💼 Commercial & Bank
                </button>
                <button
                  type="button"
                  onClick={() => setReminderMessageType('SOLAR_MILESTONE')}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    reminderMessageType === 'SOLAR_MILESTONE'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  ⚡ Solar Milestone Call
                </button>
                <button
                  type="button"
                  onClick={() => setReminderMessageType('URDU_ENG')}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    reminderMessageType === 'URDU_ENG'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  🇵🇰 Urdu یاددہانی
                </button>
                <button
                  type="button"
                  onClick={() => setReminderMessageType('URGENT')}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    reminderMessageType === 'URGENT'
                      ? 'bg-rose-700 text-white shadow-2xs'
                      : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  🚨 Urgent Overdue
                </button>
                <button
                  type="button"
                  onClick={() => setReminderMessageType('SHORT_SMS')}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    reminderMessageType === 'SHORT_SMS'
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  📱 Short Text
                </button>
              </div>

              {/* Custom Note input */}
              <div>
                <input
                  type="text"
                  value={reminderCustomNote}
                  onChange={(e) => setReminderCustomNote(e.target.value)}
                  placeholder="Optional custom remark / payment instructions (e.g. Please clear before dispatch tomorrow)"
                  className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Message Live Preview */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Message Preview:
                </label>
                <pre className="max-h-44 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2.5 text-[10px] text-slate-800 font-mono border border-slate-200 leading-relaxed">
                  {getCustomerReminderMessage(reminderCustomer)}
                </pre>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setReminderCustomer(null)}
                className="rounded px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const msg = getCustomerReminderMessage(reminderCustomer);
                    navigator.clipboard.writeText(msg);
                    setCopiedReminder(true);
                    setTimeout(() => setCopiedReminder(false), 2000);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {copiedReminder ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const targetPhone = reminderCustomer.whatsapp || reminderCustomer.phone || '';
                    const msg = getCustomerReminderMessage(reminderCustomer);
                    openWhatsApp(targetPhone, msg);
                    setReminderCustomer(null);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send via WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
