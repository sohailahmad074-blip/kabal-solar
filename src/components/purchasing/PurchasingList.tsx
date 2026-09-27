import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  ShoppingCart, 
  Truck, 
  Building2, 
  FileText, 
  Trash2, 
  Edit3,
  PackageCheck,
  Users
} from 'lucide-react';
import { PurchaseOrder, Supplier, ShopSettings, ProductItem } from '../../types/solar';
import { Badge } from '../common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface PurchasingListProps {
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  products: ProductItem[];
  settings: ShopSettings;
  onOpenPOEditor: (po?: PurchaseOrder) => void;
  onOpenSupplierModal: (supplier?: Supplier) => void;
  onReceivePO: (po: PurchaseOrder) => void;
  onDeletePO: (id: string) => void;
}

export const PurchasingList: React.FC<PurchasingListProps> = ({
  purchaseOrders,
  suppliers,
  settings,
  onOpenPOEditor,
  onOpenSupplierModal,
  onReceivePO,
  onDeletePO,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'ORDERS' | 'SUPPLIERS'>('ORDERS');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredPOs = purchaseOrders.filter((po) => {
    const matchesSearch =
      po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (po.trackingNo && po.trackingNo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredSuppliers = suppliers.filter((s) => {
    return (
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.city.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalPurchases = purchaseOrders.reduce((acc, po) => acc + po.grandTotal, 0);
  const pendingOrders = purchaseOrders.filter((po) => po.status === 'ORDERED' || po.status === 'DRAFT').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            Solar Equipment Purchasing & Suppliers
          </h1>
          <p className="text-xs text-slate-500">
            Procure Tier-1 solar panels, inverters, LiFePO4 batteries, and structure stock from distributors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenSupplierModal()}
            className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Users className="h-3.5 w-3.5 text-slate-500" />
            <span>+ Add Supplier</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenPOEditor()}
            className="flex items-center gap-1.5 rounded bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-xs hover:bg-amber-500 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Procurement</p>
          <p className="mt-0.5 text-xl font-bold text-slate-900">
            {formatCurrency(totalPurchases, settings.currency, settings.currencyPosition)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">{purchaseOrders.length} POs logged</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Pending In-Transit</p>
          <p className="mt-0.5 text-xl font-bold text-amber-700">{pendingOrders} Orders</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Awaiting warehouse delivery</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Registered Suppliers</p>
          <p className="mt-0.5 text-xl font-bold text-slate-900">{suppliers.length} Vendors</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Authorized importers & distributors</p>
        </div>
      </div>

      {/* Sub tabs switcher */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveSubTab('ORDERS')}
          className={`pb-2 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeSubTab === 'ORDERS'
              ? 'border-amber-500 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          <span>Purchase Orders ({purchaseOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('SUPPLIERS')}
          className={`pb-2 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeSubTab === 'SUPPLIERS'
              ? 'border-amber-500 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>Supplier Directory ({suppliers.length})</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeSubTab === 'ORDERS'
                ? 'Search PO #, supplier, tracking #...'
                : 'Search vendor company, contact name, city...'
            }
            className="w-full rounded border border-slate-200 bg-slate-50 pl-8 pr-3 py-1 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-amber-500 focus:outline-none"
          />
        </div>

        {activeSubTab === 'ORDERS' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:border-amber-500 focus:outline-none"
          >
            <option value="ALL">All Order Statuses</option>
            <option value="ORDERED">Ordered / In Transit</option>
            <option value="RECEIVED">Received & Stocked</option>
            <option value="DRAFT">Draft</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        )}
      </div>

      {/* TAB 1: PURCHASE ORDERS LIST */}
      {activeSubTab === 'ORDERS' && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
          {filteredPOs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center">
              <ShoppingCart className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">No purchase orders found</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Create your first equipment PO to receive hardware stock.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">PO # / Date</th>
                    <th className="py-2.5 px-3">Distributor / Supplier</th>
                    <th className="py-2.5 px-3">Items & Qty</th>
                    <th className="py-2.5 px-3 text-right">Order Cost</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-blue-500" />
                          <span className="font-bold text-slate-900">{po.poNumber}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{formatDate(po.date)}</span>
                      </td>

                      <td className="py-2 px-3">
                        <p className="font-semibold text-slate-900">{po.supplierName}</p>
                        {po.trackingNo && (
                          <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Truck className="h-3 w-3 text-slate-400" />
                            <span>Trk: {po.trackingNo}</span>
                          </p>
                        )}
                      </td>

                      <td className="py-2 px-3">
                        <p className="font-medium text-slate-800 truncate max-w-[200px]">
                          {po.items[0]?.description || 'Hardware items'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {po.items.length} line item(s) • Total Qty: {po.items.reduce((acc, i) => acc + i.quantity, 0)}
                        </p>
                      </td>

                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(po.grandTotal, settings.currency, settings.currencyPosition)}
                      </td>

                      <td className="py-2 px-3 text-center">
                        <Badge status={po.status} size="sm" />
                      </td>

                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {po.status !== 'RECEIVED' && (
                            <button
                              type="button"
                              onClick={() => onReceivePO(po)}
                              className="rounded px-2 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                              title="Mark as Received & Increase Inventory"
                            >
                              Receive Stock
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenPOEditor(po)}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title="Edit PO"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete PO ${po.poNumber}?`)) {
                                onDeletePO(po.id);
                              }
                            }}
                            className="rounded p-1 text-rose-500 hover:bg-rose-50"
                            title="Delete PO"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUPPLIER DIRECTORY */}
      {activeSubTab === 'SUPPLIERS' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSuppliers.map((sup) => (
            <div
              key={sup.id}
              className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs space-y-2.5 hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">{sup.companyName}</h3>
                  <p className="text-[11px] text-slate-600">Contact: {sup.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenSupplierModal(sup)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-0.5 text-[11px] text-slate-600">
                <p>📞 {sup.phone}</p>
                {sup.email && <p>✉️ {sup.email}</p>}
                <p>📍 {sup.city}, {sup.country}</p>
              </div>

              <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
                {sup.categoriesSupplied?.map((cat) => (
                  <span key={cat} className="text-[9px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    {(cat || '').replace(/_/g, ' ')}
                  </span>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500 text-[10px]">Total Procured:</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(sup.totalPurchasedAmount, settings.currency, settings.currencyPosition)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
