import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  User,
  Phone,
  Scissors,
  CheckCircle2,
  PlayCircle,
  XCircle,
  Plus,
  Percent,
  LogOut,
  RefreshCw,
  Search,
  Check,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { Appointment, Service, StaffMember, Customer, SalonSettings } from '../types.ts';
import { api } from '../services/api.ts';
import { formatCurrency } from '../lib/currency.ts';

interface StaffDashboardProps {
  currentStaff: StaffMember;
  allStaff?: StaffMember[];
  services: Service[];
  settings: SalonSettings | null;
  onLogout: () => void;
  onRequestAdmin: () => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  currentStaff,
  allStaff,
  services,
  settings,
  onLogout,
  onRequestAdmin,
}) => {
  const [activeStaff, setActiveStaff] = useState<StaffMember>(currentStaff);
  const [staffDirectory, setStaffDirectory] = useState<StaffMember[]>(
    allStaff && allStaff.length > 0 ? allStaff : [currentStaff]
  );
  const [bookingStaffId, setBookingStaffId] = useState<number>(currentStaff.id);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'completed'>('today');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

  // Sync activeStaff with currentStaff prop
  useEffect(() => {
    setActiveStaff(currentStaff);
    setBookingStaffId(currentStaff.id);
  }, [currentStaff]);

  // Load all 35 staff directory if not fully passed
  useEffect(() => {
    if (allStaff && allStaff.length >= 35) {
      setStaffDirectory(allStaff);
    } else {
      api.getPublicStaff().then((list: any) => {
        if (list && list.length > 0) {
          setStaffDirectory(list);
        }
      }).catch(() => {});
    }
  }, [allStaff]);

  // New Client Booking Form State
  const [bookingCustType, setBookingCustType] = useState<'new' | 'existing'>('new');
  const [existingCustomers, setExistingCustomers] = useState<Customer[]>([]);
  const [custSearch, setCustSearch] = useState('');
  const [selectedExistingCust, setSelectedExistingCust] = useState<Customer | null>(null);

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<number>(services[0]?.id || 1);
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState<string>('11:00');
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccessCode, setBookingSuccessCode] = useState<string | null>(null);

  // Load Staff's specific appointments
  const fetchMyAppointments = async (targetStaffId?: number) => {
    try {
      setLoading(true);
      const idToFetch = targetStaffId !== undefined ? targetStaffId : activeStaff.id;
      const data = await api.getStaffMyAppointments(idToFetch);
      setAppointments(data);
    } catch (err) {
      console.error('Failed to load staff appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAppointments(activeStaff.id);
    // Load existing customers for search
    api.getCustomers().then(setExistingCustomers).catch(() => {});
  }, [activeStaff.id]);

  // Status Updater
  const handleUpdateStatus = async (appointmentId: number, newStatus: string) => {
    try {
      setStatusUpdatingId(appointmentId);
      await api.updateStaffAppointmentStatus(appointmentId, newStatus);
      await fetchMyAppointments(activeStaff.id);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Submit Staff Booking for Client
  const handleStaffBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    if (bookingCustType === 'new') {
      if (!clientName.trim()) {
        setBookingError('Please enter client full name.');
        return;
      }
      if (!clientPhone || clientPhone.replace(/\D/g, '').length < 10) {
        setBookingError('Please enter a valid 10-digit mobile number.');
        return;
      }
    } else {
      if (!selectedExistingCust) {
        setBookingError('Please search and select an existing customer.');
        return;
      }
    }

    try {
      setBookingSubmitting(true);
      const res = await api.staffBookForClient({
        customerId: bookingCustType === 'existing' && selectedExistingCust ? selectedExistingCust.id : undefined,
        customerName: bookingCustType === 'new' ? clientName.trim() : selectedExistingCust?.name,
        customerPhone: bookingCustType === 'new' ? clientPhone.trim() : selectedExistingCust?.phone,
        customerEmail: bookingCustType === 'new' ? clientEmail.trim() || undefined : selectedExistingCust?.email || undefined,
        serviceId: selectedServiceId,
        staffId: bookingStaffId,
        date: bookingDate,
        startTime: bookingTime,
        notes: bookingNotes || 'Booked directly by staff for client',
      });

      setBookingSuccessCode(res.bookingCode);
      await fetchMyAppointments(activeStaff.id);
      // Reset Form
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setBookingNotes('');
      setSelectedExistingCust(null);
    } catch (err: any) {
      setBookingError(err.message || 'Failed to complete client booking.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Split Appointments into Categories
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppts = appointments.filter((a) => a.date === todayStr);
  const upcomingAppts = appointments.filter((a) => a.date > todayStr && a.status !== 'Cancelled');
  const completedAppts = appointments.filter((a) => a.status === 'Completed');

  // Real Commission Calculation (REAL DATA ONLY - 0 if no completed bookings)
  const completedTotalRevenue = completedAppts.reduce((acc, a) => acc + (a.totalAmount || 0), 0);
  const commissionPercentage = activeStaff.commissionPercentage || (activeStaff.role === 'Helper' ? 4 : 5);
  const realCommissionEarned = Math.round((completedTotalRevenue * commissionPercentage) / 100);

  const displayedAppointments =
    activeTab === 'today' ? todayAppts : activeTab === 'upcoming' ? upcomingAppts : completedAppts;

  const selectedService = services.find((s) => s.id === selectedServiceId) || services[0];

  const timeSlots = [
    '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
    '12:30', '13:00', '13:30', '14:00', '14:30', '15:00',
    '15:30', '16:00', '16:30', '17:00', '17:30', '18:00',
    '18:30', '19:00', '19:30',
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                <Scissors className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-black text-base sm:text-lg tracking-tight">Veloura 🎀 Staff Portal</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Staff Only
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {settings?.salonName || 'Veloura 🎀 Luxury Salon & Spa'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                id="staff-book-client-top-btn"
                onClick={() => {
                  setBookingSuccessCode(null);
                  setBookingError(null);
                  setShowBookingModal(true);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                <span>Book for Client</span>
              </button>

              <button
                id="staff-try-admin-btn"
                onClick={() => setShowAccessDeniedModal(true)}
                className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 hidden sm:inline-flex items-center space-x-1"
                title="Admin Dashboard is restricted"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-slate-400" />
                <span>Admin View</span>
              </button>

              <button
                id="staff-logout-btn"
                onClick={onLogout}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Log Out & Return to Customer Website"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Staff Identity Banner & Stats */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          {/* Quick Staff Member Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-4 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Staff Schedule & Profile:
              </span>
              <select
                id="staff-profile-select"
                value={activeStaff.id}
                onChange={(e) => {
                  const targetId = Number(e.target.value);
                  const found = staffDirectory.find((st) => st.id === targetId);
                  if (found) {
                    setActiveStaff(found);
                    setBookingStaffId(found.id);
                  }
                }}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg px-3 py-1 text-xs font-bold text-slate-800 cursor-pointer focus:ring-2 focus:ring-amber-500"
              >
                {staffDirectory.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} — {st.role} ({st.staffCode})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
              <span className="font-medium">Active Staff Directory</span>
              <span className="text-amber-400">•</span>
              <span className="font-medium">{staffDirectory.length} Staff Members</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-4">
              <div className="h-14 w-14 rounded-2xl bg-amber-100 border border-amber-200 text-amber-900 flex items-center justify-center font-black text-xl shrink-0">
                {activeStaff.name.charAt(0)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-extrabold text-slate-900">{activeStaff.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    {activeStaff.role}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 text-slate-700">
                    ID: {activeStaff.staffCode}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5">
                  <span className="flex items-center space-x-1">
                    <Percent className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Commission Rate: <strong className="text-slate-800 font-bold">{commissionPercentage}%</strong></span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Hours: {activeStaff.workingHours || '10:00 AM - 07:00 PM'}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{activeStaff.phone}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Live Commission & Bookings Summary (REAL DATA ONLY) */}
            <div className="flex items-center gap-3 self-start md:self-auto">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-center min-w-[110px]">
                <p className="text-[11px] text-slate-500 font-medium">Today's Clients</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{todayAppts.length}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-center min-w-[110px]">
                <p className="text-[11px] text-slate-500 font-medium">Upcoming</p>
                <p className="text-xl font-black text-amber-700 mt-0.5">{upcomingAppts.length}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-center min-w-[130px]">
                <p className="text-[11px] text-emerald-700 font-medium">Real Commission ({commissionPercentage}%)</p>
                <p className="text-xl font-black text-emerald-800 mt-0.5">{formatCurrency(realCommissionEarned)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center space-x-2">
            <button
              id="staff-tab-today"
              onClick={() => setActiveTab('today')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'today'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Today's Schedule ({todayAppts.length})
            </button>
            <button
              id="staff-tab-upcoming"
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'upcoming'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Upcoming ({upcomingAppts.length})
            </button>
            <button
              id="staff-tab-completed"
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'completed'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Completed ({completedAppts.length})
            </button>
          </div>

          <button
            onClick={fetchMyAppointments}
            disabled={loading}
            className="text-xs text-slate-500 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100 flex items-center space-x-1"
            title="Refresh Schedule"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Appointments List */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <RefreshCw className="h-8 w-8 text-amber-500 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">Loading your schedule...</p>
          </div>
        ) : displayedAppointments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {activeTab === 'today'
                ? 'No appointments scheduled for today.'
                : activeTab === 'upcoming'
                ? 'No upcoming appointments yet.'
                : 'No completed appointments yet.'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Real appointments booked by customers online or by staff members will appear here automatically.
            </p>
            <button
              onClick={() => {
                setBookingSuccessCode(null);
                setBookingError(null);
                setShowBookingModal(true);
              }}
              className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Book Appointment for Client</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedAppointments.map((apt) => {
              const isToday = apt.date === todayStr;
              return (
                <div
                  key={apt.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
                >
                  <div className="space-y-3">
                    {/* Header: Date, Time & Source */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5 font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        <span>{apt.startTime} - {apt.endTime}</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500">
                        {apt.date}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="border-b border-slate-100 pb-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-slate-900 text-base">{apt.customerName}</h4>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            apt.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : apt.status === 'In Progress'
                              ? 'bg-amber-100 text-amber-800'
                              : apt.status === 'Confirmed'
                              ? 'bg-blue-100 text-blue-800'
                              : apt.status === 'Cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {apt.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center space-x-1 mt-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <a href={`tel:${apt.customerPhone}`} className="hover:text-amber-600 hover:underline">
                          {apt.customerPhone}
                        </a>
                      </p>
                    </div>

                    {/* Service & Price Info */}
                    <div className="space-y-1.5 text-xs">
                      {apt.services && apt.services.length > 0 ? (
                        apt.services.map((svc) => (
                          <div key={svc.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                            <span className="font-medium text-slate-800 truncate mr-2">{svc.serviceName}</span>
                            <span className="font-bold text-slate-900 shrink-0">{formatCurrency(svc.price)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                          <span className="font-medium text-slate-800">Salon Service</span>
                          <span className="font-bold text-slate-900">{formatCurrency(apt.totalAmount)}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Source: <strong className="text-slate-700">{apt.source || 'Direct'}</strong></span>
                        <span className="font-mono">Ref: {apt.bookingCode || `#${apt.id}`}</span>
                      </div>

                      {apt.notes && (
                        <p className="text-[11px] text-slate-600 italic bg-amber-50/70 p-2 rounded-md border border-amber-100">
                          "{apt.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions for active appointments */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                    {apt.status === 'Booked' || apt.status === 'Confirmed' ? (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(apt.id, 'In Progress')}
                          disabled={statusUpdatingId === apt.id}
                          className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold py-1.5 rounded-lg flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          <span>Start Service</span>
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(apt.id, 'Cancelled')}
                          disabled={statusUpdatingId === apt.id}
                          className="text-rose-600 hover:bg-rose-50 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    ) : apt.status === 'In Progress' ? (
                      <button
                        onClick={() => handleUpdateStatus(apt.id, 'Completed')}
                        disabled={statusUpdatingId === apt.id}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Mark Service Completed</span>
                      </button>
                    ) : apt.status === 'Completed' ? (
                      <div className="w-full text-center text-xs font-bold text-emerald-700 bg-emerald-50 py-1.5 rounded-lg border border-emerald-200">
                        ✓ Completed • Commission Eligible ({commissionPercentage}%)
                      </div>
                    ) : (
                      <div className="w-full text-center text-xs text-slate-400 italic py-1">
                        Cancelled
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ==================================================== */}
      {/* MODAL: STAFF BOOK APPOINTMENT FOR CLIENT */}
      {/* ==================================================== */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <h3 className="font-black text-lg text-slate-900">Book Client Appointment</h3>
                <p className="text-xs text-slate-500">Booked by {currentStaff.name} ({currentStaff.role})</p>
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {bookingSuccessCode ? (
              <div className="text-center py-6 space-y-4">
                <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900">Appointment Booked!</h4>
                  <p className="text-xs text-slate-500 mt-1">Booking saved directly to database with Source: <strong>Staff Booking</strong></p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-xs mx-auto">
                  <p className="text-xs text-slate-500">Booking Confirmation Code</p>
                  <p className="text-lg font-mono font-black text-amber-600 tracking-wider mt-0.5">{bookingSuccessCode}</p>
                </div>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Done & Return to Schedule
                </button>
              </div>
            ) : (
              <form onSubmit={handleStaffBookingSubmit} className="space-y-4 text-xs sm:text-sm">
                {bookingError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{bookingError}</span>
                  </div>
                )}

                {/* Customer Type Toggle */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Client Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBookingCustType('new')}
                      className={`py-2 px-3 rounded-lg font-bold text-xs transition-all ${
                        bookingCustType === 'new'
                          ? 'bg-amber-500 text-slate-950 shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      + New Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingCustType('existing')}
                      className={`py-2 px-3 rounded-lg font-bold text-xs transition-all ${
                        bookingCustType === 'existing'
                          ? 'bg-amber-500 text-slate-950 shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Existing Client
                    </button>
                  </div>
                </div>

                {/* Client Details */}
                {bookingCustType === 'new' ? (
                  <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Client Full Name *</label>
                      <input
                        type="text"
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="e.g. Radhika Roy"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Mobile Number (10 Digits) *</label>
                        <input
                          type="tel"
                          required
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="9876543210"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">Email (Optional)</label>
                        <input
                          type="email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="client@example.com"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <label className="font-semibold text-slate-700 block">Search Existing Customer</label>
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={custSearch}
                        onChange={(e) => setCustSearch(e.target.value)}
                        placeholder="Search by name or phone..."
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    {custSearch.length > 1 && (
                      <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 bg-white border border-slate-200 rounded-lg">
                        {existingCustomers
                          .filter(
                            (c) =>
                              c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
                              c.phone.includes(custSearch)
                          )
                          .slice(0, 5)
                          .map((c) => (
                            <button
                              type="button"
                              key={c.id}
                              onClick={() => {
                                setSelectedExistingCust(c);
                                setCustSearch('');
                              }}
                              className="w-full p-2 text-left hover:bg-amber-50 flex items-center justify-between text-xs"
                            >
                              <span className="font-bold text-slate-800">{c.name}</span>
                              <span className="font-mono text-slate-500">{c.phone}</span>
                            </button>
                          ))}
                      </div>
                    )}
                    {selectedExistingCust && (
                      <div className="bg-amber-100 text-amber-900 p-2 rounded-lg text-xs flex items-center justify-between font-medium">
                        <span>Selected: <strong>{selectedExistingCust.name}</strong> ({selectedExistingCust.phone})</span>
                        <button
                          type="button"
                          onClick={() => setSelectedExistingCust(null)}
                          className="text-rose-600 hover:text-rose-800 font-bold"
                        >
                          Change
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Service Selection (with exact preserved prices!) */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Select Service *</label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {formatCurrency(s.price)} ({s.duration || 30} mins)
                      </option>
                    ))}
                  </select>
                  {selectedService && (
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 px-1">
                      <span>Category: {selectedService.categoryName || 'Salon'}</span>
                      <span>Price: <strong className="text-slate-900 font-bold">{formatCurrency(selectedService.price)}</strong></span>
                    </div>
                  )}
                </div>

                {/* Staff Specialist Assignment (All 35 Staff Members Available) */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assign Staff Specialist *</label>
                  <select
                    value={bookingStaffId}
                    onChange={(e) => setBookingStaffId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    {staffDirectory.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.role} • {st.staffCode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Appointment Date *</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Start Time Slot *</label>
                    <select
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    >
                      {timeSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Client Notes / Requests</label>
                  <input
                    type="text"
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="e.g. Requested low heat styling or organic oil"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                {/* Summary & Submit */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingSubmitting}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {bookingSubmitting ? 'Confirming...' : 'Confirm Appointment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: ACCESS DENIED FOR ADMIN DASHBOARD */}
      {/* ==================================================== */}
      {showAccessDeniedModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="h-14 w-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900">Access Denied</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                The <strong>Admin Dashboard</strong> is restricted to salon owners and managers only.
                Staff accounts do not have permission to view salon revenue, sensitive financial reports, or business settings.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setShowAccessDeniedModal(false)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Understood, Return to Staff Portal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
