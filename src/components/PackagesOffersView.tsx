import React, { useState } from 'react';
import {
  Sparkles,
  Tag,
  Plus,
  Calendar,
  IndianRupee,
  Gift,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react';
import { Package, Offer, Service } from '../types.ts';
import { formatCurrency } from '../lib/currency.ts';
import { api } from '../services/api.ts';

interface PackagesOffersViewProps {
  packages: Package[];
  offers: Offer[];
  services: Service[];
  onRefreshData: () => void;
}

export const PackagesOffersView: React.FC<PackagesOffersViewProps> = ({
  packages,
  offers,
  services,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'packages' | 'offers'>('packages');
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);

  // Package Form
  const [pkgName, setPkgName] = useState('');
  const [pkgDesc, setPkgDesc] = useState('');
  const [pkgPrice, setPkgPrice] = useState(4500);
  const [pkgValidity, setPkgValidity] = useState(90);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [submittingPkg, setSubmittingPkg] = useState(false);

  // Offer Form
  const [offerTitle, setOfferTitle] = useState('');
  const [offerCode, setOfferCode] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [offerDiscountType, setOfferDiscountType] = useState('PERCENT');
  const [offerDiscountValue, setOfferDiscountValue] = useState(15);
  const [minBillAmount, setMinBillAmount] = useState(1000);
  const [offerEndDate, setOfferEndDate] = useState('2026-12-31');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  const handleToggleService = (id: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgName.trim()) return;

    setSubmittingPkg(true);
    try {
      await api.createPackage({
        name: pkgName.trim(),
        description: pkgDesc.trim() || undefined,
        price: Number(pkgPrice),
        validityDays: Number(pkgValidity),
        serviceIds: selectedServiceIds,
      });

      setPkgName('');
      setPkgDesc('');
      setSelectedServiceIds([]);
      setShowPackageModal(false);
      onRefreshData();
    } catch (e: any) {
      alert(e.message || 'Error saving package');
    } finally {
      setSubmittingPkg(false);
    }
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle.trim() || !offerCode.trim()) return;

    setSubmittingOffer(true);
    try {
      await api.createOffer({
        title: offerTitle.trim(),
        code: offerCode.trim().toUpperCase(),
        description: offerDesc.trim() || undefined,
        discountType: offerDiscountType,
        discountValue: Number(offerDiscountValue),
        minBillAmount: Number(minBillAmount),
        endDate: offerEndDate,
      });

      setOfferTitle('');
      setOfferCode('');
      setOfferDesc('');
      setShowOfferModal(false);
      onRefreshData();
    } catch (e: any) {
      alert(e.message || 'Error saving offer');
    } finally {
      setSubmittingOffer(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Tab Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex space-x-2">
          <button
            id="tab-packages-list"
            onClick={() => setActiveTab('packages')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'packages'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Bundled Packages ({packages.length})
          </button>
          <button
            id="tab-offers-list"
            onClick={() => setActiveTab('offers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'offers'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Promotions & Coupons ({offers.length})
          </button>
        </div>

        {activeTab === 'packages' ? (
          <button
            id="btn-add-package"
            onClick={() => setShowPackageModal(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5"
          >
            <Plus className="h-4 w-4 text-amber-400" />
            <span>Create Package</span>
          </button>
        ) : (
          <button
            id="btn-add-offer"
            onClick={() => setShowOfferModal(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5"
          >
            <Plus className="h-4 w-4 text-amber-400" />
            <span>Create Promo Offer</span>
          </button>
        )}
      </div>

      {activeTab === 'packages' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              id={`package-card-${pkg.id}`}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 p-5 transition-all shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Package Deal
                  </span>
                  <span className="text-xs text-slate-400 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {pkg.validityDays} days validity
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base">{pkg.name}</h3>
                {pkg.description && (
                  <p className="text-xs text-slate-500 mt-1">{pkg.description}</p>
                )}

                {pkg.services && pkg.services.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Included Services ({pkg.services.length})
                    </span>
                    <ul className="space-y-1">
                      {pkg.services.map((s, idx) => (
                        <li key={idx} className="text-xs text-slate-700 flex items-center">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 mr-1.5 shrink-0" />
                          <span>{s.serviceName}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Bundle Price</span>
                  <div className="text-lg font-extrabold text-slate-900">{formatCurrency(pkg.price)}</div>
                </div>

                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  Active in POS
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {offers.map((off) => (
            <div
              key={off.id}
              id={`offer-card-${off.id}`}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 p-5 transition-all shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-xs bg-slate-900 text-amber-400 px-2.5 py-1 rounded-lg tracking-wider">
                    {off.code}
                  </span>
                  <span className="text-[11px] text-slate-400">Till {off.endDate}</span>
                </div>

                <h3 className="font-bold text-slate-900 text-base mt-2">{off.title}</h3>
                {off.description && (
                  <p className="text-xs text-slate-500 mt-1">{off.description}</p>
                )}

                <div className="mt-4 p-3 bg-amber-50/70 border border-amber-100 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Discount:</span>
                    <strong className="text-amber-900">
                      {off.discountType === 'PERCENT' ? `${off.discountValue}% OFF` : `₹${off.discountValue} FLAT OFF`}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Minimum Bill:</span>
                    <strong className="text-slate-800">{formatCurrency(off.minBillAmount)}</strong>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{off.usedCount || 0} Times Redeemed</span>
                <span className="text-emerald-600 font-bold">Valid & Live</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Package Creation Modal */}
      {showPackageModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 relative">
            <button
              onClick={() => setShowPackageModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base mb-1">Create Salon Package</h3>
            <p className="text-xs text-slate-500 mb-4">Combine multiple services into a discounted bundle</p>

            <form onSubmit={handleSavePackage} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Package Name *</label>
                <input
                  type="text"
                  required
                  value={pkgName}
                  onChange={(e) => setPkgName(e.target.value)}
                  placeholder="e.g. Bridal Glow Package"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Bundle Price (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={pkgPrice}
                    onChange={(e) => setPkgPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={pkgValidity}
                    onChange={(e) => setPkgValidity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Included Services</label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50/50">
                  {services.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center justify-between p-1.5 hover:bg-white rounded cursor-pointer text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedServiceIds.includes(s.id)}
                          onChange={() => handleToggleService(s.id)}
                          className="rounded text-amber-500 focus:ring-amber-500"
                        />
                        <span className="font-medium text-slate-800">{s.name}</span>
                      </div>
                      <span className="text-slate-400">{formatCurrency(s.price)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPackageModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPkg}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-xs"
                >
                  {submittingPkg ? 'Saving...' : 'Save Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Offer Creation Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 relative">
            <button
              onClick={() => setShowOfferModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base mb-1">Create Promotional Offer</h3>
            <p className="text-xs text-slate-500 mb-4">Set discount coupon codes for checkout</p>

            <form onSubmit={handleSaveOffer} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Offer Title *</label>
                <input
                  type="text"
                  required
                  value={offerTitle}
                  onChange={(e) => setOfferTitle(e.target.value)}
                  placeholder="e.g. Festive Glow Special"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    value={offerCode}
                    onChange={(e) => setOfferCode(e.target.value.toUpperCase())}
                    placeholder="e.g. FESTIVE20"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Discount Type</label>
                  <select
                    value={offerDiscountType}
                    onChange={(e) => setOfferDiscountType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="PERCENT">Percentage (%)</option>
                    <option value="FIXED">Flat Rupee (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Discount Value *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={offerDiscountValue}
                    onChange={(e) => setOfferDiscountValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Min Bill Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={minBillAmount}
                    onChange={(e) => setMinBillAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={offerEndDate}
                  onChange={(e) => setOfferEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowOfferModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOffer}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-xs"
                >
                  {submittingOffer ? 'Saving...' : 'Save Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
