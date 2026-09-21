import React, { useState, useEffect } from 'react';
import {
  UserRole,
  DashboardData,
  Service,
  ServiceCategory,
  Customer,
  StaffMember,
  Appointment,
  Invoice,
  InventoryProduct,
  Supplier,
  Expense,
  Package,
  Offer,
  NotificationItem,
  SalonSettings,
} from './types.ts';
import { api, getAuthToken, setAuthToken } from './services/api.ts';
import { Navbar } from './components/Navbar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { PosView } from './components/PosView.tsx';
import { AppointmentsView } from './components/AppointmentsView.tsx';
import { CustomersView } from './components/CustomersView.tsx';
import { ServicesView } from './components/ServicesView.tsx';
import { StaffView } from './components/StaffView.tsx';
import { InventoryView } from './components/InventoryView.tsx';
import { ExpensesView } from './components/ExpensesView.tsx';
import { PackagesOffersView } from './components/PackagesOffersView.tsx';
import { LoyaltyView } from './components/LoyaltyView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { InvoiceModal } from './components/InvoiceModal.tsx';
import { NewAppointmentModal } from './components/NewAppointmentModal.tsx';
import { NotificationsModal } from './components/NotificationsModal.tsx';
import { PublicBookingPortal } from './components/PublicBookingPortal.tsx';
import { StaffDashboard } from './components/StaffDashboard.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { CuteAnimationProvider } from './components/CuteSparkleEffect.tsx';
import { Globe, Shield, ArrowRight, Scissors, Lock, LogOut, ShieldAlert, Sparkles } from 'lucide-react';

