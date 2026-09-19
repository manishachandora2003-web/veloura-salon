import React, { useState } from 'react';
import {
  IndianRupee,
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  X,
  PieChart,
} from 'lucide-react';
import { Expense } from '../types.ts';
import { formatCurrency, formatNumber } from '../lib/currency.ts';
import { api } from '../services/api.ts';

interface ExpensesViewProps {
  expenses: Expense[];
  onRefreshData: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ expenses, onRefreshData }) => {
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Electricity');
  const [amount, setAmount] = useState<number>(1500);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    'ALL',
    'Rent',
    'Electricity',
    'Salaries',
    'Inventory Purchase',
    'Refreshments',
    'Maintenance',
    'Marketing',
    'Laundry',
    'Miscellaneous',
  ];

  const filtered = expenses.filter(
    (exp) => categoryFilter === 'ALL' || exp.category === categoryFilter
  );

  const totalExpenseAmount = filtered.reduce((acc, exp) => acc + exp.amount, 0);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) return;

    setSubmitting(true);
    try {
      await api.createExpense({
        title: title.trim(),
        category,
        amount: Number(amount),
        paymentMethod,
        date,
        notes: notes.trim() || undefined,
        vendorName: vendorName.trim() || undefined,
      });

      setTitle('');
      setAmount(1500);
      setNotes('');
      setVendorName('');
      setShowAddModal(false);
      onRefreshData();
    } catch (e: any) {
      alert(e.message || 'Error recording expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (confirm('Delete this expense entry?')) {
      try {
        await api.deleteExpense(id);
        onRefreshData();
      } catch (e: any) {
        alert(e.message || 'Error deleting expense');
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Metric */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Operational Expenses ({filtered.length} entries)
          </span>
          <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
            {formatCurrency(totalExpenseAmount)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Recorded rent, electricity (BESCOM), staff payouts, and supplies
          </p>
        </div>

        <button
          id="expense-add-btn"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5 shrink-0"
        >
          <Plus className="h-4 w-4 text-amber-400" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            id={`expense-cat-${cat.toLowerCase().replace(' ', '-')}`}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              categoryFilter === cat
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <IndianRupee className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No expenses recorded</p>
            <p className="text-slate-400 mt-1">Click "Record Expense" to add salon costs.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Title / Purpose</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Vendor / Payee</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((exp) => (
                  <tr key={exp.id} id={`expense-row-${exp.id}`} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{exp.date}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{exp.title}</div>
                      {exp.notes && <div className="text-[10px] text-slate-400">{exp.notes}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{exp.vendorName || '—'}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{exp.paymentMethod}</td>
                    <td className="py-3 px-4 font-extrabold text-slate-900 text-sm">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        id={`expense-del-${exp.id}`}
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded"
                        title="Delete Entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base mb-1">Record Salon Expense</h3>
            <p className="text-xs text-slate-500 mb-4">Track operational overheads and bills</p>

            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Expense Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. BESCOM Electricity Bill June, Chai & Snacks"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Electricity">Electricity (BESCOM / State)</option>
                    <option value="Rent">Shop Rent</option>
                    <option value="Salaries">Staff Salary Payout</option>
                    <option value="Inventory Purchase">Inventory Purchase</option>
                    <option value="Refreshments">Refreshments / Tea</option>
                    <option value="Maintenance">Maintenance & Repairs</option>
                    <option value="Marketing">Marketing & Ads</option>
                    <option value="Laundry">Towel Laundry</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="Cash">Cash Counter</option>
                    <option value="Bank Transfer">NEFT / NetBanking</option>
                    <option value="Debit Card">Debit Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Vendor / Payee</label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g. BESCOM, Landlord, Chaiwala"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional reference or transaction id..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-xs"
                >
                  {submitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
