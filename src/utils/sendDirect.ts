import { 
  Invoice, 
  ShopSettings, 
  Customer, 
  PaymentRequestMessageType, 
  PaymentReceiptMessageType 
} from '../types/solar';
import { formatCurrency, formatDate } from './formatters';

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
    if (invoice.specialDiscount && invoice.specialDiscount > 0) {
      const typeStr = invoice.specialDiscountType === 'PERCENT' ? `${invoice.specialDiscount}%` : '';
      const reasonStr = invoice.specialDiscountReason ? ` (${invoice.specialDiscountReason})` : '';
      message += `• *Special Discount${typeStr ? ` [${typeStr}]` : ''}${reasonStr}:* -${formatCurrency(invoice.discountTotal, currency, pos)}\n`;
    } else {
      message += `• *Discount:* -${formatCurrency(invoice.discountTotal, currency, pos)}\n`;
    }
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

  let sms = `Hello ${invoice.customerName}, your ${settings.shopName} ${label} #${invoice.invoiceNumber} is ready. Total: ${formatCurrency(invoice.grandTotal, currency, pos)}`;
  if (invoice.balanceDue > 0) {
    sms += `, Due: ${formatCurrency(invoice.balanceDue, currency, pos)}`;
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

/**
 * Build tailored payment request message for an invoice with multiple selectable message types
 */
export const buildPaymentRequestMessage = (
  invoice: Invoice,
  settings: ShopSettings,
  messageType: PaymentRequestMessageType = 'FRIENDLY',
  customNote?: string
): string => {
  const shop = settings.shopName || 'SolarCraft ERP';
  const currency = settings.currency;
  const pos = settings.currencyPosition;
  const balanceStr = formatCurrency(invoice.balanceDue, currency, pos);
  const totalStr = formatCurrency(invoice.grandTotal, currency, pos);
  const paidStr = formatCurrency(invoice.paidAmount, currency, pos);

  if (messageType === 'URGENT') {
    let msg = `🚨 *URGENT PAYMENT NOTICE - ${shop}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `Attention: *${invoice.customerName}*\n\n`;
    msg += `This is an urgent reminder regarding overdue payment for *Invoice #${invoice.invoiceNumber}*.\n\n`;
    msg += `• *Invoice Total:* ${totalStr}\n`;
    msg += `• *Paid So Far:* ${paidStr}\n`;
    msg += `• 🔴 *OVERDUE BALANCE DUE: ${balanceStr}*\n`;
    msg += `• *Due Date:* ${formatDate(invoice.dueDate)}\n\n`;
    if (customNote) {
      msg += `⚠️ *Urgent Remarks:* ${customNote}\n\n`;
    }
    msg += `Please arrange immediate settlement today to avoid any delays in equipment dispatch or warranty validation.\n\n`;
    if (settings.bankAccountNumber) {
      msg += `🏦 *Direct Bank Transfer Details:*\n`;
      msg += `• Bank: *${settings.bankName}*\n`;
      msg += `• Title: *${settings.bankAccountTitle}*\n`;
      msg += `• Account #: *${settings.bankAccountNumber}*\n`;
      if (settings.ibanOrSwift) msg += `• IBAN: *${settings.ibanOrSwift}*\n`;
      msg += `\n`;
    }
    msg += `Please share the bank transfer receipt once transferred. Thank you.\n📞 *Support:* ${settings.phone}`;
    return msg;
  }

  if (messageType === 'COMMERCIAL') {
    let msg = `💼 *COMMERCIAL PAYMENT REQUEST*\n`;
    msg += `*${shop}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `Dear *${invoice.customerName}*,\n\n`;
    msg += `Please find the payment request for your solar hardware invoice below:\n\n`;
    msg += `📄 *Invoice Number:* ${invoice.invoiceNumber}\n`;
    msg += `📅 *Date of Issue:* ${formatDate(invoice.date)}\n`;
    msg += `⏳ *Payment Due:* ${formatDate(invoice.dueDate)}\n`;
    if (invoice.projectSystemCapacityKw) {
      msg += `⚡ *Capacity:* ${invoice.projectSystemCapacityKw} kW\n`;
    }
    msg += `\n📊 *FINANCIAL STATEMENT:*\n`;
    msg += `• Invoice Grand Total: ${totalStr}\n`;
    msg += `• Total Paid / Cleared: ${paidStr}\n`;
    msg += `• 💳 *PAYABLE BALANCE: ${balanceStr}*\n\n`;
    if (customNote) {
      msg += `📝 *Notes:* ${customNote}\n\n`;
    }
    if (settings.bankAccountNumber) {
      msg += `🏦 *OFFICIAL BANK REMITTANCE:*\n`;
      msg += `• *Bank:* ${settings.bankName}\n`;
      msg += `• *Account Title:* ${settings.bankAccountTitle}\n`;
      msg += `• *Account #:* ${settings.bankAccountNumber}\n`;
      if (settings.ibanOrSwift) msg += `• *IBAN:* ${settings.ibanOrSwift}\n`;
      msg += `\n`;
    }
    msg += `Regards,\n*${settings.ownerName || settings.shopName}*\n📞 ${settings.phone}`;
    return msg;
  }

  if (messageType === 'SOLAR_MILESTONE') {
    let msg = `⚡ *SOLAR PROJECT MILESTONE PAYMENT CALL*\n`;
    msg += `*${shop}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `Dear *${invoice.customerName}*,\n\n`;
    msg += `Great news! The equipment allocation and procurement for your *${invoice.projectSystemCapacityKw ? `${invoice.projectSystemCapacityKw} kW ` : ''}solar system* is ready.\n\n`;
    msg += `To schedule the installation engineering team and dispatch materials to your site, please release the milestone payment below:\n\n`;
    msg += `📄 *Invoice Ref:* ${invoice.invoiceNumber}\n`;
    msg += `• Total Project Cost: ${totalStr}\n`;
    msg += `• Advance Already Received: ${paidStr}\n`;
    msg += `• ⚡ *Milestone Balance Due: ${balanceStr}*\n\n`;
    if (customNote) {
      msg += `🔧 *Milestone Details:* ${customNote}\n\n`;
    }
    if (settings.bankAccountNumber) {
      msg += `🏦 *Bank Transfer Details:*\n`;
      msg += `• Bank: *${settings.bankName}*\n`;
      msg += `• Account Title: *${settings.bankAccountTitle}*\n`;
      msg += `• Account #: *${settings.bankAccountNumber}*\n`;
      if (settings.ibanOrSwift) msg += `• IBAN: *${settings.ibanOrSwift}*\n`;
      msg += `\n`;
    }
    msg += `Thank you for partnering with *${shop}* towards clean solar energy! ☀️\n📞 *Call/WhatsApp:* ${settings.phone}`;
    return msg;
  }

  if (messageType === 'URDU_ENG') {
    let msg = `☀️ *${shop}* (سولر سسٹمز)\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `السلام علیکم محترم *${invoice.customerName}* صاحب!\n\n`;
    msg += `امید ہے آپ خیریت سے ہوں گے۔ یہ میسج آپ کے سولر انوائس *#${invoice.invoiceNumber}* کے بقایا جات کی ادائیگی کی یاددہانی کے لیے بھیجا جا رہا ہے۔\n\n`;
    msg += `📊 *انوائس تفصیلات (Bill Details):*\n`;
    msg += `• کُل انوائس رقم (Total Bill): ${totalStr}\n`;
    msg += `• موصول شدہ رقم (Paid): ${paidStr}\n`;
    msg += `• 🔴 *بقایا واجب الادا رقم (Balance Due): ${balanceStr}*\n`;
    msg += `• آخری تاریخ (Due Date): ${formatDate(invoice.dueDate)}\n\n`;
    if (customNote) {
      msg += `📝 *ضروری نوٹ:* ${customNote}\n\n`;
    }
    if (settings.bankAccountNumber) {
      msg += `🏦 *بینک اکاؤنٹ تفصیلات برائے ادائیگی:*\n`;
      msg += `• بینک: *${settings.bankName}*\n`;
      msg += `• اکاؤنٹ نام: *${settings.bankAccountTitle}*\n`;
      msg += `• اکاؤنٹ نمبر: *${settings.bankAccountNumber}*\n`;
      if (settings.ibanOrSwift) msg += `• IBAN: *${settings.ibanOrSwift}*\n`;
      msg += `\n`;
    }
    msg += `براہِ کرم ادائیگی کے بعد ٹرانزیکشن رسید شیئر فرمائیں تاکہ کھاتہ کلیئر کیا جا سکے۔ شکریہ! ☀️\n`;
    msg += `📞 *رابطہ نمبر:* ${settings.phone}`;
    return msg;
  }

  if (messageType === 'SHORT_SMS') {
    let msg = `${shop}: Payment reminder for Inv #${invoice.invoiceNumber} (${invoice.customerName}). Total: ${totalStr}, Paid: ${paidStr}, Balance Due: ${balanceStr}. Due: ${formatDate(invoice.dueDate)}.`;
    if (settings.bankAccountNumber) {
      msg += ` Pay: ${settings.bankName} A/C ${settings.bankAccountNumber}.`;
    }
    msg += ` Ph: ${settings.phone}`;
    return msg;
  }

  // Default: FRIENDLY
  let msg = `☀️ *${shop}* - Friendly Payment Reminder\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `Hello *${invoice.customerName}*! Hope you are having a great day. 😊\n\n`;
  msg += `This is a courteous reminder regarding your solar invoice *#${invoice.invoiceNumber}*.\n\n`;
  msg += `• *Invoice Total:* ${totalStr}\n`;
  msg += `• *Paid So Far:* ${paidStr}\n`;
  msg += `• 📌 *Remaining Due: ${balanceStr}*\n`;
  msg += `• *Due Date:* ${formatDate(invoice.dueDate)}\n\n`;
  if (customNote) {
    msg += `📝 *Note:* ${customNote}\n\n`;
  }
  if (settings.bankAccountNumber) {
    msg += `🏦 *Payment Details:*\n`;
    msg += `• ${settings.bankName} - Account #: ${settings.bankAccountNumber} (${settings.bankAccountTitle})\n\n`;
  }
  msg += `Please let us know once transferred so we can record your receipt. Thank you! ☀️\n📞 ${settings.phone}`;
  return msg;
};

