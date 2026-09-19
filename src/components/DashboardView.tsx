import React from 'react';
import {
  Calendar,
  IndianRupee,
  TrendingUp,
  Clock,
  Users,
  AlertCircle,
  Receipt,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { DashboardData, UserRole, Appointment, Invoice } from '../types.ts';
import { formatCurrency, formatNumber } from '../lib/currency.ts';

interface DashboardViewProps {
  stats: DashboardData | null;
  loading: boolean;
  onOpenNewBill: () => void;
  onOpenNewAppointment: () => void;
  onSelectTab: (tab: string) => void;
  onViewInvoice: (invoiceId: number) => void;
  onLoadDemoData: () => void;
  currentRole: UserRole;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  loading,
  onOpenNewBill,
  onOpenNewAppointment,
  onSelectTab,
  onViewInvoice,
  onLoadDemoData,
  currentRole,
}) => {
  if (loading || !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl"></div>
          ))}
        </div>
        <div className="h-72 bg-slate-100 rounded-xl"></div>
      </div>
    );
  }

  const isBrandNewSalon =
    stats.todayAppointmentsCount === 0 &&
    stats.todayRevenue === 0 &&
    stats.totalCustomers === 0 &&
    stats.allTimeRevenue === 0;

  return (
    <div className="space-y-6">
      {/* Brand New Salon / Clean State Guidance */}
      {isBrandNewSalon && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl mt-0.5">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Welcome to Veloura 🎀 Salon Manager! (Real Database Mode)
                </h3>
                <p className="text-xs text-amber-800 mt-1 max-w-2xl leading-relaxed">
                  The system has been bootstrapped with your <strong>31 Predefined Services</strong> and <strong>35 Specialized Staff Members</strong>.
                  No fake revenue or random numbers are generated. You can begin adding real clients and booking appointments right away,
                  or load authentic salon demo records to explore all features.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 shrink-0">
              <button
                id="dashboard-load-demo-btn"
                onClick={onLoadDemoData}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Load Demo Data</span>
              </button>
              <button
                id="dashboard-create-first-bill"
                onClick={onOpenNewBill}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
              >
                Create First Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary KPI Grid (All values derived 100% from PostgreSQL records) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Today's Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Today's Revenue</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(stats.todayRevenue)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Real cash & UPI receipts collected today</p>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Today's Bookings</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {stats.todayAppointmentsCount} Slots
            </div>
            <p className="text-xs text-slate-500 mt-1">Scheduled salon appointments today</p>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Balance</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-amber-600 tracking-tight">
              {formatCurrency(stats.pendingPayments)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Outstanding receivable balances</p>
          </div>
        </div>

        {/* Net Revenue / Profit */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Today's Net Revenue</span>
            <div className={`p-2 rounded-lg ${stats.netRevenue >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-extrabold tracking-tight ${stats.netRevenue >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              {formatCurrency(stats.netRevenue)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              After ₹{formatNumber(stats.todayExpenses)} today's expenses
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs text-xs">
        <div className="flex items-center space-x-3 p-2">
          <Users className="h-4 w-4 text-slate-400" />
          <div>
            <div className="font-bold text-slate-800">{stats.totalCustomers} Customers</div>
            <span className="text-slate-400 text-[11px]">Total registered CRM</span>
          </div>
        </div>
        <div className="flex items-center space-x-3 p-2 border-l border-slate-100">
          <Users className="h-4 w-4 text-slate-400" />
          <div>
            <div className="font-bold text-slate-800">{stats.activeStaff} Staff On Duty</div>
            <span className="text-slate-400 text-[11px]">Active stylists & specialists</span>
          </div>
        </div>
        <div className="flex items-center space-x-3 p-2 border-l border-slate-100">
          <AlertCircle className={`h-4 w-4 ${stats.lowStockCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
          <div>
            <div className={`font-bold ${stats.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {stats.lowStockCount} Low Stock
            </div>
            <span className="text-slate-400 text-[11px]">Items below safety threshold</span>
          </div>
        </div>
        <div className="flex items-center space-x-3 p-2 border-l border-slate-100">
          <IndianRupee className="h-4 w-4 text-slate-400" />
          <div>
            <div className="font-bold text-slate-800">{formatCurrency(stats.allTimeRevenue)}</div>
            <span className="text-slate-400 text-[11px]">All-time revenue collected</span>
          </div>
        </div>
      </div>

      {/* Main Content Split: Today's Appointments & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Today's Schedule & Appointments */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900">Today's Schedule & Appointments</h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                id="dash-book-slot-btn"
                onClick={onOpenNewAppointment}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center space-x-1"
              >
                <Plus className="h-3 w-3" />
                <span>Book Slot</span>
              </button>
              <button
                id="dash-view-all-appointments"
                onClick={() => onSelectTab('appointments')}
                className="text-xs text-amber-600 hover:text-amber-700 font-semibold ml-2"
              >
                View Calendar →
              </button>
            </div>
          </div>

          <div className="p-4 flex-1">
            {stats.todayAppointments.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Calendar className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-600">No appointments scheduled for today</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Click "Book Slot" to schedule customer services</p>
                <button
                  id="dash-empty-book-btn"
                  onClick={onOpenNewAppointment}
                  className="mt-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg"
                >
                  Book Appointment
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {stats.todayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    id={`dash-appt-${apt.id}`}
                    className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-white transition-all flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-16 shrink-0 font-bold text-slate-700">
                        {apt.startTime}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center space-x-2">
                          <span>{apt.customerName}</span>
                          <span className="text-[11px] font-normal text-slate-400">{apt.customerPhone}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Assigned to: <strong className="text-slate-700">{apt.staffName}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          apt.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : apt.status === 'In Progress'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : apt.status === 'Confirmed'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {apt.status}
                      </span>
                      <div className="font-bold text-slate-900">{formatCurrency(apt.totalAmount)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Invoices & Billing Highlights */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Receipt className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900">Recent Invoices</h2>
            </div>
            <button
              id="dash-view-all-invoices"
              onClick={() => onSelectTab('pos')}
              className="text-xs text-amber-600 hover:text-amber-700 font-semibold"
            >
              Open POS →
            </button>
          </div>

          <div className="p-4 flex-1">
            {stats.recentInvoices.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Receipt className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-600">No invoices generated yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Use the POS counter to create client bills</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {stats.recentInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    id={`dash-inv-${inv.id}`}
                    onClick={() => onViewInvoice(inv.id)}
                    className="p-3 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50/80 cursor-pointer transition-all flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 flex items-center space-x-2">
                        <span>{inv.invoiceNumber}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'Partial'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {inv.customerName} • {inv.date}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-extrabold text-slate-900">{formatCurrency(inv.grandTotal)}</div>
                      {inv.balanceAmount > 0 ? (
                        <div className="text-[10px] font-medium text-amber-600">
                          Due: {formatCurrency(inv.balanceAmount)}
                        </div>
                      ) : (
                        <div className="text-[10px] font-medium text-emerald-600 flex items-center justify-end">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                          <span>Fully Paid</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
