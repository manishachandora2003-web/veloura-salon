import React, { useState } from 'react';
import {
  X,
  Printer,
  Receipt,
  IndianRupee,
  CheckCircle2,
  Clock,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { Invoice, Payment, SalonSettings } from '../types.ts';
import { formatCurrency, formatNumber } from '../lib/currency.ts';
import { api } from '../services/api.ts';

interface InvoiceModalProps {
  invoiceId: number;
  onClose: () => void;
  onRefreshData: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  invoiceId,
  onClose,
  onRefreshData,
}) => {
  const [data, setData] = useState<{
    invoice: Invoice;
    items: any[];
    payments: Payment[];
    salon: SalonSettings;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Partial balance payment form
  const [showPayForm, setShowPayForm] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState('UPI');
  const [payRef, setPayRef] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await api.getInvoice(invoiceId);
      setData(res);
      setPayAmount(res.invoice.balanceAmount);
    } catch (e: any) {
      alert(e.message || 'Error loading invoice');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const handlePrint = () => {
    window.print();
  };

  const handleCollectBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) return;

    setSubmittingPayment(true);
    try {
      await api.payInvoice(invoiceId, {
        amount: Number(payAmount),
        paymentMethod: payMethod,
        transactionReference: payRef.trim() || undefined,
      });

      setShowPayForm(false);
      onRefreshData();
      await fetchInvoice();
    } catch (e: any) {
      alert(e.message || 'Error recording payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center text-slate-500">
          Loading GST Invoice #{invoiceId}...
        </div>
      </div>
    );
  }

  const { invoice, items, payments, salon } = data;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 relative flex flex-col">
        {/* Modal Toolbar (Hidden during Print) */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center space-x-2">
            <Receipt className="h-5 w-5 text-amber-500" />
            <span className="font-bold text-slate-800 text-sm">Tax Invoice Preview</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                invoice.status === 'Paid'
                  ? 'bg-emerald-100 text-emerald-800'
                  : invoice.status === 'Partial'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {invoice.status}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {invoice.balanceAmount > 0 && (
              <button
                id="inv-btn-collect-due"
                onClick={() => setShowPayForm(!showPayForm)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
              >
                Collect Balance ({formatCurrency(invoice.balanceAmount)})
              </button>
            )}

            <button
              id="inv-btn-print"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Invoice</span>
            </button>

            <button
              id="inv-btn-close"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Partial Balance Payment Drawer */}
        {showPayForm && (
          <div className="p-4 bg-emerald-50 border-b border-emerald-100 print:hidden text-xs">
            <h4 className="font-bold text-emerald-900 mb-2">Record Outstanding Balance Payment</h4>
            <form onSubmit={handleCollectBalance} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-slate-600 font-medium block mb-1">Amount to Pay (₹)</label>
                <input
                  type="number"
                  min="1"
                  max={invoice.balanceAmount}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-bold"
                />
              </div>
              <div>
                <label className="text-slate-600 font-medium block mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="text-slate-600 font-medium block mb-1">Ref / Note</label>
                <input
                  type="text"
                  placeholder="UPI Txn ID"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded shadow-xs"
                >
                  {submittingPayment ? 'Saving...' : 'Submit Receipt'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Printable GST Tax Invoice Body */}
        <div id="printable-gst-invoice" className="p-8 text-slate-800 space-y-6 text-xs">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {salon?.salonName || 'Veloura 🎀 Luxury Salon & Spa'}
              </h1>
              <p className="text-slate-500 mt-0.5">{salon?.tagline || 'Luxury Hair, Beauty & Wellness'}</p>
              <p className="text-slate-600 max-w-xs mt-1 text-[11px] leading-relaxed">
                {salon?.address || 'Indiranagar, Bengaluru, Karnataka 560038'}
              </p>
              <p className="text-slate-600 mt-0.5 font-mono text-[11px]">
                Phone: {salon?.phone || '+91 98765 43210'} | Email: {salon?.email || 'contact@veloura.in'}
              </p>
              <div className="mt-2 inline-block px-2.5 py-1 bg-slate-100 rounded font-mono font-bold text-slate-800 text-[11px]">
                GSTIN: {salon?.gstNumber || '29AAAAA0000A1Z5'}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                TAX INVOICE
              </span>
              <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                {invoice.invoiceNumber}
              </div>
              <p className="text-slate-500 mt-1 font-mono text-[11px]">Date: {invoice.date}</p>
              <p className="text-slate-500 font-mono text-[11px]">Time: {invoice.time || '10:30 AM'}</p>
            </div>
          </div>

          {/* Customer Bill To */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Billed To Customer:
              </span>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{invoice.customerName}</div>
              <div className="text-slate-500 font-mono text-[11px]">{invoice.customerPhone}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Payment Status:
              </span>
              <span
                className={`font-bold text-xs inline-block mt-0.5 ${
                  invoice.status === 'Paid'
                    ? 'text-emerald-700'
                    : invoice.status === 'Partial'
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}
              >
                {invoice.status === 'Paid'
                  ? 'PAID IN FULL'
                  : invoice.status === 'Partial'
                  ? 'PARTIAL PAYMENT'
                  : 'PENDING'}
              </span>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-slate-900 text-slate-800 uppercase text-[10px] font-black">
                  <th className="py-2">#</th>
                  <th className="py-2">Service Description</th>
                  <th className="py-2">Stylist</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Rate</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="py-2.5 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 font-bold text-slate-900">{item.serviceName}</td>
                    <td className="py-2.5 text-slate-600">{item.staffName || 'Salon Stylist'}</td>
                    <td className="py-2.5 text-center text-slate-700">{item.quantity}</td>
                    <td className="py-2.5 text-right font-mono text-slate-700">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2.5 text-right font-bold font-mono text-slate-900">
                      {formatCurrency(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculations Summary */}
          <div className="border-t-2 border-slate-200 pt-3 flex justify-end">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
              </div>

              {invoice.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount</span>
                  <span className="font-mono">-{formatCurrency(invoice.discount)}</span>
                </div>
              )}

              {invoice.taxAmount > 0 && (
                <>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>CGST (9%)</span>
                    <span className="font-mono">+{formatCurrency(Math.round(invoice.taxAmount / 2))}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>SGST (9%)</span>
                    <span className="font-mono">+{formatCurrency(Math.round(invoice.taxAmount / 2))}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-300">
                <span>Grand Total</span>
                <span className="font-mono text-amber-600">{formatCurrency(invoice.grandTotal)}</span>
              </div>

              <div className="flex justify-between text-slate-700 pt-1">
                <span>Amount Paid</span>
                <span className="font-mono font-bold text-emerald-700">{formatCurrency(invoice.paidAmount)}</span>
              </div>

              {invoice.balanceAmount > 0 ? (
                <div className="flex justify-between text-amber-700 font-black text-xs pt-1 border-t border-dashed border-amber-200">
                  <span>Balance Due</span>
                  <span className="font-mono">{formatCurrency(invoice.balanceAmount)}</span>
                </div>
              ) : (
                <div className="text-right text-[11px] text-emerald-600 font-bold flex items-center justify-end pt-1">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  <span>Balance Cleared</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Receipts History */}
          {payments && payments.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Payment Transactions
              </span>
              <div className="space-y-1">
                {payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-[11px] text-slate-600 font-mono">
                    <span>
                      {p.paymentDate} • {p.paymentMethod} {p.transactionReference ? `(${p.transactionReference})` : ''}
                    </span>
                    <strong className="text-slate-900">{formatCurrency(p.amount)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div className="border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400">
            <p>Thank you for visiting {salon?.salonName || 'Veloura 🎀 Luxury Salon & Spa'}! We look forward to pampering you again.</p>
            <p className="mt-0.5 font-mono">Computer generated invoice • GST applicable under Services Accounting Code (SAC 9997)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
