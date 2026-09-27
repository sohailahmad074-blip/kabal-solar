import React, { useState, useEffect } from 'react';
import { Building2, Save } from 'lucide-react';
import { Supplier, ProductCategory } from '../../types/solar';
import { Modal } from '../common/Modal';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: Supplier) => void;
  existingSupplier?: Supplier | null;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingSupplier,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [categoriesSupplied, setCategoriesSupplied] = useState<ProductCategory[]>(['SOLAR_PANELS']);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (existingSupplier) {
      setCompanyName(existingSupplier.companyName || existingSupplier.name);
      setContactPerson(existingSupplier.name || '');
      setPhone(existingSupplier.phone || '');
      setEmail(existingSupplier.email || '');
      setAddress(existingSupplier.address || '');
      setCity(existingSupplier.city || '');
      setTaxNumber(existingSupplier.taxNumber || '');
      setCategoriesSupplied(existingSupplier.categoriesSupplied || ['SOLAR_PANELS']);
      setPaymentTerms(existingSupplier.paymentTerms || '');
      setNotes(existingSupplier.notes || '');
    } else {
      setCompanyName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
      setCity('');
      setTaxNumber('');
      setCategoriesSupplied(['SOLAR_PANELS', 'INVERTERS']);
      setPaymentTerms('Net 30 Days');
      setNotes('');
    }
  }, [existingSupplier, isOpen]);

  const toggleCategory = (cat: ProductCategory) => {
    if (categoriesSupplied.includes(cat)) {
      setCategoriesSupplied(categoriesSupplied.filter((c) => c !== cat));
    } else {
      setCategoriesSupplied([...categoriesSupplied, cat]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      alert('Please enter company name.');
      return;
    }

    const newSupplier: Supplier = {
      id: existingSupplier?.id || `sup-${Date.now()}`,
      name: contactPerson.trim() || companyName.trim(),
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim() || companyName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      city: city.trim(),
      taxNumber: taxNumber.trim() || undefined,
      suppliedCategories: categoriesSupplied,
      totalPurchased: existingSupplier?.totalPurchased || 0,
      totalOutstanding: existingSupplier?.totalOutstanding || 0,
      notes: notes.trim() || undefined,
      createdAt: existingSupplier?.createdAt || new Date().toISOString(),
    };

    onSave(newSupplier);
    onClose();
  };

  const categoriesList: { id: ProductCategory; label: string }[] = [
    { id: 'SOLAR_PANELS', label: 'Solar Panels' },
    { id: 'INVERTERS', label: 'Inverters' },
    { id: 'BATTERIES', label: 'Lithium / Batteries' },
    { id: 'STRUCTURE_MOUNTING', label: 'Structure & Mounting' },
    { id: 'SWITCHGEAR_PROTECTION', label: 'DC/AC Switchgear' },
    { id: 'CABLES_WIRES', label: 'Solar Cables' },
    { id: 'SOLAR_PUMPS', label: 'Solar Pumps' },
    { id: 'ACCESSORIES', label: 'Accessories' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingSupplier ? `Edit Supplier: ${existingSupplier.companyName}` : 'Add Solar Supplier / Distributor'}
      subtitle="Register Tier-1 distributors, hardware importers, and manufacturers"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Company / Business Name *
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Apex Solar Distribution Ltd."
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Contact Person Name
            </label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Marcus Vance"
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Phone / WhatsApp *
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 234-5678"
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="orders@apexsolar.com"
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              City / State
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Phoenix, AZ"
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Warehouse / Office Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full physical warehouse or delivery address"
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Categories Supplied */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
            Hardware Categories Supplied
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 pt-1">
            {categoriesList.map((cat) => {
              const isChecked = categoriesSupplied.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`rounded border px-2 py-1 text-[11px] font-medium text-left transition-all cursor-pointer ${
                    isChecked
                      ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {isChecked ? '✓ ' : '+ '}
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Terms & Special Remarks
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 5% cash discount, Tier-1 official warranty partner"
            className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
          />
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
            <span>Save Supplier</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
