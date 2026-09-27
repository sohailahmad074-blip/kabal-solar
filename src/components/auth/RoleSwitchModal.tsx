import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Users, 
  Check, 
  X, 
  Copy, 
  CheckCheck, 
  Share2, 
  Package, 
  ShoppingCart, 
  FileText, 
  DollarSign, 
  Receipt, 
  Settings as SettingsIcon, 
  ArrowRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { ShopSettings, UserRole } from '../../types/solar';

interface RoleSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  settings: ShopSettings;
}

export const RoleSwitchModal: React.FC<RoleSwitchModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  onSelectRole,
  settings,
}) => {
  const [targetRole, setTargetRole] = useState<UserRole>(currentRole === 'OWNER' ? 'PARTNER' : 'OWNER');
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const ownerPin = settings.ownerPin || '7788';
  const partnerPin = settings.partnerPin || '1234';

  const partnerLink = `${window.location.origin}${window.location.pathname}?role=partner`;

  const handleCopyPartnerLink = () => {
    navigator.clipboard.writeText(partnerLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSwitchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (targetRole === 'OWNER') {
      if (settings.enableOwnerPin !== false && pinInput.trim() !== ownerPin) {
        setErrorMsg('Invalid Owner PIN code. Please try again.');
        return;
      }
    } else if (targetRole === 'PARTNER') {
      if (settings.partnerPin && pinInput.trim() && pinInput.trim() !== partnerPin) {
        setErrorMsg('Invalid Partner PIN code. (Default is 1234)');
        return;
      }
    }

    onSelectRole(targetRole);
    setPinInput('');
    setErrorMsg('');
    onClose();
  };

  const handleQuickSwitch = (role: UserRole) => {
    setTargetRole(role);
    setErrorMsg('');
    setPinInput('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Role & Partner Access Management"
      subtitle="Switch between Master Owner mode and Restricted Partner mode"
      maxWidth="2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Role Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Owner Role Card */}
          <div
            onClick={() => handleQuickSwitch('OWNER')}
            className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
              targetRole === 'OWNER'
                ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-900 flex items-center justify-center font-bold text-sm shadow-2xs">
                  👑
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Owner / Master Admin</h4>
                  <p className="text-[11px] text-slate-500">{settings.ownerName || 'Full ERP Access'}</p>
                </div>
              </div>
              {targetRole === 'OWNER' && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-400">Full Permissions:</div>
              <ul className="text-[11px] text-slate-600 space-y-0.5">
                <li className="flex items-center gap-1.5 text-emerald-700">
                  <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span>Customer Billing & Invoicing</span>
                </li>
                <li className="flex items-center gap-1.5 text-emerald-700">
                  <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span>Confidential Profit Vault (P&L)</span>
                </li>
                <li className="flex items-center gap-1.5 text-emerald-700">
                  <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span>Financial & Sales Reports</span>
                </li>
                <li className="flex items-center gap-1.5 text-emerald-700">
                  <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span>Shop Settings & Cloud Sync</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Partner Role Card */}
          <div
            onClick={() => handleQuickSwitch('PARTNER')}
            className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
              targetRole === 'PARTNER'
                ? 'border-blue-500 bg-blue-50/60 shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                  🤝
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Partner (Inventory & POs)</h4>
                  <p className="text-[11px] text-slate-500">{settings.partnerName || 'Procurement & Stock'}</p>
                </div>
              </div>
              {targetRole === 'PARTNER' && (
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-400">Strictly Restricted Access:</div>
              <ul className="text-[11px] text-slate-600 space-y-0.5">
                <li className="flex items-center gap-1.5 text-emerald-700">
                  <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span>Solar Inventory & Live Stock Levels</span>
                </li>
                <li className="flex items-center gap-1.5 text-emerald-700">
                  <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span>Create & Manage Purchase Orders (POs)</span>
                </li>
                <li className="flex items-center gap-1.5 text-emerald-700">
                  <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span>Supplier Directory & Barcode Scanner</span>
                </li>
                <li className="flex items-center gap-1.5 text-rose-600">
                  <X className="h-3 w-3 text-rose-500 shrink-0" />
                  <span>No Invoices, CRM, Profit Vault or Reports</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* PIN Authorization Form */}
        <form onSubmit={handleSwitchSubmit} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-amber-600" />
            <h4 className="font-bold text-slate-900 text-xs">
              {targetRole === 'OWNER' 
                ? 'Enter Owner Master PIN to Switch' 
                : 'Confirm Switch to Partner / Procurement Mode'}
            </h4>
          </div>

          {targetRole === 'OWNER' && (
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                Owner Secret PIN Code
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 4-6 digit PIN (Default: 7788)"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold tracking-widest text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-400 text-slate-900 font-bold rounded-lg hover:bg-amber-500 transition-colors shadow-xs shrink-0 cursor-pointer"
                >
                  Unlock Owner Mode
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Default master PIN is <span className="font-mono font-bold">7788</span> (changeable in Shop Settings).</p>
            </div>
          )}

          {targetRole === 'PARTNER' && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-600">
                You are about to switch to the restricted <span className="font-bold text-blue-700">Partner & Procurement</span> view. All financial statements, customer lists, and invoices will be hidden immediately.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>Switch to Partner Mode</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded-lg text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </form>

        {/* Share Direct Link with Partner */}
        <div className="bg-sky-50/70 p-3.5 rounded-xl border border-sky-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-sky-600" />
              <span className="font-bold text-sky-950 text-xs">Share Direct Link for Your Partner's Phone / Laptop</span>
            </div>
            <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded">Auto-Opens Partner Mode</span>
          </div>
          <p className="text-[11px] text-slate-600">
            Send this URL to your partner via WhatsApp or email. Opening this link will automatically start the app in restricted <strong>Inventory & Purchasing-only</strong> mode.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={partnerLink}
              className="w-full bg-white border border-sky-300 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-700 select-all"
            />
            <button
              type="button"
              onClick={handleCopyPartnerLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700 shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              {copiedLink ? <CheckCheck className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
