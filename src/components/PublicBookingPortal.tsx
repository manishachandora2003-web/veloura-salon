import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Search,
  ShieldCheck,
  MapPin,
  FileText,
  AlertCircle,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
  Lock,
  Scissors,
  Palette,
  Sparkle,
  Shirt,
  Hand,
  Flower2,
  HeartHandshake,
  Trash2,
  Plus,
  Edit3,
} from 'lucide-react';
import { Service, ServiceCategory, StaffMember, SalonSettings, Appointment } from '../types.ts';
import { formatCurrency } from '../lib/currency.ts';
import { api } from '../services/api.ts';

interface PublicBookingPortalProps {
  services: Service[];
  categories: ServiceCategory[];
  staffList: StaffMember[];
  settings: SalonSettings | null;
  onSwitchToAdmin: () => void;
  onSwitchToStaff?: () => void;
}

type PortalView = 'book' | 'menu' | 'lookup';

interface TimeSlot {
  time: string;
  label: string;
  available: boolean;
  freeStaffCount?: number;
  reason?: string;
}

export const PublicBookingPortal: React.FC<PublicBookingPortalProps> = ({
  services,
  categories,
  staffList,
  settings,
  onSwitchToAdmin,
  onSwitchToStaff,
}) => {
  const [activePortalView, setActivePortalView] = useState<PortalView>('book');

  // Booking Flow Steps:
  // 1: Services Selection
  // 2: Specialist Selection ("Choose Your Specialist")
  // 3: Date & Available Time Slot
  // 4: Customer Contact Details
  // 5: Final Review ("Review Your Appointment")
  // 6: Confirmation Screen ("Appointment Booked Successfully!")
  const [bookingStep, setBookingStep] = useState<number>(1);

  // Selected Booking State (supports multiple services in a single booking)
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [serviceSelectionError, setServiceSelectionError] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | 'ANY'>('ANY');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  // Backward-compatibility alias for single-service access
  const selectedService = selectedServices[0] || null;

  // Calculated totals: Preserves existing current service prices exactly!
  const totalDuration = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + (s.duration || 30), 0);
  }, [selectedServices]);

  const totalPrice = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.price, 0);
  }, [selectedServices]);

  // Customer Contact State
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Availability State
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [slotFetchError, setSlotFetchError] = useState<string | null>(null);

  // Submitting Booking
  const [submittingBooking, setSubmittingBooking] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<{
    bookingCode: string;
    appointment: Appointment;
    services?: Service[];
    service?: Service;
    staff: StaffMember;
  } | null>(null);

  // Filter & Search in Services
  const [serviceSearch, setServiceSearch] = useState<string>('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('ALL');

  // Lookup state
  const [lookupQuery, setLookupQuery] = useState<string>('');
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupResults, setLookupResults] = useState<any[] | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Copy code feedback
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Active staff list fallback (ensures all 35 staff records are available)
  const [activeStaffList, setActiveStaffList] = useState<StaffMember[]>(staffList);

  useEffect(() => {
    if (staffList && staffList.length >= 35) {
      setActiveStaffList(staffList);
    } else {
      api
        .getPublicStaff()
        .then((res) => {
          if (res && res.length > 0) {
            setActiveStaffList(res as StaffMember[]);
          }
        })
        .catch(() => {});
    }
  }, [staffList]);

  // Specialist selection filters
  const [specialistFilterTab, setSpecialistFilterTab] = useState<'suitable' | 'all'>('suitable');
  const [specialistDepartmentFilter, setSpecialistDepartmentFilter] = useState<string>('ALL');
  const [specialistGenderFilter, setSpecialistGenderFilter] = useState<string>('ALL');
  const [specialistSearch, setSpecialistSearch] = useState<string>('');

  // Multi-service toggle handler
  const handleToggleService = (svc: Service) => {
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.id === svc.id);
      if (exists) {
        return prev.filter((s) => s.id !== svc.id);
      } else {
        return [...prev, svc];
      }
    });
    setServiceSelectionError(null);
  };

  // Remove individual selected service
  const handleRemoveService = (serviceId: number) => {
    setSelectedServices((prev) => prev.filter((s) => s.id !== serviceId));
  };

  // Fetch slot availability whenever date, services, or staff changes in Step 3
  useEffect(() => {
    if (bookingStep === 3 && selectedServices.length > 0 && selectedDate) {
      let isMounted = true;
      setLoadingSlots(true);
      setSlotFetchError(null);

      api
        .getSlotAvailability({
          date: selectedDate,
          serviceIds: selectedServices.map((s) => s.id),
          duration: totalDuration,
          staffId: selectedStaffId,
        })
        .then((res) => {
          if (isMounted) {
            setAvailableSlots(res.slots);
            setLoadingSlots(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setSlotFetchError(err.message || 'Could not load time slots. Please try again.');
            setLoadingSlots(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [bookingStep, selectedDate, selectedServices, selectedStaffId, totalDuration]);

  // Filter services by category and search
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesCat =
        selectedCategoryTab === 'ALL' ||
        s.categoryName.toLowerCase().includes(selectedCategoryTab.toLowerCase());
      const q = serviceSearch.toLowerCase().trim();
      const matchesSearch = !q || s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [services, selectedCategoryTab, serviceSearch]);

  // Eligible staff for the selected services (Suitability logic supporting multi-service)
  const eligibleStaff = useMemo(() => {
    const activeStaff = activeStaffList.filter((s) => s.isActive !== false);
    if (selectedServices.length === 0) return activeStaff.filter((s) => s.role !== 'Helper');

    const getRolesForSingleService = (svc: Service): string[] => {
      const cat = (svc.categoryName || '').toLowerCase();
      const svcName = (svc.name || '').toLowerCase();

      if (
        cat.includes('makeup') ||
        svcName.includes('makeup') ||
        svcName.includes('bridal') ||
        svcName.includes('glam') ||
        svcName.includes('airbrush') ||
        svcName.includes('party')
      ) {
        return ['Makeup Artist'];
      }
      if (
        cat.includes('hair') ||
        svcName.includes('hair') ||
        svcName.includes('cut') ||
        svcName.includes('blow') ||
        svcName.includes('keratin') ||
        svcName.includes('botox') ||
        svcName.includes('balayage') ||
        svcName.includes('color') ||
        svcName.includes('smoothening') ||
        svcName.includes('beard') ||
        svcName.includes('trim')
      ) {
        return ['Hair Stylist'];
      }
      if (
        cat.includes('wax') ||
        cat.includes('thread') ||
        svcName.includes('wax') ||
        svcName.includes('thread') ||
        svcName.includes('rica') ||
        svcName.includes('eyebrow') ||
        svcName.includes('upper lip') ||
        svcName.includes('bikini') ||
        svcName.includes('underarm')
      ) {
        return ['Waxing & Threading Specialist'];
      }
      if (
        cat.includes('fashion') ||
        cat.includes('draping') ||
        svcName.includes('draping') ||
        svcName.includes('saree') ||
        svcName.includes('wardrobe') ||
        svcName.includes('styling') ||
        svcName.includes('lookbook')
      ) {
        return ['Fashion Stylist'];
      }
      if (
        cat.includes('nail') ||
        cat.includes('manicure') ||
        cat.includes('pedicure') ||
        svcName.includes('mani') ||
        svcName.includes('pedi') ||
        svcName.includes('gel nail') ||
        svcName.includes('french') ||
        svcName.includes('cuticle') ||
        svcName.includes('paraffin')
      ) {
        return ['Manicure & Pedicure Specialist'];
      }
      if (
        cat.includes('spa') ||
        cat.includes('facial') ||
        cat.includes('massage') ||
        cat.includes('skin') ||
        svcName.includes('facial') ||
        svcName.includes('spa') ||
        svcName.includes('bleach') ||
        svcName.includes('d-tan') ||
        svcName.includes('clean up') ||
        svcName.includes('massage') ||
        svcName.includes('steam')
      ) {
        return ['Spa Specialist'];
      }
      if (cat.includes('helper') || svcName.includes('helper') || svcName.includes('wash assist')) {
        return ['Helper'];
      }

      return ['Hair Stylist', 'Makeup Artist', 'Spa Specialist', 'Manicure & Pedicure Specialist', 'Waxing & Threading Specialist', 'Fashion Stylist'];
    };

    const roleSets = selectedServices.map(getRolesForSingleService);
    // Find intersection if common specialists can perform all services
    const commonRoles = roleSets.reduce((acc, cur) => acc.filter((r) => cur.includes(r)), roleSets[0] || []);
    const targetRoles = commonRoles.length > 0 ? commonRoles : Array.from(new Set(roleSets.flat()));

    const roleSet = new Set(targetRoles);
    const matched = activeStaff.filter((s) => roleSet.has(s.role) && s.role !== 'Helper');
    return matched.length > 0 ? matched : activeStaff.filter((s) => s.role !== 'Helper');
  }, [selectedServices, activeStaffList]);

  // Filtered staff based on tabs, search, department, and gender
  const displayedStaff = useMemo(() => {
    let base =
      specialistFilterTab === 'suitable'
        ? eligibleStaff
        : activeStaffList.filter((s) => s.isActive !== false);

    if (specialistFilterTab === 'all' && specialistDepartmentFilter !== 'ALL') {
      base = base.filter((s) => s.role === specialistDepartmentFilter);
    }

    if (specialistGenderFilter !== 'ALL') {
      base = base.filter((s) => s.gender === specialistGenderFilter);
    }

    if (specialistSearch.trim()) {
      const q = specialistSearch.toLowerCase().trim();
      base = base.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.role || '').toLowerCase().includes(q) ||
          (s.specialization || '').toLowerCase().includes(q)
      );
    }

    return base;
  }, [
    eligibleStaff,
    activeStaffList,
    specialistFilterTab,
    specialistDepartmentFilter,
    specialistGenderFilter,
    specialistSearch,
  ]);

  // Currently selected staff helper
  const currentSelectedStaff = useMemo(() => {
    if (selectedStaffId === 'ANY' || !selectedStaffId) return null;
    return activeStaffList.find((s) => s.id === selectedStaffId) || null;
  }, [selectedStaffId, activeStaffList]);

  // Handle Form Submission from Review Step (Step 5)
  const handleConfirmBooking = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedServices.length === 0 || !selectedTimeSlot || !selectedDate) return;

    // Validate phone number
    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setBookingError('Please enter a valid 10-digit mobile number.');
      setBookingStep(4);
      return;
    }

    setSubmittingBooking(true);
    setBookingError(null);

    try {
      const res = await api.bookOnline({
        serviceIds: selectedServices.map((s) => s.id),
        serviceId: selectedServices[0].id,
        staffId: selectedStaffId,
        date: selectedDate,
        startTime: selectedTimeSlot,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        customerEmail: customerEmail.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setConfirmedBooking(res);
      setBookingStep(6);
    } catch (err: any) {
      setBookingError(
        err.message || 'This time slot is no longer available. Please select another time.'
      );
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Handle Lookup
  const handleLookupBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupQuery.trim()) return;

    setLookupLoading(true);
    setLookupError(null);
    setLookupResults(null);

    try {
      const clean = lookupQuery.trim();
      const isPhone = /^[0-9]{10}$/.test(clean.replace(/[^0-9]/g, ''));
      const params = isPhone ? { phone: clean } : { code: clean.toUpperCase() };

      const res = await api.lookupBooking(params);
      setLookupResults(res.bookings);
    } catch (err: any) {
      setLookupError(err.message || 'No appointment found with the given details.');
    } finally {
      setLookupLoading(false);
    }
  };

  // Copy booking code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Reset booking wizard to Step 1
  const handleStartNewBooking = () => {
    setSelectedServices([]);
    setSelectedStaffId('ANY');
    setSelectedTimeSlot('');
    setConfirmedBooking(null);
    setBookingError(null);
    setServiceSelectionError(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setNotes('');
    setBookingStep(1);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Public Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Salon Branding */}
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight leading-none">
                  {settings?.salonName || 'Veloura 🎀 Luxury Salon & Spa'}
                </h1>
                <p className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-amber-500 shrink-0" />
                  <span className="truncate max-w-[200px] sm:max-w-xs">{settings?.address || 'Indiranagar 100ft Road, Bengaluru'}</span>
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button
                id="portal-nav-book"
                onClick={() => {
                  setActivePortalView('book');
                  if (confirmedBooking) setBookingStep(6);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activePortalView === 'book'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Book Online
              </button>

              <button
                id="portal-nav-menu"
                onClick={() => setActivePortalView('menu')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activePortalView === 'menu'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Services & Pricing
              </button>

              <button
                id="portal-nav-lookup"
                onClick={() => setActivePortalView('lookup')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activePortalView === 'lookup'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                My Booking Status
              </button>

              {/* Staff Portal Access Link */}
              {onSwitchToStaff && (
                <button
                  id="portal-staff-switch-btn"
                  onClick={onSwitchToStaff}
                  className="ml-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-slate-900 text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                  title="Staff Portal (Private Staff Login)"
                >
                  <Scissors className="h-3 w-3 text-amber-500" />
                  <span className="hidden sm:inline">Staff Portal</span>
                </button>
              )}

              {/* Owner / Admin Access Link */}
              <button
                id="portal-owner-switch-btn"
                onClick={onSwitchToAdmin}
                className="ml-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-slate-900 text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                title="Salon Owner & Admin Dashboard"
              >
                <Lock className="h-3 w-3 text-slate-400" />
                <span className="hidden sm:inline">Owner Login</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ==================================================== */}
        {/* VIEW 1: BOOKING WIZARD */}
        {/* ==================================================== */}
        {activePortalView === 'book' && (
          <div className="space-y-6">
            {/* Step Progress Header (Steps 1 to 5) */}
            {bookingStep <= 5 && (
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-600">
                      Step {bookingStep} of 5
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      {bookingStep === 1 && 'Select Your Desired Services'}
                      {bookingStep === 2 && 'Choose Your Specialist'}
                      {bookingStep === 3 && 'Choose Date & Available Time Slot'}
                      {bookingStep === 4 && 'Your Contact Details'}
                      {bookingStep === 5 && 'Review Your Appointment'}
                    </h2>
                  </div>

                  {bookingStep > 1 && (
                    <button
                      type="button"
                      id="booking-step-back-btn"
                      onClick={() => setBookingStep((s) => Math.max(1, s - 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Back</span>
                    </button>
                  )}
                </div>

                {/* Visual Step Dots */}
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                  {[
                    { num: 1, label: 'Services' },
                    { num: 2, label: 'Specialist' },
                    { num: 3, label: 'Date & Time' },
                    { num: 4, label: 'Contact' },
                    { num: 5, label: 'Review' },
                  ].map((st) => (
                    <div
                      key={st.num}
                      className={`py-1 rounded-md text-[11px] sm:text-xs font-bold transition-all ${
                        bookingStep === st.num
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : bookingStep > st.num
                          ? 'text-emerald-700 bg-emerald-50/60'
                          : 'text-slate-400 bg-slate-50'
                      }`}
                    >
                      {bookingStep > st.num ? '✓ ' : `${st.num}. `}
                      <span className="hidden sm:inline">{st.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 1: MULTIPLE SERVICE SELECTION */}
            {bookingStep === 1 && (
              <div className="space-y-6">
                {/* Search & Category Pills */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      id="public-service-search"
                      type="text"
                      placeholder="Search haircuts, facials, waxing, bridal, makeup, spa..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full">
                    {['ALL', 'Hair', 'Makeup', 'Waxing', 'Nail', 'Spa'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        id={`public-cat-tab-${cat.toLowerCase()}`}
                        onClick={() => setSelectedCategoryTab(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                          selectedCategoryTab === cat
                            ? 'bg-slate-900 text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {cat === 'ALL' ? 'All Services' : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Validation message if tried to proceed without services */}
                {serviceSelectionError && (
                  <div className="p-3 bg-amber-50 text-amber-900 text-xs rounded-xl border border-amber-300 flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="font-semibold">{serviceSelectionError}</span>
                  </div>
                )}

                {/* Service Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredServices.map((svc) => {
                    const isSelected = selectedServices.some((s) => s.id === svc.id);
                    return (
                      <div
                        key={svc.id}
                        id={`public-svc-card-${svc.id}`}
                        onClick={() => handleToggleService(svc)}
                        className={`bg-white rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between hover:shadow-sm ${
                          isSelected
                            ? 'border-amber-500 ring-2 ring-amber-400/30 bg-amber-50/20'
                            : 'border-slate-200/90 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start space-x-2">
                              <div
                                className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected
                                    ? 'bg-amber-500 border-amber-500 text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check className="h-3 w-3" />}
                              </div>
                              <h3 className="font-extrabold text-slate-900 text-sm leading-snug">{svc.name}</h3>
                            </div>
                            <span className="text-sm font-black text-amber-600 shrink-0">
                              {formatCurrency(svc.price)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1.5 pl-6 line-clamp-2">
                            {svc.description || `${svc.categoryName} professional salon service.`}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 pl-6">
                          <span className="text-[11px] text-slate-500 flex items-center font-medium">
                            <Clock className="h-3 w-3 mr-1 text-slate-400" />
                            {svc.duration} mins
                          </span>
                          <button
                            type="button"
                            id={`public-select-svc-${svc.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleService(svc);
                            }}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer ${
                              isSelected
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                : 'bg-amber-500 hover:bg-amber-600 text-white'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="h-3 w-3" />
                                <span>Selected</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-3 w-3" />
                                <span>Add / Select</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredServices.length === 0 && (
                  <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
                    <p className="text-slate-500 text-sm">No services found matching your search.</p>
                  </div>
                )}

                {/* SELECTED SERVICES SUMMARY DOCK / SECTION */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <h3 className="font-black text-slate-900 text-sm sm:text-base">Selected Services</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900">
                        {selectedServices.length} Selected
                      </span>
                    </div>

                    {selectedServices.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedServices([])}
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {selectedServices.length > 0 ? (
                    <div className="space-y-2">
                      <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                        {selectedServices.map((svc) => (
                          <div
                            key={svc.id}
                            className="p-3 bg-slate-50/60 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-slate-900 truncate">{svc.name}</div>
                              <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                                <span>{svc.categoryName}</span>
                                <span>•</span>
                                <span>⏱ {svc.duration} mins</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3 shrink-0">
                              <span className="font-extrabold text-slate-900 text-sm">
                                {formatCurrency(svc.price)}
                              </span>
                              <button
                                type="button"
                                id={`remove-selected-svc-${svc.id}`}
                                onClick={() => handleRemoveService(svc.id)}
                                title="Remove service"
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Calculations Bar */}
                      <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                        <div className="space-y-0.5">
                          <div className="text-slate-600 font-medium">
                            <span className="font-bold text-slate-900">Selected Services:</span> {selectedServices.length}{' '}
                            service{selectedServices.length > 1 ? 's' : ''}
                          </div>
                          <div className="text-slate-600 font-medium">
                            <span className="font-bold text-slate-900">Combined Duration:</span> {totalDuration} mins
                            {totalDuration >= 60 && ` (${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m)`}
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-slate-500 text-[11px] block">Total Amount to Pay</span>
                          <span className="text-lg font-black text-amber-700">{formatCurrency(totalPrice)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/40">
                      <p className="text-xs text-slate-500">
                        No services selected yet. Click <strong>Add / Select</strong> on any service above to create your appointment.
                      </p>
                    </div>
                  )}

                  {/* Navigation Next Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      id="next-to-specialist-btn"
                      onClick={() => {
                        if (selectedServices.length === 0) {
                          setServiceSelectionError('Please select at least one service to continue.');
                          return;
                        }
                        setServiceSelectionError(null);
                        setBookingStep(2);
                      }}
                      className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-all shadow-xs cursor-pointer ${
                        selectedServices.length > 0
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                          : 'bg-slate-200 text-slate-400 hover:bg-slate-300 hover:text-slate-600'
                      }`}
                    >
                      <span>Next — Choose Specialist</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: SPECIALIST SELECTION */}
            {bookingStep === 2 && selectedServices.length > 0 && (
              <div className="space-y-5">
                {/* Selected Services Card Reminder */}
                <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center space-x-3">
                    <div className="h-11 w-11 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-2xs shrink-0">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-200 inline-block mb-1">
                        {selectedServices.length} Service{selectedServices.length > 1 ? 's' : ''} Selected
                      </span>
                      <div className="text-sm font-black text-slate-900 line-clamp-1">
                        {selectedServices.map((s) => s.name).join(', ')}
                      </div>
                      <div className="text-xs text-slate-600 font-medium">
                        Combined Duration: <strong>{totalDuration} mins</strong> • Total Price:{' '}
                        <strong className="text-amber-800">{formatCurrency(totalPrice)}</strong>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    id="change-selected-service-btn"
                    onClick={() => setBookingStep(1)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-all shadow-2xs shrink-0 flex items-center space-x-1 cursor-pointer"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    <span>Change Services</span>
                  </button>
                </div>

                {/* Section Header */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Choose Your Specialist</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Select your preferred certified professional from our team of 35 specialists
                      </p>
                    </div>

                    {/* Filter Tabs: Suitable vs All */}
                    <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold shrink-0">
                      <button
                        type="button"
                        id="specialist-tab-suitable"
                        onClick={() => setSpecialistFilterTab('suitable')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                          specialistFilterTab === 'suitable'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Recommended ({eligibleStaff.length})
                      </button>
                      <button
                        type="button"
                        id="specialist-tab-all"
                        onClick={() => setSpecialistFilterTab('all')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                          specialistFilterTab === 'all'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All 35 Specialists
                      </button>
                    </div>
                  </div>

                  {/* Filter Row: Search & Gender */}
                  <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
                    {/* Search by Name / Specialty */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        id="specialist-search-input"
                        placeholder="Search specialist by name or specialty..."
                        value={specialistSearch}
                        onChange={(e) => setSpecialistSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 transition-colors"
                      />
                    </div>

                    {/* Gender Filters */}
                    <div className="flex items-center space-x-1.5 text-xs self-start md:self-auto">
                      <span className="text-slate-400 text-[11px] font-medium mr-1">Gender:</span>
                      {(['ALL', 'Female', 'Male'] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          id={`filter-gender-${g.toLowerCase()}`}
                          onClick={() => setSpecialistGenderFilter(g)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                            specialistGenderFilter === g
                              ? 'bg-amber-500 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {g === 'ALL' ? 'All' : g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Department Pills when viewing All Specialists */}
                  {specialistFilterTab === 'all' && (
                    <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 pt-1 text-xs">
                      {[
                        { label: 'All (35)', value: 'ALL' },
                        { label: 'Makeup Artists (5)', value: 'Makeup Artist' },
                        { label: 'Hair Stylists (5)', value: 'Hair Stylist' },
                        { label: 'Waxing & Threading (5)', value: 'Waxing & Threading Specialist' },
                        { label: 'Fashion Stylists (5)', value: 'Fashion Stylist' },
                        { label: 'Helpers (5)', value: 'Helper' },
                        { label: 'Nail Specialists (5)', value: 'Manicure & Pedicure Specialist' },
                        { label: 'Spa Specialists (5)', value: 'Spa Specialist' },
                      ].map((dept) => (
                        <button
                          key={dept.value}
                          type="button"
                          onClick={() => setSpecialistDepartmentFilter(dept.value)}
                          className={`px-3 py-1 rounded-full whitespace-nowrap text-xs font-semibold transition-colors shrink-0 ${
                            specialistDepartmentFilter === dept.value
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {dept.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Specialist Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* Any Available Option Card */}
                  <div
                    id="staff-option-any"
                    onClick={() => {
                      setSelectedStaffId('ANY');
                      setSelectedTimeSlot('');
                      setBookingStep(3);
                    }}
                    className={`group bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md ${
                      selectedStaffId === 'ANY'
                        ? 'border-amber-500 ring-2 ring-amber-400/30 bg-amber-50/15'
                        : 'border-slate-200/90 hover:border-amber-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-3">
                          <div className="h-11 w-11 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-black text-sm shrink-0 border border-slate-800 shadow-2xs">
                            ⚡
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base group-hover:text-amber-700 transition-colors">
                              Any Available Specialist
                            </h4>
                            <span className="inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Fastest Booking & Earliest Slots
                            </span>
                          </div>
                        </div>

                        {selectedStaffId === 'ANY' && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center space-x-1 shadow-2xs">
                            <Check className="h-3 w-3" />
                            <span>Selected</span>
                          </span>
                        )}
                      </div>

                      <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                        <div className="flex items-baseline justify-between">
                          <span className="text-slate-400 text-[11px]">Department:</span>
                          <span className="font-bold text-slate-800">{selectedService.categoryName} Certified</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-slate-400 text-[11px]">Assignment:</span>
                          <span className="font-semibold text-amber-800">First available specialist</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200 flex items-center justify-between text-[11px]">
                        <span className="inline-flex items-center font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                          Available for Booking
                        </span>
                        <span className="text-slate-400 text-[10px]">All working hours</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      id="select-staff-btn-any"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStaffId('ANY');
                        setSelectedTimeSlot('');
                        setBookingStep(3);
                      }}
                      className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer ${
                        selectedStaffId === 'ANY'
                          ? 'bg-amber-500 text-white shadow-amber-500/20'
                          : 'bg-slate-900 group-hover:bg-amber-600 text-white'
                      }`}
                    >
                      <span>{selectedStaffId === 'ANY' ? 'Selected' : 'Select Any Specialist'}</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Individual Staff Cards */}
                  {displayedStaff.map((st) => (
                    <div
                      key={st.id}
                      id={`staff-card-${st.id}`}
                      onClick={() => {
                        setSelectedStaffId(st.id);
                        setSelectedTimeSlot('');
                        setBookingStep(3);
                      }}
                      className={`group bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md ${
                        selectedStaffId === st.id
                          ? 'border-amber-500 ring-2 ring-amber-400/40 bg-amber-50/20'
                          : 'border-slate-200/90 hover:border-amber-300'
                      }`}
                    >
                      <div>
                        {/* Header: Avatar, Name & Gender */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div
                              className={`h-11 w-11 rounded-full flex items-center justify-center font-black text-sm shrink-0 border shadow-2xs ${
                                st.gender === 'Male'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              {st.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug group-hover:text-amber-700 transition-colors truncate">
                                {st.name}
                              </h4>
                              <span
                                className={`inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${
                                  st.gender === 'Male'
                                    ? 'bg-blue-50/70 text-blue-800 border-blue-200'
                                    : 'bg-rose-50/70 text-rose-800 border-rose-200'
                                }`}
                              >
                                Gender: <strong className="ml-1 font-extrabold">{st.gender || 'Female'}</strong>
                              </span>
                            </div>
                          </div>

                          {selectedStaffId === st.id && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center space-x-1 shadow-2xs">
                              <Check className="h-3 w-3" />
                              <span>Selected</span>
                            </span>
                          )}
                        </div>

                        {/* Professional Role & Specialty */}
                        <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                          <div className="flex items-baseline justify-between">
                            <span className="text-slate-400 text-[11px]">Professional Role:</span>
                            <span className="font-bold text-slate-800">{st.role}</span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-slate-400 text-[11px]">Specialty:</span>
                            <span
                              className="font-semibold text-amber-800 text-right truncate max-w-[65%]"
                              title={st.specialization}
                            >
                              {st.specialization}
                            </span>
                          </div>
                        </div>

                        {/* Availability Status */}
                        <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200 flex items-center justify-between text-[11px]">
                          <span className="inline-flex items-center font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                            Available for Booking
                          </span>
                          <span className="text-slate-400 text-[10px] truncate max-w-[45%]" title={st.workingHours}>
                            {st.workingHours || '10:00 AM - 07:00 PM'}
                          </span>
                        </div>
                      </div>

                      {/* Explicit Select Button */}
                      <button
                        type="button"
                        id={`select-staff-btn-${st.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStaffId(st.id);
                          setSelectedTimeSlot('');
                          setBookingStep(3);
                        }}
                        className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer ${
                          selectedStaffId === st.id
                            ? 'bg-amber-500 text-white shadow-amber-500/20'
                            : 'bg-slate-900 group-hover:bg-amber-600 text-white'
                        }`}
                      >
                        <span>{selectedStaffId === st.id ? 'Selected' : `Select ${st.name.split(' ')[0]}`}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {displayedStaff.length === 0 && (
                  <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
                    <p className="text-slate-500 text-sm">No specialists found matching your search or filters.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSpecialistSearch('');
                        setSpecialistGenderFilter('ALL');
                        setSpecialistDepartmentFilter('ALL');
                      }}
                      className="mt-3 px-4 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg"
                    >
                      Reset Filters
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: DATE & TIME SLOT SELECTION */}
            {bookingStep === 3 && selectedServices.length > 0 && (
              <div className="space-y-4">
                {/* Summary Header */}
                <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[10px] font-extrabold uppercase tracking-wide">
                        {selectedServices.length} Service{selectedServices.length > 1 ? 's' : ''}
                      </span>
                      <h4 className="text-sm sm:text-base font-black text-slate-900 line-clamp-1">
                        {selectedServices.map((s) => s.name).join(', ')}
                      </h4>
                      <span className="text-xs font-extrabold text-amber-800 shrink-0">
                        • {formatCurrency(totalPrice)} ({totalDuration} mins)
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 flex flex-wrap items-center gap-1.5">
                      <span className="text-slate-500">Specialist:</span>
                      {currentSelectedStaff ? (
                        <span className="font-extrabold text-slate-900 flex items-center flex-wrap gap-1">
                          <User className="h-3.5 w-3.5 text-amber-600" />
                          <span>{currentSelectedStaff.name}</span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                              currentSelectedStaff.gender === 'Male'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            Gender: <strong>{currentSelectedStaff.gender || 'Female'}</strong>
                          </span>
                          <span className="text-[11px] font-semibold text-amber-800">
                            • {currentSelectedStaff.role} ({currentSelectedStaff.specialization})
                          </span>
                        </span>
                      ) : (
                        <span className="font-extrabold text-slate-900 flex items-center">
                          ⚡ Any Available Certified Specialist
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    id="edit-step-2-btn"
                    onClick={() => setBookingStep(2)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-all shadow-2xs shrink-0 flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Change Specialist</span>
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                </div>

                {/* Date Selection Box */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 text-sm flex items-center">
                      <Calendar className="h-4 w-4 mr-1.5 text-amber-500" />
                      Select Appointment Date
                    </label>
                    <input
                      id="public-date-picker"
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setSelectedTimeSlot('');
                      }}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-hidden bg-white"
                    />
                  </div>

                  {/* Quick Date Pills (Next 5 days) */}
                  <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                    {[0, 1, 2, 3, 4, 5].map((dayOffset) => {
                      const d = new Date();
                      d.setDate(d.getDate() + dayOffset);
                      const dStr = d.toISOString().split('T')[0];
                      const isSelected = selectedDate === dStr;
                      const dayName =
                        dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
                      const dayNum = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

                      return (
                        <button
                          key={dStr}
                          id={`quick-date-btn-${dayOffset}`}
                          onClick={() => {
                            setSelectedDate(dStr);
                            setSelectedTimeSlot('');
                          }}
                          className={`px-3 py-2 rounded-xl text-left border shrink-0 transition-all ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">{dayName}</div>
                          <div className="text-xs font-black">{dayNum}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Available Time Slots Grid */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm flex items-center">
                        <Clock className="h-4 w-4 mr-1.5 text-amber-500" />
                        Available Time Slots
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Salon hours: 09:30 AM to 08:00 PM • Real-time live synchronization
                      </p>
                    </div>

                    {loadingSlots && (
                      <span className="text-xs text-amber-600 font-semibold flex items-center">
                        <span className="h-2 w-2 rounded-full bg-amber-500 mr-1.5 animate-ping"></span>
                        Checking availability...
                      </span>
                    )}
                  </div>

                  {slotFetchError && (
                    <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                      {slotFetchError}
                    </div>
                  )}

                  {!loadingSlots && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-2">
                      {availableSlots.map((slot) => {
                        const isChosen = selectedTimeSlot === slot.time;
                        return (
                          <button
                            key={slot.time}
                            id={`slot-btn-${slot.time.replace(':', '')}`}
                            disabled={!slot.available}
                            onClick={() => setSelectedTimeSlot(slot.time)}
                            className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all relative ${
                              !slot.available
                                ? 'bg-slate-100/70 border-slate-200 text-slate-300 cursor-not-allowed line-through'
                                : isChosen
                                ? 'bg-amber-500 text-white border-amber-500 shadow-xs ring-2 ring-amber-400/40'
                                : 'bg-white text-slate-800 border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 cursor-pointer'
                            }`}
                          >
                            <div>{slot.label}</div>
                            {slot.available && (
                              <div
                                className={`text-[9px] font-normal mt-0.5 ${
                                  isChosen ? 'text-amber-100' : 'text-emerald-600'
                                }`}
                              >
                                Available
                              </div>
                            )}
                            {!slot.available && (
                              <div className="text-[9px] text-slate-400 font-normal mt-0.5 no-underline">
                                {slot.reason === 'Past time' ? 'Passed' : 'Booked'}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Proceed to details button */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      {selectedTimeSlot ? (
                        <span className="text-emerald-700 font-bold">
                          Selected: {selectedTimeSlot} on {selectedDate}
                        </span>
                      ) : (
                        'Please tap an available time slot above to continue.'
                      )}
                    </div>

                    <button
                      id="proceed-to-step-4-btn"
                      disabled={!selectedTimeSlot}
                      onClick={() => setBookingStep(4)}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                    >
                      <span>Proceed to Customer Details</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: CUSTOMER CONTACT DETAILS */}
            {bookingStep === 4 && selectedServices.length > 0 && selectedTimeSlot && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Left 2 Cols: Form Fields */}
                  <div className="md:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900">Your Contact Details</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Please provide your contact information for booking confirmation and appointment updates.
                      </p>
                    </div>

                    {bookingError && (
                      <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{bookingError}</span>
                      </div>
                    )}

                    <div className="space-y-3.5 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                        <input
                          id="public-form-name"
                          type="text"
                          required
                          placeholder="e.g. Priya Sharma"
                          value={customerName}
                          onChange={(e) => {
                            setCustomerName(e.target.value);
                            if (bookingError) setBookingError(null);
                          }}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Mobile Number (10-digit) *
                          </label>
                          <input
                            id="public-form-phone"
                            type="tel"
                            required
                            maxLength={10}
                            placeholder="e.g. 9820123456"
                            value={customerPhone}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              setCustomerPhone(val);
                              if (bookingError) setBookingError(null);
                            }}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Email Address (Optional)</label>
                          <input
                            id="public-form-email"
                            type="email"
                            placeholder="e.g. priya@gmail.com"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">
                          Special Requests or Preferences (Optional)
                        </label>
                        <textarea
                          id="public-form-notes"
                          rows={2}
                          placeholder="e.g. Sensitive scalp, bridal consultation, quiet session..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        id="back-to-step-3-btn"
                        onClick={() => setBookingStep(3)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Back to Date & Slots</span>
                      </button>

                      <button
                        type="button"
                        id="proceed-to-review-btn"
                        onClick={() => {
                          if (!customerName.trim()) {
                            setBookingError('Please enter your full name.');
                            return;
                          }
                          const cleanPhone = customerPhone.replace(/\D/g, '');
                          if (cleanPhone.length < 10) {
                            setBookingError('Please enter a valid 10-digit mobile number.');
                            return;
                          }
                          setBookingError(null);
                          setBookingStep(5);
                        }}
                        className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold rounded-xl transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
                      >
                        <span>Proceed to Review Appointment</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Right 1 Col: Quick Snapshot */}
                  <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-950 inline-block">
                        Booking Snapshot
                      </span>
                      <h4 className="text-sm font-extrabold mt-2 text-white">
                        {selectedServices.length} Selected Service{selectedServices.length > 1 ? 's' : ''}
                      </h4>

                      <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {selectedServices.map((s) => (
                          <div key={s.id} className="flex justify-between items-center text-xs text-slate-300">
                            <span className="truncate max-w-[150px]">{s.name}</span>
                            <span className="font-bold text-white shrink-0">{formatCurrency(s.price)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-800 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Date:</span>
                          <span className="font-bold text-white">{selectedDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Time Slot:</span>
                          <span className="font-bold text-amber-400">{selectedTimeSlot}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Duration:</span>
                          <span className="font-bold text-white">{totalDuration} mins</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-slate-400">Specialist:</span>
                          <span className="font-bold text-white text-right">
                            {currentSelectedStaff ? (
                              <>
                                <div>{currentSelectedStaff.name}</div>
                                <div className="text-[10px] text-amber-300 font-medium">
                                  {currentSelectedStaff.gender || 'Female'} • {currentSelectedStaff.role}
                                </div>
                              </>
                            ) : (
                              'Any Available Specialist'
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-baseline">
                        <span className="text-xs text-slate-400">Total Payable:</span>
                        <div className="text-right">
                          <span className="text-xl font-black text-amber-400">{formatCurrency(totalPrice)}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">Pay at Salon</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 space-y-1 mt-3">
                      <div className="font-bold text-slate-200 flex items-center">
                        <ShieldCheck className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                        No Upfront Payment Required
                      </div>
                      <p>Your slot is locked in real-time. Pay directly after your service.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW YOUR APPOINTMENT */}
            {bookingStep === 5 && selectedServices.length > 0 && selectedTimeSlot && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-6">
                  <div>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900">
                      Step 5 of 5 — Review
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-1">Review Your Appointment Details</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Please double-check all appointment items before final reservation.
                    </p>
                  </div>

                  {bookingError && (
                    <div className="p-3.5 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span className="font-semibold">{bookingError}</span>
                    </div>
                  )}

                  {/* Services Itemized Breakdown */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-slate-900 text-sm flex items-center space-x-1.5">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        <span>Selected Services ({selectedServices.length})</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setBookingStep(1)}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                      >
                        Edit Services
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {selectedServices.map((svc, idx) => (
                        <div key={svc.id} className="p-3.5 bg-slate-50/50 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-black text-slate-900 flex items-center space-x-2">
                              <span>{idx + 1}.</span>
                              <span>{svc.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 pl-4">
                              {svc.categoryName} • ⏱ {svc.duration} mins
                            </div>
                          </div>
                          <span className="font-extrabold text-slate-900 text-sm">{formatCurrency(svc.price)}</span>
                        </div>
                      ))}

                      {/* Total Calculations */}
                      <div className="p-4 bg-amber-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                        <div>
                          <div className="text-slate-600 font-medium">
                            <span className="font-bold text-slate-900">Total Services:</span> {selectedServices.length}
                          </div>
                          <div className="text-slate-600 font-medium">
                            <span className="font-bold text-slate-900">Combined Duration:</span> {totalDuration} mins
                            {totalDuration >= 60 && ` (${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m)`}
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-slate-500 text-[11px] block">Total Amount to Pay</span>
                          <span className="text-xl font-black text-amber-700">{formatCurrency(totalPrice)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Specialist & Appointment Schedule */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Specialist Box */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                          Selected Specialist
                        </span>
                        <button
                          type="button"
                          onClick={() => setBookingStep(2)}
                          className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                        >
                          Change
                        </button>
                      </div>

                      {currentSelectedStaff ? (
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                            {currentSelectedStaff.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 text-sm flex items-center space-x-1.5">
                              <span>{currentSelectedStaff.name}</span>
                              <span
                                className={`px-2 py-0.2 text-[10px] font-bold rounded-full border ${
                                  currentSelectedStaff.gender === 'Male'
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}
                              >
                                {currentSelectedStaff.gender || 'Female'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 font-medium">
                              {currentSelectedStaff.role} • {currentSelectedStaff.specialization}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                          <span>⚡ Any Available Certified Specialist</span>
                        </div>
                      )}
                    </div>

                    {/* Date & Time Box */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                          Appointment Date & Time
                        </span>
                        <button
                          type="button"
                          onClick={() => setBookingStep(3)}
                          className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                        >
                          Change
                        </button>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-sm">
                          <Calendar className="h-4 w-4 text-amber-500" />
                          <span>{selectedDate}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-amber-700 font-black text-sm">
                          <Clock className="h-4 w-4 text-amber-500" />
                          <span>{selectedTimeSlot} (Estimated duration: {totalDuration} mins)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Details Box */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                        Customer Information
                      </span>
                      <button
                        type="button"
                        onClick={() => setBookingStep(4)}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Full Name</span>
                        <span className="font-extrabold text-slate-900">{customerName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Mobile Number</span>
                        <span className="font-extrabold text-slate-900">{customerPhone}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Email</span>
                        <span className="font-medium text-slate-900">{customerEmail.trim() || 'Not provided'}</span>
                      </div>
                    </div>

                    {notes.trim() && (
                      <div className="pt-2 border-t border-slate-200/60 text-xs">
                        <span className="text-slate-400 block text-[11px]">Special Requests:</span>
                        <p className="text-slate-700 italic mt-0.5">{notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Payment notice */}
                  <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 flex items-start space-x-2.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black">Pay at Salon — No Upfront Payment Required</span>
                      <p className="text-emerald-700 text-[11px] mt-0.5">
                        Your appointment slot will be confirmed and locked in real-time. You can pay via Cash, UPI, or Card
                        upon completion of your services at Veloura 🎀.
                      </p>
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      id="back-to-step-4-btn"
                      onClick={() => setBookingStep(4)}
                      className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Back to Contact Details</span>
                    </button>

                    <button
                      type="button"
                      id="public-confirm-booking-btn"
                      disabled={submittingBooking}
                      onClick={handleConfirmBooking}
                      className="w-full sm:w-auto px-8 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {submittingBooking ? (
                        <>
                          <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                          <span>Securing Appointment...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Confirm & Book Slot ({formatCurrency(totalPrice)})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: BOOKING CONFIRMED SUCCESS CARD */}
            {bookingStep === 6 && confirmedBooking && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm max-w-2xl mx-auto text-center space-y-6">
                <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="h-10 w-10" />
                </div>

                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Booking Confirmed & Slot Reserved
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 mt-3">We look forward to seeing you!</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Your multi-service appointment has been registered directly onto our salon schedule.
                  </p>
                </div>

                {/* Unique Booking Code Banner */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700">
                      Your Unique Booking Reference
                    </span>
                    <div className="text-2xl font-mono font-black text-slate-900 tracking-wider">
                      {confirmedBooking.bookingCode}
                    </div>
                  </div>
                  <button
                    id="copy-booking-code-btn"
                    onClick={() => handleCopyCode(confirmedBooking.bookingCode)}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 text-slate-500" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Summary Box */}
                <div className="bg-slate-50 rounded-2xl p-5 text-left border border-slate-200 text-xs space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Customer:</span>
                      <strong className="text-slate-900">{confirmedBooking.appointment.customerName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Phone:</span>
                      <strong className="text-slate-900">{confirmedBooking.appointment.customerPhone}</strong>
                    </div>
                  </div>

                  {/* List of services */}
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-400 block text-[11px] mb-1">Booked Services:</span>
                    <div className="space-y-1">
                      {(confirmedBooking.services && confirmedBooking.services.length > 0
                        ? confirmedBooking.services
                        : [confirmedBooking.service]
                      ).map((svc: any, idx: number) => (
                        <div key={svc.id || idx} className="flex justify-between items-center text-slate-800">
                          <span className="font-bold">
                            {idx + 1}. {svc.name}
                          </span>
                          <span className="font-extrabold text-slate-900">{formatCurrency(svc.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Assigned Specialist:</span>
                      <strong className="text-slate-900">{confirmedBooking.staff.name}</strong>
                      <div className="text-[10px] text-slate-500">
                        Gender: {confirmedBooking.staff.gender || 'Female'}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Specialty / Role:</span>
                      <strong className="text-slate-900">{confirmedBooking.staff.role}</strong>
                      <div className="text-[10px] text-slate-500">{confirmedBooking.staff.specialization}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Date & Time:</span>
                      <strong className="text-amber-600 font-extrabold">
                        {confirmedBooking.appointment.date} at {confirmedBooking.appointment.startTime}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Amount to Pay at Salon:</span>
                      <strong className="text-slate-900 font-extrabold text-sm">
                        {formatCurrency(confirmedBooking.appointment.totalAmount)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Next Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    id="book-another-btn"
                    onClick={handleStartNewBooking}
                    className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Book Another Appointment
                  </button>

                  <button
                    id="lookup-this-booking-btn"
                    onClick={() => {
                      setLookupQuery(confirmedBooking.bookingCode);
                      setActivePortalView('lookup');
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    View in Booking Tracker
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 2: SERVICES & PRICING GUIDE */}
        {/* ==================================================== */}
        {activePortalView === 'menu' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900">
                Salon Menu & Pricing
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-1">Our Full Service Menu</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Authentic salon pricing with duration and transparent descriptions. Select any service to book directly.
              </p>
            </div>

            {/* Categorized Services List */}
            {categories.map((cat) => {
              const catServices = services.filter((s) => s.categoryId === cat.id);
              if (catServices.length === 0) return null;

              return (
                <div key={cat.id} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-900 text-base">{cat.name}</h3>
                    <span className="text-xs text-slate-400 font-medium">{catServices.length} services</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {catServices.map((svc) => (
                      <div
                        key={svc.id}
                        id={`menu-item-${svc.id}`}
                        className="p-3 rounded-xl border border-slate-100 hover:border-amber-200 bg-slate-50/50 hover:bg-amber-50/20 transition-all flex items-start justify-between gap-3"
                      >
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">{svc.name}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">{svc.description || 'Premium salon experience'}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">⏱ {svc.duration} minutes</span>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-black text-slate-900 text-xs">{formatCurrency(svc.price)}</div>
                          <button
                            id={`menu-book-btn-${svc.id}`}
                            onClick={() => {
                              setSelectedServices([svc]);
                              setBookingStep(2);
                              setActivePortalView('book');
                            }}
                            className="mt-1.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold"
                          >
                            Book
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 3: LOOKUP MY BOOKING (SECURE) */}
        {/* ==================================================== */}
        {activePortalView === 'lookup' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-900">
                Booking Status Check
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-1">Check Your Appointment Status</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter your Booking Reference Code (e.g. BK-ONL-2026-XXXX) or your 10-digit mobile number.
              </p>

              <form onSubmit={handleLookupBooking} className="mt-4 flex gap-2">
                <input
                  id="lookup-input"
                  type="text"
                  required
                  placeholder="Enter Booking Code or 10-digit phone"
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
                <button
                  type="submit"
                  id="lookup-search-btn"
                  disabled={lookupLoading || !lookupQuery.trim()}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {lookupLoading ? 'Searching...' : 'Search'}
                </button>
              </form>

              {lookupError && (
                <div className="mt-3 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
                  {lookupError}
                </div>
              )}
            </div>

            {/* Results */}
            {lookupResults && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Found {lookupResults.length} Matching Booking(s):
                </h3>

                {lookupResults.map((b: any) => (
                  <div
                    key={b.id}
                    id={`lookup-result-${b.id}`}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {b.bookingCode}
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-sm mt-1">{b.customerName}</h4>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          b.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : b.status === 'In Progress'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : b.status === 'Cancelled'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Appointment Date & Time:</span>
                        <strong className="text-slate-800">
                          {b.date} at {b.startTime} - {b.endTime}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Assigned Specialist:</span>
                        <strong className="text-slate-800">{b.staffName}</strong>
                        {(() => {
                          const matchedStaff = activeStaffList.find((s) => s.id === b.staffId || s.name === b.staffName);
                          if (matchedStaff) {
                            return (
                              <span className="text-[10px] text-slate-500 block font-medium">
                                {matchedStaff.gender || 'Female'} • {matchedStaff.role}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>

                    {b.services && b.services.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 text-xs">
                        <span className="text-slate-400 block text-[11px]">Reserved Services:</span>
                        <div className="font-medium text-slate-800 mt-0.5">
                          {b.services.map((s: any) => `${s.serviceName} (${formatCurrency(s.price)})`).join(', ')}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-500">Payment Status: <strong className="text-slate-700">{b.paymentStatus}</strong></span>
                      <span className="font-black text-slate-900 text-sm">{formatCurrency(b.totalAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Public Footer */}
      <footer className="mt-12 bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 space-y-2">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} {settings?.salonName || 'Veloura 🎀 Luxury Salon & Spa'}. All rights reserved.</p>
          <div className="flex items-center space-x-3 sm:space-x-4">
            <span className="text-slate-400">Phone: {settings?.phone || '+91 98765 43210'}</span>
            <span>•</span>
            {onSwitchToStaff && (
              <>
                <button
                  onClick={onSwitchToStaff}
                  className="text-slate-600 hover:text-slate-900 font-bold underline cursor-pointer"
                >
                  Staff Portal
                </button>
                <span>•</span>
              </>
            )}
            <button
              onClick={onSwitchToAdmin}
              className="text-amber-600 hover:text-amber-700 font-bold underline cursor-pointer"
            >
              Owner Portal
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
