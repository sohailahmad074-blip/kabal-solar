import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  Scan, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Flashlight, 
  History, 
  Printer, 
  Plus, 
  Minus, 
  Search, 
  Sun, 
  Zap, 
  BatteryCharging, 
  Layers, 
  Cable, 
  Building2, 
  User, 
  FileText,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { ProductItem, Customer, Supplier, StockMovement, ShopSettings, UserRole } from '../../types/solar';
import { playScannerSuccessBeep, playScannerErrorBeep } from '../../utils/barcodeSound';
import { generateBarcodeSvg } from '../../utils/barcodeGenerator';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductItem[];
  customers: Customer[];
  suppliers: SuppliersList[];
  settings: ShopSettings;
  stockMovements: StockMovement[];
  onStockMovement: (movement: StockMovement) => void;
  onOpenProductEditor: (product?: ProductItem, prefillCode?: string) => void;
  currentRole?: UserRole;
}

type SuppliersList = Supplier;
type ScanMode = 'STOCK_IN' | 'STOCK_OUT' | 'LOG' | 'LABELS';

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  customers,
  suppliers,
  settings,
  stockMovements,
  onStockMovement,
  onOpenProductEditor,
  currentRole = 'OWNER',
}) => {
  const isPartner = currentRole === 'PARTNER';
  const [activeMode, setActiveMode] = useState<ScanMode>('STOCK_IN');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Scanner state
  const [manualCode, setManualCode] = useState('');
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<ProductItem | null>(null);
  
  // Action form state
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('Inbound Material Shipment');
  const [referenceNo, setReferenceNo] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [batchOrSerial, setBatchOrSerial] = useState('');
  const [notes, setNotes] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Label printing state
  const [selectedProductForLabel, setSelectedProductForLabel] = useState<ProductItem | null>(null);
  const [labelQuantity, setLabelQuantity] = useState<number>(12);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Helper to find product by scanned code (supporting 1D Barcode, 2D QR Code, URLs, and JSON QR payloads)
  const findProduct = (rawCode: string): ProductItem | undefined => {
    if (!rawCode) return undefined;
    let clean = rawCode.trim();

    // 1. Try parsing JSON formatted QR code
    if (clean.startsWith('{') && clean.endsWith('}')) {
      try {
        const parsed = JSON.parse(clean);
        clean = parsed.code || parsed.sku || parsed.barcode || parsed.id || parsed.model || clean;
      } catch (e) {
        // Not valid JSON, continue with raw
      }
    }

    // 2. Extract SKU from URL format (e.g. https://.../sku/SP-585 or https://solarcraft/SP-585)
    if (clean.includes('/') && !clean.includes(' ')) {
      const parts = clean.split('/');
      clean = parts[parts.length - 1] || clean;
    }

    // 3. Strip prefixes like "SKU:", "CODE:", "ITEM:"
    clean = clean.replace(/^(sku|code|item|barcode|qr):\s*/i, '').trim();

    const searchLower = clean.toLowerCase();
    if (!searchLower) return undefined;

    return products.find((p) => {
      const matchCode = p.code?.toLowerCase() === searchLower;
      const matchBarcode = p.barcode?.toLowerCase() === searchLower;
      const matchModel = p.model?.toLowerCase() === searchLower;
      const matchName = p.name.toLowerCase().includes(searchLower);
      return matchCode || matchBarcode || matchModel || matchName;
    });
  };

  // Process a barcode/QR scanned from Camera or Hardware reader
  const handleBarcodeDetected = (code: string) => {
    if (!code || !code.trim()) return;
    const cleanCode = code.trim();
    setScannedCode(cleanCode);
    setManualCode(cleanCode);

    const found = findProduct(cleanCode);
    if (found) {
      setMatchedProduct(found);
      if (soundEnabled) playScannerSuccessBeep();
      setFeedbackMessage({
        type: 'success',
        text: `Identified: ${found.name} (${found.code}) - Current Stock: ${found.stockQty} ${found.unit}`,
      });
    } else {
      setMatchedProduct(null);
      if (soundEnabled) playScannerErrorBeep();
      setFeedbackMessage({
        type: 'error',
        text: `Unrecognized QR / Barcode "${cleanCode}". Not found in catalog.`,
      });
    }
  };

  // Hardware barcode/QR scanner wedge listener (scanners send keys fast followed by 'Enter')
  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea other than the barcode search
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && target !== manualInputRef.current))) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // If time between keystrokes is very fast (< 100ms), it's a hardware barcode/QR gun
      if (e.key === 'Enter') {
        if (buffer.length >= 2) {
          handleBarcodeDetected(buffer);
          buffer = '';
          e.preventDefault();
        }
      } else if (e.key.length === 1) {
        if (timeDiff > 100) {
          buffer = e.key;
        } else {
          buffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, products, soundEnabled]);

  // Initialize Camera Scanner
  useEffect(() => {
    if (!isOpen || !cameraActive || activeMode === 'LOG' || activeMode === 'LABELS') {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
      return;
    }

    let isMounted = true;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    const startCamera = async () => {
      try {
        setCameraError(null);
        // List video devices
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (!isMounted) return;
        setCameraDevices(devices);

        // Prefer environment/back camera if available
        let deviceId = selectedDeviceId;
        if (!deviceId && devices.length > 0) {
          const backCam = devices.find((d) => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') || 
            d.label.toLowerCase().includes('environment')
          );
          deviceId = backCam ? backCam.deviceId : devices[0].deviceId;
          setSelectedDeviceId(deviceId);
        }

        if (videoRef.current && deviceId) {
          const controls = await reader.decodeFromVideoDevice(
            deviceId,
            videoRef.current,
            (result, error) => {
              if (result) {
                const text = result.getText();
                handleBarcodeDetected(text);
              }
            }
          );
          if (isMounted) {
            controlsRef.current = controls;
          } else {
            controls.stop();
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Camera access restricted or unavailable';
          setCameraError(msg);
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
    };
  }, [isOpen, cameraActive, selectedDeviceId, activeMode, products]);

  // Reset defaults on modal open
  useEffect(() => {
    if (isOpen) {
      setFeedbackMessage(null);
      setQuantity(1);
      if (products.length > 0 && !selectedProductForLabel) {
        setSelectedProductForLabel(products[0]);
      }
      setTimeout(() => {
        manualInputRef.current?.focus();
      }, 200);
    }
  }, [isOpen, products]);

  // Set default reason when switching mode
  useEffect(() => {
    if (activeMode === 'STOCK_IN') {
      setReason('Inbound Material Shipment / Receiving');
    } else if (activeMode === 'STOCK_OUT') {
      setReason('Customer Solar Project Dispatch');
    }
  }, [activeMode]);

  if (!isOpen) return null;

  // Execute Stock IN or OUT
  const handleExecuteStockMovement = () => {
    if (!matchedProduct) {
      alert('Please scan or select a valid material first.');
      return;
    }

    const qtyNum = Number(quantity);
    if (!qtyNum || qtyNum <= 0) {
      alert('Please enter a valid quantity greater than 0.');
      return;
    }

    if (activeMode === 'STOCK_OUT' && qtyNum > matchedProduct.stockQty) {
      const confirmExceed = window.confirm(
        `Warning: You are deducting ${qtyNum} ${matchedProduct.unit}, but warehouse only shows ${matchedProduct.stockQty} in stock. Proceed with negative stock adjustment?`
      );
      if (!confirmExceed) return;
    }

    const previousStock = matchedProduct.stockQty;
    const newStock = activeMode === 'STOCK_IN' 
      ? previousStock + qtyNum 
      : previousStock - qtyNum;

    const matchedCustomer = customers.find((c) => c.id === selectedCustomerId);
    const matchedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

    const movement: StockMovement = {
      id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId: matchedProduct.id,
      productCode: matchedProduct.code,
      productName: matchedProduct.name,
      category: matchedProduct.category,
      type: activeMode === 'STOCK_IN' ? 'IN' : 'OUT',
      quantity: qtyNum,
      previousStock,
      newStock,
      reason: reason || (activeMode === 'STOCK_IN' ? 'Stock Added' : 'Material Out'),
      referenceNo: referenceNo.trim() || undefined,
      customerId: selectedCustomerId || undefined,
      customerName: matchedCustomer?.name || undefined,
      supplierId: selectedSupplierId || undefined,
      supplierName: matchedSupplier?.name || undefined,
      unitCost: matchedProduct.costPrice,
      batchOrSerial: batchOrSerial.trim() || undefined,
      scannedBy: settings.ownerName || 'Warehouse Admin',
      date: new Date().toISOString(),
      notes: notes.trim() || undefined,
    };

    onStockMovement(movement);

    if (soundEnabled) playScannerSuccessBeep();

    setFeedbackMessage({
      type: 'success',
      text: activeMode === 'STOCK_IN'
        ? `✅ Successfully ADDED +${qtyNum} ${matchedProduct.unit} of "${matchedProduct.name}". New Stock: ${newStock}`
        : `📦 Successfully DISPATCHED -${qtyNum} ${matchedProduct.unit} of "${matchedProduct.name}". Remaining Stock: ${newStock}`,
    });

    // Reset input fields for next fast scan
    setQuantity(1);
    setBatchOrSerial('');
    setNotes('');
    setReferenceNo('');
  };

  const handleManualSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleBarcodeDetected(manualCode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-2xl transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-900 text-white rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-slate-900 shadow-sm font-bold">
              <Scan className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Solar QR Code & Barcode Scanner Hub
                </h3>
                <span className="rounded bg-emerald-400/20 text-emerald-300 px-1.5 py-0.5 text-[10px] font-mono font-bold border border-emerald-400/30 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  External USB/Bluetooth & Camera Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Plug in any USB/Bluetooth QR scanner gun or use your device camera to scan equipment labels
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`rounded p-1.5 text-xs transition-colors cursor-pointer ${
                soundEnabled ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800'
              }`}
              title={soundEnabled ? 'Scanner Beep Sound: ON' : 'Scanner Beep Sound: OFF'}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mode Selector Navigation Tabs */}
        <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveMode('STOCK_IN')}
            className={`flex items-center justify-center gap-1.5 py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeMode === 'STOCK_IN'
                ? 'border-emerald-600 bg-white text-emerald-700 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
            <span>🟢 1. Stock IN (Add Material)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('STOCK_OUT')}
            className={`flex items-center justify-center gap-1.5 py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeMode === 'STOCK_OUT'
                ? 'border-rose-600 bg-white text-rose-700 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowUpRight className="h-4 w-4 text-rose-600" />
            <span>🔴 2. Stock OUT (Dispatch)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('LOG')}
            className={`flex items-center justify-center gap-1.5 py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeMode === 'LOG'
                ? 'border-blue-600 bg-white text-blue-700 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="h-4 w-4 text-blue-600" />
            <span>📋 Scan History & Logs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('LABELS')}
            className={`flex items-center justify-center gap-1.5 py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeMode === 'LABELS'
                ? 'border-amber-600 bg-white text-amber-700 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Printer className="h-4 w-4 text-amber-600" />
            <span>🏷️ Print Barcode Labels</span>
          </button>
        </div>

        {/* Modal Main Content */}
        <div className="p-4 max-h-[75vh] overflow-y-auto space-y-4">
          {/* Top Feedback Banner */}
          {feedbackMessage && (
            <div
              className={`flex items-center justify-between rounded-lg p-3 text-xs font-semibold animate-fadeIn ${
                feedbackMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                  : 'bg-amber-50 text-amber-900 border border-amber-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedbackMessage.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                )}
                <span>{feedbackMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackMessage(null)}
                className="text-slate-400 hover:text-slate-700 text-xs ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* MAIN SCANNING INTERFACE (FOR STOCK IN / OUT) */}
          {(activeMode === 'STOCK_IN' || activeMode === 'STOCK_OUT') && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Left Column: Live Camera Stream & Search Box */}
              <div className="md:col-span-5 space-y-3">
                {/* Camera Viewfinder */}
                <div className="relative overflow-hidden rounded-xl border border-slate-300 bg-slate-950 aspect-4/3 flex items-center justify-center shadow-inner">
                  {cameraActive && !cameraError ? (
                    <>
                      <video
                        ref={videoRef}
                        className="h-full w-full object-cover"
                        playsInline
                        muted
                        autoPlay
                      />
                      {/* Targeting Reticle & Scanning Laser Animation */}
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <div className="relative h-44 w-56 rounded-lg border-2 border-amber-400/80 bg-amber-400/5 shadow-2xl">
                          {/* Laser Bar */}
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-bounce" />
                          <div className="absolute -top-2 -left-2 h-4 w-4 border-t-2 border-l-2 border-amber-400" />
                          <div className="absolute -top-2 -right-2 h-4 w-4 border-t-2 border-r-2 border-amber-400" />
                          <div className="absolute -bottom-2 -left-2 h-4 w-4 border-b-2 border-l-2 border-amber-400" />
                          <div className="absolute -bottom-2 -right-2 h-4 w-4 border-b-2 border-r-2 border-amber-400" />
                        </div>
                        <p className="mt-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                          Align barcode or QR code inside box
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 text-center text-slate-400">
                      <Camera className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                      <p className="text-xs font-semibold text-slate-300">Camera Paused / Unavailable</p>
                      {cameraError && (
                        <p className="text-[11px] text-amber-400 mt-1 max-w-xs">{cameraError}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setCameraError(null);
                          setCameraActive(true);
                        }}
                        className="mt-3 rounded bg-amber-400 px-3 py-1 text-xs font-bold text-slate-900 hover:bg-amber-500"
                      >
                        Retry Camera
                      </button>
                    </div>
                  )}

                  {/* Camera Controls Overlay */}
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    {cameraDevices.length > 1 && (
                      <select
                        value={selectedDeviceId}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                        className="rounded bg-black/70 px-2 py-1 text-[10px] font-semibold text-white border border-white/20 focus:outline-none"
                      >
                        {cameraDevices.map((d, i) => (
                          <option key={d.deviceId} value={d.deviceId}>
                            {d.label || `Camera ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    )}

                    <button
                      type="button"
                      onClick={() => setCameraActive(!cameraActive)}
                      className="rounded bg-black/70 p-1 text-white hover:bg-black/90 border border-white/20"
                      title={cameraActive ? 'Pause Camera' : 'Start Camera'}
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Manual Barcode / SKU / Model Search Box */}
                <form onSubmit={handleManualSearchSubmit} className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center justify-between">
                    <span>Manual Barcode / SKU Input</span>
                    <span className="text-amber-700 font-semibold text-[10px]">Press Enter to Scan</span>
                  </label>
                  <div className="flex gap-1.5">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        ref={manualInputRef}
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="Scan or type SKU (e.g. SP-585, INV-10KW)..."
                        className="w-full rounded border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="rounded bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                    >
                      Lookup
                    </button>
                  </div>
                </form>

                {/* Quick Catalog Barcode Quick Pick List */}
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Quick Sample Barcodes from Warehouse:
                  </label>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 border border-slate-200 rounded-lg bg-slate-50">
                    {products.slice(0, 8).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleBarcodeDetected(p.code || p.barcode || p.name)}
                        className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-mono text-slate-700 hover:border-amber-400 hover:bg-amber-50 text-left transition-colors truncate max-w-[170px]"
                        title={`${p.name} (${p.code})`}
                      >
                        🏷️ <strong>{p.code}</strong> - {p.brand}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Scanned Item Profile & Stock In/Out Execution */}
              <div className="md:col-span-7 space-y-3">
                {matchedProduct ? (
                  /* PRODUCT MATCH CARD */
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold font-mono text-amber-800">
                            {matchedProduct.code}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-500">
                            {matchedProduct.brand} • {(matchedProduct.category || '').replace(/_/g, ' ')}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900 mt-1">
                          {matchedProduct.name}
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">{matchedProduct.specs}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Stock</span>
                        <span className={`text-lg font-black font-mono ${
                          matchedProduct.stockQty <= matchedProduct.minStockAlert ? 'text-rose-600' : 'text-emerald-700'
                        }`}>
                          {matchedProduct.stockQty} {matchedProduct.unit}
                        </span>
                        {!isPartner ? (
                          <span className="text-[10px] text-slate-500 block">
                            Cost: {formatCurrency(matchedProduct.costPrice, settings.currency, settings.currencyPosition)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 block">
                            Price: {formatCurrency(matchedProduct.sellingPrice, settings.currency, settings.currencyPosition)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stock IN vs Stock OUT Configuration Panel */}
                    <div className={`rounded-lg p-3 border ${
                      activeMode === 'STOCK_IN' 
                        ? 'bg-emerald-50/50 border-emerald-200' 
                        : 'bg-rose-50/50 border-rose-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                          activeMode === 'STOCK_IN' ? 'text-emerald-900' : 'text-rose-900'
                        }`}>
                          {activeMode === 'STOCK_IN' ? (
                            <>
                              <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                              <span>INBOUND MATERIAL RECEIVING (ADD STOCK)</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="h-4 w-4 text-rose-600" />
                              <span>OUTBOUND MATERIAL DISPATCH (DEDUCT STOCK)</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Quantity Selector with Quick Increment Buttons */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                          <span>Quantity to {activeMode === 'STOCK_IN' ? 'Add' : 'Dispatch'} ({matchedProduct.unit})</span>
                          <span className="text-slate-500 font-mono text-[11px]">
                            New Result: <strong>{activeMode === 'STOCK_IN' ? matchedProduct.stockQty + Number(quantity || 0) : matchedProduct.stockQty - Number(quantity || 0)} {matchedProduct.unit}</strong>
                          </span>
                        </label>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-100"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>

                          <input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="h-8 w-24 rounded border border-slate-300 bg-white text-center text-sm font-bold font-mono text-slate-900 focus:border-amber-500 focus:outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => setQuantity(quantity + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-100"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>

                          {/* Quick Preset Buttons */}
                          <div className="flex flex-wrap items-center gap-1 ml-auto">
                            {[5, 10, 20, 31].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setQuantity(n)}
                                className="rounded bg-white border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-amber-100 hover:text-slate-900"
                              >
                                +{n} {n === 31 ? '(Pallet)' : ''}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Transaction Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 uppercase">
                            Reason / Movement Type
                          </label>
                          <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none"
                          >
                            {activeMode === 'STOCK_IN' ? (
                              <>
                                <option value="Inbound Material Shipment / Receiving">Inbound Shipment / Supplier PO</option>
                                <option value="Customer Project Return / Unused Material">Customer Project Return / Unused</option>
                                <option value="Physical Inventory Audit (Stock Count +)">Physical Audit (Stock Found +)</option>
                                <option value="Supplier Warranty Replacement">Supplier Warranty Replacement Received</option>
                              </>
                            ) : (
                              <>
                                <option value="Customer Solar Project Dispatch">Customer Solar Project Installation</option>
                                <option value="Invoice Order Fulfillment">Invoice / Sales Order Fulfillment</option>
                                <option value="Site Technician Trunk Stock">Technician Van / Trunk Issue</option>
                                <option value="Damaged / RMA Return to Supplier">Damaged / RMA Return to Supplier</option>
                                <option value="Physical Inventory Audit (Shrinkage -)">Physical Audit (Shrinkage / Loss -)</option>
                              </>
                            )}
                          </select>
                        </div>

                        {activeMode === 'STOCK_OUT' ? (
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase">
                              Assign to Customer Project
                            </label>
                            <select
                              value={selectedCustomerId}
                              onChange={(e) => setSelectedCustomerId(e.target.value)}
                              className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none"
                            >
                              <option value="">-- General Stock Dispatch --</option>
                              {customers.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name} ({c.phone})
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase">
                              Supplier / Vendor
                            </label>
                            <select
                              value={selectedSupplierId}
                              onChange={(e) => setSelectedSupplierId(e.target.value)}
                              className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none"
                            >
                              <option value="">-- Select Supplier (Optional) --</option>
                              {suppliers.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.companyName || s.phone})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 uppercase">
                            Reference (Invoice / PO / Project #)
                          </label>
                          <input
                            type="text"
                            value={referenceNo}
                            onChange={(e) => setReferenceNo(e.target.value)}
                            placeholder="e.g. INV-2026-004 or PO-882"
                            className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 uppercase">
                            Serial Numbers / Batch #
                          </label>
                          <input
                            type="text"
                            value={batchOrSerial}
                            onChange={(e) => setBatchOrSerial(e.target.value)}
                            placeholder="e.g. SN-8839201, SN-8839202"
                            className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      {/* Execution Action Button */}
                      <button
                        type="button"
                        onClick={handleExecuteStockMovement}
                        className={`mt-4 w-full flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-xs font-black text-white shadow-md transition-all cursor-pointer ${
                          activeMode === 'STOCK_IN'
                            ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
                            : 'bg-rose-600 hover:bg-rose-700 active:scale-98'
                        }`}
                      >
                        {activeMode === 'STOCK_IN' ? (
                          <>
                            <ArrowDownLeft className="h-4 w-4" />
                            <span>Confirm & Add +{quantity} {matchedProduct.unit} to Warehouse</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="h-4 w-4" />
                            <span>Confirm & Dispatch -{quantity} {matchedProduct.unit} from Warehouse</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* UNRECOGNIZED / EMPTY STATE */
                  <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                      <Scan className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        {scannedCode ? `Code "${scannedCode}" Not in Catalog` : 'Awaiting Material Barcode Scan'}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        Point camera at a solar panel, inverter, or battery barcode label, or type a SKU above.
                      </p>
                    </div>

                    {scannedCode && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenProductEditor(undefined, scannedCode);
                        }}
                        className="inline-flex items-center gap-1.5 rounded bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-slate-900 shadow-xs hover:bg-amber-500 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Create New Solar SKU for "{scannedCode}"</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RECENT SCAN AUDIT LOG TAB */}
          {activeMode === 'LOG' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Real-time Barcode Material Audit Trail
                  </h4>
                  <p className="text-xs text-slate-500">
                    Complete history of all scanned material Inbound receiving and Outbound project dispatches.
                  </p>
                </div>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono font-bold text-slate-700">
                  {stockMovements.length} Total Logs
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date / Time</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Material & SKU</th>
                      <th className="py-2.5 px-3 text-center">Qty Delta</th>
                      <th className="py-2.5 px-3 text-center">Balance Stock</th>
                      <th className="py-2.5 px-3">Reason / Reference</th>
                      <th className="py-2.5 px-3">Customer / Supplier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stockMovements.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400">
                          No barcode scan transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      stockMovements.slice(0, 50).map((mov) => (
                        <tr key={mov.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-[11px] text-slate-500 font-mono">
                            {formatDate(mov.date)}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              mov.type === 'IN'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {mov.type === 'IN' ? '🟢 STOCK IN' : '🔴 STOCK OUT'}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <p className="font-bold text-slate-900">{mov.productName}</p>
                            <span className="text-[10px] text-slate-400 font-mono">{mov.productCode}</span>
                          </td>
                          <td className={`py-2 px-3 text-center font-bold font-mono ${
                            mov.type === 'IN' ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            {mov.type === 'IN' ? `+${mov.quantity}` : `-${mov.quantity}`}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-slate-700">
                            {mov.newStock}
                          </td>
                          <td className="py-2 px-3">
                            <p className="text-slate-700 font-medium">{mov.reason}</p>
                            {mov.referenceNo && (
                              <span className="text-[10px] text-amber-700 font-mono">Ref: {mov.referenceNo}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-[11px] text-slate-600">
                            {mov.customerName ? `👤 ${mov.customerName}` : mov.supplierName ? `🏢 ${mov.supplierName}` : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* BARCODE LABELS GENERATOR TAB */}
          {activeMode === 'LABELS' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Warehouse Barcode Label & Sticker Sheet Generator
                  </h4>
                  <p className="text-xs text-slate-500">
                    Print adhesive Code-128 barcode stickers for solar panels, inverter cartons, battery racks, and bin boxes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded bg-amber-400 px-4 py-1.5 text-xs font-bold text-slate-900 hover:bg-amber-500 shadow-xs cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Label Sheet</span>
                </button>
              </div>

              {/* Product Selector for Labels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Select Equipment to Generate Barcode:
                  </label>
                  <select
                    value={selectedProductForLabel?.id || ''}
                    onChange={(e) => {
                      const found = products.find((p) => p.id === e.target.value);
                      setSelectedProductForLabel(found || null);
                    }}
                    className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name} ({p.brand})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Number of Labels per Sheet:
                  </label>
                  <select
                    value={labelQuantity}
                    onChange={(e) => setLabelQuantity(parseInt(e.target.value) || 12)}
                    className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none"
                  >
                    <option value={4}>4 Labels (Large Equipment Box)</option>
                    <option value={8}>8 Labels (Standard Inverter/Battery)</option>
                    <option value={12}>12 Labels (Standard 3x4 Sheet)</option>
                    <option value={24}>24 Labels (Small Hardware Bins)</option>
                  </select>
                </div>
              </div>

              {/* Printable Labels Grid Preview */}
              {selectedProductForLabel && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Print Preview ({labelQuantity} Labels):
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {Array.from({ length: labelQuantity }).map((_, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-slate-300 bg-white p-2.5 shadow-2xs text-center flex flex-col justify-between"
                      >
                        <div className="border-b border-slate-100 pb-1">
                          <p className="text-[9px] font-bold text-amber-700 uppercase truncate">
                            {settings.shopName}
                          </p>
                          <p className="text-[11px] font-black text-slate-900 truncate">
                            {selectedProductForLabel.name}
                          </p>
                          <p className="text-[9px] text-slate-500 truncate">
                            {selectedProductForLabel.brand} • {selectedProductForLabel.specs}
                          </p>
                        </div>

                        {/* Barcode SVG Rendering */}
                        <div
                          className="py-2 flex items-center justify-center"
                          dangerouslySetInnerHTML={{
                            __html: generateBarcodeSvg(selectedProductForLabel.code || selectedProductForLabel.id, {
                              width: 170,
                              height: 50,
                              showText: true,
                            }),
                          }}
                        />

                        <div className="border-t border-slate-100 pt-1 flex justify-between text-[9px] text-slate-600">
                          <span>SKU: <strong>{selectedProductForLabel.code}</strong></span>
                          <span className="font-bold text-slate-900">
                            {formatCurrency(selectedProductForLabel.sellingPrice, settings.currency, settings.currencyPosition)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5 rounded-b-xl">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span>Hardware Barcode Scanners Supported (Zebra, Honeywell, Datalogic, Generic USB)</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 bg-white px-4 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};
