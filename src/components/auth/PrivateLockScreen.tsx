import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle, 
  Sun,
  ArrowRight,
  Delete
} from 'lucide-react';
import { ShopSettings, UserRole } from '../../types/solar';

interface PrivateLockScreenProps {
  settings: ShopSettings;
  onUnlock: (role: UserRole, remember: boolean) => void;
}

export const PrivateLockScreen: React.FC<PrivateLockScreenProps> = ({
  settings,
  onUnlock,
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const ownerPin = settings.ownerPin || '7788';
  const partnerPin = settings.partnerPin || '1234';
  const shopName = settings.shopName || 'SolarCraft ERP';

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleAttemptUnlock = (enteredPin: string) => {
    const cleanPin = enteredPin.trim();
    if (!cleanPin) return;

    if (cleanPin === ownerPin) {
      setErrorMsg('');
      onUnlock('OWNER', rememberDevice);
    } else if (cleanPin === partnerPin) {
      setErrorMsg('');
      onUnlock('PARTNER', rememberDevice);
    } else {
      setErrorMsg('Incorrect PIN code. Access Denied.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
      setPin('');
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 8) {
      const next = pin + num;
      setPin(next);
      setErrorMsg('');
      // Auto-submit if reaches typical PIN length and matches
      if (next === ownerPin || next === partnerPin) {
        handleAttemptUnlock(next);
      }
    }
  };

  const handleDeleteDigit = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 text-slate-100 selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Main Lock Card */}
        <div 
          className={`overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-transform ${
            isShaking ? 'animate-shake' : ''
          }`}
        >
          {/* Header Branding */}
          <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-slate-800/80">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/20">
              <Sun className="h-9 w-9" />
              <div className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 border-2 border-slate-800 text-amber-400">
                <Lock className="h-3.5 w-3.5" />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Private Enterprise System</span>
              </div>
              <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                {shopName}
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Confidential business portal. Enter your security PIN to access the software.
              </p>
            </div>
          </div>

          {/* Form / PIN Entry */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleAttemptUnlock(pin);
            }} 
            className="mt-6 space-y-5"
          >
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-bold uppercase tracking-wider text-slate-400 text-[10px] flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                  <span>Security PIN Code</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span>{showPin ? 'Hide' : 'Show'}</span>
                </button>
              </div>

              <div className="relative">
                <input
                  ref={inputRef}
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPin(val);
                    setErrorMsg('');
                    if (val === ownerPin || val === partnerPin) {
                      handleAttemptUnlock(val);
                    }
                  }}
                  placeholder="••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-center text-2xl font-mono font-bold tracking-widest text-amber-400 placeholder-slate-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-all shadow-inner"
                  autoFocus
                />
              </div>

              {errorMsg && (
                <div className="mt-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 py-1.5 px-3 rounded-lg animate-in fade-in duration-150">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Touch / On-Screen Keypad for quick mobile/tablet usage */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeyPress(digit)}
                  className="h-11 rounded-xl border border-slate-800 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-700 text-lg font-bold text-slate-200 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="h-11 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-800/80 text-xs font-bold text-slate-400 transition-all active:scale-95 cursor-pointer flex items-center justify-center uppercase tracking-wider"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="h-11 rounded-xl border border-slate-800 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-700 text-lg font-bold text-slate-200 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDeleteDigit}
                className="h-11 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-white transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                title="Backspace"
              >
                <Delete className="h-5 w-5" />
              </button>
            </div>

            {/* Remember Device Toggle */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-400 hover:text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-400 focus:ring-offset-slate-900"
                />
                <span>Remember session on this device</span>
              </label>

              <span className="text-[11px] text-slate-500 font-mono">
                PIN: 4-6 Digits
              </span>
            </div>

            {/* Unlock Action Button */}
            <button
              type="submit"
              disabled={!pin}
              className={`w-full rounded-xl py-3 px-4 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                pin
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20 active:scale-[0.99]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>Unlock Private ERP</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Privacy & Confidentiality Guarantee */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center space-y-1">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              🔒 <strong>Strict Privacy Active:</strong> Software, invoices, client ledgers, and business records are fully confidential and private.
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              Default Owner PIN: <strong className="text-amber-400">{ownerPin}</strong> • Partner PIN: <strong className="text-blue-400">{partnerPin}</strong>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};
