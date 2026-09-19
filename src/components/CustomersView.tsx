import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  IndianRupee,
  Award,
  Clock,
  MapPin,
  FileText,
  X,
  Eye,
  Trash2,
} from 'lucide-react';
import { Customer, Appointment, Invoice, Payment } from '../types.ts';
import { formatCurrency, formatNumber } from '../lib/currency.ts';
import { api } from '../services/api.ts';

interface CustomersViewProps {
  customers: Customer[];
  onRefreshData: () => void;
  onViewInvoice: (invoiceId: number) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  onRefreshData,
  onViewInvoice,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDetail, setCustomerDetail] = useState<{
    customer: Customer;
    appointments: Appointment[];
    invoices: Invoice[];
    payments: Payment[];
    loyalty: any;
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // New Customer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formGender, setFormGender] = useState('Female');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formPreferences, setFormPreferences] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filtered customer list
  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  // View Customer Full Profile
  const handleOpenDetail = async (id: number) => {
    setSelectedCustomerId(id);
    setLoadingDetail(true);
    try {
      const data = await api.getCustomer(id);
      setCustomerDetail(data);
    } catch (e: any) {
      alert(e.message || 'Failed to load customer profile');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Submit new customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      setFormError('Customer name and phone number are required.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await api.createCustomer({
        name: formName.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim() || undefined,
        dob: formDob || undefined,
        gender: formGender,
        address: formAddress.trim() || undefined,
        notes: formNotes.trim() || undefined,
        preferences: formPreferences.trim() || undefined,
      });

      // Reset
      setFormName('');
      setFormPhone('');
      setFormEmail('');
      setFormDob('');
      setFormAddress('');
      setFormNotes('');
      setFormPreferences('');
      setShowAddModal(false);
      onRefreshData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create customer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
          <input
            id="crm-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone (e.g. 9876543210)..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <button
          id="crm-add-customer-btn"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5"
        >
          <Plus className="h-4 w-4 text-amber-400" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No customers found</p>
            <p className="text-slate-400 mt-1">Try adjusting your search or add a new customer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50">
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Gender</th>
                  <th className="py-3 px-4">Visits</th>
                  <th className="py-3 px-4">Total Spent</th>
                  <th className="py-3 px-4">Loyalty Balance</th>
                  <th className="py-3 px-4">Preferences / Notes</th>
                  <th className="py-3 px-4 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} id={`crm-customer-row-${c.id}`} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      {c.address && <div className="text-[10px] text-slate-400 truncate max-w-xs">{c.address}</div>}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      <div>{c.phone}</div>
                      {c.email && <div className="text-[10px] text-slate-400">{c.email}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{c.gender || '—'}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{c.totalVisits} visits</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{formatCurrency(c.totalSpent)}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Award className="h-2.5 w-2.5 mr-1 text-amber-500" />
                        {c.loyaltyPoints} Pts
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                      {c.preferences || c.notes || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        id={`crm-view-profile-${c.id}`}
                        onClick={() => handleOpenDetail(c.id)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] inline-flex items-center space-x-1"
                      >
                        <Eye className="h-3 w-3" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Full Profile Drawer / Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
            <button
              id="crm-close-detail-modal"
              onClick={() => {
                setSelectedCustomerId(null);
                setCustomerDetail(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            {loadingDetail || !customerDetail ? (
              <div className="py-16 text-center text-slate-400">Loading profile data...</div>
            ) : (
              <div className="space-y-6">
                {/* Header Profile */}
                <div className="border-b border-slate-100 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-lg">
                      {customerDetail.customer.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{customerDetail.customer.name}</h2>
                      <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                        <span>{customerDetail.customer.phone}</span>
                        {customerDetail.customer.email && <span>• {customerDetail.customer.email}</span>}
                        {customerDetail.customer.gender && <span>• {customerDetail.customer.gender}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100 text-center">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Total Visits</div>
                      <div className="text-base font-extrabold text-slate-800">
                        {customerDetail.customer.totalVisits}
                      </div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Total Spent</div>
                      <div className="text-base font-extrabold text-slate-900">
                        {formatCurrency(customerDetail.customer.totalSpent)}
                      </div>
                    </div>
                    <div className="p-2 bg-amber-50 rounded-lg">
                      <div className="text-[10px] text-amber-700 font-bold uppercase">Loyalty Points</div>
                      <div className="text-base font-extrabold text-amber-800">
                        {customerDetail.customer.loyaltyPoints} Pts
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes & Preferences */}
                {(customerDetail.customer.preferences || customerDetail.customer.notes) && (
                  <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3 text-xs space-y-1">
                    {customerDetail.customer.preferences && (
                      <p>
                        <strong className="text-amber-900">Preferences:</strong> {customerDetail.customer.preferences}
                      </p>
                    )}
                    {customerDetail.customer.notes && (
                      <p>
                        <strong className="text-amber-900">Styling Notes:</strong> {customerDetail.customer.notes}
                      </p>
                    )}
                  </div>
                )}

                {/* Appointment History */}
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Appointment History ({customerDetail.appointments.length})
                  </h3>
                  {customerDetail.appointments.length === 0 ? (
                    <p className="text-xs text-slate-400">No appointments recorded yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {customerDetail.appointments.map((a) => (
                        <div
                          key={a.id}
                          className="p-2.5 bg-slate-50 rounded-lg text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{a.date} at {a.startTime}</span>
                            <span className="text-slate-500 ml-2">Stylist: {a.staffName}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200">
                              {a.status}
                            </span>
                            <span className="font-bold text-slate-900">{formatCurrency(a.totalAmount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Invoices History */}
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Past Invoices & Receipts ({customerDetail.invoices.length})
                  </h3>
                  {customerDetail.invoices.length === 0 ? (
                    <p className="text-xs text-slate-400">No invoices recorded yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {customerDetail.invoices.map((inv) => (
                        <div
                          key={inv.id}
                          onClick={() => {
                            setSelectedCustomerId(null);
                            onViewInvoice(inv.id);
                          }}
                          className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{inv.invoiceNumber}</span>
                            <span className="text-slate-500 ml-2">{inv.date}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                inv.status === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : inv.status === 'Partial'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {inv.status}
                            </span>
                            <span className="font-bold text-slate-900">{formatCurrency(inv.grandTotal)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add New Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 relative">
            <button
              id="crm-modal-close"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 mb-1">Add New Customer</h2>
            <p className="text-xs text-slate-500 mb-4">Register client into salon CRM database</p>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                <input
                  id="crm-form-name"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Priya Patel"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number *</label>
                  <input
                    id="crm-form-phone"
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Gender</label>
                  <select
                    id="crm-form-gender"
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  id="crm-form-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. priya@gmail.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Date of Birth</label>
                <input
                  id="crm-form-dob"
                  type="date"
                  value={formDob}
                  onChange={(e) => setFormDob(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Preferences & Notes</label>
                <textarea
                  id="crm-form-notes"
                  rows={2}
                  value={formPreferences}
                  onChange={(e) => setFormPreferences(e.target.value)}
                  placeholder="Preferred stylist, scalp sensitivity, allergy notes..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  id="crm-submit-customer-btn"
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-xs transition-colors"
                >
                  {submitting ? 'Saving...' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
