import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  Play,
  Check,
  Receipt,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Globe,
  RefreshCw,
  Search,
  MessageSquare,
  Send,
  Sparkles,
  Info,
  Smartphone,
} from 'lucide-react';
import { Appointment, StaffMember, Service } from '../types.ts';
import { formatCurrency } from '../lib/currency.ts';
import { api } from '../services/api.ts';

interface AppointmentsViewProps {
  appointments: Appointment[];
  staffList: StaffMember[];
  services: Service[];
  onOpenNewAppointment: () => void;
  onRefreshData: () => void;
  onCheckoutAppointment: (appointment: Appointment) => void;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  appointments,
  staffList,
  services,
  onOpenNewAppointment,
  onRefreshData,
  onCheckoutAppointment,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [dateScope, setDateScope] = useState<'UPCOMING' | 'TODAY' | 'DATE' | 'ALL'>('UPCOMING');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'day'>('list');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [whatsAppFeedback, setWhatsAppFeedback] = useState<{ id: number; message: string; success: boolean } | null>(null);

  // Navigate date
  const changeDateByDays = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
    setDateScope('DATE');
  };

  // Manual trigger for refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshData();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Filter appointments
  const filteredAppointments = appointments.filter((apt) => {
    // 1. Date Scope filter
    let matchesDate = true;
    if (dateScope === 'TODAY') {
      matchesDate = apt.date === todayStr;
    } else if (dateScope === 'DATE') {
      matchesDate = apt.date === selectedDate;
    } else if (dateScope === 'UPCOMING') {
      // Upcoming includes today and future, or active slots
      matchesDate = apt.date >= todayStr || apt.status === 'In Progress' || apt.status === 'Booked';
    } else if (dateScope === 'ALL') {
      matchesDate = true;
    }

    // 2. Staff filter
    const matchesStaff = selectedStaffFilter === 'ALL' || String(apt.staffId) === selectedStaffFilter;

    // 3. Status filter
    const matchesStatus = selectedStatusFilter === 'ALL' || apt.status === selectedStatusFilter;

    // 4. Source filter
    const matchesSource =
      selectedSourceFilter === 'ALL' ||
      (selectedSourceFilter === 'Online Booking'
        ? apt.source === 'Online Booking'
        : apt.source !== 'Online Booking');

    // 5. Search query filter (Customer Name, Phone, Booking Code, Staff Name)
    let matchesSearch = true;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (apt.customerName || '').toLowerCase().includes(q);
      const phoneMatch = (apt.customerPhone || '').includes(q);
      const codeMatch = (apt.bookingCode || '').toLowerCase().includes(q);
      const staffMatch = (apt.staffName || '').toLowerCase().includes(q);
      const serviceMatch = (apt.services || []).some((s) => (s.serviceName || '').toLowerCase().includes(q));
      matchesSearch = nameMatch || phoneMatch || codeMatch || staffMatch || serviceMatch;
    }

    return matchesDate && matchesStaff && matchesStatus && matchesSource && matchesSearch;
  });

  // Sort: Chronological by date then startTime
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const dDiff = a.date.localeCompare(b.date);
    if (dDiff !== 0) return dDiff;
    return a.startTime.localeCompare(b.startTime);
  });

  // Counts for scopes
  const countToday = appointments.filter((a) => a.date === todayStr).length;
  const countUpcoming = appointments.filter((a) => a.date >= todayStr && a.status !== 'Cancelled').length;
  const countAll = appointments.length;

  // Handle status update
  const handleUpdateStatus = async (id: number, status: any) => {
    try {
      await api.updateAppointment(id, { status });
      onRefreshData();
    } catch (e: any) {
      alert(e.message || 'Failed to update status.');
    }
  };

  // Handle WhatsApp Resend with automatic Twilio SMS Fallback
  const handleResendWhatsApp = async (appointmentId: number) => {
    setResendingId(appointmentId);
    setWhatsAppFeedback(null);
    try {
      const res = await api.resendWhatsAppConfirmation(appointmentId);
      if (res.success) {
        setWhatsAppFeedback({
          id: appointmentId,
          message: res.summary || (res.activeChannel === 'sms'
            ? `WhatsApp ${res.whatsapp?.status || 'failed'}; Twilio SMS fallback sent!`
            : `WhatsApp sent successfully (ID: ${res.messageId || 'Delivered'})`),
          success: true,
        });
      } else {
        setWhatsAppFeedback({
          id: appointmentId,
          message: res.summary || res.error || `Status: ${res.status}`,
          success: false,
        });
      }
      onRefreshData();
    } catch (err: any) {
      setWhatsAppFeedback({
        id: appointmentId,
        message: err.message || 'Failed to dispatch notification',
        success: false,
      });
    } finally {
      setResendingId(null);
    }
  };

  // Handle direct Twilio SMS dispatch
  const handleResendSMS = async (appointmentId: number) => {
    setResendingId(appointmentId);
    setWhatsAppFeedback(null);
    try {
      const res = await api.resendSMSConfirmation(appointmentId);
      if (res.success) {
        setWhatsAppFeedback({
          id: appointmentId,
          message: `Twilio SMS sent successfully (SID: ${res.messageId || 'Queued'})`,
          success: true,
        });
      } else {
        setWhatsAppFeedback({
          id: appointmentId,
          message: res.error || `Twilio SMS Status: ${res.status}`,
          success: false,
        });
      }
      onRefreshData();
    } catch (err: any) {
      setWhatsAppFeedback({
        id: appointmentId,
        message: err.message || 'Failed to dispatch Twilio SMS',
        success: false,
      });
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Filter & Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        {/* Row 1: Date Scope Segments & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Scope Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
            <button
              id="scope-upcoming-btn"
              onClick={() => setDateScope('UPCOMING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateScope === 'UPCOMING'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              All Upcoming ({countUpcoming})
            </button>

            <button
              id="scope-today-btn"
              onClick={() => {
                setSelectedDate(todayStr);
                setDateScope('TODAY');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateScope === 'TODAY'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Today ({countToday})
            </button>

            <button
              id="scope-pick-date-btn"
              onClick={() => setDateScope('DATE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateScope === 'DATE'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              By Date
            </button>

            <button
              id="scope-all-btn"
              onClick={() => setDateScope('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateScope === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              All History ({countAll})
            </button>
          </div>

          {/* Search bar & Live Refresh Button */}
          <div className="flex items-center space-x-2 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="appt-search-input"
                type="text"
                placeholder="Search name, phone, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-amber-400"
              />
            </div>

            <button
              id="appt-sync-btn"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-200 shrink-0"
              title="Sync appointments with database"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            <button
              id="appt-book-slot-btn"
              onClick={onOpenNewAppointment}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Book Appointment</span>
            </button>
          </div>
        </div>

        {/* Row 2: Date Selector (visible when By Date or specific date) & Secondary Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Date Selector Navigation */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center border border-slate-200 rounded-lg p-1 bg-slate-50">
              <button
                id="appt-prev-day-btn"
                onClick={() => changeDateByDays(-1)}
                className="p-1 hover:bg-white rounded text-slate-600 transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <input
                id="appt-date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setDateScope('DATE');
                }}
                className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 px-2 focus:outline-hidden cursor-pointer"
              />
              <button
                id="appt-next-day-btn"
                onClick={() => changeDateByDays(1)}
                className="p-1 hover:bg-white rounded text-slate-600 transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {dateScope === 'DATE' && selectedDate !== todayStr && (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
                Viewing date: {selectedDate}
              </span>
            )}
          </div>

          {/* Filters & View Mode */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Staff Filter */}
            <select
              id="appt-staff-filter"
              value={selectedStaffFilter}
              onChange={(e) => setSelectedStaffFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium cursor-pointer"
            >
              <option value="ALL">All Staff</option>
              {staffList.map((st) => (
                <option key={st.id} value={String(st.id)}>
                  {st.name} ({st.role})
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              id="appt-status-filter"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Booked">Booked</option>
              <option value="Confirmed">Confirmed</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="No Show">No Show</option>
            </select>

            {/* Channel / Source Filter */}
            <select
              id="appt-source-filter"
              value={selectedSourceFilter}
              onChange={(e) => setSelectedSourceFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium cursor-pointer"
            >
              <option value="ALL">All Channels</option>
              <option value="Online Booking">🌐 Online Bookings</option>
              <option value="Walk-in">Walk-in & Phone</option>
            </select>
          </div>
        </div>
      </div>

      {/* WhatsApp Feedback Banner */}
      {whatsAppFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            whatsAppFeedback.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {whatsAppFeedback.success ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>
              <strong>WhatsApp Delivery:</strong> {whatsAppFeedback.message}
            </span>
          </div>
          <button
            onClick={() => setWhatsAppFeedback(null)}
            className="text-xs underline hover:opacity-80 ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Conflict Prevention & Live Sync Notice */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
          <span>
            <strong>PostgreSQL Real-Time Sync:</strong> Showing{' '}
            <strong className="text-slate-900">{sortedAppointments.length}</strong> appointments in view.
            Online customer bookings register directly with zero duplicate simulation.
          </span>
        </div>
        {dateScope === 'TODAY' && countUpcoming > countToday && (
          <button
            onClick={() => setDateScope('UPCOMING')}
            className="text-amber-700 font-bold hover:underline shrink-0 text-left sm:text-right"
          >
            + {countUpcoming - countToday} upcoming on other dates → View All
          </button>
        )}
      </div>

      {/* Appointments List */}
      {sortedAppointments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <CalendarIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No appointments found for this filter</p>
          <p className="text-xs text-slate-400 mt-1">
            {dateScope === 'TODAY' && countUpcoming > 0
              ? `There are ${countUpcoming} upcoming appointments scheduled on other dates.`
              : 'Try changing your search keywords or date scope.'}
          </p>
          <div className="flex items-center justify-center space-x-2 mt-4">
            {dateScope !== 'UPCOMING' && (
              <button
                id="appt-empty-upcoming-btn"
                onClick={() => setDateScope('UPCOMING')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 cursor-pointer"
              >
                View All Upcoming
              </button>
            )}
            <button
              id="appt-empty-book-btn"
              onClick={onOpenNewAppointment}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
            >
              Book New Slot
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAppointments.map((apt) => (
            <div
              key={apt.id}
              id={`appointment-card-${apt.id}`}
              className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 p-4 transition-all shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              {/* Left Column: Time & Customer Info */}
              <div className="flex items-start space-x-4">
                {/* Time Badge */}
                <div className="px-3 py-2 bg-slate-100 rounded-xl text-center shrink-0 min-w-20">
                  <div className="font-extrabold text-slate-900 text-sm">{apt.startTime}</div>
                  <div className="text-[10px] text-slate-500 font-medium">to {apt.endTime}</div>
                  <div className="text-[9px] text-slate-500 font-mono mt-0.5 font-bold">{apt.date}</div>
                </div>

                {/* Details */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <h3 className="font-bold text-slate-900 text-sm">{apt.customerName}</h3>
                    <span className="text-xs text-slate-500 font-mono font-semibold">{apt.customerPhone}</span>
                    {apt.customerEmail && (
                      <span className="text-[11px] text-slate-400 font-sans">({apt.customerEmail})</span>
                    )}

                    {/* Source Badge */}
                    {apt.source === 'Online Booking' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 flex items-center space-x-1">
                        <Globe className="h-3 w-3" />
                        <span>Online Booking</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        {apt.source || 'Walk-in'}
                      </span>
                    )}

                    {/* Booking Code */}
                    {apt.bookingCode && (
                      <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {apt.bookingCode}
                      </span>
                    )}

                    {/* WhatsApp Status Pill */}
                    {apt.whatsappStatus === 'WhatsApp Sent' ? (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1"
                        title={apt.whatsappMessageId ? `Message ID: ${apt.whatsappMessageId}` : 'WhatsApp confirmed'}
                      >
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>WhatsApp Sent</span>
                      </span>
                    ) : apt.whatsappStatus === 'WhatsApp Failed' ? (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 flex items-center space-x-1"
                        title={apt.whatsappError || 'Failed to dispatch WhatsApp message'}
                      >
                        <AlertCircle className="h-3 w-3 text-rose-600" />
                        <span>WhatsApp Failed</span>
                      </span>
                    ) : apt.whatsappStatus === 'Invalid Number' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                        Invalid Number
                      </span>
                    ) : (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 flex items-center space-x-1"
                        title="WhatsApp credentials not configured in environment"
                      >
                        <MessageSquare className="h-3 w-3 text-slate-400" />
                        <span>WhatsApp: Not Configured</span>
                      </span>
                    )}

                    {/* Twilio SMS Fallback Pill (when WhatsApp is Failed or Not Configured) */}
                    {(apt.whatsappStatus === 'WhatsApp Failed' || apt.whatsappStatus === 'WhatsApp Not Configured') && (
                      apt.smsStatus === 'SMS Sent' ? (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 flex items-center space-x-1"
                          title={apt.smsMessageId ? `Twilio SMS SID: ${apt.smsMessageId}` : 'Twilio SMS sent as automated fallback'}
                        >
                          <Smartphone className="h-3 w-3 text-blue-600" />
                          <span>SMS Fallback: Sent</span>
                        </span>
                      ) : apt.smsStatus === 'SMS Failed' ? (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 flex items-center space-x-1"
                          title={apt.smsError || 'Twilio SMS fallback failed to dispatch'}
                        >
                          <AlertCircle className="h-3 w-3 text-amber-600" />
                          <span>SMS Fallback: Failed</span>
                        </span>
                      ) : (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-200 flex items-center space-x-1"
                          title="Twilio SMS fallback triggered (configured via TWILIO_ACCOUNT_SID)"
                        >
                          <Smartphone className="h-3 w-3 text-slate-400" />
                          <span>SMS Fallback: Triggered</span>
                        </span>
                      )
                    )}
                  </div>

                  {/* Staff & Specialist Assignment */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="flex items-center font-medium text-slate-700">
                      <User className="h-3 w-3 mr-1 text-slate-400" />
                      Specialist: <strong className="ml-1 text-slate-900">{apt.staffName}</strong>
                      {(() => {
                        const s = staffList.find((st) => st.id === apt.staffId);
                        if (!s) return null;
                        return (
                          <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 rounded">
                            {s.role} • {s.gender || 'Staff'}
                          </span>
                        );
                      })()}
                    </span>

                    {/* Booked Services */}
                    {apt.services && apt.services.length > 0 && (
                      <span className="text-slate-600">
                        • Services:{' '}
                        <strong className="text-slate-800">
                          {apt.services.map((s) => s.serviceName).join(', ')}
                        </strong>
                      </span>
                    )}
                  </div>

                  {/* Customer Notes */}
                  {apt.notes && !apt.notes.includes('<!--SERVICE_ASSIGNMENTS') && (
                    <p className="text-[11px] text-slate-500 italic mt-0.5">"{apt.notes}"</p>
                  )}
                </div>
              </div>

              {/* Right Column: Status, Amount & Actions */}
              <div className="flex items-center space-x-3 self-end md:self-center shrink-0">
                {/* Status & Amount */}
                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                      apt.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : apt.status === 'In Progress'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : apt.status === 'Confirmed'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : apt.status === 'Cancelled'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {apt.status}
                  </span>
                  <div className="text-xs font-bold text-slate-900 mt-1">
                    {formatCurrency(apt.totalAmount)}
                  </div>
                </div>

                {/* Status Transitions & Operational Buttons */}
                <div className="flex items-center space-x-1.5 border-l border-slate-100 pl-3">
                  {/* Resend WhatsApp (with automated SMS fallback) */}
                  <button
                    id={`appt-resend-wa-${apt.id}`}
                    onClick={() => handleResendWhatsApp(apt.id)}
                    disabled={resendingId === apt.id}
                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold flex items-center space-x-1 border border-emerald-200/80 cursor-pointer disabled:opacity-50"
                    title="Dispatch Notification (WhatsApp with automated Twilio SMS fallback)"
                  >
                    <Send className={`h-3 w-3 ${resendingId === apt.id ? 'animate-pulse' : ''}`} />
                    <span className="hidden sm:inline text-[11px]">Notify</span>
                  </button>

                  {/* Direct Twilio SMS Dispatch */}
                  <button
                    id={`appt-resend-sms-${apt.id}`}
                    onClick={() => handleResendSMS(apt.id)}
                    disabled={resendingId === apt.id}
                    className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center space-x-1 border border-blue-200/80 cursor-pointer disabled:opacity-50"
                    title="Dispatch Direct Twilio SMS Confirmation"
                  >
                    <Smartphone className={`h-3 w-3 ${resendingId === apt.id ? 'animate-pulse' : ''}`} />
                    <span className="hidden sm:inline text-[11px]">SMS</span>
                  </button>

                  {apt.status === 'Booked' && (
                    <button
                      id={`appt-confirm-${apt.id}`}
                      onClick={() => handleUpdateStatus(apt.id, 'Confirmed')}
                      className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold cursor-pointer"
                      title="Confirm Appointment"
                    >
                      Confirm
                    </button>
                  )}

                  {(apt.status === 'Booked' || apt.status === 'Confirmed') && (
                    <button
                      id={`appt-start-${apt.id}`}
                      onClick={() => handleUpdateStatus(apt.id, 'In Progress')}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                      title="Mark In Progress"
                    >
                      <Play className="h-3 w-3" />
                      <span>Start</span>
                    </button>
                  )}

                  {apt.status === 'In Progress' && (
                    <button
                      id={`appt-complete-${apt.id}`}
                      onClick={() => handleUpdateStatus(apt.id, 'Completed')}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                      title="Mark Completed"
                    >
                      <Check className="h-3 w-3" />
                      <span>Finish</span>
                    </button>
                  )}

                  {/* Checkout & Bill Button */}
                  <button
                    id={`appt-checkout-${apt.id}`}
                    onClick={() => onCheckoutAppointment(apt)}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-2xs cursor-pointer"
                    title="Generate POS Bill"
                  >
                    <Receipt className="h-3.5 w-3.5 text-amber-400" />
                    <span>Bill</span>
                  </button>

                  {/* Cancel Button */}
                  {apt.status !== 'Cancelled' && apt.status !== 'Completed' && (
                    <button
                      id={`appt-cancel-${apt.id}`}
                      onClick={() => {
                        if (confirm(`Cancel appointment #${apt.id} for ${apt.customerName}?`)) {
                          handleUpdateStatus(apt.id, 'Cancelled');
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                      title="Cancel Booking"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
