import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  IndianRupee,
  Clock,
  User,
  Percent,
  FileText,
  Printer,
  CreditCard,
  QrCode,
  Banknote,
  Sparkles,
} from 'lucide-react';
import { Service, Customer, StaffMember, Invoice } from '../types.ts';
import { formatCurrency, formatNumber, calculateBillTotals } from '../lib/currency.ts';
import { api } from '../services/api.ts';

interface PosViewProps {
  services: Service[];
  customers: Customer[];
  staffList: StaffMember[];
  onInvoiceCreated: (invoice: Invoice) => void;
  onViewInvoice: (invoiceId: number) => void;
  onRefreshData: () => void;
}

export const PosView: React.FC<PosViewProps> = ({
  services,
  customers,
  staffList,
  onInvoiceCreated,
  onViewInvoice,
  onRefreshData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'checkout' | 'invoices'>('checkout');

  // Billing form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');

  // Items in current bill
  const [billItems, setBillItems] = useState<
    Array<{
      serviceId?: number;
      serviceName: string;
      staffId?: number;
      staffName?: string;
      price: number;
      quantity: number;
    }>
  >([]);

  // Category filter for service selector
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [serviceSearch, setServiceSearch] = useState('');

  // Discount & Tax settings
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [taxEnabled, setTaxEnabled] = useState<boolean>(true);
  const [taxRate, setTaxRate] = useState<number>(18);

  // Payment details
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [billingNotes, setBillingNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Invoices list state
  const [pastInvoices, setPastInvoices] = useState<Invoice[]>([]);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('ALL');
  const [invoiceSearch, setInvoiceSearch] = useState<string>('');
  const [loadingInvoices, setLoadingInvoices] = useState<boolean>(false);

  // Load past invoices when switching to invoices tab
  const fetchInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const data = await api.getInvoices(
        invoiceStatusFilter !== 'ALL' ? invoiceStatusFilter : undefined,
        invoiceSearch || undefined
      );
      setPastInvoices(data);
    } catch (e: any) {
      console.error('Error fetching invoices:', e);
    } finally {
      setLoadingInvoices(false);
    }
  };

  React.useEffect(() => {
    if (activeSubTab === 'invoices') {
      fetchInvoices();
    }
  }, [activeSubTab, invoiceStatusFilter, invoiceSearch]);

  // Derived category list
  const categories: string[] = ['ALL', ...Array.from(new Set(services.map((s) => s.categoryName))) as string[]];

  // Filtered services
  const filteredServices = services.filter((s) => {
    const matchesCat = selectedCategory === 'ALL' || s.categoryName === selectedCategory;
    const matchesSearch = !serviceSearch || s.name.toLowerCase().includes(serviceSearch.toLowerCase());
    return matchesCat && matchesSearch && s.isActive;
  });

  // Add service to bill
  const handleAddService = (service: Service) => {
    setBillItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.serviceId === service.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx].quantity += 1;
        return copy;
      }
      return [
        ...prev,
        {
          serviceId: service.id,
          serviceName: service.name,
          staffId: staffList[0]?.id || undefined,
          staffName: staffList[0]?.name || undefined,
          price: service.price,
          quantity: 1,
        },
      ];
    });
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setBillItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Update item staff or price
  const handleUpdateItemStaff = (index: number, staffId: number) => {
    const member = staffList.find((st) => st.id === staffId);
    setBillItems((prev) => {
      const copy = [...prev];
      copy[index].staffId = staffId;
      copy[index].staffName = member?.name;
      return copy;
    });
  };

  // Financial Calculations
  const rawSubtotal = billItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const numericDiscount =
    discountType === 'PERCENT'
      ? Math.round((rawSubtotal * Math.min(100, Math.max(0, discountValue))) / 100)
      : Math.min(rawSubtotal, Math.max(0, discountValue));

  const totals = calculateBillTotals(rawSubtotal, numericDiscount, taxRate, taxEnabled);

  // If paidAmountInput is empty, assume full payment by default
  const effectivePaid =
    paidAmountInput === '' ? totals.grandTotal : Math.max(0, Math.round(Number(paidAmountInput) || 0));
  const remainingBalance = Math.max(0, totals.grandTotal - effectivePaid);

  // Submit Bill
  const handleSubmitBill = async () => {
    if (billItems.length === 0) {
      setErrorMessage('Please add at least one service to the bill.');
      return;
    }

    if (!selectedCustomer && (!walkInName || !walkInPhone)) {
      setErrorMessage('Please select an existing customer or enter walk-in customer details.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await api.createBill({
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name || walkInName.trim(),
        customerPhone: selectedCustomer?.phone || walkInPhone.trim(),
        items: billItems,
        discount: numericDiscount,
        discountReason: discountReason || undefined,
        paidAmount: effectivePaid,
        paymentMethod,
        notes: billingNotes || undefined,
      });

      // Clear bill
      setBillItems([]);
      setSelectedCustomer(null);
      setWalkInName('');
      setWalkInPhone('');
      setDiscountValue(0);
      setDiscountReason('');
      setPaidAmountInput('');
      setBillingNotes('');

      onRefreshData();
      onInvoiceCreated(result.invoice);
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to create invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub Tabs: POS Counter / Past Invoices */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex space-x-2">
          <button
            id="pos-tab-checkout"
            onClick={() => setActiveSubTab('checkout')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
              activeSubTab === 'checkout'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            POS Billing Counter
          </button>
          <button
            id="pos-tab-invoices"
            onClick={() => setActiveSubTab('invoices')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
              activeSubTab === 'invoices'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Invoice History & Payments
          </button>
        </div>
      </div>

      {activeSubTab === 'checkout' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Service Selection Catalog (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Category Tabs */}
            <div className="flex space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  id={`cat-filter-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Service Search Box */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
              <input
                id="pos-service-search"
                type="text"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                placeholder="Search services (e.g. Haircut, Fruit Facial, Wax, Keratin)..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Services Grid (All 31 Services) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredServices.map((service) => (
                <button
                  key={service.id}
                  id={`pos-add-service-${service.id}`}
                  onClick={() => handleAddService(service)}
                  className="p-3 bg-white hover:bg-amber-50/50 rounded-xl border border-slate-200 hover:border-amber-300 transition-all text-left shadow-2xs group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        {service.categoryName}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {service.duration}m
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm mt-1.5 group-hover:text-amber-700 transition-colors">
                      {service.name}
                    </h3>
                    {service.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{service.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <span className="font-extrabold text-slate-900 text-sm">{formatCurrency(service.price)}</span>
                    <span className="text-xs font-semibold text-amber-600 group-hover:translate-x-0.5 transition-transform flex items-center">
                      <Plus className="h-3.5 w-3.5 mr-0.5" />
                      Add
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Bill Cart & Payment Processing (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Customer Selector Header */}
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Customer Information
                  </label>
                  {selectedCustomer && (
                    <button
                      id="pos-clear-selected-customer"
                      onClick={() => setSelectedCustomer(null)}
                      className="text-[11px] text-rose-600 hover:underline font-medium"
                    >
                      Clear / Change
                    </button>
                  )}
                </div>

                {selectedCustomer ? (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                        <User className="h-3.5 w-3.5 text-amber-600" />
                        <span>{selectedCustomer.name}</span>
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">{selectedCustomer.phone}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-amber-700 font-bold uppercase">Loyalty Balance</div>
                      <div className="font-extrabold text-amber-800">{selectedCustomer.loyaltyPoints} Pts</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Search Existing Customer */}
                    <div className="relative">
                      <input
                        id="pos-customer-search-input"
                        type="text"
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setShowCustomerDropdown(true);
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        placeholder="Search existing customer by name or phone..."
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                      />

                      {showCustomerDropdown && customerSearch.trim() && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto">
                          {customers
                            .filter(
                              (c) =>
                                c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                c.phone.includes(customerSearch)
                            )
                            .map((cust) => (
                              <button
                                key={cust.id}
                                id={`pos-select-cust-${cust.id}`}
                                onClick={() => {
                                  setSelectedCustomer(cust);
                                  setShowCustomerDropdown(false);
                                  setCustomerSearch('');
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between border-b border-slate-50"
                              >
                                <div>
                                  <span className="font-bold text-slate-900">{cust.name}</span>
                                  <span className="text-slate-400 ml-2">{cust.phone}</span>
                                </div>
                                <span className="text-[10px] text-amber-600 font-bold">{cust.loyaltyPoints} Pts</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Or Quick Walk-in Entry */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <input
                        id="pos-walkin-name"
                        type="text"
                        value={walkInName}
                        onChange={(e) => setWalkInName(e.target.value)}
                        placeholder="Walk-in name"
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                      />
                      <input
                        id="pos-walkin-phone"
                        type="text"
                        value={walkInPhone}
                        onChange={(e) => setWalkInPhone(e.target.value)}
                        placeholder="Phone (e.g. 9876543210)"
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Items List in Current Bill */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Bill Services ({billItems.length})
                </label>

                {billItems.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                    <Receipt className="h-6 w-6 mx-auto mb-1 text-slate-300" />
                    <p className="text-xs">No services added to bill</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click services on the left to add</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {billItems.map((item, idx) => (
                      <div
                        key={idx}
                        id={`pos-cart-item-${idx}`}
                        className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-xs flex items-center justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 truncate">{item.serviceName}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <select
                              value={item.staffId || ''}
                              onChange={(e) => handleUpdateItemStaff(idx, Number(e.target.value))}
                              className="text-[11px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-700"
                            >
                              <option value="">Assign Stylist...</option>
                              {staffList.map((st) => (
                                <option key={st.id} value={st.id}>
                                  {st.name} ({st.role})
                                </option>
                              ))}
                            </select>
                            <span className="text-[11px] text-slate-400">Qty: {item.quantity}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="font-bold text-slate-900">{formatCurrency(item.price * item.quantity)}</span>
                          <button
                            id={`pos-remove-item-${idx}`}
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Discount & Tax Options */}
              {billItems.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                  {/* Discount line */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600 font-medium">Discount:</span>
                    <div className="flex items-center space-x-1.5">
                      <div className="flex rounded-md border border-slate-200 overflow-hidden text-[11px]">
                        <button
                          type="button"
                          onClick={() => setDiscountType('FIXED')}
                          className={`px-2 py-0.5 font-bold ${
                            discountType === 'FIXED' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'
                          }`}
                        >
                          ₹
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiscountType('PERCENT')}
                          className={`px-2 py-0.5 font-bold ${
                            discountType === 'PERCENT' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'
                          }`}
                        >
                          %
                        </button>
                      </div>
                      <input
                        id="pos-discount-value"
                        type="number"
                        min="0"
                        value={discountValue || ''}
                        onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value)))}
                        placeholder="0"
                        className="w-20 px-2 py-1 border border-slate-200 rounded text-right text-xs"
                      />
                    </div>
                  </div>

                  {/* GST Tax Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">GST Tax ({taxRate}%):</span>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        id="pos-tax-toggle"
                        type="checkbox"
                        checked={taxEnabled}
                        onChange={(e) => setTaxEnabled(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                      />
                      <span className="text-[11px] text-slate-500">Apply GST (18%)</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            {billItems.length > 0 && (
              <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount</span>
                    <span>-{formatCurrency(totals.discount)}</span>
                  </div>
                )}
                {totals.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>GST (CGST 9% + SGST 9%)</span>
                    <span>+{formatCurrency(totals.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-100">
                  <span>Grand Total</span>
                  <span className="text-amber-600">{formatCurrency(totals.grandTotal)}</span>
                </div>

                {/* Payment Method Selector */}
                <div className="pt-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['UPI', 'Cash', 'Card', 'Bank Transfer'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        id={`pos-pay-method-${m.toLowerCase().replace(' ', '-')}`}
                        onClick={() => setPaymentMethod(m)}
                        className={`py-1.5 px-1 rounded-lg text-xs font-semibold text-center border transition-colors ${
                          paymentMethod === m
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Partial Payment Amount Input (Section 36 Compliance) */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-slate-600">Amount Paid Now</span>
                    <button
                      type="button"
                      id="pos-btn-full-pay"
                      onClick={() => setPaidAmountInput(String(totals.grandTotal))}
                      className="text-amber-600 hover:underline font-semibold"
                    >
                      Full Amount ({formatCurrency(totals.grandTotal)})
                    </button>
                  </div>
                  <div className="relative">
                    <IndianRupee className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      id="pos-paid-amount-input"
                      type="number"
                      min="0"
                      max={totals.grandTotal}
                      value={paidAmountInput === '' ? totals.grandTotal : paidAmountInput}
                      onChange={(e) => setPaidAmountInput(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>

                  {remainingBalance > 0 && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg mt-2 text-[11px] text-amber-800 flex items-center justify-between">
                      <span className="font-medium">Remaining Balance Due:</span>
                      <strong className="font-bold">{formatCurrency(remainingBalance)} (Partial Status)</strong>
                    </div>
                  )}
                </div>

                {errorMessage && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                    {errorMessage}
                  </div>
                )}

                {/* Final Checkout Button */}
                <button
                  id="pos-btn-generate-bill"
                  disabled={submitting}
                  onClick={handleSubmitBill}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm rounded-xl shadow-xs transition-colors mt-2 flex items-center justify-center space-x-2"
                >
                  <Receipt className="h-4 w-4" />
                  <span>
                    {submitting
                      ? 'Recording in Database...'
                      : `Generate Invoice & Collect ${formatCurrency(effectivePaid)}`}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Past Invoices & Partial Payments Sub-Tab */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <input
                id="pos-invoices-search"
                type="text"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                placeholder="Search invoice number or customer..."
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs w-64 placeholder-slate-400"
              />
            </div>
            <div className="flex space-x-1.5">
              {['ALL', 'Paid', 'Partial', 'Pending'].map((st) => (
                <button
                  key={st}
                  id={`pos-inv-filter-${st.toLowerCase()}`}
                  onClick={() => setInvoiceStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    invoiceStatusFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {loadingInvoices ? (
            <div className="py-12 text-center text-slate-400">Loading invoices...</div>
          ) : pastInvoices.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">No invoices found for this filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Invoice #</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Grand Total</th>
                    <th className="py-3 px-3">Paid</th>
                    <th className="py-3 px-3">Balance Due</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pastInvoices.map((inv) => (
                    <tr key={inv.id} id={`pos-invoice-row-${inv.id}`} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="py-3 px-3 text-slate-500">{inv.date}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {inv.customerName}
                        <div className="text-[10px] text-slate-400">{inv.customerPhone}</div>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">{formatCurrency(inv.grandTotal)}</td>
                      <td className="py-3 px-3 text-emerald-700 font-semibold">{formatCurrency(inv.paidAmount)}</td>
                      <td className="py-3 px-3">
                        {inv.balanceAmount > 0 ? (
                          <span className="font-bold text-amber-600">{formatCurrency(inv.balanceAmount)}</span>
                        ) : (
                          <span className="text-slate-400">₹0</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inv.status === 'Partial'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          id={`pos-view-inv-${inv.id}`}
                          onClick={() => onViewInvoice(inv.id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px]"
                        >
                          View / Print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
