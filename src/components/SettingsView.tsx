import React, { useState } from 'react';
import {
  Store,
  MapPin,
  Phone,
  Mail,
  FileText,
  Clock,
  Save,
  CheckCircle2,
  Percent,
} from 'lucide-react';
import { SalonSettings } from '../types.ts';
import { api } from '../services/api.ts';

interface SettingsViewProps {
  settings: SalonSettings | null;
  onRefreshData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onRefreshData }) => {
  const [salonName, setSalonName] = useState(settings?.salonName || 'Veloura 🎀 Luxury Salon & Spa');
  const [tagline, setTagline] = useState(settings?.tagline || 'Luxury Hair, Beauty & Wellness');
  const [address, setAddress] = useState(settings?.address || '100ft Road, Indiranagar, Bengaluru, Karnataka 560038');
  const [phone, setPhone] = useState(settings?.phone || '+91 98765 43210');
  const [email, setEmail] = useState(settings?.email || 'contact@veloura.in');
  const [gstNumber, setGstNumber] = useState(settings?.gstNumber || '29AAAAA0000A1Z5');
  const [taxRate, setTaxRate] = useState(settings?.taxRate ?? 18);
  const [openingTime, setOpeningTime] = useState(settings?.openingTime || '09:30 AM');
  const [closingTime, setClosingTime] = useState(settings?.closingTime || '08:00 PM');
  const [invoicePrefix, setInvoicePrefix] = useState(settings?.invoicePrefix || 'VEL-2026-');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      await api.updateSettings({
        salonName: salonName.trim(),
        tagline: tagline.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        gstNumber: gstNumber.trim().toUpperCase(),
        taxRate: Number(taxRate),
        openingTime,
        closingTime,
        invoicePrefix: invoicePrefix.trim(),
      });

      setSavedSuccess(true);
      onRefreshData();
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e: any) {
      alert(e.message || 'Error updating settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Salon Profile & Business Settings</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure your salon brand, Indian GST details, and billing defaults
          </p>
        </div>
        {savedSuccess && (
          <span className="flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-600" />
            Settings Saved Successfully!
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6 text-xs">
        {/* Salon Identity */}
        <div>
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 mb-4">
            Salon Identity & Branding
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Salon Name *</label>
              <input
                id="set-salon-name"
                type="text"
                required
                value={salonName}
                onChange={(e) => setSalonName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-semibold text-slate-900"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tagline</label>
              <input
                id="set-tagline"
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700"
              />
            </div>
          </div>
        </div>

        {/* Address & Contact */}
        <div>
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 mb-4">
            Location & Contact Details
          </h3>
          <div className="space-y-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Full Physical Address *</label>
              <textarea
                id="set-address"
                rows={2}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Phone / WhatsApp *</label>
                <input
                  id="set-phone"
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-slate-800"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Official Email</label>
                <input
                  id="set-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* GST & Taxation */}
        <div>
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 mb-4">
            Indian GST & Invoicing Configuration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">GSTIN Number</label>
              <input
                id="set-gst-number"
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                placeholder="29AABCG1234F1Z5"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Default GST Tax Rate (%)</label>
              <input
                id="set-tax-rate"
                type="number"
                min="0"
                max="28"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Usually 18% for Salon & Spa Services</span>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Invoice Prefix</label>
              <input
                id="set-inv-prefix"
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                placeholder="GD-2026-"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>
        </div>

        {/* Operational Hours */}
        <div>
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 mb-4">
            Salon Operating Hours
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Opening Time</label>
              <input
                id="set-opening-time"
                type="text"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                placeholder="09:00 AM"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Closing Time</label>
              <input
                id="set-closing-time"
                type="text"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                placeholder="09:00 PM"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            id="set-save-btn"
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-2"
          >
            <Save className="h-4 w-4 text-amber-400" />
            <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
