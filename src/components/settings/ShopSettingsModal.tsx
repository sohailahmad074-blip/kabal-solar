import React from 'react';
import { X, Settings, Building2 } from 'lucide-react';
import { ShopSettings, UserRole } from '../../types/solar';
import { SettingsView } from './SettingsView';

interface ShopSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ShopSettings;
  onSaveSettings: (newSettings: ShopSettings) => void;
  onResetData: () => void;
  allAppData: any;
  onImportData: (data: any) => void;
  onOpenCloudSync?: () => void;
  onOpenGitHub?: () => void;
  onSwitchRole?: (role: UserRole) => void;
  onLockSoftware?: () => void;
}

export const ShopSettingsModal: React.FC<ShopSettingsModalProps> = ({
  isOpen,
  onClose,
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-50 rounded-2xl shadow-2xl border border-slate-300 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Window Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
              <Settings className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Shop Settings Window
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {settings.shopName || 'SolarCraft ERP'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Configure company profile, tax registration, PIN access, banking details, categories & cloud sync
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Settings Window"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Window Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          <SettingsView
            settings={settings}
            onSaveSettings={(newSettings) => {
              onSaveSettings(newSettings);
            }}
            onResetData={onResetData}
            allAppData={allAppData}
            onImportData={onImportData}
            onOpenCloudSync={onOpenCloudSync}
            onOpenGitHub={onOpenGitHub}
            onSwitchRole={onSwitchRole}
            onLockSoftware={onLockSoftware}
          />
        </div>

        {/* Modal Window Footer */}
        <div className="px-5 py-2.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span>Settings apply across all invoices, quotations, statements & synced devices</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
