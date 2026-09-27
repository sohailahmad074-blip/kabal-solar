import React, { useState, useEffect } from 'react';
import { User, Sun, Save } from 'lucide-react';
import { Customer } from '../../types/solar';
import { Modal } from '../common/Modal';

interface CustomerEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Customer) => void;
  existingCustomer?: Customer | null;
}

export const CustomerEditorModal: React.FC<CustomerEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingCustomer,
}) => {
  const [name, setName] = useState('');
  const [customerType, setCustomerType] = useState<'RESIDENTIAL' | 'COMMERCIAL' | 'AGRICULTURAL' | 'INDUSTRIAL' | 'RESELLER'>('RESIDENTIAL');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [nationalIdOrTax, setNationalIdOrTax] = useState('');

  // Solar specifics
  const [installedCapacityKw, setInstalledCapacityKw] = useState<number | undefined>(undefined);
  const [systemType, setSystemType] = useState<'ON_GRID' | 'HYBRID' | 'OFF_GRID' | 'SOLAR_PUMP'>('ON_GRID');
  const [inverterSerial, setInverterSerial] = useState('');
  const [panelBrandModel, setPanelBrandModel] = useState('');
  const [installationDate, setInstallationDate] = useState('');
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState('');
  const [utilityDiscom, setUtilityDiscom] = useState('');
  const [consumerNumber, setConsumerNumber] = useState('');
  const [sanctionedLoadKw, setSanctionedLoadKw] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (existingCustomer) {
      setName(existingCustomer.name);
      setCustomerType(existingCustomer.customerType);
      setPhone(existingCustomer.phone);
      setWhatsapp(existingCustomer.whatsapp || '');
      setEmail(existingCustomer.email || '');
      setAddress(existingCustomer.address || '');
      setCity(existingCustomer.city || '');
      setNationalIdOrTax(existingCustomer.nationalIdOrTax || '');
      setInstalledCapacityKw(existingCustomer.installedCapacityKw);
      setSystemType(existingCustomer.systemType || 'ON_GRID');
      setInverterSerial(existingCustomer.inverterSerial || '');
      setPanelBrandModel(existingCustomer.panelBrandModel || '');
      setInstallationDate(existingCustomer.installationDate || '');
      setWarrantyExpiryDate(existingCustomer.warrantyExpiryDate || '');
      setUtilityDiscom(existingCustomer.utilityDiscom || '');
      setConsumerNumber(existingCustomer.consumerNumber || '');
      setSanctionedLoadKw(existingCustomer.sanctionedLoadKw);
      setNotes(existingCustomer.notes || '');
    } else {
      setName('');
      setCustomerType('RESIDENTIAL');
      setPhone('');
      setWhatsapp('');
      setEmail('');
      setAddress('');
      setCity('');
      setNationalIdOrTax('');
      setInstalledCapacityKw(undefined);
      setSystemType('ON_GRID');
      setInverterSerial('');
      setPanelBrandModel('');
      setInstallationDate(new Date().toISOString().split('T')[0]);
      setWarrantyExpiryDate(
        new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      );
      setUtilityDiscom('');
      setConsumerNumber('');
      setSanctionedLoadKw(undefined);
      setNotes('');
    }
  }, [existingCustomer, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Please provide customer name and phone number.');
      return;
    }

    const newCust: Customer = {
      id: existingCustomer?.id || `cust-${Date.now()}`,
      name: name.trim(),
      customerType,
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || phone.trim(),
      email: email.trim() || undefined,
      address: address.trim(),
      city: city.trim(),
      nationalIdOrTax: nationalIdOrTax.trim() || undefined,
      installedCapacityKw: installedCapacityKw ? Number(installedCapacityKw) : undefined,
      systemType,
      inverterSerial: inverterSerial.trim() || undefined,
      panelBrandModel: panelBrandModel.trim() || undefined,
      installationDate: installationDate || undefined,
      warrantyExpiryDate: warrantyExpiryDate || undefined,
      utilityDiscom: utilityDiscom.trim() || undefined,
      consumerNumber: consumerNumber.trim() || undefined,
      sanctionedLoadKw: sanctionedLoadKw ? Number(sanctionedLoadKw) : undefined,
      notes: notes.trim() || undefined,
      totalInvoiced: existingCustomer?.totalInvoiced || 0,
      totalPaid: existingCustomer?.totalPaid || 0,
      balanceDue: existingCustomer?.balanceDue || 0,
      createdAt: existingCustomer?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(newCust);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingCustomer ? `Edit Client: ${existingCustomer.name}` : 'Add New Solar Client / Project'}
      subtitle="Record contact details, site address, equipment serials, and utility grid info"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Section 1: Customer Profile */}
        <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <User className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Personal & Contact Information
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. Arthur Mitchell"
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Customer Category</label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as any)}
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
              >
                <option value="RESIDENTIAL">Residential Homeowner</option>
                <option value="COMMERCIAL">Commercial Business</option>
                <option value="AGRICULTURAL">Agricultural / Farm</option>
                <option value="INDUSTRIAL">Industrial Factory</option>
                <option value="RESELLER">Sub-Dealer / Installer</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Phone / Mobile *</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0300 1234567"
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">WhatsApp Number</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="e.g. 0300 1234567 (Auto +92)"
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@domain.com"
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">City / District *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Phoenix, AZ"
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                required
              />
            </div>

            <div className="sm:col-span-3">
              <label className="text-[10px] font-bold uppercase text-slate-500">
                Installation / Site Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address, building number, rooftop access notes"
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Technical Solar System Details */}
        <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <Sun className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Solar Installation & Equipment Specs
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">System Capacity (kW)</label>
              <input
                type="number"
                step="0.1"
                value={installedCapacityKw || ''}
                onChange={(e) => setInstalledCapacityKw(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="e.g. 10 kW"
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">System Type</label>
              <select
                value={systemType}
                onChange={(e) => setSystemType(e.target.value as any)}
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
              >
                <option value="ON_GRID">On-Grid (Grid-Tied)</option>
                <option value="HYBRID">Hybrid (Lithium Battery)</option>
                <option value="OFF_GRID">Off-Grid (Isolated)</option>
                <option value="SOLAR_PUMP">Solar Tubewell Pump</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Inverter Serial #</label>
              <input
                type="text"
                value={inverterSerial}
                onChange={(e) => setInverterSerial(e.target.value)}
                placeholder="e.g. SN-INV-998821"
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Panel Brand & Wattage</label>
              <input
                type="text"
                value={panelBrandModel}
                onChange={(e) => setPanelBrandModel(e.target.value)}
                placeholder="e.g. Longi Hi-MO 6 585W (18 Pcs)"
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Utility Consumer / Ref #</label>
              <input
                type="text"
                value={consumerNumber}
                onChange={(e) => setConsumerNumber(e.target.value)}
                placeholder="e.g. REF-0991823901"
                className="mt-1 w-full rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-amber-500 focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Notes */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Project & Site Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special rooftop requirements, shadow analysis notes, warranty details"
            className="mt-1 w-full rounded border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
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
            <span>Save Client Profile</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
