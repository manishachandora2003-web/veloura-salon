import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Heart,
  Star,
  Printer,
  RotateCcw,
  CheckCheck,
  MessageSquare,
} from 'lucide-react';
import { Service, ServiceCategory, StaffMember, SalonSettings, Appointment } from '../types.ts';
import { formatCurrency } from '../lib/currency.ts';
import { api } from '../services/api.ts';
import { useCuteSparkle } from './CuteSparkleEffect.tsx';

interface PublicBookingPortalProps {
  services: Service[];
  categories: ServiceCategory[];
  staffList: StaffMember[];
  settings: SalonSettings | null;
  onSwitchToAdmin: () => void;
  onSwitchToStaff?: () => void;
  onBookingCreated?: () => void;
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
  onBookingCreated,
}) => {
  const { triggerCuteSparkle } = useCuteSparkle();
  const [activePortalView, setActivePortalView] = useState<PortalView>('book');

  // Booking Flow Steps:
  // 1: Services Selection
  // 2: Specialist Selection ("Choose Your Specialists" per service)
  // 3: Date & Available Time Slot
  // 4: Customer Contact Details
  // 5: Final Review ("Review Your Appointment")
  // 6: Confirmation Screen ("Appointment Booked Successfully!")
  const [bookingStep, setBookingStep] = useState<number>(1);

  // Selected Booking State (supports multiple services in a single booking)
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [serviceSelectionError, setServiceSelectionError] = useState<string | null>(null);

  // Multi-specialist selection state: maps each serviceId to a staffId or 'ANY'
  const [selectedSpecialists, setSelectedSpecialists] = useState<Record<number, number | 'ANY'>>({});

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
    serviceAssignments?: Array<{
      serviceId: number;
      serviceName: string;
      staffId: number;
      staffName: string;
      role: string;
      gender?: string;
      specialization?: string;
    }>;
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

  // Active services fallback (ensures persistent Veloura 🎀 services are loaded)
  const [activeServices, setActiveServices] = useState<Service[]>(services || []);
  const [loadingServices, setLoadingServices] = useState<boolean>(!services || services.length === 0);

  useEffect(() => {
    if (services && services.length > 0) {
      setActiveServices(services);
      setLoadingServices(false);
    } else {
      setLoadingServices(true);
      api
        .getServices()
        .then((res) => {
          if (Array.isArray(res) && res.length > 0) {
            setActiveServices(res);
          }
        })
        .catch((err) => {
          console.error('Error fetching services in PublicBookingPortal:', err);
        })
        .finally(() => {
          setLoadingServices(false);
        });
    }
  }, [services]);

  // Multi-service toggle handler
  const handleToggleService = (svc: Service, e?: React.MouseEvent) => {
    if (e) triggerCuteSparkle(e);
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.id === svc.id);
      if (exists) {
        setSelectedSpecialists((curr) => {
          const next = { ...curr };
          delete next[svc.id];
          return next;
        });
        return prev.filter((s) => s.id !== svc.id);
      } else {
        setSelectedSpecialists((curr) => ({
          ...curr,
          [svc.id]: 'ANY',
        }));
        return [...prev, svc];
      }
    });
    setServiceSelectionError(null);
  };

  const handleRemoveService = (serviceId: number) => {
    setSelectedServices((prev) => prev.filter((s) => s.id !== serviceId));
    setSelectedSpecialists((curr) => {
      const next = { ...curr };
      delete next[serviceId];
      return next;
    });
  };

  // Assign specialist to a specific service
  const handleAssignSpecialist = (serviceId: number, staffId: number | 'ANY', e?: React.MouseEvent) => {
    if (e) triggerCuteSparkle(e);
    setSelectedSpecialists((curr) => ({
      ...curr,
      [serviceId]: staffId,
    }));
  };

  // Set all services to 'ANY' specialist
  const handleAssignAllToAny = (e?: React.MouseEvent) => {
    if (e) triggerCuteSparkle(e);
    const anyMap: Record<number, number | 'ANY'> = {};
    selectedServices.forEach((s) => {
      anyMap[s.id] = 'ANY';
    });
    setSelectedSpecialists(anyMap);
  };

  // Filter eligible specialists for a given service category/craft
  const getEligibleStaffForService = useCallback(
    (svc: Service): StaffMember[] => {
      const activeStaff = activeStaffList.filter((s) => s.isActive !== false);
      const cat = (svc.categoryName || '').toLowerCase();
      const svcName = (svc.name || '').toLowerCase();

      let targetRole: string | null = null;
      if (
        cat.includes('makeup') ||
        svcName.includes('makeup') ||
        svcName.includes('bridal') ||
        svcName.includes('glam') ||
        svcName.includes('airbrush') ||
        svcName.includes('party')
      ) {
        targetRole = 'Makeup Artist';
      } else if (
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
        targetRole = 'Hair Stylist';
      } else if (
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
        targetRole = 'Waxing & Threading Specialist';
      } else if (
        cat.includes('fashion') ||
        cat.includes('draping') ||
        svcName.includes('draping') ||
        svcName.includes('saree') ||
        svcName.includes('wardrobe') ||
        svcName.includes('styling') ||
        svcName.includes('lookbook')
      ) {
        targetRole = 'Fashion Stylist';
      } else if (
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
        targetRole = 'Manicure & Pedicure Specialist';
      } else if (
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
        targetRole = 'Spa Specialist';
      }

      if (targetRole) {
        const matched = activeStaff.filter((s) => s.role === targetRole);
        if (matched.length > 0) return matched;
      }

      return activeStaff.filter((s) => s.role !== 'Helper');
    },
    [activeStaffList]
  );

  // Load available time slots when date or assignments change
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
          staffAssignments: selectedSpecialists,
          staffId: 'ANY',
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
  }, [bookingStep, selectedDate, selectedServices, selectedSpecialists, totalDuration]);

  // Filter services by search and category
  const filteredServices = useMemo(() => {
    return activeServices.filter((s) => {
      if (s.isActive === false) return false;

      const matchSearch =
        !serviceSearch.trim() ||
        s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        (s.categoryName || '').toLowerCase().includes(serviceSearch.toLowerCase()) ||
        (s.description || '').toLowerCase().includes(serviceSearch.toLowerCase());

      if (!matchSearch) return false;

      if (selectedCategoryTab === 'ALL') return true;

      const cat = (s.categoryName || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      const desc = (s.description || '').toLowerCase();
      const tabLower = selectedCategoryTab.toLowerCase();

      if (tabLower === 'nail') {
        return (
          cat.includes('manicure') ||
          cat.includes('pedicure') ||
          cat.includes('nail') ||
          name.includes('manicure') ||
          name.includes('pedicure') ||
          name.includes('nail')
        );
      }

      if (tabLower === 'spa') {
        return (
          name.includes('spa') ||
          cat.includes('spa') ||
          cat.includes('facial') ||
          cat.includes('skin') ||
          name.includes('massage') ||
          name.includes('facial') ||
          desc.includes('spa')
        );
      }

      if (tabLower === 'hair') {
        return cat.includes('hair') || name.includes('hair') || name.includes('blow dry');
      }

      if (tabLower === 'makeup') {
        return cat.includes('makeup') || name.includes('makeup') || name.includes('bridal');
      }

      if (tabLower === 'waxing') {
        return cat.includes('wax') || name.includes('wax');
      }

      return cat.includes(tabLower) || name.includes(tabLower);
    });
  }, [activeServices, serviceSearch, selectedCategoryTab]);

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
        staffId: 'ANY',
        staffAssignments: selectedSpecialists,
        date: selectedDate,
        startTime: selectedTimeSlot,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        customerEmail: customerEmail.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setConfirmedBooking(res);
      triggerCuteSparkle();
      setBookingStep(6);
      if (onBookingCreated) {
        onBookingCreated();
      }
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
    setSelectedSpecialists({});
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
    <div className="min-h-screen bg-[#fdf7f8] text-[#2d1822] flex flex-col font-sans">
      {/* Public Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-pink-100/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Salon Branding */}
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-400 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-extrabold text-base sm:text-lg text-[#2d1822] tracking-tight leading-none flex items-center space-x-1">
                  <span>{settings?.salonName || 'Veloura 🎀'}</span>
                  <span className="text-xs font-semibold text-[#b57388] hidden sm:inline">• Luxury Salon & Spa</span>
                </h1>
                <p className="text-[11px] text-[#7a485c] flex items-center space-x-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-pink-400 shrink-0" />
                  <span className="truncate max-w-[200px] sm:max-w-xs">
                    {settings?.address || 'Indiranagar 100ft Road, Bengaluru'}
                  </span>
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activePortalView === 'book'
                    ? 'bg-gradient-to-r from-pink-400 to-rose-400 text-white shadow-xs'
                    : 'text-[#7a485c] hover:text-[#2d1822] hover:bg-pink-50'
                }`}
              >
                Book Online
              </button>

              <button
                id="portal-nav-menu"
                onClick={() => setActivePortalView('menu')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activePortalView === 'menu'
                    ? 'bg-gradient-to-r from-pink-400 to-rose-400 text-white shadow-xs'
                    : 'text-[#7a485c] hover:text-[#2d1822] hover:bg-pink-50'
                }`}
              >
                Services & Pricing
              </button>

              <button
                id="portal-nav-lookup"
                onClick={() => setActivePortalView('lookup')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activePortalView === 'lookup'
                    ? 'bg-gradient-to-r from-pink-400 to-rose-400 text-white shadow-xs'
                    : 'text-[#7a485c] hover:text-[#2d1822] hover:bg-pink-50'
                }`}
              >
                My Booking Status
              </button>

              {/* Staff Portal Access Link */}
              {onSwitchToStaff && (
                <button
                  id="portal-staff-switch-btn"
                  onClick={onSwitchToStaff}
                  className="ml-1 px-2.5 py-1.5 rounded-xl border border-pink-200 hover:border-pink-300 bg-white text-[#7a485c] hover:text-[#2d1822] text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                  title="Staff Portal (Private Staff Login)"
                >
                  <Scissors className="h-3 w-3 text-pink-500" />
                  <span className="hidden sm:inline">Staff</span>
                </button>
              )}

              {/* Owner / Admin Access Link */}
              <button
                id="portal-owner-switch-btn"
                onClick={onSwitchToAdmin}
                className="ml-1 px-2.5 py-1.5 rounded-xl border border-pink-200 hover:border-pink-300 bg-white text-[#7a485c] hover:text-[#2d1822] text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                title="Salon Owner & Admin Dashboard"
              >
                <Lock className="h-3 w-3 text-rose-400" />
                <span className="hidden sm:inline">Owner</span>
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
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-pink-100/90 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-rose-700 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200 inline-block">
                      Step {bookingStep} of 5
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-[#2d1822] mt-1">
                      {bookingStep === 1 && 'Select Your Desired Services'}
                      {bookingStep === 2 && 'Assign Specialists for Your Services'}
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
                      className="px-3 py-1.5 rounded-xl border border-pink-200 hover:bg-pink-50 text-xs font-semibold text-[#7a485c] flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Back</span>
                    </button>
                  )}
                </div>

                {/* Visual Step Dots */}
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mt-4 pt-3 border-t border-pink-100 text-center">
                  {[
                    { num: 1, label: 'Services' },
                    { num: 2, label: 'Specialists' },
                    { num: 3, label: 'Date & Time' },
                    { num: 4, label: 'Contact' },
                    { num: 5, label: 'Review' },
                  ].map((st) => (
                    <div
                      key={st.num}
                      className={`py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                        bookingStep === st.num
                          ? 'bg-pink-100/90 text-rose-900 border border-pink-300'
                          : bookingStep > st.num
                          ? 'text-rose-700 bg-pink-50/70 border border-pink-200'
                          : 'text-slate-400 bg-slate-50 border border-transparent'
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
                    <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#b57388]" />
                    <input
                      id="public-service-search"
                      type="text"
                      placeholder="Search haircuts, facials, waxing, bridal, makeup, spa..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-pink-200 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
                    />
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full">
                    {['ALL', 'Hair', 'Makeup', 'Waxing', 'Nail', 'Spa'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        id={`public-cat-tab-${cat.toLowerCase()}`}
                        onClick={(e) => {
                          triggerCuteSparkle(e);
                          setSelectedCategoryTab(cat);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                          selectedCategoryTab === cat
                            ? 'bg-gradient-to-r from-pink-400 to-rose-400 text-white shadow-2xs'
                            : 'bg-white border border-pink-200 text-[#7a485c] hover:bg-pink-50'
                        }`}
                      >
                        {cat === 'ALL' ? 'All Services' : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Validation message if tried to proceed without services */}
                {serviceSelectionError && (
                  <div className="p-3.5 bg-rose-50 text-rose-900 text-xs rounded-xl border border-rose-200 flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
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
                        onClick={(e) => handleToggleService(svc, e)}
                        className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between hover:shadow-sm ${
                          isSelected
                            ? 'border-pink-400 ring-2 ring-pink-300/40 bg-pink-50/30 animate-cute-pop'
                            : 'border-pink-100 hover:border-pink-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start space-x-2.5">
                              <div
                                className={`mt-0.5 h-4.5 w-4.5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected
                                    ? 'bg-gradient-to-br from-pink-400 to-rose-400 border-pink-400 text-white shadow-2xs'
                                    : 'border-pink-200 bg-white'
                                }`}
                              >
                                {isSelected && <Check className="h-3 w-3" />}
                              </div>
                              <div>
                                <h3 className="font-black text-[#2d1822] text-sm leading-snug">{svc.name}</h3>
                                <span className="inline-block mt-0.5 px-2 py-0.2 rounded-md text-[10px] font-extrabold bg-pink-50 text-rose-800 border border-pink-200">
                                  {svc.categoryName}
                                </span>
                              </div>
                            </div>
                            <span className="text-sm font-black text-[#8B2C4E] shrink-0">
                              {formatCurrency(svc.price)}
                            </span>
                          </div>
                          <p className="text-xs text-[#7a485c] mt-2 pl-7 line-clamp-2">
                            {svc.description || `${svc.categoryName} professional salon experience.`}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-pink-100 pl-7">
                          <span className="text-[11px] text-[#7a485c] flex items-center font-medium">
                            <Clock className="h-3 w-3 mr-1 text-pink-400" />
                            {svc.duration} mins
                          </span>
                          <button
                            type="button"
                            id={`public-select-svc-${svc.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleService(svc, e);
                            }}
                            className={`px-3 py-1 text-xs font-bold rounded-xl transition-all flex items-center space-x-1 cursor-pointer ${
                              isSelected
                                ? 'bg-pink-100 text-rose-800 hover:bg-pink-200'
                                : 'bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white shadow-2xs'
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

                {loadingServices ? (
                  <div className="bg-white rounded-2xl p-8 text-center border border-pink-100 flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-3 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[#7a485c] text-sm font-medium">Loading Veloura 🎀 services...</p>
                  </div>
                ) : filteredServices.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center border border-pink-100">
                    <p className="text-[#7a485c] text-sm">No services found matching your search.</p>
                  </div>
                ) : null}

                {/* SELECTED SERVICES SUMMARY DOCK */}
                <div className="bg-white rounded-2xl p-5 border border-pink-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-pink-100">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="h-4 w-4 text-pink-400" />
                      <h3 className="font-black text-[#2d1822] text-sm sm:text-base">Selected Services</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-100 text-rose-900">
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
                      <div className="divide-y divide-pink-100 border border-pink-100 rounded-xl overflow-hidden">
                        {selectedServices.map((svc) => (
                          <div
                            key={svc.id}
                            className="p-3 bg-pink-50/30 flex items-center justify-between gap-3 text-xs hover:bg-pink-50/60 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-[#2d1822] truncate">{svc.name}</div>
                              <div className="text-[11px] text-[#7a485c] flex items-center space-x-2 mt-0.5">
                                <span>{svc.categoryName}</span>
                                <span>•</span>
                                <span>⏱ {svc.duration} mins</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3 shrink-0">
                              <span className="font-extrabold text-[#8B2C4E] text-sm">
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
                      <div className="bg-pink-50/70 border border-pink-200/90 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                        <div className="space-y-0.5">
                          <div className="text-[#7a485c] font-medium">
                            <span className="font-bold text-[#2d1822]">Selected Services:</span> {selectedServices.length}{' '}
                            service{selectedServices.length > 1 ? 's' : ''}
                          </div>
                          <div className="text-[#7a485c] font-medium">
                            <span className="font-bold text-[#2d1822]">Combined Duration:</span> {totalDuration} mins
                            {totalDuration >= 60 && ` (${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m)`}
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[#7a485c] text-[11px] block">Total Amount to Pay</span>
                          <span className="text-xl font-black text-[#8B2C4E]">{formatCurrency(totalPrice)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 border border-dashed border-pink-200 rounded-xl bg-pink-50/20">
                      <p className="text-xs text-[#7a485c]">
                        No services selected yet. Click <strong>Add / Select</strong> on any service above to create your appointment.
                      </p>
                    </div>
                  )}

                  {/* Navigation Next Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      id="next-to-specialist-btn"
                      onClick={(e) => {
                        if (selectedServices.length === 0) {
                          setServiceSelectionError('Please select at least one service to continue.');
                          return;
                        }
                        setServiceSelectionError(null);
                        triggerCuteSparkle(e);
                        setBookingStep(2);
                      }}
                      className={`w-full sm:w-auto px-7 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-all shadow-xs cursor-pointer ${
                        selectedServices.length > 0
                          ? 'bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white'
                          : 'bg-slate-200 text-slate-400 hover:bg-slate-300'
                      }`}
                    >
                      <span>Next — Choose Specialists</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: MULTI-SPECIALIST SELECTION PER SERVICE */}
            {bookingStep === 2 && selectedServices.length > 0 && (
              <div className="space-y-6">
                {/* Banner */}
                <div className="bg-white rounded-2xl p-5 border border-pink-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-400 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
                          Multi-Specialist Assignment
                        </span>
                        <span className="text-xs text-[#7a485c] font-medium">
                          • {selectedServices.length} {selectedServices.length === 1 ? 'Service' : 'Services'} Selected
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-[#2d1822] mt-0.5">
                        Assign Specialists for Your Services 🎀
                      </h3>
                      <p className="text-xs text-[#7a485c]">
                        Select certified professionals tailored to each service. Only verified specialists qualified in that category are shown.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-stretch sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={handleAssignAllToAny}
                      className="px-3.5 py-2 bg-pink-50 hover:bg-pink-100/70 text-rose-700 border border-pink-200/80 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center space-x-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-rose-500" />
                      <span>Set All to Any Available</span>
                    </button>
                  </div>
                </div>

                {/* Dedicated Specialist Card for EACH Selected Service */}
                <div className="space-y-6">
                  {selectedServices.map((svc, sIdx) => {
                    const eligible = getEligibleStaffForService(svc);
                    const assignedStaffId = selectedSpecialists[svc.id] || 'ANY';
                    const assignedStaffObj =
                      assignedStaffId === 'ANY'
                        ? null
                        : activeStaffList.find((s) => s.id === assignedStaffId);

                    return (
                      <div
                        key={svc.id}
                        className="soft-pink-card rounded-2xl p-5 border border-pink-200/90 shadow-xs space-y-4"
                      >
                        {/* Service Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-pink-100">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-xl bg-pink-100 text-rose-700 flex items-center justify-center font-black text-xs shrink-0">
                              {sIdx + 1}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm sm:text-base font-black text-[#2d1822]">{svc.name}</h4>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-pink-50 text-rose-800 border border-pink-200">
                                  {svc.categoryName}
                                </span>
                              </div>
                              <div className="text-[11px] text-[#7a485c] mt-0.5 flex items-center space-x-2">
                                <span>⏱ {svc.duration} mins</span>
                                <span>•</span>
                                <span className="font-extrabold text-[#8B2C4E]">{formatCurrency(svc.price)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center space-x-2">
                            <span className="text-[11px] text-[#7a485c] font-medium">Assigned:</span>
                            <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-50 text-rose-800 border border-pink-200 flex items-center space-x-1">
                              {assignedStaffObj ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-rose-600" />
                                  <span>{assignedStaffObj.name} ({assignedStaffObj.role})</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3.5 w-3.5 text-rose-500" />
                                  <span>Any Available {svc.categoryName} Specialist</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Specialist Options Grid */}
                        <div>
                          <div className="text-[11px] font-extrabold text-[#7a485c] uppercase tracking-wider mb-2.5">
                            Choose Specialist for {svc.name}:
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {/* 1. Any Available Option */}
                            <div
                              onClick={(e) => handleAssignSpecialist(svc.id, 'ANY', e)}
                              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                                assignedStaffId === 'ANY'
                                  ? 'border-pink-500 ring-2 ring-pink-300/40 bg-pink-50/40 animate-cute-pop'
                                  : 'border-pink-100 hover:border-pink-300 bg-white hover:bg-pink-50/20'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-2.5">
                                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-300 to-rose-400 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                    ⚡
                                  </div>
                                  <div>
                                    <div className="text-xs font-black text-[#2d1822]">
                                      Any Available Specialist
                                    </div>
                                    <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                                      Fastest allocation
                                    </div>
                                  </div>
                                </div>
                                {assignedStaffId === 'ANY' && (
                                  <span className="h-5 w-5 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px]">
                                    ✓
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-[#7a485c] mt-2 pt-2 border-t border-pink-100/80">
                                Auto-assigns first free {svc.categoryName} expert
                              </div>
                            </div>

                            {/* 2. Eligible Specialists */}
                            {eligible.map((staff) => {
                              const isAssigned = assignedStaffId === staff.id;
                              return (
                                <div
                                  key={staff.id}
                                  onClick={(e) => handleAssignSpecialist(svc.id, staff.id, e)}
                                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                                    isAssigned
                                      ? 'border-pink-500 ring-2 ring-pink-300/40 bg-pink-50/40 animate-cute-pop'
                                      : 'border-pink-100 hover:border-pink-300 bg-white hover:bg-pink-50/20'
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-2.5 min-w-0">
                                      <div
                                        className={`h-9 w-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                                          staff.gender === 'Male'
                                            ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                            : 'bg-pink-100 text-rose-800 border border-pink-200'
                                        }`}
                                      >
                                        {staff.name
                                          .split(' ')
                                          .map((n) => n[0])
                                          .join('')
                                          .slice(0, 2)}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-xs font-black text-[#2d1822] truncate">
                                          {staff.name}
                                        </div>
                                        <div className="text-[10px] text-[#7a485c] truncate">
                                          {staff.role}
                                        </div>
                                      </div>
                                    </div>
                                    {isAssigned && (
                                      <span className="h-5 w-5 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px]">
                                        ✓
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-2 pt-2 border-t border-pink-100/80 flex items-center justify-between text-[10px]">
                                    <span
                                      className={`px-1.5 py-0.2 rounded font-bold ${
                                        staff.gender === 'Male'
                                          ? 'bg-indigo-50 text-indigo-700'
                                          : 'bg-rose-50 text-rose-700'
                                      }`}
                                    >
                                      {staff.gender || 'Female'}
                                    </span>
                                    <span className="text-[#7a485c] truncate max-w-[120px]">
                                      {staff.specialization || 'Certified'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Navigation to Step 3 */}
                <div className="bg-white rounded-2xl p-4 border border-pink-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setBookingStep(1)}
                    className="w-full sm:w-auto px-5 py-2.5 border border-pink-200 rounded-xl text-xs font-bold text-[#7a485c] hover:bg-pink-50 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Change Services</span>
                  </button>

                  <div className="text-xs text-[#7a485c] text-center">
                    All {selectedServices.length} {selectedServices.length === 1 ? 'service has' : 'services have'} assigned specialists
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      triggerCuteSparkle(e);
                      setBookingStep(3);
                    }}
                    className="w-full sm:w-auto px-7 py-2.5 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-black rounded-xl transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>Proceed to Date & Available Slot</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: DATE & TIME SLOT SELECTION */}
            {bookingStep === 3 && selectedServices.length > 0 && (
              <div className="space-y-6">
                {/* Date Selection Box */}
                <div className="bg-white rounded-2xl p-5 border border-pink-200/80 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-pink-100">
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-[#2d1822] flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-pink-500" />
                        Select Appointment Date
                      </h3>
                      <p className="text-xs text-[#7a485c] mt-0.5">
                        Bookings open up to 30 days in advance
                      </p>
                    </div>

                    <input
                      type="date"
                      id="booking-date-picker"
                      min={new Date().toISOString().split('T')[0]}
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setSelectedTimeSlot('');
                      }}
                      className="px-3.5 py-2 border border-pink-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-pink-300 focus:outline-hidden bg-white"
                    />
                  </div>

                  {/* Quick Date Pills */}
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
                          onClick={(e) => {
                            triggerCuteSparkle(e);
                            setSelectedDate(dStr);
                            setSelectedTimeSlot('');
                          }}
                          className={`px-3.5 py-2 rounded-xl text-left border shrink-0 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-pink-400 to-rose-400 text-white border-pink-400 shadow-2xs'
                              : 'bg-pink-50/40 hover:bg-pink-50 text-[#7a485c] border-pink-200'
                          }`}
                        >
                          <div className="text-[10px] uppercase font-bold tracking-wider opacity-85">{dayName}</div>
                          <div className="text-xs font-black">{dayNum}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Available Time Slots Grid */}
                <div className="bg-white rounded-2xl p-5 border border-pink-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-[#2d1822] text-sm flex items-center">
                        <Clock className="h-4 w-4 mr-1.5 text-pink-500" />
                        Available Time Slots
                      </h4>
                      <p className="text-xs text-[#7a485c] mt-0.5">
                        Salon hours: 09:30 AM to 08:00 PM • Real-time live synchronization
                      </p>
                    </div>

                    {loadingSlots && (
                      <span className="text-xs text-rose-600 font-semibold flex items-center">
                        <span className="h-2 w-2 rounded-full bg-pink-500 mr-1.5 animate-ping"></span>
                        Checking availability...
                      </span>
                    )}
                  </div>

                  {slotFetchError && (
                    <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
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
                            onClick={(e) => {
                              triggerCuteSparkle(e);
                              setSelectedTimeSlot(slot.time);
                            }}
                            className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all relative ${
                              !slot.available
                                ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed line-through'
                                : isChosen
                                ? 'bg-gradient-to-r from-pink-400 to-rose-400 text-white border-pink-400 shadow-xs ring-2 ring-pink-300/40 animate-cute-pop'
                                : 'bg-white text-[#2d1822] border-pink-100 hover:border-pink-300 hover:bg-pink-50/40 cursor-pointer'
                            }`}
                          >
                            <div>{slot.label}</div>
                            {slot.available && (
                              <div
                                className={`text-[9px] font-bold mt-0.5 ${
                                  isChosen ? 'text-pink-100' : 'text-emerald-700'
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
                  <div className="pt-4 border-t border-pink-100 flex items-center justify-between">
                    <div className="text-xs text-[#7a485c]">
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
                      onClick={(e) => {
                        triggerCuteSparkle(e);
                        setBookingStep(4);
                      }}
                      className="px-6 py-2.5 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
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
                  <div className="md:col-span-2 bg-white rounded-2xl p-5 border border-pink-200/80 shadow-xs space-y-4">
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-[#2d1822]">Your Contact Details</h3>
                      <p className="text-xs text-[#7a485c] mt-0.5">
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
                        <label className="font-bold text-[#2d1822] block mb-1">Full Name *</label>
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
                          className="w-full px-3.5 py-2.5 border border-pink-200 rounded-xl bg-white font-medium focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-[#2d1822] block mb-1">
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
                            className="w-full px-3.5 py-2.5 border border-pink-200 rounded-xl bg-white font-medium focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-[#2d1822] block mb-1">Email Address (Optional)</label>
                          <input
                            id="public-form-email"
                            type="email"
                            placeholder="e.g. priya@gmail.com"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-pink-200 rounded-xl bg-white font-medium focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-[#2d1822] block mb-1">
                          Special Requests or Preferences (Optional)
                        </label>
                        <textarea
                          id="public-form-notes"
                          rows={2}
                          placeholder="e.g. Sensitive skin, bridal consultation, quiet session..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-pink-200 rounded-xl bg-white font-medium focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-pink-100 flex items-center justify-between">
                      <button
                        type="button"
                        id="back-to-step-3-btn"
                        onClick={() => setBookingStep(3)}
                        className="text-xs font-semibold text-[#7a485c] hover:text-[#2d1822] flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Back to Date & Slots</span>
                      </button>

                      <button
                        type="button"
                        id="proceed-to-review-btn"
                        onClick={(e) => {
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
                          triggerCuteSparkle(e);
                          setBookingStep(5);
                        }}
                        className="px-6 py-2.5 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-extrabold rounded-xl transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer"
                      >
                        <span>Proceed to Review Appointment</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Right 1 Col: Quick Snapshot */}
                  <div className="bg-[#2d1822] text-white rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-pink-300 text-slate-950 inline-block">
                        Booking Snapshot 🎀
                      </span>
                      <h4 className="text-sm font-extrabold mt-2 text-white">
                        {selectedServices.length} Selected Service{selectedServices.length > 1 ? 's' : ''}
                      </h4>

                      <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto pr-1 divide-y divide-white/10">
                        {selectedServices.map((s) => {
                          const staffId = selectedSpecialists[s.id] || 'ANY';
                          const staffObj = staffId === 'ANY' ? null : activeStaffList.find((st) => st.id === staffId);
                          return (
                            <div key={s.id} className="pt-1.5 text-xs text-pink-100 flex justify-between items-center">
                              <div>
                                <span className="truncate max-w-[130px] font-bold block">{s.name}</span>
                                <span className="text-[10px] text-pink-300 block">
                                  {staffObj ? staffObj.name : 'Any Specialist'}
                                </span>
                              </div>
                              <span className="font-black text-white shrink-0">{formatCurrency(s.price)}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-pink-200/70">Date:</span>
                          <span className="font-bold text-white">{selectedDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-pink-200/70">Time Slot:</span>
                          <span className="font-bold text-pink-300">{selectedTimeSlot}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-pink-200/70">Duration:</span>
                          <span className="font-bold text-white">{totalDuration} mins</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-baseline">
                        <span className="text-xs text-pink-200/70">Total Payable:</span>
                        <div className="text-right">
                          <span className="text-xl font-black text-pink-300">{formatCurrency(totalPrice)}</span>
                          <span className="block text-[10px] text-pink-200/60 mt-0.5">Pay at Salon</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-pink-100/90 bg-white/10 p-3 rounded-xl border border-white/15 space-y-1 mt-3">
                      <div className="font-bold text-white flex items-center">
                        <ShieldCheck className="h-3.5 w-3.5 mr-1 text-pink-300" />
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
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-pink-200/80 shadow-xs space-y-6">
                  <div>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-pink-100 text-rose-900">
                      Step 5 of 5 — Review
                    </span>
                    <h3 className="text-lg font-black text-[#2d1822] mt-1">Review Your Appointment Details</h3>
                    <p className="text-xs text-[#7a485c] mt-0.5">
                      Please double-check your selected services and assigned specialists before final reservation.
                    </p>
                  </div>

                  {bookingError && (
                    <div className="p-3.5 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span className="font-semibold">{bookingError}</span>
                    </div>
                  )}

                  {/* Services & Specialist Assignments Breakdown */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-[#2d1822] text-sm flex items-center space-x-1.5">
                        <Sparkles className="h-4 w-4 text-pink-500" />
                        <span>Selected Services & Assigned Specialists ({selectedServices.length})</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setBookingStep(2)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                      >
                        Change Specialists
                      </button>
                    </div>

                    <div className="border border-pink-100 rounded-xl overflow-hidden divide-y divide-pink-100">
                      {selectedServices.map((svc, idx) => {
                        const staffId = selectedSpecialists[svc.id] || 'ANY';
                        const staffObj = staffId === 'ANY' ? null : activeStaffList.find((s) => s.id === staffId);

                        return (
                          <div key={svc.id} className="p-3.5 bg-pink-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div>
                              <div className="font-black text-[#2d1822] flex items-center space-x-2">
                                <span>{idx + 1}.</span>
                                <span>{svc.name}</span>
                                <span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-pink-50 text-rose-800 border border-pink-200">
                                  {svc.categoryName}
                                </span>
                              </div>
                              <div className="text-[11px] text-[#7a485c] mt-0.5 pl-4">
                                Assigned: {staffObj ? (
                                  <strong className="text-[#2d1822] font-black">{staffObj.name} ({staffObj.role})</strong>
                                ) : (
                                  <strong className="text-emerald-700 font-bold">⚡ Any Available {svc.categoryName} Specialist</strong>
                                )} • ⏱ {svc.duration} mins
                              </div>
                            </div>
                            <span className="font-black text-[#8B2C4E] text-sm">{formatCurrency(svc.price)}</span>
                          </div>
                        );
                      })}

                      {/* Total Calculations */}
                      <div className="p-4 bg-pink-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                        <div>
                          <div className="text-[#7a485c] font-medium">
                            <span className="font-bold text-[#2d1822]">Total Services:</span> {selectedServices.length}
                          </div>
                          <div className="text-[#7a485c] font-medium">
                            <span className="font-bold text-[#2d1822]">Combined Duration:</span> {totalDuration} mins
                            {totalDuration >= 60 && ` (${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m)`}
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[#7a485c] text-[11px] block">Total Amount to Pay</span>
                          <span className="text-xl font-black text-[#8B2C4E]">{formatCurrency(totalPrice)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Date & Time and Customer Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Date & Time Box */}
                    <div className="p-4 rounded-xl border border-pink-100 bg-pink-50/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-[#7a485c] uppercase tracking-wider">
                          Appointment Date & Time
                        </span>
                        <button
                          type="button"
                          onClick={() => setBookingStep(3)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                        >
                          Change
                        </button>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex items-center space-x-2 text-[#2d1822] font-extrabold text-sm">
                          <Calendar className="h-4 w-4 text-pink-500" />
                          <span>{selectedDate}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-rose-700 font-black text-sm">
                          <Clock className="h-4 w-4 text-pink-500" />
                          <span>{selectedTimeSlot} (Estimated duration: {totalDuration} mins)</span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Details Box */}
                    <div className="p-4 rounded-xl border border-pink-100 bg-pink-50/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-[#7a485c] uppercase tracking-wider">
                          Customer Information
                        </span>
                        <button
                          type="button"
                          onClick={() => setBookingStep(4)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                        >
                          Edit
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[#7a485c] block text-[11px]">Full Name</span>
                          <span className="font-extrabold text-[#2d1822]">{customerName}</span>
                        </div>
                        <div>
                          <span className="text-[#7a485c] block text-[11px]">Mobile Number</span>
                          <span className="font-extrabold text-[#2d1822]">{customerPhone}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {notes.trim() && (
                    <div className="p-3 bg-pink-50/30 border border-pink-100 rounded-xl text-xs">
                      <span className="text-[#7a485c] block text-[11px]">Special Requests:</span>
                      <p className="text-[#2d1822] italic mt-0.5">{notes}</p>
                    </div>
                  )}

                  {/* Payment notice */}
                  <div className="p-3.5 bg-pink-50/70 border border-pink-200 rounded-xl text-xs text-rose-950 flex items-start space-x-2.5">
                    <ShieldCheck className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black">Pay at Salon — No Upfront Payment Required</span>
                      <p className="text-[#7a485c] text-[11px] mt-0.5">
                        Your appointment slots and specialists are confirmed in real-time. Pay upon completion at Veloura 🎀.
                      </p>
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      id="back-to-step-4-btn"
                      onClick={() => setBookingStep(4)}
                      className="w-full sm:w-auto px-5 py-2.5 border border-pink-200 rounded-xl text-xs font-bold text-[#7a485c] hover:bg-pink-50 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Back to Contact Details</span>
                    </button>

                    <button
                      type="button"
                      id="public-confirm-booking-btn"
                      disabled={submittingBooking}
                      onClick={handleConfirmBooking}
                      className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {submittingBooking ? (
                        <>
                          <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                          <span>Securing Appointment...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Confirm & Book Slots ({formatCurrency(totalPrice)})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: BOOKING CONFIRMED SUCCESS CARD */}
            {bookingStep === 6 && confirmedBooking && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-200/90 shadow-sm max-w-2xl mx-auto text-center space-y-6">
                <div className="h-16 w-16 bg-pink-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="h-10 w-10" />
                </div>

                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-pink-50 text-rose-700 border border-pink-200">
                    Booking Confirmed & Specialists Locked 🎀
                  </span>
                  <h2 className="text-2xl font-black text-[#2d1822] mt-3">We look forward to pampering you!</h2>
                  <p className="text-xs text-[#7a485c] mt-1">
                    Your appointment has been registered directly onto our salon schedule.
                  </p>
                </div>

                {/* Unique Booking Code Banner */}
                <div className="bg-pink-50/80 border border-pink-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-rose-700">
                      Your Unique Booking Reference
                    </span>
                    <div className="text-2xl font-mono font-black text-[#2d1822] tracking-wider">
                      {confirmedBooking.bookingCode}
                    </div>
                  </div>
                  <button
                    id="copy-booking-code-btn"
                    onClick={() => handleCopyCode(confirmedBooking.bookingCode)}
                    className="px-4 py-2 bg-white hover:bg-pink-50/60 text-[#2d1822] border border-pink-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 text-[#7a485c]" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                {/* WhatsApp Status Notice */}
                {confirmedBooking.whatsappStatus === 'WhatsApp Sent' ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center space-x-2 text-xs text-emerald-800 text-left">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>WhatsApp Confirmation Sent:</strong> Real confirmation message dispatched to{' '}
                      <span className="font-mono font-bold">{confirmedBooking.appointment.customerPhone}</span> via Meta WhatsApp Cloud API.
                    </span>
                  </div>
                ) : confirmedBooking.whatsappStatus === 'WhatsApp Failed' ? (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-center space-x-2 text-xs text-rose-800 text-left">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>
                      <strong>WhatsApp Status:</strong> WhatsApp message delivery could not complete ({confirmedBooking.whatsappError || 'gateway response'}). Your appointment is firmly registered in the salon schedule!
                    </span>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center space-x-2 text-xs text-slate-600 text-left">
                    <MessageSquare className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>
                      <strong>Appointment Secured:</strong> Saved in PostgreSQL. WhatsApp API environment credentials not configured on this host.
                    </span>
                  </div>
                )}

                {/* Summary Box with itemized services and assigned specialists */}
                <div className="bg-pink-50/30 rounded-2xl p-5 text-left border border-pink-100 text-xs space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[#7a485c] block text-[11px]">Customer:</span>
                      <strong className="text-[#2d1822]">{confirmedBooking.appointment.customerName}</strong>
                    </div>
                    <div>
                      <span className="text-[#7a485c] block text-[11px]">Phone:</span>
                      <strong className="text-[#2d1822]">{confirmedBooking.appointment.customerPhone}</strong>
                    </div>
                  </div>

                  {/* List of services & assigned specialists */}
                  <div className="pt-2 border-t border-pink-100">
                    <span className="text-[#7a485c] block text-[11px] mb-1.5 font-bold">
                      Booked Services & Specialist Assignments:
                    </span>
                    <div className="space-y-2">
                      {confirmedBooking.serviceAssignments && confirmedBooking.serviceAssignments.length > 0 ? (
                        confirmedBooking.serviceAssignments.map((sa, idx) => (
                          <div key={idx} className="p-2 bg-white rounded-lg border border-pink-100 flex items-center justify-between">
                            <div>
                              <span className="font-black text-[#2d1822]">{idx + 1}. {sa.serviceName}</span>
                              <div className="text-[10px] text-[#7a485c] mt-0.5">
                                Specialist: <strong className="text-rose-700">{sa.staffName}</strong> ({sa.role} • {sa.gender || 'Female'})
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        (confirmedBooking.services || [confirmedBooking.service]).map((svc: any, idx: number) => (
                          <div key={svc.id || idx} className="flex justify-between items-center text-[#2d1822]">
                            <span className="font-bold">
                              {idx + 1}. {svc.name}
                            </span>
                            <span className="font-extrabold text-[#8B2C4E]">{formatCurrency(svc.price)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-pink-100">
                    <div>
                      <span className="text-[#7a485c] block text-[11px]">Date & Time:</span>
                      <strong className="text-rose-700 font-extrabold">
                        {confirmedBooking.appointment.date} at {confirmedBooking.appointment.startTime}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#7a485c] block text-[11px]">Amount to Pay at Salon:</span>
                      <strong className="text-[#8B2C4E] font-extrabold text-sm">
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
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    Book Another Appointment
                  </button>

                  <button
                    id="lookup-this-booking-btn"
                    onClick={() => {
                      setLookupQuery(confirmedBooking.bookingCode);
                      setActivePortalView('lookup');
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 bg-white border border-pink-200 hover:bg-pink-50/50 text-[#2d1822] rounded-xl text-xs font-bold transition-colors cursor-pointer"
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
            <div className="bg-white rounded-2xl p-6 border border-pink-200/80 shadow-xs">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-pink-100 text-rose-900">
                Salon Menu & Pricing 🎀
              </span>
              <h2 className="text-xl font-black text-[#2d1822] mt-1">Our Full Service Menu</h2>
              <p className="text-xs text-[#7a485c] mt-0.5">
                Authentic salon pricing with transparent durations and descriptions. Select any service to book directly.
              </p>
            </div>

            {/* Categorized Services List */}
            {categories.map((cat) => {
              const catServices = activeServices.filter((s) => s.categoryId === cat.id || s.categoryName === cat.name);
              if (catServices.length === 0) return null;

              return (
                <div key={cat.id} className="bg-white rounded-2xl p-5 border border-pink-100 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-pink-100">
                    <h3 className="font-extrabold text-[#2d1822] text-base">{cat.name}</h3>
                    <span className="text-xs text-[#7a485c] font-medium">{catServices.length} services</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {catServices.map((svc) => (
                      <div
                        key={svc.id}
                        id={`menu-item-${svc.id}`}
                        className="p-3.5 rounded-xl border border-pink-100 hover:border-pink-300 bg-pink-50/20 hover:bg-pink-50/40 transition-all flex items-start justify-between gap-3"
                      >
                        <div>
                          <h4 className="font-bold text-[#2d1822] text-xs">{svc.name}</h4>
                          <p className="text-[11px] text-[#7a485c] mt-0.5">{svc.description || 'Premium salon experience'}</p>
                          <span className="text-[10px] text-pink-500 mt-1 block font-medium">⏱ {svc.duration} minutes</span>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-black text-[#8B2C4E] text-xs">{formatCurrency(svc.price)}</div>
                          <button
                            id={`menu-book-btn-${svc.id}`}
                            onClick={(e) => {
                              triggerCuteSparkle(e);
                              setSelectedServices([svc]);
                              setSelectedSpecialists({ [svc.id]: 'ANY' });
                              setBookingStep(2);
                              setActivePortalView('book');
                            }}
                            className="mt-1.5 px-3 py-1 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all shadow-2xs"
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
            <div className="bg-white rounded-2xl p-6 border border-pink-200/80 shadow-xs">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-pink-100 text-rose-900">
                Booking Status Check 🎀
              </span>
              <h2 className="text-xl font-black text-[#2d1822] mt-1">Check Your Appointment Status</h2>
              <p className="text-xs text-[#7a485c] mt-0.5">
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
                  className="flex-1 px-4 py-2 border border-pink-200 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
                />
                <button
                  type="submit"
                  id="lookup-search-btn"
                  disabled={lookupLoading || !lookupQuery.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
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
                <h3 className="text-xs font-bold text-[#7a485c] uppercase tracking-wider">
                  Found {lookupResults.length} Matching Booking(s):
                </h3>

                {lookupResults.map((b: any) => (
                  <div
                    key={b.id}
                    id={`lookup-result-${b.id}`}
                    className="bg-white rounded-2xl p-5 border border-pink-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-extrabold text-rose-700 bg-pink-50 px-2 py-0.5 rounded border border-pink-200">
                          {b.bookingCode}
                        </span>
                        <h4 className="font-extrabold text-[#2d1822] text-sm mt-1">{b.customerName}</h4>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          b.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : b.status === 'In Progress'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : b.status === 'Cancelled'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-pink-50 text-rose-700 border border-pink-200'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-pink-100">
                      <div>
                        <span className="text-[#7a485c] block text-[11px]">Appointment Date & Time:</span>
                        <strong className="text-[#2d1822]">
                          {b.date} at {b.startTime} - {b.endTime}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#7a485c] block text-[11px]">Primary Specialist:</span>
                        <strong className="text-[#2d1822]">{b.staffName}</strong>
                      </div>
                    </div>

                    {/* Specialist assignments breakdown if present */}
                    {b.serviceAssignments && b.serviceAssignments.length > 0 ? (
                      <div className="pt-2 border-t border-pink-100 text-xs space-y-1">
                        <span className="text-[#7a485c] block text-[11px] font-bold">Multi-Specialist Breakdown:</span>
                        {b.serviceAssignments.map((sa: any, sIdx: number) => (
                          <div key={sIdx} className="flex justify-between items-center text-[#2d1822] text-[11px] bg-pink-50/30 p-1.5 rounded-lg">
                            <span>{sa.serviceName}</span>
                            <span className="font-bold text-rose-700">{sa.staffName} ({sa.role})</span>
                          </div>
                        ))}
                      </div>
                    ) : b.services && b.services.length > 0 ? (
                      <div className="pt-2 border-t border-pink-100 text-xs">
                        <span className="text-[#7a485c] block text-[11px]">Reserved Services:</span>
                        <div className="font-medium text-[#2d1822] mt-0.5">
                          {b.services.map((s: any) => `${s.serviceName} (${formatCurrency(s.price)})`).join(', ')}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between pt-2 border-t border-pink-100 text-xs">
                      <span className="text-[#7a485c]">Payment Status: <strong className="text-[#2d1822]">{b.paymentStatus}</strong></span>
                      <span className="font-black text-[#8B2C4E] text-sm">{formatCurrency(b.totalAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Public Footer */}
      <footer className="mt-12 bg-white border-t border-pink-100 py-6 text-center text-xs text-[#7a485c] space-y-2">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} {settings?.salonName || 'Veloura 🎀 Luxury Salon & Spa'}. All rights reserved.</p>
          <div className="flex items-center space-x-3 sm:space-x-4">
            <span className="text-[#7a485c]">Phone: {settings?.phone || '+91 98765 43210'}</span>
            <span>•</span>
            {onSwitchToStaff && (
              <>
                <button
                  onClick={onSwitchToStaff}
                  className="text-[#7a485c] hover:text-[#2d1822] font-bold underline cursor-pointer"
                >
                  Staff Portal
                </button>
                <span>•</span>
              </>
            )}
            <button
              onClick={onSwitchToAdmin}
              className="text-rose-600 hover:text-rose-700 font-bold underline cursor-pointer"
            >
              Owner Portal
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