export default function App() {
  const [portalMode, setPortalMode] = useState<'public' | 'admin' | 'staff'>(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    if (modeParam === 'admin' || modeParam === 'dashboard') return 'admin';
    if (modeParam === 'staff') return 'staff';
    if (modeParam === 'public' || modeParam === 'book') return 'public';
    const saved = localStorage.getItem('veloura_portal_mode');
    if (saved === 'admin' || saved === 'staff' || saved === 'public') return saved;
    return 'public';
  });

  const [authRole, setAuthRole] = useState<'ANONYMOUS' | 'ADMIN' | 'STAFF'>('ANONYMOUS');
  const [loggedInStaff, setLoggedInStaff] = useState<StaffMember | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalType, setAuthModalType] = useState<'admin' | 'staff'>('admin');

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('OWNER');

  // Application Data States
  const [dashboardStats, setDashboardStats] = useState<DashboardData | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [settings, setSettings] = useState<SalonSettings | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDemo, setLoadingDemo] = useState<boolean>(false);

  // Modals
  const [activeInvoiceModalId, setActiveInvoiceModalId] = useState<number | null>(null);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState<boolean>(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);

  // Initial Data & Auth Verification
  const verifySession = async () => {
    const token = getAuthToken();
    if (!token) {
      setAuthRole('ANONYMOUS');
      // If user directly opened admin or staff URL without token, prompt login
      if (portalMode === 'admin') {
        setAuthModalType('admin');
        setShowAuthModal(true);
      } else if (portalMode === 'staff') {
        setAuthModalType('staff');
        setShowAuthModal(true);
      }
      return;
    }

    try {
      const auth = await api.verifyAuth();
      if (auth.valid && auth.role === 'ADMIN') {
        setAuthRole('ADMIN');
      } else if (auth.valid && auth.role === 'STAFF') {
        setAuthRole('STAFF');
        if (auth.staff) setLoggedInStaff(auth.staff);
      } else {
        setAuthRole('ANONYMOUS');
        setAuthToken(null);
      }
    } catch {
      setAuthRole('ANONYMOUS');
      setAuthToken(null);
    }
  };

  const loadAllData = async () => {
    try {
      // Promptly resolve public catalog to display services without waiting for full dashboard sync
      api.getServices().then((svcs) => {
        if (Array.isArray(svcs) && svcs.length > 0) setServices(svcs);
      }).catch(() => {});
      api.getCategories().then((cats) => {
        if (Array.isArray(cats) && cats.length > 0) setCategories(cats);
      }).catch(() => {});

      const [
        dash,
        svcs,
        cats,
        custs,
        stf,
        apts,
        inv,
        sups,
        exps,
        pkgs,
        offs,
        notifs,
        sett,
      ] = await Promise.all([
        api.getDashboard().catch(() => null),
        api.getServices().catch(() => []),
        api.getCategories().catch(() => []),
        api.getCustomers().catch(() => []),
        api.getStaff().catch(async () => {
          const pub = await api.getPublicStaff().catch(() => []);
          return pub as StaffMember[];
        }),
        api.getAppointments().catch(() => []),
        api.getInventory().catch(() => []),
        api.getSuppliers().catch(() => []),
        api.getExpenses().catch(() => []),
        api.getPackages().catch(() => []),
        api.getOffers().catch(() => []),
        api.getNotifications().catch(() => []),
        api.getSettings().catch(() => null),
      ]);

      if (dash) setDashboardStats(dash);
      setServices(svcs);
      setCategories(cats);
      setCustomers(custs);
      setStaffList(stf);
      setAppointments(apts);
      setInventoryProducts(inv);
      setSuppliers(sups);
      setExpenses(exps);
      setPackages(pkgs);
      setOffers(offs);
      setNotifications(notifs);
      if (sett) setSettings(sett);
    } catch (err) {
      console.error('Failed to load salon records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifySession();
    loadAllData();

    // Periodic synchronization to ensure live updates across all open views
    const syncInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        Promise.all([
          api.getAppointments().then(setAppointments).catch(() => {}),
          api.getNotifications().then(setNotifications).catch(() => {}),
          api.getDashboard().then((d) => d && setDashboardStats(d)).catch(() => {}),
        ]);
      }
    }, 15000);

    const handleWindowFocus = () => {
      Promise.all([
        api.getAppointments().then(setAppointments).catch(() => {}),
        api.getNotifications().then(setNotifications).catch(() => {}),
        api.getDashboard().then((d) => d && setDashboardStats(d)).catch(() => {}),
      ]);
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // Demo Data Handlers
  const handleLoadDemoData = async () => {
    if (!confirm('Load realistic Indian salon demo data? This will populate genuine appointments, invoices, staff records, and customer loyalty balances.')) {
      return;
    }
    setLoadingDemo(true);
    try {
      await api.loadDemoData();
      await loadAllData();
    } catch (e: any) {
      alert(e.message || 'Error populating demo data');
    } finally {
      setLoadingDemo(false);
    }
  };

  const handleClearDemoData = async () => {
    if (!confirm('Are you sure you want to clear all transaction records? Customer CRM, staff, appointments, invoices, and expenses will be reset to a clean state. Predefined services and 35 staff members will remain.')) {
      return;
    }
    setLoadingDemo(true);
    try {
      await api.clearDemoData();
      await loadAllData();
    } catch (e: any) {
      alert(e.message || 'Error clearing demo records');
    } finally {
      setLoadingDemo(false);
    }
  };

  // Switchers & Auth Actions
  const handleSwitchToAdmin = () => {
    if (authRole === 'ADMIN') {
      setPortalMode('admin');
      localStorage.setItem('veloura_portal_mode', 'admin');
      loadAllData();
    } else {
      setAuthModalType('admin');
      setShowAuthModal(true);
    }
  };

  const handleSwitchToStaff = () => {
    if (authRole === 'STAFF' && loggedInStaff) {
      setPortalMode('staff');
      localStorage.setItem('veloura_portal_mode', 'staff');
    } else {
      setAuthModalType('staff');
      setShowAuthModal(true);
    }
  };

  const handleSwitchToPublic = () => {
    setPortalMode('public');
    localStorage.setItem('veloura_portal_mode', 'public');
    loadAllData();
  };

  const handleLogout = () => {
    setAuthToken(null);
    setAuthRole('ANONYMOUS');
    setLoggedInStaff(null);
    setPortalMode('public');
    localStorage.setItem('veloura_portal_mode', 'public');
  };

  const handleAuthSuccess = (role: 'ADMIN' | 'STAFF', staff?: StaffMember) => {
    setAuthRole(role);
    if (role === 'ADMIN') {
      setPortalMode('admin');
      localStorage.setItem('veloura_portal_mode', 'admin');
      loadAllData();
    } else if (role === 'STAFF' && staff) {
      setLoggedInStaff(staff);
      setPortalMode('staff');
      localStorage.setItem('veloura_portal_mode', 'staff');
    }
  };

  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  // 1. PUBLIC CUSTOMER WEBSITE
  if (portalMode === 'public') {
    return (
      <CuteAnimationProvider>
        <div className="relative min-h-screen bg-[#fdf7f8]">
          {/* Salon Owner & Staff switcher top bar */}
          <div className="bg-[#2a1720] text-white text-xs px-4 py-1.5 flex items-center justify-between border-b border-[#3d2330]">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-pink-400 animate-pulse"></span>
              <span className="text-pink-100 font-medium">Veloura 🎀 Public Customer Website</span>
              <span className="hidden sm:inline text-pink-200/60">• Instant Online Appointments (No Login Required)</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                id="top-switch-to-staff-btn"
                onClick={handleSwitchToStaff}
                className="text-pink-100 hover:text-white font-bold flex items-center space-x-1 cursor-pointer bg-[#3d2330] hover:bg-[#4d2d3e] px-2.5 py-0.5 rounded-md transition-colors"
              >
                <Scissors className="h-3 w-3 mr-0.5 text-pink-300" />
                <span>Staff Portal</span>
              </button>

              <button
                id="top-switch-to-admin-btn"
                onClick={handleSwitchToAdmin}
                className="text-rose-200 hover:text-white font-bold flex items-center space-x-1 cursor-pointer bg-[#4a2638] hover:bg-[#5a3045] px-2.5 py-0.5 rounded-md transition-colors"
              >
                <Shield className="h-3 w-3 mr-0.5 text-pink-300" />
                <span>Owner Dashboard</span>
                <ArrowRight className="h-3 w-3 ml-0.5" />
              </button>
            </div>
          </div>

          <PublicBookingPortal
            services={services}
            categories={categories}
            staffList={staffList}
            settings={settings}
            onSwitchToAdmin={handleSwitchToAdmin}
            onSwitchToStaff={handleSwitchToStaff}
            onBookingCreated={loadAllData}
          />

          <AuthModal
            isOpen={showAuthModal}
            initialType={authModalType}
            onClose={() => setShowAuthModal(false)}
            onSuccess={handleAuthSuccess}
          />
        </div>
      </CuteAnimationProvider>
    );
  }

  // 2. STAFF DASHBOARD (STAFF ONLY)
  if (portalMode === 'staff') {
    // If not authenticated as staff, guard and prompt
    if (authRole !== 'STAFF' || !loggedInStaff) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="h-14 w-14 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto">
              <Lock className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Staff Portal Authorization Required</h3>
            <p className="text-xs text-slate-600">
              Please sign in with your Veloura 🎀 Staff Code and Password to access the Staff Dashboard.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setAuthModalType('staff');
                  setShowAuthModal(true);
                }}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-xl text-xs"
              >
                Sign In as Staff
              </button>
              <button
                onClick={handleSwitchToPublic}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs"
              >
                Customer Website
              </button>
            </div>
          </div>
          <AuthModal
            isOpen={showAuthModal}
            initialType="staff"
            onClose={() => setShowAuthModal(false)}
            onSuccess={handleAuthSuccess}
          />
        </div>
      );
    }

    return (
      <div className="relative">
        <StaffDashboard
          currentStaff={loggedInStaff}
          allStaff={staffList}
          services={services}
          settings={settings}
          onLogout={handleLogout}
          onRequestAdmin={handleSwitchToAdmin}
        />
        <AuthModal
          isOpen={showAuthModal}
          initialType={authModalType}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  // 3. ADMIN DASHBOARD (ADMIN ONLY)
  // Direct URL Protection: If user manually changes URL to admin but has not authenticated as ADMIN
  if (authRole !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
          <div className="h-14 w-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-black text-slate-900">Admin Authentication Required</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            The Owner Dashboard contains private business revenue and salon settings. Please authenticate to continue.
          </p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                setAuthModalType('admin');
                setShowAuthModal(true);
              }}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs"
            >
              Unlock Admin Dashboard
            </button>
            <button
              onClick={handleSwitchToPublic}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs"
            >
              Back to Website
            </button>
          </div>
        </div>
        <AuthModal
          isOpen={showAuthModal}
          initialType="admin"
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans antialiased selection:bg-amber-100 selection:text-amber-900">
      {/* Top Banner indicating Admin Mode with quick switch */}
      <div className="bg-amber-500 text-slate-950 text-xs px-4 py-1.5 flex items-center justify-between font-medium">
        <div className="flex items-center space-x-2">
          <Shield className="h-3.5 w-3.5" />
          <span className="font-extrabold">Veloura 🎀 Salon Management Dashboard</span>
          <span className="hidden md:inline text-amber-950/80">• Real-Time Scheduling & 35 Staff Members Active</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            id="top-switch-to-public-btn"
            onClick={handleSwitchToPublic}
            className="bg-slate-950 hover:bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded-md flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Globe className="h-3 w-3 text-amber-400" />
            <span>Public Website</span>
          </button>
          <button
            id="top-admin-logout-btn"
            onClick={handleLogout}
            className="bg-amber-600 hover:bg-amber-700 text-slate-950 hover:text-white text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center space-x-1 transition-colors cursor-pointer"
            title="Log Out of Admin"
          >
            <LogOut className="h-3 w-3" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </div>

      {/* Top Header & Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        notifications={notifications}
        unreadCount={unreadNotifsCount}
        onOpenNotifications={() => setShowNotificationsModal(true)}
        onOpenNewBill={() => setCurrentTab('pos')}
        onOpenNewAppointment={() => setShowNewAppointmentModal(true)}
        onLoadDemoData={handleLoadDemoData}
        onClearDemoData={handleClearDemoData}
        onSwitchToPublic={handleSwitchToPublic}
        settings={settings}
        loadingDemo={loadingDemo}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            stats={dashboardStats}
            loading={loading}
            onOpenNewBill={() => setCurrentTab('pos')}
            onOpenNewAppointment={() => setShowNewAppointmentModal(true)}
            onSelectTab={(tab) => setCurrentTab(tab)}
            onViewInvoice={(id) => setActiveInvoiceModalId(id)}
            onLoadDemoData={handleLoadDemoData}
            currentRole={currentRole}
          />
        )}

        {currentTab === 'pos' && (
          <PosView
            services={services}
            customers={customers}
            staffList={staffList}
            onInvoiceCreated={(inv) => {
              loadAllData();
              setActiveInvoiceModalId(inv.id);
            }}
            onViewInvoice={(id) => setActiveInvoiceModalId(id)}
            onRefreshData={loadAllData}
          />
        )}

        {currentTab === 'appointments' && (
          <AppointmentsView
            appointments={appointments}
            staffList={staffList}
            services={services}
            onOpenNewAppointment={() => setShowNewAppointmentModal(true)}
            onRefreshData={loadAllData}
            onCheckoutAppointment={(apt) => setCurrentTab('pos')}
          />
        )}

        {currentTab === 'customers' && (
          <CustomersView
            customers={customers}
            onRefreshData={loadAllData}
            onViewInvoice={(id) => setActiveInvoiceModalId(id)}
          />
        )}

        {currentTab === 'services' && (
          <ServicesView
            services={services}
            categories={categories}
            onRefreshData={loadAllData}
          />
        )}

        {currentTab === 'staff' && (
          <StaffView staffList={staffList} onRefreshData={loadAllData} />
        )}

        {currentTab === 'inventory' && (
          <InventoryView
            products={inventoryProducts}
            suppliers={suppliers}
            onRefreshData={loadAllData}
          />
        )}

        {currentTab === 'expenses' && (
          <ExpensesView expenses={expenses} onRefreshData={loadAllData} />
        )}

        {currentTab === 'packages' && (
          <PackagesOffersView
            packages={packages}
            offers={offers}
            services={services}
            onRefreshData={loadAllData}
          />
        )}

        {currentTab === 'loyalty' && <LoyaltyView />}

        {currentTab === 'reports' && <ReportsView />}

        {currentTab === 'settings' && (
          <SettingsView settings={settings} onRefreshData={loadAllData} />
        )}
      </main>

      {/* Global Invoice / GST Receipt Modal */}
      {activeInvoiceModalId !== null && (
        <InvoiceModal
          invoiceId={activeInvoiceModalId}
          onClose={() => setActiveInvoiceModalId(null)}
          onRefreshData={loadAllData}
        />
      )}

      {/* Book Appointment Modal */}
      {showNewAppointmentModal && (
        <NewAppointmentModal
          customers={customers}
          staffList={staffList}
          services={services}
          onClose={() => setShowNewAppointmentModal(false)}
          onRefreshData={loadAllData}
        />
      )}

      {/* Notifications Drawer Modal */}
      {showNotificationsModal && (
        <NotificationsModal
          notifications={notifications}
          onClose={() => setShowNotificationsModal(false)}
          onRefreshData={loadAllData}
          onNavigateToAppointments={() => {
            setCurrentTab('appointments');
            setShowNotificationsModal(false);
          }}
        />
      )}

      <AuthModal
        isOpen={showAuthModal}
        initialType={authModalType}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
