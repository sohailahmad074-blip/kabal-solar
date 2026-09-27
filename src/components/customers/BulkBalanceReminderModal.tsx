import React, { useState } from 'react';
import { 
  Send, 
  CheckCircle2, 
  Clock, 
  MessageCircle, 
  Copy, 
  Check, 
  AlertCircle, 
  Search, 
  Sparkles, 
  Phone, 
  ExternalLink,
  ChevronRight,
  RefreshCw,
  FileText,
  User,
  Zap,
  Info
} from 'lucide-react';
import { Customer, ShopSettings } from '../../types/solar';
import { Modal } from '../common/Modal';
import { formatCurrency } from '../../utils/formatters';
import { 
  buildCustomerBalanceReminderMessage, 
  CustomerReminderTemplateType, 
  formatWhatsAppNumber, 
  openWhatsApp,
  openSms 
} from '../../utils/sendDirect';

interface BulkBalanceReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  settings: ShopSettings;
}

export const BulkBalanceReminderModal: React.FC<BulkBalanceReminderModalProps> = ({
  isOpen,
  onClose,
  customers,
  settings,
}) => {
  // Filter all customers with pending balances
  const pendingCustomers = customers.filter(c => (c.balanceDue || 0) > 0);
  const totalPendingAmount = pendingCustomers.reduce((acc, c) => acc + (c.balanceDue || 0), 0);

  // Selected customer IDs for reminder
  const [selectedIds, setSelectedIds] = useState<string[]>(() => pendingCustomers.map(c => c.id));
  const [searchTerm, setSearchTerm] = useState('');
  const [templateType, setTemplateType] = useState<CustomerReminderTemplateType>('FRIENDLY');
  const [customNote, setCustomNote] = useState('');
  const [sentCustomerIds, setSentCustomerIds] = useState<Record<string, { sentAt: Date; method: 'WHATSAPP' | 'SMS' }>>({});
  const [activeCustomerIndex, setActiveCustomerIndex] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Filtered by search
  const filteredPending = pendingCustomers.filter(c => {
    const q = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.whatsapp && c.whatsapp.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q))
    );
  });

  const selectedCustomers = pendingCustomers.filter(c => selectedIds.includes(c.id));

  // Current customer targeted in queue
  const currentQueueCustomer = selectedCustomers.find(c => !sentCustomerIds[c.id]) || selectedCustomers[0];

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === pendingCustomers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingCustomers.map(c => c.id));
    }
  };

  const handleSendSingleWhatsApp = (customer: Customer) => {
    const targetPhone = customer.whatsapp || customer.phone || '';
    const message = buildCustomerBalanceReminderMessage(customer, settings, templateType, customNote);
    openWhatsApp(targetPhone, message);
    
    setSentCustomerIds(prev => ({
      ...prev,
      [customer.id]: { sentAt: new Date(), method: 'WHATSAPP' }
    }));
  };

  const handleSendSingleSms = (customer: Customer) => {
    const targetPhone = customer.phone || customer.whatsapp || '';
    const message = buildCustomerBalanceReminderMessage(customer, settings, templateType, customNote);
    openSms(targetPhone, message);

    setSentCustomerIds(prev => ({
      ...prev,
      [customer.id]: { sentAt: new Date(), method: 'SMS' }
    }));
  };

  const handleCopySingle = (customer: Customer) => {
    const message = buildCustomerBalanceReminderMessage(customer, settings, templateType, customNote);
    navigator.clipboard.writeText(message);
    setCopiedId(customer.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    if (selectedCustomers.length === 0) return;
    const allMessages = selectedCustomers
      .map(c => {
        const phone = c.whatsapp || c.phone || 'No phone';
        const msg = buildCustomerBalanceReminderMessage(c, settings, templateType, customNote);
        return `==============================\nRECIPIENT: ${c.name} (${phone})\n==============================\n${msg}\n\n`;
      })
      .join('\n');

    navigator.clipboard.writeText(allMessages);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  // Next in Auto-Dispatch Queue
  const handleAutoDispatchNext = () => {
    if (!currentQueueCustomer) return;
    handleSendSingleWhatsApp(currentQueueCustomer);
  };

  // Preview sample message
  const previewCustomer = currentQueueCustomer || pendingCustomers[0] || {
    id: 'sample',
    name: 'Muhammad Ali',
    phone: '03001234567',
    customerType: 'RESIDENTIAL',
    balanceDue: 185000,
    totalInvoiced: 850000,
    totalPaid: 665000,
    installedCapacityKw: 10,
    systemType: 'HYBRID',
    address: 'Gulberg III, Lahore',
    city: 'Lahore',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const previewMessage = buildCustomerBalanceReminderMessage(previewCustomer, settings, templateType, customNote);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Automatic Pending Balance Reminders"
      subtitle="Dispatch tailored WhatsApp & SMS reminders to clients with outstanding milestone dues"
      maxWidth="4xl"
    >
      <div className="flex flex-col gap-4 max-h-[80vh] overflow-hidden text-slate-800">
        
        {/* Top Financial Overview Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-emerald-500/5 border border-rose-200/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-white shadow-xs">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Total Overdue Dues</p>
              <p className="text-base font-black text-rose-700 font-mono">
                {formatCurrency(totalPendingAmount, settings.currency, settings.currencyPosition)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-slate-900 shadow-xs">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Pending Clients</p>
              <p className="text-base font-black text-slate-900">
                {pendingCustomers.length} {pendingCustomers.length === 1 ? 'Client' : 'Clients'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Queue Progress</p>
              <p className="text-base font-black text-emerald-700 font-mono">
                {Object.keys(sentCustomerIds).length} / {selectedCustomers.length} Reminded
              </p>
            </div>
          </div>
        </div>

        {pendingCustomers.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 space-y-3">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">All Client Balances Cleared! 🎉</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              There are currently no customers with outstanding dues. All project milestones and invoices are settled.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto pr-1">
            
            {/* Left Column: Customer Queue & Selection (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              
              {/* Auto Dispatch Launch Box */}
              {selectedCustomers.length > 0 && (
                <div className="rounded-xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-amber-50/40 p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-emerald-600 fill-emerald-600" />
                      <p className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                        1-Click Auto Dispatch Engine
                      </p>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      {currentQueueCustomer ? (
                        <span>Next in queue: <strong className="text-emerald-950 font-bold">{currentQueueCustomer.name}</strong> ({formatCurrency(currentQueueCustomer.balanceDue, settings.currency, settings.currencyPosition)})</span>
                      ) : (
                        <span className="font-bold text-emerald-700">All selected customers reminded!</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {currentQueueCustomer ? (
                      <button
                        type="button"
                        onClick={handleAutoDispatchNext}
                        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition-all cursor-pointer hover:scale-102"
                      >
                        <MessageCircle className="h-4 w-4 fill-white" />
                        <span>Send Next via WhatsApp</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSentCustomerIds({})}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Reset Queue</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Filter & Selection Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
                  >
                    {selectedIds.length === pendingCustomers.length ? 'Deselect All' : `Select All (${pendingCustomers.length})`}
                  </button>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {selectedIds.length} of {pendingCustomers.length} selected
                  </span>
                </div>

                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search pending clients..."
                    className="w-full rounded-md border border-slate-200 bg-white pl-8 pr-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Customer List Table / Cards */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {filteredPending.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No pending clients matched your search.
                  </div>
                ) : (
                  filteredPending.map((cust) => {
                    const isSelected = selectedIds.includes(cust.id);
                    const sentInfo = sentCustomerIds[cust.id];
                    const targetPhone = cust.whatsapp || cust.phone || '';
                    const hasContact = Boolean(targetPhone);
                    const formattedPhone = formatWhatsAppNumber(targetPhone);

                    return (
                      <div
                        key={cust.id}
                        className={`p-3 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          sentInfo 
                            ? 'bg-emerald-50/60 border-emerald-200' 
                            : isSelected 
                            ? 'bg-white border-amber-300/80 shadow-2xs' 
                            : 'bg-slate-50/70 border-slate-200 opacity-70'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(cust.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
                          />
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-slate-900 truncate">{cust.name}</p>
                              {sentInfo ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-200">
                                  <Check className="h-3 w-3" /> Reminded ({sentInfo.method})
                                </span>
                              ) : null}
                            </div>
                            
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                              {hasContact ? (
                                <span className="font-mono text-slate-700 flex items-center gap-1">
                                  <Phone className="h-2.5 w-2.5 text-slate-400" />
                                  {targetPhone}
                                  <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 rounded font-sans font-semibold">🇵🇰 +{formattedPhone}</span>
                                </span>
                              ) : (
                                <span className="text-rose-600 font-bold flex items-center gap-0.5">
                                  <AlertCircle className="h-2.5 w-2.5" /> No phone number
                                </span>
                              )}
                              {cust.installedCapacityKw && (
                                <span className="text-amber-700 font-semibold">• {cust.installedCapacityKw} kW</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Financial balance & Actions */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                          <div className="text-right mr-1">
                            <p className="text-xs font-black text-rose-600 font-mono">
                              {formatCurrency(cust.balanceDue, settings.currency, settings.currencyPosition)}
                            </p>
                            <p className="text-[9px] text-slate-400">
                              of {formatCurrency(cust.totalInvoiced, settings.currency, settings.currencyPosition)}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* WhatsApp Send */}
                            <button
                              type="button"
                              onClick={() => handleSendSingleWhatsApp(cust)}
                              disabled={!hasContact}
                              title="Send Reminder on WhatsApp"
                              className={`p-1.5 rounded-md border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                                !hasContact 
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                  : sentInfo 
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                  : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-2xs'
                              }`}
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>

                            {/* Direct SMS */}
                            <button
                              type="button"
                              onClick={() => handleSendSingleSms(cust)}
                              disabled={!hasContact}
                              title="Send Regular SMS Reminder"
                              className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs transition-colors cursor-pointer"
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </button>

                            {/* Copy Message */}
                            <button
                              type="button"
                              onClick={() => handleCopySingle(cust)}
                              title="Copy Message Text"
                              className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 text-xs transition-colors cursor-pointer"
                            >
                              {copiedId === cust.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Bulk Copy action */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCopyAll}
                  disabled={selectedCustomers.length === 0}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {copiedAll ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied {selectedCustomers.length} Messages!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                      <span>Copy All ({selectedCustomers.length}) Messages to Clipboard</span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-slate-500">
                  Total in queue: <strong className="font-mono text-rose-700 font-bold">{formatCurrency(selectedCustomers.reduce((acc, c) => acc + (c.balanceDue || 0), 0), settings.currency, settings.currencyPosition)}</strong>
                </p>
              </div>
            </div>

            {/* Right Column: Template & Message Preview (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
              
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Reminder Style & Template
                </label>
              </div>

              {/* Template Buttons */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTemplateType('FRIENDLY')}
                  className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    templateType === 'FRIENDLY'
                      ? 'bg-amber-400 text-slate-900 border-amber-500 font-bold shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-bold">🌟 Friendly Reminder</p>
                  <p className="text-[10px] opacity-80">Polite account update</p>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateType('URGENT_MILESTONE')}
                  className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    templateType === 'URGENT_MILESTONE'
                      ? 'bg-amber-400 text-slate-900 border-amber-500 font-bold shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-bold">⚡ Milestone Due</p>
                  <p className="text-[10px] opacity-80">Installation progress</p>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateType('FORMAL_STATEMENT')}
                  className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    templateType === 'FORMAL_STATEMENT'
                      ? 'bg-amber-400 text-slate-900 border-amber-500 font-bold shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-bold">📋 Formal Statement</p>
                  <p className="text-[10px] opacity-80">Official ledger balance</p>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateType('URDU_ENG')}
                  className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    templateType === 'URDU_ENG'
                      ? 'bg-amber-400 text-slate-900 border-amber-500 font-bold shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-bold">🇵🇰 Urdu & English</p>
                  <p className="text-[10px] opacity-80">Bilingual reminder</p>
                </button>
              </div>

              {/* Custom Note Addition */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Optional Custom Note / Bank Details to append:
                </label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g. Bank Alfalah A/C: 0123456789 (Title: SolarCrafter)"
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Live Preview Box */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <MessageCircle className="h-3 w-3 text-emerald-600" />
                    Live Message Preview ({previewCustomer.name}):
                  </span>
                  <span className="text-[9px] text-emerald-700 font-semibold bg-emerald-50 px-1 rounded border border-emerald-200">
                    WhatsApp Formatted
                  </span>
                </div>
                
                <div className="flex-1 bg-white p-3 rounded-lg border border-slate-200 text-xs font-sans text-slate-800 whitespace-pre-wrap max-h-[220px] overflow-y-auto leading-relaxed shadow-inner select-text">
                  {previewMessage}
                </div>
              </div>

              <div className="text-[10px] text-slate-500 flex items-start gap-1.5 bg-amber-50/80 p-2 rounded-md border border-amber-200/60">
                <Info className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  All Pakistani phone numbers (e.g. 0300...) are automatically formatted with the <strong>+92</strong> international WhatsApp dial code.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Close
          </button>

          {pendingCustomers.length > 0 && selectedCustomers.length > 0 && currentQueueCustomer && (
            <button
              type="button"
              onClick={handleAutoDispatchNext}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition-all cursor-pointer hover:shadow-md"
            >
              <MessageCircle className="h-4 w-4 fill-white" />
              <span>Send Due Reminder to {currentQueueCustomer.name}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
