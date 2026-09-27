import { Invoice, ShopSettings, Customer } from '../types/solar';
import { formatCurrency, formatDate } from './formatters';

/**
 * Generate a direct customer document portal URL
 */
export const getCustomerPortalUrl = (invoiceId: string): string => {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.searchParams.set('doc', invoiceId);
  return url.toString();
};

/**
 * Clean and format any phone number into full international WhatsApp digits.
 * Automatically handles Pakistan (+92) local phone numbers:
 * - 03001234567 -> 923001234567
 * - 3001234567 -> 923001234567
 * - 04235889900 -> 924235889900
 * - +923001234567 -> 923001234567
 */
export const formatWhatsAppNumber = (phone?: string | null): string => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^0-9+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // If local Pakistani mobile starting with 03 (11 digits: e.g. 03001234567 -> 923001234567)
  if (cleaned.startsWith('03') && cleaned.length === 11) {
    return '92' + cleaned.substring(1);
  }

  // If local Pakistani mobile starting with 3 (10 digits: e.g. 3001234567 -> 923001234567)
  if (cleaned.startsWith('3') && cleaned.length === 10) {
    return '92' + cleaned;
  }

  // If local Pakistani landline or other area code starting with 0 (e.g. 04235889900, 051..., 021...)
  if (cleaned.startsWith('0') && (cleaned.length === 10 || cleaned.length === 11)) {
    return '92' + cleaned.substring(1);
  }

  // If already starts with 92 (Pakistan)
  if (cleaned.startsWith('92') && (cleaned.length === 12 || cleaned.length === 11)) {
    return cleaned;
  }

  // If 10 digits without leading 0, assume Pakistan (+92)
  if (cleaned.length === 10) {
    return '92' + cleaned;
  }

  // If 11 digits starting with 0, strip leading 0 and prepend 92
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return '92' + cleaned.substring(1);
  }

  return cleaned;
};

/**
 * Clean phone number for WhatsApp / SMS
 */
export const sanitizePhoneNumber = (phone?: string | null): string => {
  return formatWhatsAppNumber(phone);
};

/**
 * Build rich WhatsApp formatted text for customer
 */
