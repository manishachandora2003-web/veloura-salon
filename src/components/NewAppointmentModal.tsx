import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Plus,
  X,
  Sparkles,
  AlertTriangle,
  IndianRupee,
  Search,
} from 'lucide-react';
import { Customer, StaffMember, Service } from '../types.ts';
import { formatCurrency } from '../lib/currency.ts';
import { api } from '../services/api.ts';

interface NewAppointmentModalProps {
  customers: Customer[];
  staffList: StaffMember[];
  services: Service[];
  onClose: () => void;
  onRefreshData: () => void;
}

export const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({
  customers,
  staffList,
  services,
  onClose,
  onRefreshData,
}) => {
  // Customer selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(
    customers[0]?.id
  );
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');

  // Staff
  const [selectedStaffId, setSelectedStaffId] = useState<number>(staffList[0]?.id || 1);

  // Selected Services
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([services[0]?.id || 1]);

  // Date and Time
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('11:00 AM');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Time slot options
  const timeSlots = [
    '09:00 AM',
    '09:30 AM',
    '10:00 AM',
    '10:30 AM',
    '11:00 AM',
    '11:30 AM',
    '12:00 PM',
    '12:30 PM',
    '01:00 PM',
    '01:30 PM',
    '02:00 PM',
    '02:30 PM',
    '03:00 PM',
    '03:30 PM',
    '04:00 PM',
    '04:30 PM',
    '05:00 PM',
    '05:30 PM',
    '06:00 PM',
    '06:30 PM',
    '07:00 PM',
    '07:30 PM',
    '08:00 PM',
  ];

  // Calculate totals
  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration, 0);
  const totalAmount = selectedServices.reduce((acc, s) => acc + s.price, 0);

  const handleToggleService = (id: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((x) => x !== id) : prev) : [...prev, id]
    );
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let customerIdToUse = selectedCustomerId;

    // If walk-in, create customer record first
    if (isWalkIn) {
      if (!walkInName.trim() || !walkInPhone.trim()) {
        setErrorMessage('Customer name and phone number are required for booking.');
        return;
      }
      try {
        const newCust = await api.createCustomer({
          name: walkInName.trim(),
          phone: walkInPhone.trim(),
        });
        customerIdToUse = newCust.id;
      } catch (err: any) {
        setErrorMessage(err.message || 'Error creating customer record.');
        return;
      }
    }

    if (!customerIdToUse) {
      setErrorMessage('Please select or specify a customer.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createAppointment({
        customerId: customerIdToUse,
        staffId: selectedStaffId,
        serviceIds: selectedServiceIds,
        date,
        startTime,
        notes: notes.trim() || undefined,
      });

      onRefreshData();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Conflict detected! Please choose another time slot.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="font-bold text-slate-900 text-base mb-1">Book New Appointment Slot</h3>
        <p className="text-xs text-slate-500 mb-4">
          Real database conflict detection prevents overlapping stylist bookings
        </p>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 mb-4 flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleBook} className="space-y-4 text-xs">
          {/* Customer Selection */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-bold text-slate-700">Client / Customer *</label>
              <button
                type="button"
                onClick={() => setIsWalkIn(!isWalkIn)}
                className="text-amber-600 hover:underline font-semibold"
              >
                {isWalkIn ? 'Choose Existing Customer' : '+ New / Walk-in Customer'}
              </button>
            </div>

            {isWalkIn ? (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Full name"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  required
                  placeholder="Phone number"
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
            ) : (
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) - {c.loyaltyPoints} Pts
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Assigned Staff Stylist */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Stylist / Staff Member *</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium"
            >
              {staffList.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} — {st.role} ({st.specialization})
                </option>
              ))}
            </select>
          </div>

          {/* Services Picker */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-bold text-slate-700">Services ({selectedServices.length} selected)</label>
              <span className="text-slate-500 font-medium">
                Est. Duration: <strong>{totalDuration} mins</strong>
              </span>
            </div>
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
                  <div className="text-right text-[11px] text-slate-500">
                    <span>{s.duration}m • </span>
                    <strong className="text-slate-800">{formatCurrency(s.price)}</strong>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Date & Time Slot */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Start Time Slot *</label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-bold"
              >
                {timeSlots.map((ts) => (
                  <option key={ts} value={ts}>
                    {ts}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Booking Notes / Requests</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Needs skin patch test, prefers organic dye"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          {/* Price Preview */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
            <span className="text-amber-900 font-semibold">Total Estimated Value:</span>
            <span className="text-base font-extrabold text-amber-950">{formatCurrency(totalAmount)}</span>
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-xs transition-colors"
            >
              {submitting ? 'Checking Conflict & Booking...' : 'Confirm Booking Slot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
