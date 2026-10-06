import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  Tag, 
  Edit3, 
  Trash2, 
  Sun, 
  Zap, 
  BatteryCharging, 
  Layers, 
  Cable,
  Scan,
  Printer,
  History,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { ProductItem, ProductCategory, ShopSettings, UserRole } from '../../types/solar';
import { formatCurrency } from '../../utils/formatters';
import { getAllCategories, getCategoryLabel } from '../../utils/categories';

interface InventoryListProps {
  products: ProductItem[];
  settings: ShopSettings;
  onOpenProductEditor: (product?: ProductItem, prefillCode?: string) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateStock: (id: string, newStock: number) => void;
  onOpenBarcodeScanner?: (mode?: 'STOCK_IN' | 'STOCK_OUT' | 'LOG' | 'LABELS') => void;
  currentRole?: UserRole;
}

export const InventoryList: React.FC<InventoryListProps> = ({
  products,
  settings,
  onOpenProductEditor,
  onDeleteProduct,
  onUpdateStock,
  onOpenBarcodeScanner,
  currentRole = 'OWNER',
}) => {
  const isPartner = currentRole === 'PARTNER';
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.specs.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalStockItems = products.reduce((acc, p) => acc + (p.category !== 'SERVICES_LABOR' ? p.stockQty : 0), 0);
  const totalAssetValue = products.reduce((acc, p) => acc + (p.category !== 'SERVICES_LABOR' ? p.stockQty * p.costPrice : 0), 0);
  const totalPotentialRetail = products.reduce((acc, p) => acc + (p.category !== 'SERVICES_LABOR' ? p.stockQty * p.sellingPrice : 0), 0);
  const lowStockCount = products.filter((p) => p.category !== 'SERVICES_LABOR' && p.stockQty <= p.minStockAlert).length;

  const dynamicCategories = getAllCategories(settings);
  const categoryFilterList = [
    { id: 'ALL', label: 'All Equipment' },
    ...dynamicCategories.map(c => ({ id: c.id, label: c.label }))
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl flex items-center gap-2">
            <span>Solar Equipment & Warehouse Inventory</span>
          </h1>
          <p className="text-xs text-slate-500">
            Scan material barcodes to Add stock or Dispatch equipment for solar projects.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenBarcodeScanner && (
            <>
              {/* Scan Barcode Hub Action */}
              <button
                type="button"
                onClick={() => onOpenBarcodeScanner('STOCK_IN')}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                title="Scan Barcodes to Receive or Dispatch Material"
              >
                <Scan className="h-4 w-4" />
                <span>📷 Scan Barcode (In / Out)</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenBarcodeScanner('LABELS')}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                title="Print Code-128 Barcode Stickers"
              >
                <Printer className="h-3.5 w-3.5 text-slate-500" />
                <span>Print Labels</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenBarcodeScanner('LOG')}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                title="View All Scan Logs & History"
              >
                <History className="h-3.5 w-3.5 text-blue-600" />
                <span>Scan Logs</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => onOpenProductEditor()}
            className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-xs hover:bg-amber-500 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Add Solar SKU</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className={`grid grid-cols-1 gap-3 ${isPartner ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
        {!isPartner && (
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Stock Valuation (Cost)</p>
            <p className="mt-0.5 text-xl font-bold text-slate-900">
              {formatCurrency(totalAssetValue, settings.currency, settings.currencyPosition)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Warehouse hardware asset</p>
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Retail Sales Potential</p>
          <p className="mt-0.5 text-xl font-bold text-emerald-700">
            {formatCurrency(totalPotentialRetail, settings.currency, settings.currencyPosition)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Expected turnover</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Hardware Units in Stock</p>
          <p className="mt-0.5 text-xl font-bold text-slate-900">{totalStockItems} Units</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{products.length} registered SKUs</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Low Stock Alerts</p>
          <p className="mt-0.5 text-xl font-bold text-amber-700">{lowStockCount} Items</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Below reorder threshold</p>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {categoryFilterList.map((cat) => {
          const isActive = categoryFilter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`flex items-center gap-1 whitespace-nowrap rounded px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-400 text-slate-900 font-bold shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Tag className="h-3 w-3" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search Input Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search equipment by name, brand, model, SKU code..."
            className="w-full rounded border border-slate-200 bg-slate-50 pl-8 pr-3 py-1 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Product Table */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <Package className="h-10 w-10 text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-700">No solar items found</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Click "+ Add Solar SKU" to create catalog hardware.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Equipment SKU & Brand</th>
                  <th className="py-2.5 px-3">Category</th>
                  {!isPartner && <th className="py-2.5 px-3 text-right">Cost Price</th>}
                  <th className="py-2.5 px-3 text-right">Selling Price</th>
                  <th className="py-2.5 px-3 text-center">Stock / Reorder</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const isLow = p.category !== 'SERVICES_LABOR' && p.stockQty <= p.minStockAlert;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Brand */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{p.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {p.brand} • <span className="font-mono">{p.code}</span> {p.specs ? `• ${p.specs}` : ''}
                        </p>
                      </td>

                      {/* Category */}
                      <td className="py-2 px-3">
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          {getCategoryLabel(p.category)}
                        </span>
                      </td>

                      {/* Cost (Owner Only) */}
                      {!isPartner && (
                        <td className="py-2 px-3 text-right font-medium text-slate-600">
                          {formatCurrency(p.costPrice, settings.currency, settings.currencyPosition)}
                        </td>
                      )}

                      {/* Selling Price */}
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(p.sellingPrice, settings.currency, settings.currencyPosition)}
                      </td>

                      {/* Stock Qty Controls */}
                      <td className="py-2 px-3 text-center">
                        {p.category === 'SERVICES_LABOR' ? (
                          <span className="text-[10px] text-slate-400">Service SKU</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onUpdateStock(p.id, Math.max(0, p.stockQty - 1))}
                              className="h-5 w-5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
                            >
                              -
                            </button>
                            <span className={`font-mono font-bold px-1.5 ${isLow ? 'text-rose-600 bg-rose-50 rounded' : 'text-slate-900'}`}>
                              {p.stockQty} {p.unit}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateStock(p.id, p.stockQty + 1)}
                              className="h-5 w-5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
                            >
                              +
                            </button>
                            {isLow && (
                              <span title="Low stock alert" className="text-amber-500">
                                <AlertTriangle className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onOpenBarcodeScanner && (
                            <button
                              type="button"
                              onClick={() => onOpenBarcodeScanner('LABELS')}
                              className="rounded p-1 text-amber-600 hover:bg-amber-50"
                              title="Print Barcode Label"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenProductEditor(p)}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title="Edit Product"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete product "${p.name}"?`)) {
                                onDeleteProduct(p.id);
                              }
                            }}
                            className="rounded p-1 text-rose-500 hover:bg-rose-50"
                            title="Delete Product"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