/**
 * Build tailored payment received acknowledgment receipt with multiple selectable message types
 */
export const buildPaymentReceivedReceiptMessage = (
  invoice: Invoice,
  payment: {
    amount: number;
    discount?: number;
    method: string;
    referenceNo?: string;
    notes?: string;
  },
  settings: ShopSettings,
  receiptType: PaymentReceiptMessageType = 'OFFICIAL_RECEIPT'
): string => {
  const shop = settings.shopName || 'SolarCraft ERP';
  const currency = settings.currency;
  const pos = settings.currencyPosition;
  const receivedStr = formatCurrency(payment.amount, currency, pos);
  const discountStr = payment.discount && payment.discount > 0 ? formatCurrency(payment.discount, currency, pos) : null;
  const balanceStr = formatCurrency(invoice.balanceDue, currency, pos);
  const totalPaidStr = formatCurrency(invoice.paidAmount, currency, pos);
  const methodLabel = payment.method.replace(/_/g, ' ');

  if (receiptType === 'URDU_RECEIPT') {
    let msg = `🧾 *رسید برائے وصولی رقم (Official Payment Receipt)*\n`;
    msg += `*${shop}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `السلام علیکم محترم *${invoice.customerName}* صاحب!\n\n`;
    msg += `آپ کی طرف سے رقم کی ادائیگی شکریہ کے ساتھ موصول ہو گئی ہے۔\n\n`;
    msg += `📋 *وصولی کی تفصیلات (Receipt Details):*\n`;
    msg += `• انوائس نمبر: *#${invoice.invoiceNumber}*\n`;
    msg += `• موصول شدہ رقم (Payment Received): *${receivedStr}*\n`;
    if (discountStr) {
      msg += `• ڈسکاؤنٹ / رعایت (Discount Granted): *${discountStr}*\n`;
    }
    msg += `• تاریخ ادائیگی: ${formatDate(new Date().toISOString().split('T')[0])}\n`;
    msg += `• طریقہ ادائیگی: ${methodLabel}\n`;
    if (payment.referenceNo) {
      msg += `• ٹرانزیکشن ریفرنس / Trx ID: ${payment.referenceNo}\n`;
    }
    msg += `\n📊 *کھاتے کی موجودہ صورتحال:*\n`;
    msg += `• کل موصول شدہ رقم: ${totalPaidStr}\n`;
    msg += `• *بقیہ واجب الادا بیلنس:* *${balanceStr}*\n`;
    if (invoice.balanceDue <= 0) {
      msg += `• اسٹیٹس: ✅ *مکمل حساب بے باک (Paid in Full)* 🎉\n`;
    }
    if (payment.notes) {
      msg += `• ریمارکس: ${payment.notes}\n`;
    }
    msg += `\n`;
    msg += `ہم پر اعتماد کرنے کا بے حد شکریہ! ☀️\n`;
    msg += `📞 *اکاؤنٹس ڈیپارٹمنٹ:* ${settings.phone}`;
    return msg;
  }

  if (receiptType === 'SHORT_RECEIPT') {
    let msg = `✅ ${shop}: Received ${receivedStr}`;
    if (discountStr) {
      msg += ` [Discount: ${discountStr}]`;
    }
    msg += ` for Inv #${invoice.invoiceNumber} from ${invoice.customerName}. Bal Due: ${balanceStr}. Thank you!`;
    msg += ` Ph: ${settings.phone}`;
    return msg;
  }

  if (receiptType === 'FULL_SETTLEMENT') {
    let msg = `🏆 *ACCOUNT 100% SETTLED IN FULL*\n`;
    msg += `*${shop}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `Dear *${invoice.customerName}*,\n\n`;
    msg += `Congratulations! We have received your final payment and your account for *Invoice #${invoice.invoiceNumber}* is now **100% PAID IN FULL**! 🎉☀️\n\n`;
    msg += `🧾 *FINAL SETTLEMENT SUMMARY:*\n`;
    msg += `• Final Payment Received: *${receivedStr}*\n`;
    if (discountStr) {
      msg += `• Settlement Discount / Waiver: *${discountStr}*\n`;
    }
    msg += `• Total Paid on Invoice: ${totalPaidStr}\n`;
    msg += `• ✅ *Remaining Balance: ${formatCurrency(0, currency, pos)} (Zero Due)*\n`;
    msg += `• Payment Method: ${methodLabel}\n`;
    if (payment.referenceNo) {
      msg += `• Reference / Trx ID: ${payment.referenceNo}\n`;
    }
    msg += `\n🛡️ *WARRANTY & SUPPORT STATUS: ACTIVE*\n`;
    msg += `Your manufacturer warranties, net metering documentation, and after-sales customer care are fully active.\n\n`;
    msg += `Thank you for trusting *${shop}* for your solar energy journey!\n`;
    msg += `📞 *Customer Care:* ${settings.phone}`;
    return msg;
  }

  if (receiptType === 'MILESTONE_CONFIRMED') {
    let msg = `⚡ *SOLAR MILESTONE PAYMENT RECEIVED*\n`;
    msg += `*${shop}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `Dear *${invoice.customerName}*,\n\n`;
    msg += `We have successfully received and verified your project milestone payment! ☀️\n\n`;
    msg += `📋 *RECEIPT DETAILS:*\n`;
    msg += `• Invoice Ref: *#${invoice.invoiceNumber}*\n`;
    msg += `• Milestone Amount Paid: *${receivedStr}*\n`;
    if (discountStr) {
      msg += `• Discount Granted: *${discountStr}*\n`;
    }
    msg += `• Payment Mode: ${methodLabel}\n`;
    if (payment.referenceNo) {
      msg += `• Trx ID: ${payment.referenceNo}\n`;
    }
    msg += `• *Remaining Balance Due:* ${balanceStr}\n\n`;
    msg += `🚀 *NEXT PROJECT STEP:* Equipment allocation & installation phase is moving forward. Our technician team will coordinate with you for on-site dispatch.\n\n`;
    msg += `Best Regards,\n*${shop}*\n📞 ${settings.phone}`;
    return msg;
  }

  // Default: OFFICIAL_RECEIPT
  let msg = `🧾 *OFFICIAL PAYMENT RECEIPT*\n`;
  msg += `*${shop}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `Received with thanks from: *${invoice.customerName}*\n\n`;
  msg += `• *Invoice Number:* #${invoice.invoiceNumber}\n`;
  msg += `• *Payment Amount Received:* *${receivedStr}*\n`;
  if (discountStr) {
    msg += `• *Settlement Discount / Waiver:* *${discountStr}*\n`;
  }
  msg += `• *Payment Date:* ${formatDate(new Date().toISOString().split('T')[0])}\n`;
  msg += `• *Payment Method:* ${methodLabel}\n`;
  if (payment.referenceNo) {
    msg += `• *Transaction Reference:* ${payment.referenceNo}\n`;
  }
  msg += `\n📊 *CURRENT ACCOUNT STATUS:*\n`;
  msg += `• Total Paid To Date: ${totalPaidStr}\n`;
  msg += `• *Current Balance Remaining:* *${balanceStr}*\n`;
  if (invoice.balanceDue <= 0) {
    msg += `• Status: ✅ *PAID IN FULL*\n`;
  }
  if (payment.notes) {
    msg += `• Remarks: ${payment.notes}\n`;
  }
  msg += `\n`;
  msg += `Thank you for your business! ☀️\n`;
  msg += `📞 *Accounts Department:* ${settings.phone}`;
  return msg;
};