export const buildWhatsAppMessage = (invoice: Invoice, settings: ShopSettings): string => {
  const isQuote = invoice.type === 'QUOTATION' || invoice.type === 'PROFORMA';
  const docTitle = isQuote ? 'Quotation / Estimate' : 'Invoice / Bill';
  const currency = settings.currency;
  const pos = settings.currencyPosition;

  const docUrl = getCustomerPortalUrl(invoice.id);

  let message = `☀️ *${settings.shopName}*\n`;
  if (settings.tagline) {
    message += `_${settings.tagline}_\n`;
  }
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  message += `Dear *${invoice.customerName}*,\n\n`;
  message += `Please find the details of your *${docTitle}* below:\n\n`;

  message += `📄 *Document #:* ${invoice.invoiceNumber}\n`;
  message += `📅 *Date:* ${formatDate(invoice.date)}\n`;
  message += `⏳ *Due Date:* ${formatDate(invoice.dueDate)}\n`;

  if (invoice.projectSystemCapacityKw) {
    const sysType = invoice.systemType ? invoice.systemType.replace(/_/g, ' ') : 'Solar PV';
    message += `⚡ *Solar System:* ${invoice.projectSystemCapacityKw} kW (${sysType})\n`;
  }

  if (invoice.installationAddress) {
    message += `📍 *Site Address:* ${invoice.installationAddress}\n`;
  }

  message += `\n📋 *ITEMS & HARDWARE SUPPLIED:*\n`;
  invoice.items.slice(0, 6).forEach((item, index) => {
    message += `${index + 1}. *${item.description}* (${item.quantity} ${item.unit || 'Pcs'}) - ${formatCurrency(item.total, currency, pos)}\n`;
  });

  if (invoice.items.length > 6) {
    message += `_...and ${invoice.items.length - 6} additional items._\n`;
  }

  if (invoice.hasTradeIn && (invoice.tradeInTotal || 0) > 0 && invoice.tradeInItems && invoice.tradeInItems.length > 0) {
    message += `\n🔄 *OLD EQUIPMENT EXCHANGE / BUYBACK CREDIT:*\n`;
    invoice.tradeInItems.forEach((t, i) => {
      const conditionStr = t.condition ? ` [${t.condition}]` : '';
      message += `${i + 1}. *${t.description}*${conditionStr} (${t.quantity || 1}x): -${formatCurrency((t.valuationPrice || 0) * (t.quantity || 1), currency, pos)}\n`;
    });
    message += `• *Total Exchange Credit:* -${formatCurrency(invoice.tradeInTotal || 0, currency, pos)}\n`;
  }

  message += `\n💵 *FINANCIAL SUMMARY:*\n`;
  message += `• *New Equipment Subtotal:* ${formatCurrency(invoice.subtotal, currency, pos)}\n`;
  if (invoice.discountTotal > 0) {
    message += `• *Discount:* -${formatCurrency(invoice.discountTotal, currency, pos)}\n`;
  }
  if (invoice.hasTradeIn && (invoice.tradeInTotal || 0) > 0) {
    message += `• *Old Equipment Buyback Credit:* -${formatCurrency(invoice.tradeInTotal || 0, currency, pos)}\n`;
  }
  if (invoice.taxAmount > 0) {
    message += `• *Sales Tax (${invoice.taxPercent}%):* ${formatCurrency(invoice.taxAmount, currency, pos)}\n`;
  }
  if (invoice.installationCharge > 0) {
    message += `• *Installation & Services:* ${formatCurrency(invoice.installationCharge, currency, pos)}\n`;
  }
  message += `• *Grand Total:* *${formatCurrency(invoice.grandTotal, currency, pos)}*\n`;
  message += `• *Amount Paid:* ${formatCurrency(invoice.paidAmount, currency, pos)}\n`;
  
  if (invoice.balanceDue > 0) {
    message += `• *Balance Due:* *${formatCurrency(invoice.balanceDue, currency, pos)}*\n`;
  } else {
    message += `• *Status:* ✅ *PAID IN FULL*\n`;
  }

  // Bank transfer info if balance is due
  if (invoice.balanceDue > 0 && settings.bankAccountNumber) {
    message += `\n🏦 *BANK PAYMENT DETAILS:*\n`;
    message += `• *Bank Name:* ${settings.bankName}\n`;
    message += `• *Account Title:* ${settings.bankAccountTitle}\n`;
    message += `• *Account #:* ${settings.bankAccountNumber}\n`;
    if (settings.ibanOrSwift) {
      message += `• *IBAN / SWIFT:* ${settings.ibanOrSwift}\n`;
    }
  }

  // Warranty note
  if (invoice.warrantyNotes || settings.warrantyDisclaimer) {
    message += `\n🛡️ *WARRANTY:* ${invoice.warrantyNotes || settings.warrantyDisclaimer}\n`;
  }

  // Online link
  if (docUrl) {
    message += `\n🔗 *View & Download Full PDF Document:*\n${docUrl}\n`;
  }

  message += `\nFor any queries or assistance, please reach out to us at *${settings.phone}* or *${settings.email}*.\n\n`;
  message += `Thank you for choosing *${settings.shopName}*! ☀️`;

  return message;
};

/**
 * Build Email Subject
 */
export const buildEmailSubject = (invoice: Invoice, settings: ShopSettings): string => {
  const isQuote = invoice.type === 'QUOTATION' || invoice.type === 'PROFORMA';
  const typeLabel = isQuote ? 'Quotation' : 'Invoice';
  const capacity = invoice.projectSystemCapacityKw ? ` (${invoice.projectSystemCapacityKw}kW)` : '';
  return `${typeLabel} ${invoice.invoiceNumber}${capacity} - ${settings.shopName}`;
};

/**
 * Build Plain Text Email Body
 */
