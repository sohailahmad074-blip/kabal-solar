import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  ExternalLink, 
  Globe, 
  Sun,
  ShieldCheck,
  Building2,
  FileText
} from 'lucide-react';
import { Invoice, ShopSettings, PaymentRequestMessageType } from '../../types/solar';
import { 
  buildWhatsAppMessage, 
  buildPaymentRequestMessage,
  buildEmailSubject, 
  buildEmailBody, 
  buildSmsMessage,
  openWhatsApp,
  openMailto,
  openGmailWeb,
  openOutlookWeb,
  openSms
} from '../../utils/sendDirect';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface SendDirectModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  settings: ShopSettings;
}

type SendTab = 'WHATSAPP' | 'EMAIL' | 'SMS';

export const SendDirectModal: React.FC<SendDirectModalProps> = ({
  isOpen,
  onClose,
  invoice,
  settings,
}) => {
  const [activeTab, setActiveTab] = useState<SendTab>('WHATSAPP');
  
  // Custom editable states
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [customWhatsAppText, setCustomWhatsAppText] = useState('');
  const [customEmailBody, setCustomEmailBody] = useState('');
  const [customSmsText, setCustomSmsText] = useState('');
  
  // Copy feedback states
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [waTemplate, setWaTemplate] = useState<string>('SUMMARY');

  const handleSelectWaTemplate = (type: string) => {
    if (!invoice) return;
    setWaTemplate(type);
    if (type === 'SUMMARY') {
      setCustomWhatsAppText(buildWhatsAppMessage(invoice, settings));
    } else {
      setCustomWhatsAppText(buildPaymentRequestMessage(invoice, settings, type as PaymentRequestMessageType));
    }
  };

  useEffect(() => {
    if (invoice && isOpen) {
      setPhone(invoice.customerPhone || '');
      setEmail(invoice.customerEmail || '');
      setSubject(buildEmailSubject(invoice, settings));
      setWaTemplate('SUMMARY');
      setCustomWhatsAppText(buildWhatsAppMessage(invoice, settings));
      setCustomEmailBody(buildEmailBody(invoice, settings));
      setCustomSmsText(buildSmsMessage(invoice, settings));
      setCopiedType(null);
    }
  }, [invoice, isOpen, settings]);

  if (!isOpen || !invoice) return null;

  const isQuote = invoice.type === 'QUOTATION' || invoice.type === 'PROFORMA';
  const docLabel = isQuote ? 'Quotation' : 'Invoice';

  const handleCopy = (text: string, typeKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(typeKey);
    setTimeout(() => {
      setCopiedType(null);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-400 text-slate-900 shadow-xs">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Send {docLabel} Directly to Customer
                </h3>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 font-mono">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span>🔒 Private Dispatch via WhatsApp, Email & SMS</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-semibold">
                  Zero software/portal links shared
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Customer & Document Summary Banner */}
        <div className="bg-slate-100/70 px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">{invoice.customerName}</span>
            {invoice.customerPhone && (
              <span className="text-slate-500 text-[11px]">📞 {invoice.customerPhone}</span>
            )}
            {invoice.customerEmail && (
              <span className="text-slate-500 text-[11px]">✉️ {invoice.customerEmail}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {invoice.projectSystemCapacityKw && (
              <span className="flex items-center gap-1 font-bold text-amber-700 text-[11px]">
                <Sun className="h-3 w-3" />
                {invoice.projectSystemCapacityKw} kW System
              </span>
            )}
            <span className="font-bold text-slate-900">
              Total: {formatCurrency(invoice.grandTotal, settings.currency, settings.currencyPosition)}
            </span>
            {invoice.balanceDue > 0 ? (
              <span className="font-bold text-rose-600 text-[11px]">
                Due: {formatCurrency(invoice.balanceDue, settings.currency, settings.currencyPosition)}
              </span>
            ) : (
              <span className="font-bold text-emerald-700 text-[11px]">
                Paid in Full
              </span>
            )}
          </div>
        </div>

        {/* Channel Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-4 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('WHATSAPP')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'WHATSAPP'
                ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50 rounded-t'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
            <span>WhatsApp Direct</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EMAIL')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'EMAIL'
                ? 'border-blue-500 text-blue-700 bg-blue-50/50 rounded-t'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="h-3.5 w-3.5 text-blue-600" />
            <span>Email</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SMS')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'SMS'
                ? 'border-amber-500 text-amber-700 bg-amber-50/50 rounded-t'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5 text-amber-600" />
            <span>SMS / Text</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto text-xs">
          {/* WHATSAPP TAB */}
          {activeTab === 'WHATSAPP' && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center justify-between">
                  <span>Customer WhatsApp Number</span>
                  <span className="text-emerald-700 font-semibold text-[10px] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    🇵🇰 PK 03xx Auto (+92)
                  </span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0300 1234567 (No country code needed)"
                  className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Message Type & Template:
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopy(customWhatsAppText, 'wa')}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer self-start sm:self-auto"
                  >
                    {copiedType === 'wa' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Message Text</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Template Selector Pills */}
                <div className="flex flex-wrap gap-1 mb-2">
                  <button
                    type="button"
                    onClick={() => handleSelectWaTemplate('SUMMARY')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      waTemplate === 'SUMMARY'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    📋 Invoice Breakdown
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectWaTemplate('FRIENDLY')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      waTemplate === 'FRIENDLY'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    🌿 Friendly Reminder
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectWaTemplate('COMMERCIAL')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      waTemplate === 'COMMERCIAL'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    💼 Commercial & Bank
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectWaTemplate('SOLAR_MILESTONE')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      waTemplate === 'SOLAR_MILESTONE'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    ⚡ Solar Milestone
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectWaTemplate('URDU_ENG')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      waTemplate === 'URDU_ENG'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    🇵🇰 Urdu یاددہانی
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectWaTemplate('URGENT')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      waTemplate === 'URGENT'
                        ? 'bg-rose-700 text-white shadow-xs'
                        : 'bg-white text-rose-800 border border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    🚨 Urgent Overdue
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectWaTemplate('SHORT_SMS')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      waTemplate === 'SHORT_SMS'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    📱 Short Text
                  </button>
                </div>

                <textarea
                  rows={9}
                  value={customWhatsAppText}
                  onChange={(e) => setCustomWhatsAppText(e.target.value)}
                  className="w-full rounded border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 font-mono leading-relaxed focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <p className="text-[11px] text-slate-500">
                  {phone ? `Ready to send to ${phone}` : 'Enter recipient number with country code (e.g. +1... or +92...)'}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(customWhatsAppText, 'wa')}
                    className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Text</span>
                  </button>

                  {/* Fallback Direct Link in case popup blocked */}
                  <button
                    type="button"
                    onClick={() => {
                      const clean = (phone || '').replace(/[^0-9+]/g, '').replace('+', '');
                      const webUrl = clean 
                        ? `https://web.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(customWhatsAppText)}`
                        : `https://web.whatsapp.com/send?text=${encodeURIComponent(customWhatsAppText)}`;
                      window.open(webUrl, '_blank');
                    }}
                    className="flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                    title="Open directly in WhatsApp Web"
                  >
                    <ExternalLink className="h-3 w-3 text-emerald-600" />
                    <span>WhatsApp Web</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openWhatsApp(phone, customWhatsAppText)}
                    className="flex items-center gap-1.5 rounded bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Send via WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EMAIL TAB */}
          {activeTab === 'EMAIL' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Recipient Customer Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none font-semibold"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Email Message Content
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopy(customEmailBody, 'email')}
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800"
                  >
                    {copiedType === 'email' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Email Body</span>
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  rows={8}
                  value={customEmailBody}
                  onChange={(e) => setCustomEmailBody(e.target.value)}
                  className="w-full rounded border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 font-mono leading-relaxed focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Email Send Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openGmailWeb(email, subject, customEmailBody)}
                    className="flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                  >
                    <ExternalLink className="h-3 w-3 text-rose-500" />
                    <span>Open in Gmail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openOutlookWeb(email, subject, customEmailBody)}
                    className="flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                  >
                    <ExternalLink className="h-3 w-3 text-blue-600" />
                    <span>Open in Outlook</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(customEmailBody, 'email')}
                    className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Content</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openMailto(email, subject, customEmailBody)}
                    className="flex items-center gap-1.5 rounded bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Send via Mail App</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SMS TAB */}
          {activeTab === 'SMS' && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Customer Phone Number
                  </label>
                  <span className="text-amber-700 font-semibold text-[10px] bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                    🇵🇰 PK 03xx Auto (+92)
                  </span>
                </div>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0300 1234567"
                  className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Concise SMS Text ({customSmsText.length} characters)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopy(customSmsText, 'sms')}
                    className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800"
                  >
                    {copiedType === 'sms' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy SMS</span>
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={customSmsText}
                  onChange={(e) => setCustomSmsText(e.target.value)}
                  className="w-full rounded border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* SMS Actions */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-slate-500">
                  Launches native SMS messenger app on your device.
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(customSmsText, 'sms')}
                    className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Text</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openSms(phone, customSmsText)}
                    className="flex items-center gap-1.5 rounded bg-amber-500 px-4 py-1.5 text-xs font-bold text-slate-900 shadow-xs hover:bg-amber-600 transition-colors cursor-pointer"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>Send SMS</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5 rounded-b-lg">
          <span className="text-[11px] text-slate-500">
            Powered by {settings.shopName} CRM
          </span>

          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
