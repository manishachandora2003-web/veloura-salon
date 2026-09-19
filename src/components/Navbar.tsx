import React, { useState } from 'react';
import {
  Sparkles,
  Bell,
  Plus,
  Receipt,
  Calendar,
  Database,
  Trash2,
  UserCheck,
  ChevronDown,
  Store,
  CheckCircle2,
  AlertTriangle,
  Globe,
} from 'lucide-react';
import { UserRole, NotificationItem, SalonSettings } from '../types.ts';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  notifications: NotificationItem[];
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenNewBill: () => void;
  onOpenNewAppointment: () => void;
  onLoadDemoData: () => void;
  onClearDemoData: () => void;
  onSwitchToPublic?: () => void;
  settings: SalonSettings | null;
  loadingDemo: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentRole,
  setCurrentRole,
  notifications,
  unreadCount,
  onOpenNotifications,
  onOpenNewBill,
  onOpenNewAppointment,
  onLoadDemoData,
  onClearDemoData,
  onSwitchToPublic,
  settings,
  loadingDemo,
}) => {
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'pos', label: 'POS Billing' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'customers', label: 'Customers' },
    { id: 'services', label: 'Services' },
    { id: 'staff', label: 'Staff' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'packages', label: 'Packages & Offers' },
    { id: 'loyalty', label: 'Loyalty' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Banner & Quick Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Salon Identity */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">
                  {settings?.salonName || 'Veloura 🎀 Luxury Salon & Spa'}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                  Open Today
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-xs">
                {settings?.address || 'Indiranagar, Bengaluru'} • {settings?.gstNumber ? `GSTIN: ${settings.gstNumber}` : 'GST Registered'}
              </p>
            </div>
          </div>

          {/* Action Buttons & Role Switcher */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* View Public Customer Website */}
            {onSwitchToPublic && (
              <button
                id="nav-btn-public-website"
                onClick={onSwitchToPublic}
                className="inline-flex items-center px-3 py-2 border border-amber-300 text-xs sm:text-sm font-bold rounded-lg text-amber-950 bg-amber-50 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
                title="Open Public Customer Website & Online Booking"
              >
                <Globe className="h-4 w-4 mr-1.5 text-amber-600" />
                <span className="hidden md:inline">Customer Website</span>
                <span className="md:hidden">Website</span>
              </button>
            )}

            {/* Quick Action: New Appointment */}
            <button
              id="nav-btn-new-appointment"
              onClick={onOpenNewAppointment}
              className="inline-flex items-center px-3 py-2 border border-slate-300 text-xs sm:text-sm font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Calendar className="h-4 w-4 mr-1.5 text-slate-500" />
              <span className="hidden sm:inline">Book Slot</span>
            </button>

            {/* Quick Action: POS Billing */}
            <button
              id="nav-btn-quick-pos"
              onClick={onOpenNewBill}
              className="inline-flex items-center px-3.5 py-2 border border-transparent text-xs sm:text-sm font-semibold rounded-lg text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Receipt className="h-4 w-4 mr-1.5 text-amber-400" />
              <span>Create Bill</span>
            </button>

            {/* Demo Data Management Menu */}
            <div className="relative">
              <button
                id="nav-btn-demo-menu"
                onClick={() => setShowDataMenu(!showDataMenu)}
                className="inline-flex items-center px-2.5 py-2 border border-slate-200 text-xs font-medium rounded-lg text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
                title="Manage Demo Data"
              >
                <Database className="h-3.5 w-3.5 mr-1 text-slate-500" />
                <span className="hidden md:inline">Demo Data</span>
                <ChevronDown className="h-3 w-3 ml-1 text-slate-400" />
              </button>

              {showDataMenu && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-xl shadow-lg bg-white ring-1 ring-black/5 divide-y divide-slate-100 z-50 py-1">
                  <div className="px-3 py-2 text-xs text-slate-500">
                    <p className="font-semibold text-slate-700">Demo Operations</p>
                    <p className="text-[11px] text-slate-400">Loads or wipes Indian salon demo transactions</p>
                  </div>
                  <div className="py-1">
                    <button
                      id="menu-load-demo-data"
                      disabled={loadingDemo}
                      onClick={() => {
                        setShowDataMenu(false);
                        onLoadDemoData();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span>{loadingDemo ? 'Populating...' : 'Load Demo Data'}</span>
                    </button>
                    <button
                      id="menu-clear-demo-data"
                      disabled={loadingDemo}
                      onClick={() => {
                        setShowDataMenu(false);
                        onClearDemoData();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center space-x-2"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      <span>Clear Demo Records</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <button
              id="nav-btn-notifications"
              onClick={onOpenNotifications}
              className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Role Switcher */}
            <div className="relative">
              <button
                id="nav-role-dropdown-btn"
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="flex items-center space-x-2 pl-2.5 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    currentRole === 'OWNER'
                      ? 'bg-purple-500'
                      : currentRole === 'MANAGER'
                      ? 'bg-blue-500'
                      : 'bg-emerald-500'
                  }`}
                />
                <span>{currentRole}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {showRoleDropdown && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-xl shadow-lg bg-white ring-1 ring-black/5 py-1 z-50">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Switch Role</p>
                  </div>
                  {(['OWNER', 'MANAGER', 'STAFF'] as UserRole[]).map((role) => (
                    <button
                      key={role}
                      id={`switch-role-${role.toLowerCase()}`}
                      onClick={() => {
                        setCurrentRole(role);
                        setShowRoleDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between ${
                        currentRole === role ? 'bg-slate-50 font-bold text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center space-x-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            role === 'OWNER' ? 'bg-purple-500' : role === 'MANAGER' ? 'bg-blue-500' : 'bg-emerald-500'
                          }`}
                        />
                        <span>{role}</span>
                      </span>
                      {currentRole === role && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="border-t border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 no-scrollbar">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              // Role restrictions check:
              // Staff cannot see Settings, Staff, Expenses, or Reports
              if (currentRole === 'STAFF' && ['settings', 'staff', 'expenses', 'reports'].includes(item.id)) {
                return null;
              }
              // Manager cannot see Salon Settings
              if (currentRole === 'MANAGER' && ['settings'].includes(item.id)) {
                return null;
              }

              return (
                <button
                  key={item.id}
                  id={`tab-${item.id}`}
                  onClick={() => setCurrentTab(item.id)}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