export const buildEmailBody = (invoice: Invoice, settings: ShopSettings): string => {
  const isQuote = invoice.type === 'QUOTATION' || invoice.type === 'PROFORMA';
  const docTitle = isQuote ? 'Quotation & Estimate' : 'Invoice';
  const currency = settings.currency;
  const pos = settings.currencyPosition;
  const docUrl = getCustomerPortalUrl(invoice.id);

  let body = `Dear ${invoice.customerName},\n\n`;
  body += `Thank you for choosing ${settings.shopName}. Please find the details for your ${docTitle} (${invoice.invoiceNumber}) below.\n\n`;
  
  body += `DOCUMENT DETAILS:\n`;
  body += `--------------------------------------------------\n`;
  body += `Document Number: ${invoice.invoiceNumber}\n`;
  body += `Document Date:   ${formatDate(invoice.date)}\n`;
  body += `Payment Due:     ${formatDate(invoice.dueDate)}\n`;
  if (invoice.projectSystemCapacityKw) {
    body += `System Capacity: ${invoice.projectSystemCapacityKw} kW (${invoice.systemType ? invoice.systemType.replace(/_/g, ' ') : 'Solar PV'})\n`;
  }
  if (invoice.installationAddress) {
    body += `Installation Site: ${invoice.installationAddress}\n`;
  }
  body += `\n`;

  body += `FINANCIAL BREAKDOWN:\n`;
  body += `--------------------------------------------------\n`;
  body += `New Hardware Subtotal: ${formatCurrency(invoice.subtotal, currency, pos)}\n`;
  if (invoice.discountTotal > 0) {
    body += `Discount:             -${formatCurrency(invoice.discountTotal, currency, pos)}\n`;
  }
  if (invoice.hasTradeIn && (invoice.tradeInTotal || 0) > 0) {
    body += `Old Equipment Credit: -${formatCurrency(invoice.tradeInTotal || 0, currency, pos)}\n`;
  }
  if (invoice.taxAmount > 0) {
    body += `Tax (${invoice.taxPercent}%):           ${formatCurrency(invoice.taxAmount, currency, pos)}\n`;
  }
  if (invoice.installationCharge > 0) {
    body += `Installation Charge:   ${formatCurrency(invoice.installationCharge, currency, pos)}\n`;
  }
  body += `Grand Total:           ${formatCurrency(invoice.grandTotal, currency, pos)}\n`;
  body += `Amount Paid:           ${formatCurrency(invoice.paidAmount, currency, pos)}\n`;
  body += `Balance Due:           ${formatCurrency(invoice.balanceDue, currency, pos)}\n\n`;

  if (invoice.balanceDue > 0 && settings.bankAccountNumber) {
    body += `BANK PAYMENT DETAILS FOR DIRECT TRANSFER:\n`;
    body += `--------------------------------------------------\n`;
    body += `Bank:           ${settings.bankName}\n`;
    body += `Account Title:  ${settings.bankAccountTitle}\n`;
    body += `Account Number: ${settings.bankAccountNumber}\n`;
    if (settings.ibanOrSwift) {
      body += `IBAN / SWIFT:   ${settings.ibanOrSwift}\n`;
    }
    body += `\n`;
  }

  if (invoice.termsAndConditions || settings.termsAndConditions) {
    body += `TERMS & CONDITIONS:\n`;
    body += `--------------------------------------------------\n`;
    body += `${invoice.termsAndConditions || settings.termsAndConditions}\n\n`;
  }

  if (docUrl) {
    body += `ONLINE DOCUMENT & PDF ACCESS:\n`;
    body += `--------------------------------------------------\n`;
    body += `You can review and print your official document directly at:\n`;
    body += `${docUrl}\n\n`;
  }

  body += `Warm regards,\n\n`;
  body += `${settings.ownerName || settings.shopName}\n`;
  body += `${settings.shopName}\n`;
  body += `Phone: ${settings.phone}\n`;
  body += `Email: ${settings.email}\n`;
  if (settings.address) {
    body += `Address: ${settings.address}, ${settings.city}\n`;
  }

  return body;
};

