import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ShoppingCart, Save, Building2 } from 'lucide-react';
import { PurchaseOrder, PurchaseOrderItem, Supplier, ProductItem, ShopSettings, POStatus, ProductCategory, UserRole } from '../../types/solar';
import { Modal } from '../common/Modal';
import { formatCurrency } from '../../utils/formatters';

interface PurchaseOrderEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (po: PurchaseOrder) => void;
  existingPO?: PurchaseOrder | null;
  suppliers: Supplier[];
  products: ProductItem[];
  settings: ShopSettings;
  currentRole?: UserRole;
}

export const PurchaseOrderEditor: React.FC<PurchaseOrderEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  existingPO,
  suppliers,
  products,
  settings,
  currentRole = 'OWNER',
}) => {
  const isPartner = currentRole === 'PARTNER';
  const [poNumber, setPoNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<POStatus>('ORDERED');
  const [trackingNo, setTrackingNo] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [shippingFreight, setShippingFreight] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);

  useEffect(() => {
    if (existingPO) {
      setPoNumber(existingPO.poNumber);
      setSupplierId(existingPO.supplierId);
      setSupplierName(existingPO.supplierName);
      setSupplierPhone(existingPO.supplierPhone);
      setSupplierEmail(existingPO.supplierEmail || '');
      setSupplierAddress(existingPO.supplierAddress || '');
      setOrderDate(existingPO.orderDate);
      setExpectedDate(existingPO.expectedDate || '');
      setStatus(existingPO.status);
      setTrackingNo(existingPO.trackingNo || '');
      setNotes(existingPO.notes || '');
      setItems(existingPO.items);
      setShippingFreight(existingPO.shippingFreight);
      setTaxAmount(existingPO.taxAmount);
      setPaidAmount(existingPO.paidAmount);
    } else {
      const suffix = Math.floor(1000 + Math.random() * 9000);
      setPoNumber(`${settings.poPrefix}${suffix}`);
      setSupplierId('');
      setSupplierName('');
      setSupplierPhone('');
      setSupplierEmail('');
      setSupplierAddress('');
      setOrderDate(new Date().toISOString().split('T')[0]);
      setExpectedDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setStatus('ORDERED');
      setTrackingNo('');
      setNotes('');
      setShippingFreight(0);
      setTaxAmount(0);
      setPaidAmount(0);
      setItems([
        {
          id: `po-item-${Date.now()}`,
          name: '',
          category: 'SOLAR_PANELS',
          brand: '',
          specs: '',
          quantity: 10,
          unit: 'Pieces',
          unitCost: 0,
          total: 0,
        },
      ]);
    }
  }, [existingPO, isOpen, settings]);

  const handleSupplierSelect = (id: string) => {
    setSupplierId(id);
    const sup = suppliers.find((s) => s.id === id);
    if (sup) {
      setSupplierName(sup.companyName);
      setSupplierPhone(sup.phone);
      setSupplierEmail(sup.email || '');
      setSupplierAddress(sup.address || '');
    }
  };

  const handleProductSelect = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      productId: prod.id,
      name: prod.name,
      category: prod.category,
      brand: prod.brand,
      specs: prod.specs,
      unit: prod.unit,
      unitCost: prod.costPrice,
      total: (newItems[index].quantity || 1) * prod.costPrice,
    };
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    const qty = Number(newItems[index].quantity) || 0;
    const cost = Number(newItems[index].unitCost) || 0;
    newItems[index].total = qty * cost;
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `po-item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        name: '',
        category: 'SOLAR_PANELS',
        brand: '',
        specs: '',
        quantity: 1,
        unit: 'Pieces',
        unitCost: 0,
        total: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((acc, itm) => acc + itm.total, 0);
  const grandTotal = subtotal + Number(shippingFreight || 0) + Number(taxAmount || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      alert('Please select or specify a supplier name.');
      return;
    }

    const po: PurchaseOrder = {
      id: existingPO?.id || `po-${Date.now()}`,
      poNumber,
      supplierId: supplierId || 'sup-direct',
      supplierName,
      supplierPhone,
      supplierEmail,
      supplierAddress,
      orderDate,
      expectedDate,
      status,
      trackingNo,
      notes,
      items,
      subtotal,
      shippingFreight: Number(shippingFreight || 0),
      taxAmount: Number(taxAmount || 0),
      grandTotal,
      paidAmount: Number(paidAmount || 0),
      balanceDue: grandTotal - Number(paidAmount || 0),
      paymentStatus: Number(paidAmount || 0) >= grandTotal ? 'PAID' : Number(paidAmount || 0) > 0 ? 'PARTIAL' : 'UNPAID',
      payments: existingPO?.payments || [],
      createdAt: existingPO?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(po);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingPO ? `Edit Purchase Order ${existingPO.poNumber}` : 'Create Equipment Purchase Order (PO)'}
      subtitle="Order hardware stock from solar distributors and track logistics"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* PO Header Meta */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              PO Number *
            </label>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none font-mono"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Order Date
            </label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Expected Delivery
            </label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Order Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as POStatus)}
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-none"
            >
              <option value="DRAFT">Draft</option>
              <option value="ORDERED">Ordered / In Transit</option>
              <option value="RECEIVED">Received & Stocked</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Supplier Selector */}
        <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Supplier & Distributor Details
              </span>
            </div>

            {suppliers.length > 0 && (
              <select
                value={supplierId}
                onChange={(e) => handleSupplierSelect(e.target.value)}
                className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-700 focus:border-amber-500 focus:outline-none"
              >
                <option value="">-- Choose Existing Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName} ({s.city || 'Vendor'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Company Name *</label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Apex Solar Distribution Inc"
                className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Phone</label>
              <input
                type="text"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Tracking / Consignment #</label>
              <input
                type="text"
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                placeholder="e.g. TRK-990184"
                className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* PO Items Table */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
              Procurement Line Items
            </span>

            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1 rounded bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span>Add Hardware Row</span>
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={item.id || index} className="rounded border border-slate-200 bg-white p-2.5 shadow-xs space-y-2">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                  <div className="lg:w-1/3">
                    <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">
                      Select From Catalog
                    </label>
                    <select
                      value={item.productId || ''}
                      onChange={(e) => handleProductSelect(index, e.target.value)}
                      className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">-- Choose SKU --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {!isPartner ? `(Cost: ${formatCurrency(p.costPrice, settings.currency, settings.currencyPosition)})` : `(${p.brand || p.code})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">
                      Description *
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                      placeholder="e.g. 585W Bifacial Solar Panels"
                      className="w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="w-20">
                    <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">Qty</label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-900 text-center focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="w-24">
                    <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">
                      Cost Price
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.unitCost}
                      onChange={(e) => handleItemChange(index, 'unitCost', parseFloat(e.target.value) || 0)}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-900 text-right focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="w-24 text-right">
                    <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">Total</label>
                    <p className="py-1 text-xs font-bold text-slate-900">
                      {formatCurrency(item.total, settings.currency, settings.currencyPosition)}
                    </p>
                  </div>

                  <div className="pt-2 lg:pt-3">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PO Totals */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="w-full sm:w-1/2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Procurement & Warehouse Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Delivery via heavy freight at Warehouse Dock 2"
              className="mt-1 w-full rounded border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="w-full sm:w-72 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Hardware Subtotal:</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(subtotal, settings.currency, settings.currencyPosition)}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-700">
              <span>Freight / Shipping:</span>
              <input
                type="number"
                step="any"
                min="0"
                value={shippingFreight}
                onChange={(e) => setShippingFreight(parseFloat(e.target.value) || 0)}
                className="w-24 rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-right font-medium"
              />
            </div>

            <div className="flex justify-between pt-1.5 border-t border-slate-200 text-sm font-bold text-slate-900">
              <span>Total PO Cost:</span>
              <span>{formatCurrency(grandTotal, settings.currency, settings.currencyPosition)}</span>
            </div>
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
            <span>Save Purchase Order</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
