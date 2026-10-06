import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Save, 
  CreditCard, 
  FileText, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2,
  Cloud,
  Smartphone,
  Users,
  KeyRound,
  Copy,
  CheckCheck,
  Share2,
  Tag,
  Plus,
  Trash2,
  Layers,
  ShieldCheck,
  Github,
  Lock
} from 'lucide-react';
import { ShopSettings, UserRole } from '../../types/solar';
import { getAllCategories, DEFAULT_CATEGORY_LABELS } from '../../utils/categories';
import { defaultSettings } from '../../utils/storage';

interface SettingsViewProps {
  settings?: ShopSettings;
  onSaveSettings: (newSettings: ShopSettings) => void;
  onResetData: () => void;
  allAppData?: any;
  onImportData: (data: any) => void;
  onOpenCloudSync?: () => void;
  onOpenGitHub?: () => void;
  onSwitchRole?: (role: UserRole) => void;
  onLockSoftware?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onResetData,
  allAppData,
  onImportData,
  onOpenCloudSync,
  onOpenGitHub,
  onSwitchRole,
  onLockSoftware,
}) => {
  const safeInitialSettings: ShopSettings = {
    ...defaultSettings,
    ...(settings || {}),
    customCategories: Array.isArray(settings?.customCategories)
      ? settings.customCategories.filter((c) => typeof c === 'string' && c.trim())
      : (defaultSettings.customCategories || ['EV_CHARGERS', 'SOLAR_LIGHTS', 'SOLAR_WATER_HEATERS']),
    partnerPin: settings?.partnerPin || defaultSettings.partnerPin || '1234',
    partnerName: settings?.partnerName || defaultSettings.partnerName || 'Procurement & Inventory Partner',
  };

  const [formData, setFormData] = useState<ShopSettings>(() => safeInitialSettings);
  const [saveMessage, setSaveMessage] = useState('');
  const [copiedPartnerLink, setCopiedPartnerLink] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Keep form data in sync if settings update from external changes or cloud
  useEffect(() => {
    if (settings) {
      setFormData((prev) => ({
        ...defaultSettings,
        ...prev,
        ...settings,
        customCategories: Array.isArray(settings.customCategories)
          ? settings.customCategories.filter((c) => typeof c === 'string' && c.trim())
          : (prev.customCategories || defaultSettings.customCategories || []),
      }));
    }
  }, [settings]);

  const partnerLink = typeof window !== 'undefined' && window.location
    ? `${window.location.origin}${window.location.pathname}?role=partner`
    : '';

  const handleChange = (field: keyof ShopSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSaveMessage('Solar Shop settings saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleCopyPartnerLink = () => {
    navigator.clipboard.writeText(partnerLink);
    setCopiedPartnerLink(true);
    setTimeout(() => setCopiedPartnerLink(false), 2500);
  };

  const handleAddCustomCategory = () => {
    if (!newCategoryInput.trim()) return;
    const cleanKey = newCategoryInput
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_');
    
    const existing = formData.customCategories || [];
    if (!existing.includes(cleanKey) && !DEFAULT_CATEGORY_LABELS[cleanKey]) {
      const updated = [...existing, cleanKey];
      const updatedSettings = { ...formData, customCategories: updated };
      setFormData(updatedSettings);
      onSaveSettings(updatedSettings);
      setNewCategoryInput('');
      setSaveMessage(`Category "${cleanKey.replace(/_/g, ' ')}" added and saved successfully!`);
      setTimeout(() => setSaveMessage(''), 3000);
    } else {
      alert('This category already exists!');
    }
  };

  const handleRemoveCustomCategory = (catToRemove: string) => {
    const updated = (formData.customCategories || []).filter((c) => c !== catToRemove);
    const updatedSettings = { ...formData, customCategories: updated };
    setFormData(updatedSettings);
    onSaveSettings(updatedSettings);
    setSaveMessage(`Category "${catToRemove.replace(/_/g, ' ')}" removed and saved.`);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleExportBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allAppData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `SolarCraft_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (window.confirm('Are you sure you want to restore this backup? This will replace your current data.')) {
            onImportData(parsed);
            alert('Backup data restored successfully!');
          }
        } catch (err) {
          alert('Invalid backup file. Please provide a valid SolarCraft JSON backup.');
        }
      };
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all invoices, purchasing, customers, and expenses back to default demo solar records?')) {
      onResetData();
      alert('Data reset to sample solar records.');
    }
  };

  return (
    <div className="space-y-4 max-w-5xl text-xs">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            Solar Shop Business & Invoicing Settings
          </h1>
          <p className="text-xs text-slate-500">
            Configure company profile, partner/team access control, custom product categories, bank settlement, and cloud sync.
          </p>
        </div>

        {saveMessage && (
          <div className="flex items-center gap-1.5 rounded bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{saveMessage}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Company Profile */}
        <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3 shadow-xs">
          <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <Building2 className="h-3.5 w-3.5 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Solar Enterprise & Business Profile
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Shop / Company Name *</label>
              <input
                type="text"
                value={formData.shopName || ''}
                onChange={(e) => handleChange('shopName', e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Business Tagline</label>
              <input
                type="text"
                value={formData.tagline || ''}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Tax / NTN / GST #</label>
              <input
                type="text"
                value={formData.taxRegistrationNumber || ''}
                onChange={(e) => handleChange('taxRegistrationNumber', e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Phone / WhatsApp</label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Official Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Owner / Manager Name</label>
              <input
                type="text"
                value={formData.ownerName || ''}
                onChange={(e) => handleChange('ownerName', e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-500">Office / Showroom Address</label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">City / State</label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Team & Partner Access Control (Role Management) */}
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3.5 space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-200 pb-2 gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-blue-600" />
                <span>Partner & Team Role-Based Access (Inventory & Purchasing Only)</span>
              </h3>
              <p className="text-[11px] text-blue-800">
                Grant your partner restricted access to view stock levels and create purchase orders without seeing billing invoices, client lists, or profit margins.
              </p>
            </div>
            {onSwitchRole && (
              <button
                type="button"
                onClick={() => onSwitchRole('PARTNER')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                🤝 Test Partner Mode View
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-700 block">
                Partner / Staff Name
              </label>
              <input
                type="text"
                value={formData.partnerName || ''}
                onChange={(e) => handleChange('partnerName', e.target.value)}
                placeholder="e.g. Farhan (Procurement Partner)"
                className="mt-1 w-full rounded border border-blue-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-700 block">
                Partner Access PIN Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={formData.partnerPin || '1234'}
                onChange={(e) => handleChange('partnerPin', e.target.value.replace(/\D/g, ''))}
                placeholder="1234"
                className="mt-1 w-full rounded border border-blue-300 bg-white px-2.5 py-1 text-xs font-mono font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">PIN for your partner to enter.</p>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-700 block">
                Owner Master Unlock PIN
              </label>
              <input
                type="text"
                maxLength={6}
                value={formData.ownerPin || '7788'}
                onChange={(e) => handleChange('ownerPin', e.target.value.replace(/\D/g, ''))}
                placeholder="7788"
                className="mt-1 w-full rounded border border-amber-300 bg-white px-2.5 py-1 text-xs font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">Master PIN to unlock full Owner Admin.</p>
            </div>
          </div>

          {/* Software Privacy Status & Lock Now */}
          <div className="mt-2 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0" />
              <div>
                <span className="font-bold text-slate-900 text-xs block">
                  🔒 Private Software Protection Active
                </span>
                <span className="text-[10px] text-slate-600">
                  All client ledgers, invoices, and financial records require PIN authentication.
                </span>
              </div>
            </div>

            {onLockSoftware && (
              <button
                type="button"
                onClick={onLockSoftware}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-xs shadow-xs transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Lock Software Now</span>
              </button>
            )}
          </div>

          {/* Shareable Partner Link */}
          <div className="mt-2 p-2.5 rounded-md bg-white border border-blue-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5 text-blue-600" />
                <span>Shareable Link for Partner's Phone / Computer:</span>
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                Direct Restricted Access
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={partnerLink}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] font-mono text-slate-700 select-all"
              />
              <button
                type="button"
                onClick={handleCopyPartnerLink}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 shadow-xs transition-colors shrink-0 cursor-pointer text-xs"
              >
                {copiedPartnerLink ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedPartnerLink ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Solar Equipment & Custom Categories Manager */}
        <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Solar Product & Equipment Categories
              </h3>
            </div>
            <span className="text-[10px] text-slate-500">
              Manage equipment categories used in inventory, POs, and invoices
            </span>
          </div>

          {/* Add New Category Field */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCategoryInput}
              onChange={(e) => setNewCategoryInput(e.target.value)}
              placeholder="e.g. EV Chargers, Solar Street Lights, Solar Water Heaters, Wind Turbines..."
              className="flex-1 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomCategory();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddCustomCategory}
              className="flex items-center gap-1 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-3 py-1.5 rounded text-xs transition-colors shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add Category</span>
            </button>
          </div>

          {/* Categories Pill Grid */}
          <div className="space-y-2 pt-1">
            <div className="text-[10px] font-bold uppercase text-slate-500">Standard Built-In Categories:</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(DEFAULT_CATEGORY_LABELS).map(([key, label]) => (
                <span
                  key={key}
                  className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200"
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Custom User Categories */}
            {(formData.customCategories || []).length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <div className="text-[10px] font-bold uppercase text-amber-700">Custom Added Categories:</div>
                <div className="flex flex-wrap gap-1.5">
                  {(formData.customCategories || [])
                    .filter((cat): cat is string => typeof cat === 'string' && Boolean(cat && cat.trim()))
                    .map((cat) => {
                      const displayLabel = String(cat).replace(/_/g, ' ');
                      return (
                        <span
                          key={cat}
                          className="px-2.5 py-1 rounded bg-amber-50 text-amber-900 text-[11px] font-bold border border-amber-300 flex items-center gap-1.5"
                        >
                          <span>{displayLabel}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomCategory(cat)}
                            className="text-amber-700 hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer"
                            title="Remove category"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Currency & Document Numbering */}
        <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3 shadow-xs">
          <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <FileText className="h-3.5 w-3.5 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Currency & Document Prefixes
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Currency Symbol</label>
              <input
                type="text"
                value={formData.currency || '$'}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Currency Position</label>
              <select
                value={formData.currencyPosition === 'AFTER' || (formData.currencyPosition as any) === 'SUFFIX' ? 'AFTER' : 'BEFORE'}
                onChange={(e) => handleChange('currencyPosition', e.target.value as 'BEFORE' | 'AFTER')}
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
              >
                <option value="BEFORE">Prefix / Before (e.g. $ 1,000)</option>
                <option value="AFTER">Suffix / After (e.g. 1,000 PKR)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Invoice Prefix</label>
              <input
                type="text"
                value={formData.invoicePrefix || 'INV-'}
                onChange={(e) => handleChange('invoicePrefix', e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">PO Prefix</label>
              <input
                type="text"
                value={formData.poPrefix || 'PO-'}
                onChange={(e) => handleChange('poPrefix', e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Banking Wire Information */}
        <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3 shadow-xs">
          <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <CreditCard className="h-3.5 w-3.5 text-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Official Bank Settlement & Wire Transfer Details
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Bank Name</label>
              <input
                type="text"
                value={formData.bankName || ''}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Account Title / Name</label>
              <input
                type="text"
                value={formData.bankAccountTitle || ''}
                onChange={(e) => handleChange('bankAccountTitle', e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">IBAN / Account Number</label>
              <input
                type="text"
                value={formData.bankAccountNumber || ''}
                onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Default Terms & Warranties */}
        <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3 shadow-xs">
          <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <FileText className="h-3.5 w-3.5 text-slate-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Default Solar Quotation & Invoice Terms
            </h3>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Payment & Solar Commissioning Terms
              </label>
              <textarea
                rows={2}
                value={formData.termsAndConditions || ''}
                onChange={(e) => handleChange('termsAndConditions', e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Warranty & Performance Guarantees
              </label>
              <textarea
                rows={2}
                value={formData.warrantyDisclaimer || ''}
                onChange={(e) => handleChange('warrantyDisclaimer', e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Save */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded bg-amber-400 px-5 py-2 text-xs font-bold text-slate-900 hover:bg-amber-500 shadow-xs transition-colors cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>

      {/* Firebase Cloud Database & Multi-Device Mobile Sync */}
      <div className="rounded-lg border border-sky-200 bg-sky-50/40 p-3.5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-sky-200/80 pb-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-950 flex items-center gap-1.5">
              <Cloud className="h-4 w-4 text-sky-600" />
              <span>Firebase Cloud Database & Mobile Sync</span>
            </h3>
            <p className="text-[11px] text-sky-800">
              Live multi-device real-time sync across computers, Android phones, iPhones, and tablets.
            </p>
          </div>
          <span className="rounded bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 border border-sky-300">
            Spark Free Tier
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
          <div className="text-xs text-slate-700 space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-slate-900">
              <Smartphone className="h-3.5 w-3.5 text-slate-600" />
              <span>Instant Access from Any Phone or Laptop</span>
            </p>
            <p className="text-[11px] text-slate-500">
              Changes you or your partner save automatically appear on all connected devices in real time.
            </p>
          </div>

          {onOpenCloudSync && (
            <button
              type="button"
              onClick={onOpenCloudSync}
              className="shrink-0 flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-sky-700 shadow-xs transition-colors cursor-pointer"
            >
              <Cloud className="h-3.5 w-3.5" />
              <span>Manage Cloud Sync & Mobile Link</span>
            </button>
          )}
        </div>
      </div>

      {/* GitHub Deployment & Automated Publishing */}
      <div className="rounded-lg border border-slate-300 bg-slate-900 text-white p-3.5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Github className="h-4 w-4 text-amber-400" />
              <span>Deploy to GitHub & Automated Publishing</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Host SolarCraft ERP on GitHub with pre-configured GitHub Actions CI/CD and free GitHub Pages web hosting.
            </p>
          </div>
          <span className="rounded bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 border border-slate-700">
            GitHub Pages Ready
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
          <div className="text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-white">
              Automated CI/CD Pipeline Configured
            </p>
            <p className="text-[11px] text-slate-400">
              Every push to branch <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">main</code> triggers a build that automatically publishes your site online.
            </p>
          </div>

          {onOpenGitHub && (
            <button
              type="button"
              onClick={onOpenGitHub}
              className="shrink-0 flex items-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-xs transition-colors cursor-pointer"
            >
              <Github className="h-3.5 w-3.5" />
              <span>Deploy to GitHub Suite</span>
            </button>
          )}
        </div>
      </div>

      {/* Backup & System Maintenance */}
      <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
          Backup, Export & Database Maintenance
        </h3>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-blue-600" />
            <span>Export JSON Database Backup</span>
          </button>

          <label className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
            <Upload className="h-3.5 w-3.5 text-emerald-600" />
            <span>Restore From JSON</span>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer ml-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Demo Records</span>
          </button>
        </div>
      </div>
    </div>
  );
};
