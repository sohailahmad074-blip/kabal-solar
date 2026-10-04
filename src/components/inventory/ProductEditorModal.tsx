import React, { useState, useEffect } from 'react';
import { Package, Save, Scan, Plus, Check, X } from 'lucide-react';
import { ProductItem, ProductCategory, ShopSettings, UserRole } from '../../types/solar';
import { Modal } from '../common/Modal';
import { generateBarcodeSvg } from '../../utils/barcodeGenerator';
import { getAllCategories } from '../../utils/categories';

interface ProductEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: ProductItem) => void;
  existingProduct?: ProductItem | null;
  settings: ShopSettings;
  onUpdateSettings?: (settings: ShopSettings) => void;
  prefillCode?: string;
  currentRole?: UserRole;
}

export const ProductEditorModal: React.FC<ProductEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingProduct,
  settings,
  onUpdateSettings,
  prefillCode,
  currentRole = 'OWNER',
}) => {
  const isPartner = currentRole === 'PARTNER';
  const [code, setCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('SOLAR_PANELS');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [specs, setSpecs] = useState('');
  const [unit, setUnit] = useState('Pieces');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [stockQty, setStockQty] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(5);
  const [wattageRating, setWattageRating] = useState<number | undefined>(undefined);
  const [capacityKwh, setCapacityKwh] = useState<number | undefined>(undefined);
  const [warrantyYears, setWarrantyYears] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (existingProduct) {
      setCode(existingProduct.code);
      setBarcode(existingProduct.barcode || existingProduct.code);
      setName(existingProduct.name);
      setCategory(existingProduct.category);
      setBrand(existingProduct.brand);
      setModel(existingProduct.model);
      setSpecs(existingProduct.specs);
      setUnit(existingProduct.unit);
      setCostPrice(existingProduct.costPrice);
      setSellingPrice(existingProduct.sellingPrice);
      setStockQty(existingProduct.stockQty);
      setMinStockAlert(existingProduct.minStockAlert);
      setWattageRating(existingProduct.wattageRating);
      setCapacityKwh(existingProduct.capacityKwh);
      setWarrantyYears(existingProduct.warrantyYears);
      setNotes(existingProduct.notes || '');
    } else {
      const generatedCode = prefillCode || `SP-${Math.floor(1000 + Math.random() * 9000)}`;
      setCode(generatedCode);
      setBarcode(generatedCode);
      setName('');
      setCategory('SOLAR_PANELS');
      setBrand('');
      setModel('');
      setSpecs('');
      setUnit('Pieces');
      setCostPrice(0);
      setSellingPrice(0);
      setStockQty(10);
      setMinStockAlert(5);
      setWattageRating(585);
      setCapacityKwh(undefined);
      setWarrantyYears(25);
      setNotes('');
    }
  }, [existingProduct, isOpen, prefillCode]);

  const handleSaveNewCategory = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!newCategoryName.trim()) return;
    const cleanKey = newCategoryName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const existing = settings.customCategories || [];
    if (!existing.includes(cleanKey)) {
      const updatedSettings: ShopSettings = {
        ...settings,
        customCategories: [...existing, cleanKey],
      };
      if (onUpdateSettings) {
        onUpdateSettings(updatedSettings);
      }
    }
    setCategory(cleanKey as ProductCategory);
    setIsAddingCategory(false);
    setNewCategoryName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter product name.');
      return;
    }

    const newProd: ProductItem = {
      id: existingProduct?.id || `prod-${Date.now()}`,
      code: code.trim() || `SKU-${Date.now().toString().slice(-4)}`,
      barcode: barcode.trim() || code.trim(),
      name: name.trim(),
      category,
      brand: brand.trim(),
      model: model.trim(),
      specs: specs.trim(),
      unit: unit.trim() || 'Pieces',
      costPrice: Number(costPrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      stockQty: Number(stockQty) || 0,
      minStockAlert: Number(minStockAlert) || 0,
      wattageRating: wattageRating ? Number(wattageRating) : undefined,
      capacityKwh: capacityKwh ? Number(capacityKwh) : undefined,
      warrantyYears: warrantyYears ? Number(warrantyYears) : undefined,
      notes: notes.trim() || undefined,
      createdAt: existingProduct?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(newProd);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingProduct ? `Edit SKU: ${existingProduct.name}` : 'Add New Solar Equipment SKU'}
      subtitle="Define hardware specs, wattage, warranty, distributor cost, and client selling price"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Product / Model Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Longi Hi-MO 6 585W Bifacial Solar Panel"
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              SKU / Item Code *
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (!barcode || barcode === code) setBarcode(e.target.value);
              }}
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Barcode / EAN / QR *</span>
              <span className="text-[9px] text-amber-700 font-mono">Code 128</span>
            </label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="e.g. SP-585-LONG or 88391029381"
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Category
              </label>
              {!isAddingCategory ? (
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(true)}
                  className="text-[10px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="h-2.5 w-2.5" />
                  <span>+ New Category</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(false)}
                  className="text-[10px] text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

            {isAddingCategory ? (
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Microinverters, Wind Turbines"
                  className="flex-1 rounded border border-amber-300 bg-amber-50/50 px-2 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveNewCategory();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveNewCategory}
                  className="rounded bg-amber-400 hover:bg-amber-500 px-2 py-1 text-xs font-bold text-slate-900 flex items-center gap-0.5 cursor-pointer shadow-2xs"
                >
                  <Check className="h-3 w-3" />
                  <span>Save</span>
                </button>
              </div>
            ) : (
              <select
                value={category}
                onChange={(e) => {
                  if (e.target.value === '__ADD_NEW__') {
                    setIsAddingCategory(true);
                  } else {
                    setCategory(e.target.value as ProductCategory);
                  }
                }}
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
              >
                {getAllCategories(settings).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
                <option value="__ADD_NEW__">+ Add Custom Category...</option>
              </select>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Brand / Manufacturer
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Longi, Growatt, Deye"
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Unit of Measurement
            </label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Pieces, Meters, Sets"
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Pricing & Stock Grid */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className={`grid grid-cols-2 gap-2.5 ${isPartner ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
            {!isPartner && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Purchase Cost ({settings.currency})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Selling Price ({settings.currency})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                className="mt-1 w-full rounded border border-emerald-300 bg-white px-2.5 py-1 text-xs font-bold text-emerald-700 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Current Stock Qty
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={stockQty}
                onChange={(e) => setStockQty(parseFloat(e.target.value) || 0)}
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Min Stock Alert Threshold
              </label>
              <input
                type="number"
                min="0"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(parseInt(e.target.value) || 0)}
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Technical Specs */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Wattage Rating (Watts)
            </label>
            <input
              type="number"
              value={wattageRating || ''}
              onChange={(e) => setWattageRating(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="e.g. 585 W"
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Capacity (kWh)
            </label>
            <input
              type="number"
              step="0.1"
              value={capacityKwh || ''}
              onChange={(e) => setCapacityKwh(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="e.g. 5.12 kWh"
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Warranty (Years)
            </label>
            <input
              type="number"
              value={warrantyYears || ''}
              onChange={(e) => setWarrantyYears(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="e.g. 25"
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Technical Specifications
            </label>
            <input
              type="text"
              value={specs}
              onChange={(e) => setSpecs(e.target.value)}
              placeholder="e.g. Tier-1 TOPCon Monofacial / Dual MPPT 150-500V DC"
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded bg-amber-400 px-4 py-1.5 text-xs font-bold text-slate-900 hover:bg-amber-500 shadow-xs transition-colors cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save SKU</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
