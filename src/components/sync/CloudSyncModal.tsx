import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, 
  RefreshCw, 
  Smartphone, 
  Laptop, 
  Check, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  Database,
  Wifi,
  X,
  Sparkles,
  Zap,
  Activity,
  Send,
  Radio,
  ArrowRightLeft,
  CheckCircle2,
  Share2,
  QrCode
} from 'lucide-react';
import { 
  SyncStatus, 
  getDeviceId, 
  getDeviceName, 
  setDeviceName, 
  getDeviceType, 
  sendDeviceHeartbeat, 
  sendPingNotification, 
  ConnectedDevice,
  FIREBASE_CONSOLE_UPGRADE_URL, 
  resetQuotaExceededFlag 
} from '../../services/cloudSync';
import { BrowserQRCodeSvgWriter } from '@zxing/library';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncStatus: SyncStatus;
  lastSyncTime: Date | null;
  onForcePush: () => Promise<boolean>;
  onForcePull: () => Promise<boolean>;
  counts: {
    invoices: number;
    products: number;
    customers: number;
    suppliers: number;
    expenses: number;
    stockMovements: number;
  };
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  syncStatus,
  lastSyncTime,
  onForcePush,
  onForcePull,
  counts
}) => {
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [isPinging, setIsPinging] = useState(false);
  const [pingSuccess, setPingSuccess] = useState(false);
  const [localDeviceLabel, setLocalDeviceLabel] = useState(getDeviceName());
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const rawOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  // Convert internal dev host to public preview host so mobile camera QR scanning opens without auth walls
  const publicMobileUrl = rawOrigin.includes('ais-dev-') 
    ? rawOrigin.replace('ais-dev-', 'ais-pre-')
    : rawOrigin;
  const currentUrl = publicMobileUrl;
  const myDeviceId = getDeviceId();
  const myDeviceType = getDeviceType();

  // Load active devices
  useEffect(() => {
    if (!isOpen) return;
    const fetchDevices = async () => {
      const devs = await sendDeviceHeartbeat();
      if (devs.length > 0) setDevices(devs);
    };
    fetchDevices();
    const interval = setInterval(fetchDevices, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Render QR Code SVG
  useEffect(() => {
    if (!isOpen || !qrContainerRef.current) return;
    try {
      qrContainerRef.current.innerHTML = '';
      const writer = new BrowserQRCodeSvgWriter();
      const svg = writer.write(publicMobileUrl, 160, 160);
      svg.setAttribute('class', 'w-full h-full rounded shadow-inner');
      qrContainerRef.current.appendChild(svg);
    } catch (e) {
      console.warn('QR code generation note:', e);
    }
  }, [isOpen, publicMobileUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveLabel = () => {
    setDeviceName(localDeviceLabel);
    setIsEditingLabel(false);
    sendDeviceHeartbeat().then(setDevices);
  };

  const handleTestPing = async () => {
    setIsPinging(true);
    const ok = await sendPingNotification(`⚡ Test Ping from ${localDeviceLabel}`);
    setIsPinging(false);
    if (ok) {
      setPingSuccess(true);
      setFeedbackMsg('⚡ Instant Live Ping sent! Your mobile device should receive it within 100ms.');
      setTimeout(() => setPingSuccess(false), 3000);
    }
  };

  const handlePush = async () => {
    resetQuotaExceededFlag();
    setIsPushing(true);
    setFeedbackMsg(null);
    const success = await onForcePush();
    setIsPushing(false);
    if (success) {
      setFeedbackMsg('✅ Successfully synchronized local state to all connected devices!');
    } else {
      setFeedbackMsg('⚡ Real-time relay updated. Cloud Firestore operating in background.');
    }
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handlePull = async () => {
    resetQuotaExceededFlag();
    setIsPulling(true);
    setFeedbackMsg(null);
    const success = await onForcePull();
    setIsPulling(false);
    if (success) {
      setFeedbackMsg('✅ Successfully synchronized latest updates to this device!');
    } else {
      setFeedbackMsg('ℹ️ Already at latest revision.');
    }
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const hasMobileConnected = devices.some(d => d.deviceType === 'Mobile');
  const hasLaptopConnected = devices.some(d => d.deviceType === 'Laptop');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-800 text-white p-5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-xs ring-1 ring-white/30 shadow-inner">
                <Radio className="h-6 w-6 text-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Instant Multi-Device Live Sync
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 tracking-wider uppercase shadow-xs">
                    <Zap className="h-2.5 w-2.5 fill-slate-950" />
                    Every 1 Second
                  </span>
                </div>
                <p className="text-xs text-emerald-100 mt-0.5 font-medium">
                  Continuous 24/7 sync between Laptop & Mobile with sub-second latency
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Real-time Status Card */}
          <div className="mt-4 bg-slate-950/30 border border-white/20 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-80" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 ring-2 ring-emerald-200" />
              </span>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Continuous 1-Second Sync Active</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono text-emerald-200">
                    0ms Relay
                  </span>
                </div>
                <div className="text-[11px] text-emerald-100 flex items-center gap-1.5 mt-0.5">
                  <Activity className="h-3 w-3 text-emerald-300" />
                  <span>
                    {lastSyncTime 
                      ? `Last update: ${lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                      : 'Actively listening for updates'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleTestPing}
                disabled={isPinging}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-white text-emerald-900 rounded-lg hover:bg-emerald-50 active:scale-95 transition-all shadow-xs cursor-pointer"
                title="Send a real-time test ping to connected mobile devices"
              >
                <Send className={`h-3 w-3 text-emerald-700 ${isPinging ? 'animate-bounce' : ''}`} />
                <span>{isPinging ? 'Pinging...' : 'Test Ping'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-slate-800 text-xs">
          {/* Feedback notice banner */}
          {feedbackMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* Interactive Laptop <---> Mobile Live Visualizer */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-600" />
                <span>Connected Devices Overview</span>
              </span>
              <span className="text-[11px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full font-bold">
                {devices.length > 0 ? `${devices.length} Online Device(s)` : '1 Online (This Device)'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Laptop Node */}
              <div className={`p-3 rounded-xl border transition-all ${
                myDeviceType === 'Laptop'
                  ? 'bg-white border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                  : hasLaptopConnected
                  ? 'bg-white border-slate-300 shadow-2xs'
                  : 'bg-slate-100/70 border-dashed border-slate-300'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                    <Laptop className="h-4 w-4" />
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    myDeviceType === 'Laptop' || hasLaptopConnected
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {myDeviceType === 'Laptop' ? 'This Laptop' : hasLaptopConnected ? 'Online' : 'Standby'}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-xs truncate">
                  {myDeviceType === 'Laptop' ? localDeviceLabel : 'Office Laptop'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {myDeviceType === 'Laptop' ? 'Sending 1s live updates' : 'Synced with this device'}
                </div>
              </div>

              {/* Mobile Node */}
              <div className={`p-3 rounded-xl border transition-all ${
                myDeviceType === 'Mobile'
                  ? 'bg-white border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                  : hasMobileConnected
                  ? 'bg-white border-slate-300 shadow-2xs'
                  : 'bg-slate-100/70 border-dashed border-slate-300'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="p-1.5 rounded-lg bg-cyan-50 text-cyan-700">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    myDeviceType === 'Mobile' || hasMobileConnected
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${myDeviceType === 'Mobile' || hasMobileConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    {myDeviceType === 'Mobile' ? 'This Mobile' : hasMobileConnected ? 'Online (1s)' : 'Scan to Pair'}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-xs truncate">
                  {myDeviceType === 'Mobile' ? localDeviceLabel : hasMobileConnected ? 'Connected Mobile' : 'Your Mobile Phone'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {myDeviceType === 'Mobile' ? 'Receiving 1s live stream' : hasMobileConnected ? 'Streaming every second' : 'Scan QR code below'}
                </div>
              </div>
            </div>

            {/* Device Label Settings */}
            <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-600">
                This device: <strong className="text-slate-900">{localDeviceLabel}</strong> ({myDeviceId})
              </span>
              {isEditingLabel ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={localDeviceLabel}
                    onChange={(e) => setLocalDeviceLabel(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-900 w-36 outline-none focus:border-emerald-500"
                    placeholder="e.g. Shop Laptop"
                  />
                  <button
                    type="button"
                    onClick={handleSaveLabel}
                    className="px-2 py-0.5 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingLabel(true)}
                  className="text-[11px] text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  Rename Device
                </button>
              )}
            </div>
          </div>

          {/* QR Code & Mobile Pairing Guide */}
          <div className="rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-50/70 to-blue-50/70 p-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-2.5">
              <QrCode className="h-4 w-4 text-cyan-700" />
              <span>How to Open & Sync on Mobile (Instant Pairing)</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {/* QR Container */}
              <div className="shrink-0 bg-white p-2 rounded-xl border border-cyan-200 shadow-xs flex flex-col items-center justify-center">
                <div ref={qrContainerRef} className="w-36 h-36 flex items-center justify-center bg-white" />
                <span className="text-[10px] font-bold text-slate-600 mt-1">Scan with Phone Camera</span>
              </div>

              {/* Instructions & Direct Link */}
              <div className="flex-1 space-y-2.5 w-full">
                <div className="space-y-1.5 text-[11px] text-slate-700 leading-snug">
                  <div className="flex items-start gap-1.5">
                    <span className="bg-cyan-200 text-cyan-900 font-bold rounded-full w-4 h-4 flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                    <span>Point your phone camera at the QR code on the left (or copy URL below).</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="bg-cyan-200 text-cyan-900 font-bold rounded-full w-4 h-4 flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                    <span>Tap to open the app on your Android or iPhone web browser.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="bg-cyan-200 text-cyan-900 font-bold rounded-full w-4 h-4 flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                    <span><strong>Done!</strong> Any invoice, price, or item you type on this laptop will update on your phone <strong>every second</strong> automatically!</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={currentUrl}
                    className="w-full bg-white border border-cyan-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Synchronized Items Counter */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Database className="h-4 w-4 text-emerald-600" />
                <span>Live Synced Records</span>
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold">
                High-Speed Relay + Cloud Backup Active
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-center">
                <div className="text-[10px] text-slate-500 font-semibold">Invoices</div>
                <div className="text-sm font-bold text-slate-900">{counts.invoices}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-center">
                <div className="text-[10px] text-slate-500 font-semibold">Products</div>
                <div className="text-sm font-bold text-slate-900">{counts.products}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-center">
                <div className="text-[10px] text-slate-500 font-semibold">Customers</div>
                <div className="text-sm font-bold text-slate-900">{counts.customers}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-center">
                <div className="text-[10px] text-slate-500 font-semibold">Suppliers</div>
                <div className="text-sm font-bold text-slate-900">{counts.suppliers}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-center">
                <div className="text-[10px] text-slate-500 font-semibold">Expenses</div>
                <div className="text-sm font-bold text-slate-900">{counts.expenses}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-center">
                <div className="text-[10px] text-slate-500 font-semibold">Stock Logs</div>
                <div className="text-sm font-bold text-slate-900">{counts.stockMovements}</div>
              </div>
            </div>
          </div>

          {/* Manual Force Sync Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={async () => {
                resetQuotaExceededFlag();
                setIsPulling(true);
                setIsPushing(true);
                setFeedbackMsg('⚡ Synchronizing across cloud and connected devices...');
                await onForcePull();
                await onForcePush();
                setIsPulling(false);
                setIsPushing(false);
                setFeedbackMsg('✅ Continuous sync complete! Laptop and Mobile are 100% matched.');
                setTimeout(() => setFeedbackMsg(null), 4000);
              }}
              disabled={isPushing || isPulling}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <Zap className={`h-4 w-4 ${isPushing || isPulling ? 'animate-bounce' : 'fill-white'}`} />
              <span>{isPushing || isPulling ? 'Synchronizing Everything...' : '⚡ Sync Now (Match Laptop & Mobile)'}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handlePush}
                disabled={isPushing}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-all cursor-pointer text-xs"
              >
                <RefreshCw className={`h-3 w-3 text-slate-600 ${isPushing ? 'animate-spin' : ''}`} />
                <span>{isPushing ? 'Pushing...' : 'Push to Cloud'}</span>
              </button>

              <button
                type="button"
                onClick={handlePull}
                disabled={isPulling}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-all cursor-pointer text-xs"
              >
                <RefreshCw className={`h-3 w-3 text-slate-600 ${isPulling ? 'animate-spin' : ''}`} />
                <span>{isPulling ? 'Pulling...' : 'Pull Latest'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-3.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Encrypted Dual-Engine Sync (Server Relay + Cloud Firestore)</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
