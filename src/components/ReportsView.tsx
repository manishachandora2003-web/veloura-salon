import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  IndianRupee,
  Calendar,
  Users,
  Award,
  CreditCard,
  Receipt,
  FileSpreadsheet,
  PieChart,
} from 'lucide-react';
import { ReportsData } from '../types.ts';
import { formatCurrency, formatNumber } from '../lib/currency.ts';
import { api } from '../services/api.ts';

export const ReportsView: React.FC = () => {
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getReports()
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !reports) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-slate-100 rounded-xl"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-64 bg-slate-100 rounded-xl"></div>
          <div className="h-64 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const { summary, paymentMethodBreakdown, topServices, staffPerformance } = reports;

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Salon Financial & Operations Reports</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated purely from real invoices, customer visits, payments and operational expenses in PostgreSQL
          </p>
        </div>
        <div className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-lg">
          Fiscal Year 2026-27 (India)
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Billed Revenue
          </span>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {formatCurrency(summary.totalRevenue)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">From {summary.totalInvoices} issued customer bills</p>
        </div>

        {/* Total Collected */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Cash & UPI Received
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">
            {formatCurrency(summary.totalPaid)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Realized bank & cash counter funds</p>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Operating Expenses
          </span>
          <div className="text-2xl font-extrabold text-rose-600 mt-2">
            {formatCurrency(summary.totalExpenses)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Rent, electricity, stock, and payouts</p>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Net Salon Profit
          </span>
          <div
            className={`text-2xl font-extrabold mt-2 ${
              summary.netProfit >= 0 ? 'text-slate-900' : 'text-rose-600'
            }`}
          >
            {formatCurrency(summary.netProfit)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Collections minus operational costs
          </p>
        </div>
      </div>

      {/* Tax & Receivables Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-medium">Total GST Collected (18%):</span>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">
              {formatCurrency(summary.totalTax)}
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-400">
            <div>CGST 9%: {formatCurrency(Math.round(summary.totalTax / 2))}</div>
            <div>SGST 9%: {formatCurrency(Math.round(summary.totalTax / 2))}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 font-medium">Outstanding Balances (Receivables):</span>
            <div className="text-lg font-extrabold text-amber-600 mt-0.5">
              {formatCurrency(summary.totalPending)}
            </div>
          </div>
          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 font-medium">
            Due from Partial Bills
          </span>
        </div>
      </div>

      {/* Middle Grid: Payment Modes & Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Payment Method Breakdown */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <CreditCard className="h-4 w-4 text-slate-500" />
            <h3 className="font-bold text-slate-900 text-sm">Payment Collections Breakdown</h3>
          </div>

          {paymentMethodBreakdown.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No payment transactions recorded.</p>
          ) : (
            <div className="space-y-3">
              {paymentMethodBreakdown.map((pm) => {
                const totalCollections = paymentMethodBreakdown.reduce((acc, x) => acc + x.total, 0);
                const percent = totalCollections > 0 ? Math.round((pm.total / totalCollections) * 100) : 0;
                return (
                  <div key={pm.method} className="space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">{pm.method}</span>
                      <span className="text-slate-500 font-medium">
                        {formatCurrency(pm.total)} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-500 h-2 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Performing Services */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Award className="h-4 w-4 text-slate-500" />
            <h3 className="font-bold text-slate-900 text-sm">Top Services by Revenue</h3>
          </div>

          {topServices.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No service billing data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                    <th className="py-2">Service Name</th>
                    <th className="py-2 text-center">Bookings Done</th>
                    <th className="py-2 text-right">Revenue Brought In</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topServices.map((svc, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 font-bold text-slate-900 flex items-center space-x-2">
                        <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                        <span>{svc.serviceName}</span>
                      </td>
                      <td className="py-2.5 text-center font-medium text-slate-700">{svc.count} times</td>
                      <td className="py-2.5 text-right font-extrabold text-slate-900">
                        {formatCurrency(svc.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Table: Staff Performance & Commission Report */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-slate-500" />
            <h3 className="font-bold text-slate-900 text-sm">Staff Revenue & Commission Ledger</h3>
          </div>
          <span className="text-xs text-slate-400">Calculated strictly from service allocations</span>
        </div>

        {staffPerformance.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No staff performance data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50">
                  <th className="py-3 px-3">Stylist / Staff Name</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3 text-center">Appointments Done</th>
                  <th className="py-3 px-3">Gross Sales Generated</th>
                  <th className="py-3 px-3">Commission Rate</th>
                  <th className="py-3 px-3 text-right">Commission Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffPerformance.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold text-slate-900">{st.name}</td>
                    <td className="py-3 px-3 text-slate-600">{st.role}</td>
                    <td className="py-3 px-3 text-center font-medium text-slate-800">
                      {st.appointmentCount}
                    </td>
                    <td className="py-3 px-3 font-extrabold text-slate-900">
                      {formatCurrency(st.revenueGenerated)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">{st.commissionPercentage}%</td>
                    <td className="py-3 px-3 text-right font-extrabold text-emerald-700">
                      {formatCurrency(st.commissionEarned)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