/**
 * Build Concise SMS Message
 */
export const buildSmsMessage = (invoice: Invoice, settings: ShopSettings): string => {
  const isQuote = invoice.type === 'QUOTATION';
  const label = isQuote ? 'Quotation' : 'Invoice';
  const currency = settings.currency;
  const pos = settings.currencyPosition;
  const docUrl = getCustomerPortalUrl(invoice.id);

  let sms = `Hello ${invoice.customerName}, your ${settings.shopName} ${label} #${invoice.invoiceNumber} is ready. Total: ${formatCurrency(invoice.grandTotal, currency, pos)}`;
  if (invoice.balanceDue > 0) {
    sms += `, Due: ${formatCurrency(invoice.balanceDue, currency, pos)}`;
  }
  if (docUrl) {
    sms += `. View online: ${docUrl}`;
  }
  sms += `. Call: ${settings.phone}`;
  return sms;
};

/**
 * Open external URL safely inside iframe environments
 */
export const openExternalLink = (url: string) => {
  try {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    window.open(url, '_blank');
  }
};

/**
 * Open WhatsApp with prefilled message
 */
export const openWhatsApp = (phone: string, text: string) => {
  const cleanPhone = sanitizePhoneNumber(phone);
  const encodedText = encodeURIComponent(text);
  const url = cleanPhone 
    ? `https://api.whatsapp.com/send?phone=${cleanPhone.replace('+', '')}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;
  openExternalLink(url);
};

/**
 * Open default mail client (mailto:)
 */
export const openMailto = (email: string, subject: string, body: string) => {
  const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  try {
    const a = document.createElement('a');
    a.href = mailtoUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    window.location.href = mailtoUrl;
  }
};

/**
 * Open Gmail web client
 */
export const openGmailWeb = (email: string, subject: string, body: string) => {
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  openExternalLink(gmailUrl);
};

/**
 * Open Outlook web client
 */
export const openOutlookWeb = (email: string, subject: string, body: string) => {
  const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(email)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  openExternalLink(outlookUrl);
};

/**
 * Open SMS handler
 */
export const openSms = (phone: string, body: string) => {
  const cleanPhone = sanitizePhoneNumber(phone);
  const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(body)}`;
  try {
    const a = document.createElement('a');
    a.href = smsUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    window.location.href = smsUrl;
  }
};

export type CustomerReminderTemplateType = 'FRIENDLY' | 'URGENT_MILESTONE' | 'FORMAL_STATEMENT' | 'URDU_ENG';

/**
 * Generate formatted balance reminder messages for a customer with pending balance
 */
