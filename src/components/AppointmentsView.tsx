import React, { useState } from 'react';
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
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'day' | 'week'>('list');

  // Navigate date
  const changeDateByDays = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Filter appointments
  const filteredAppointments = appointments.filter((apt) => {
    const matchesDate = viewMode === 'week' ? true : apt.date === selectedDate;
    const matchesStaff = selectedStaffFilter === 'ALL' || String(apt.staffId) === selectedStaffFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || apt.status === selectedStatusFilter;
    const matchesSource =
      selectedSourceFilter === 'ALL' ||
      (selectedSourceFilter === 'Online Booking'
        ? apt.source === 'Online Booking'
        : apt.source !== 'Online Booking');
    return matchesDate && matchesStaff && matchesStatus && matchesSource;
  });

  // Handle status update
  const handleUpdateStatus = async (id: number, status: any) => {
    try {
      await api.updateAppointment(id, { status });
      onRefreshData();
    } catch (e: any) {
      alert(e.message || 'Failed to update status.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Filter & Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Date Selector */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center border border-slate-200 rounded-lg p-1 bg-slate-50">
            <button
              id="appt-prev-day-btn"
              onClick={() => changeDateByDays(-1)}
              className="p-1 hover:bg-white rounded text-slate-600 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              id="appt-date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 px-2 focus:outline-hidden"
            />
            <button
              id="appt-next-day-btn"
              onClick={() => changeDateByDays(1)}
              className="p-1 hover:bg-white rounded text-slate-600 transition-colors"
              title="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            id="appt-today-btn"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        {/* View Mode & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Staff Filter */}
          <select
            id="appt-staff-filter"
            value={selectedStaffFilter}
            onChange={(e) => setSelectedStaffFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
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
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="Booked">Booked</option>
            <option value="Confirmed">Confirmed</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="No Show">No Show</option>
          </select>

          {/* Source Filter */}
          <select
            id="appt-source-filter"
            value={selectedSourceFilter}
            onChange={(e) => setSelectedSourceFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="ALL">All Channels</option>
            <option value="Online Booking">🌐 Online Bookings</option>
            <option value="Walk-in">Walk-in & Phone</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex border border-slate-200 rounded-lg overflow-hidden text-xs">
            <button
              id="appt-view-list"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 font-semibold ${
                viewMode === 'list' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              List
            </button>
            <button
              id="appt-view-day"
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 font-semibold ${
                viewMode === 'day' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Timeline
            </button>
          </div>

          {/* Book Slot Button */}
          <button
            id="appt-book-slot-btn"
            onClick={onOpenNewAppointment}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* Conflict Prevention Reminder Notice */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
          <span>
            <strong>Conflict Prevention Engine Active:</strong> Overlapping bookings for the same stylist are
            automatically detected and blocked by the PostgreSQL database.
          </span>
        </div>
        <span className="font-bold text-slate-800">{filteredAppointments.length} Bookings Shown</span>
      </div>

      {/* Appointments List / View */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <CalendarIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No appointments for this selection</p>
          <p className="text-xs text-slate-400 mt-1">
            Change the selected date or click "Book Appointment" to add a slot.
          </p>
          <button
            id="appt-empty-book-btn"
            onClick={onOpenNewAppointment}
            className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs"
          >
            Book New Slot
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((apt) => (
            <div
              key={apt.id}
              id={`appointment-card-${apt.id}`}
              className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 p-4 transition-all shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              {/* Left Column: Time & Customer */}
              <div className="flex items-start space-x-4">
                {/* Time Badge */}
                <div className="px-3 py-2 bg-slate-100 rounded-xl text-center shrink-0 min-w-20">
                  <div className="font-extrabold text-slate-900 text-sm">{apt.startTime}</div>
                  <div className="text-[10px] text-slate-500 font-medium">to {apt.endTime}</div>
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">{apt.date}</div>
                </div>

                {/* Details */}
                <div>
                  <div className="flex items-center space-x-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-sm">{apt.customerName}</h3>
                    <span className="text-xs text-slate-400 font-mono">{apt.customerPhone}</span>
                    {apt.customerEmail && (
                      <span className="text-[11px] text-slate-400 font-sans">({apt.customerEmail})</span>
                    )}
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
                    {apt.bookingCode && (
                      <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {apt.bookingCode}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
                    <span className="flex items-center font-medium text-slate-700">
                      <User className="h-3 w-3 mr-1 text-slate-400" />
                      Staff: <strong className="ml-1 text-slate-900">{apt.staffName}</strong>
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

                    {apt.services && apt.services.length > 0 && (
                      <span className="text-slate-600">
                        • Service: <strong className="text-slate-800">{apt.services.map((s) => s.serviceName).join(', ')}</strong>
                      </span>
                    )}
                  </div>

                  {apt.notes && (
                    <p className="text-[11px] text-slate-400 italic mt-1">"{apt.notes}"</p>
                  )}
                </div>
              </div>

              {/* Right Column: Status & Operational Actions */}
              <div className="flex items-center space-x-3 self-end md:self-center shrink-0">
                {/* Status Badge */}
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

                {/* Status Transitions */}
                <div className="flex items-center space-x-1.5 border-l border-slate-100 pl-3">
                  {apt.status === 'Booked' && (
                    <button
                      id={`appt-confirm-${apt.id}`}
                      onClick={() => handleUpdateStatus(apt.id, 'Confirmed')}
                      className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold"
                      title="Confirm Appointment"
                    >
                      Confirm
                    </button>
                  )}

                  {(apt.status === 'Booked' || apt.status === 'Confirmed') && (
                    <button
                      id={`appt-start-${apt.id}`}
                      onClick={() => handleUpdateStatus(apt.id, 'In Progress')}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center space-x-1"
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
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold flex items-center space-x-1"
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
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-2xs"
                    title="Generate POS Bill"
                  >
                    <Receipt className="h-3.5 w-3.5 text-amber-400" />
                    <span>Bill / POS</span>
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
                      className="p-1 text-slate-400 hover:text-rose-500 rounded"
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