export const buildCustomerBalanceReminderMessage = (
  customer: Customer,
  settings: ShopSettings,
  templateType: CustomerReminderTemplateType = 'FRIENDLY',
  customNote?: string
): string => {
  const shop = settings.shopName || 'SolarCrafter Systems';
  const currency = settings.currency;
  const pos = settings.currencyPosition;
  const balanceStr = formatCurrency(customer.balanceDue || 0, currency, pos);
  const totalBilledStr = formatCurrency(customer.totalInvoiced || 0, currency, pos);
  const totalPaidStr = formatCurrency(customer.totalPaid || 0, currency, pos);

  if (templateType === 'URGENT_MILESTONE') {
    let msg = `⚡ *${shop}* - Payment Milestone Notice\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `Respected *${customer.name}*,\n\n`;
    msg += `This is an update regarding the ongoing solar project work.\n\n`;
    if (customer.installedCapacityKw) {
      msg += `☀️ *Solar System:* ${customer.installedCapacityKw} kW (${customer.systemType || 'On-Grid'})\n`;
    }
    msg += `📊 *Account Summary:*\n`;
    msg += `• Total Project Cost: ${totalBilledStr}\n`;
    msg += `• Amount Received: ${totalPaidStr}\n`;
    msg += `• 🔴 *Pending Milestone Balance: ${balanceStr}*\n\n`;
    if (customNote) {
      msg += `📝 *Note:* ${customNote}\n\n`;
    }
    msg += `Kindly arrange the milestone clearance to ensure uninterrupted equipment commissioning and net-metering dispatch.\n\n`;
    msg += `Thank you for your cooperation! ☀️\n`;
    msg += `📞 *Accounts & Support:* ${settings.phone}`;
    return msg;
  }

  if (templateType === 'FORMAL_STATEMENT') {
    let msg = `🏛️ *${shop}* - Outstanding Account Statement\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `Attention: *${customer.name}*\n`;
    if (customer.consumerNumber) {
      msg += `Reference ID: ${customer.consumerNumber}\n`;
    }
    if (customer.address || customer.city) {
      msg += `Site: ${[customer.address, customer.city].filter(Boolean).join(', ')}\n`;
    }
    msg += `\nThis message serves as a formal reminder of the outstanding balance on your solar client ledger:\n\n`;
    msg += `• Total Billed to Date: ${totalBilledStr}\n`;
    msg += `• Total Payments Cleared: ${totalPaidStr}\n`;
    msg += `• 🔴 *Current Balance Due: ${balanceStr}*\n\n`;
    if (customNote) {
      msg += `Additional Remarks: ${customNote}\n\n`;
    }
    msg += `Please submit the payment via bank transfer or visit our office. If already paid, please share the transaction slip.\n\n`;
    msg += `Best Regards,\n`;
    msg += `*${settings.ownerName || settings.shopName}*\n`;
    msg += `📞 ${settings.phone} | ✉️ ${settings.email}`;
    return msg;
  }

  if (templateType === 'URDU_ENG') {
    let msg = `☀️ *${shop}* (سولر سسٹمز)\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `السلام علیکم محترم *${customer.name}* صاحب!\n\n`;
    msg += `امید ہے آپ خیریت سے ہوں گے۔ یہ میسج آپ کے سولر پراجیکٹ کے بقیہ بیلنس (Pending Dues) کی یاددہانی کے لیے بھیجا جا رہا ہے۔\n\n`;
    msg += `📊 *کھاتے کی تفصیل (Account Summary):*\n`;
    msg += `• کُل رقم (Total Bill): ${totalBilledStr}\n`;
    msg += `• موصول شدہ رقم (Total Paid): ${totalPaidStr}\n`;
    msg += `• 🔴 *بقایا واجب الادا رقم (Balance Due): ${balanceStr}*\n\n`;
    if (customNote) {
      msg += `ضروری نوٹ: ${customNote}\n\n`;
    }
    msg += `براہِ کرم بقایا رقم کی ادائیگی جلد از جلد ممکن بنائیں۔ اگر آپ ادائیگی کر چکے ہیں تو برائے مہربانی رسید شیئر فرمائیں۔\n\n`;
    msg += `شکریہ!\n`;
    msg += `*${shop}*\n`;
    msg += `📞 رابطہ نمبر: ${settings.phone}`;
    return msg;
  }

  // Default: FRIENDLY
  let msg = `Hello *${customer.name}*! Hope you are having a wonderful day. 😊\n\n`;
  msg += `This is a friendly update regarding your solar account with *${shop}*.\n\n`;
  if (customer.installedCapacityKw) {
    msg += `☀️ *Solar Installation:* ${customer.installedCapacityKw} kW\n`;
  }
  msg += `📊 *Account Summary:*\n`;
  msg += `• Total Billed: ${totalBilledStr}\n`;
  msg += `• Total Received: ${totalPaidStr}\n`;
  msg += `• 🔴 *Pending Balance: ${balanceStr}*\n\n`;
  if (customNote) {
    msg += `📝 *Note:* ${customNote}\n\n`;
  }
  msg += `Please let us know if you have any questions or need any assistance. Thank you for choosing *${shop}*! ☀️\n\n`;
  msg += `📞 *Contact:* ${settings.phone}`;
  return msg;
};

