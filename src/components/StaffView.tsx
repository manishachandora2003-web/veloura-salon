import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Phone,
  Mail,
  Calendar,
  IndianRupee,
  Clock,
  Briefcase,
  TrendingUp,
  X,
  Edit2,
  CheckCircle2,
  Search,
  Sparkles,
  Scissors,
  Palette,
  Sparkle,
  Shirt,
  HeartHandshake,
  Filter,
  Hand,
  Flower2,
} from 'lucide-react';
import { StaffMember } from '../types.ts';
import { formatCurrency, formatNumber } from '../lib/currency.ts';
import { api } from '../services/api.ts';

interface StaffViewProps {
  staffList: StaffMember[];
  onRefreshData: () => void;
}

type StaffCategoryTab =
  | 'ALL'
  | 'Makeup Artist'
  | 'Hair Stylist'
  | 'Waxing & Threading Specialist'
  | 'Fashion Stylist'
  | 'Helper'
  | 'Manicure & Pedicure Specialist'
  | 'Spa Specialist';

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.FC<{ className?: string }>; color: string; badgeBg: string; badgeText: string; defaultCommission: number; codePrefix: string }
> = {
  'Makeup Artist': {
    label: 'Makeup Artists',
    icon: Palette,
    color: 'text-purple-600',
    badgeBg: 'bg-purple-50 border-purple-200',
    badgeText: 'text-purple-700',
    defaultCommission: 5,
    codePrefix: 'STF-MUA',
  },
  'Hair Stylist': {
    label: 'Hair Stylists',
    icon: Scissors,
    color: 'text-blue-600',
    badgeBg: 'bg-blue-50 border-blue-200',
    badgeText: 'text-blue-700',
    defaultCommission: 5,
    codePrefix: 'STF-HRS',
  },
  'Waxing & Threading Specialist': {
    label: 'Waxing & Threading',
    icon: Sparkle,
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeText: 'text-rose-700',
    defaultCommission: 5,
    codePrefix: 'STF-WTS',
  },
  'Fashion Stylist': {
    label: 'Fashion Stylists',
    icon: Shirt,
    color: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-700',
    defaultCommission: 5,
    codePrefix: 'STF-FSH',
  },
  'Helper': {
    label: 'Helpers',
    icon: HeartHandshake,
    color: 'text-amber-600',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-700',
    defaultCommission: 4,
    codePrefix: 'STF-HLP',
  },
  'Manicure & Pedicure Specialist': {
    label: 'Mani & Pedi',
    icon: Hand,
    color: 'text-teal-600',
    badgeBg: 'bg-teal-50 border-teal-200',
    badgeText: 'text-teal-700',
    defaultCommission: 5,
    codePrefix: 'STF-MPS',
  },
  'Spa Specialist': {
    label: 'Spa Specialists',
    icon: Flower2,
    color: 'text-cyan-600',
    badgeBg: 'bg-cyan-50 border-cyan-200',
    badgeText: 'text-cyan-700',
    defaultCommission: 5,
    codePrefix: 'STF-SPA',
  },
};

export const StaffView: React.FC<StaffViewProps> = ({ staffList, onRefreshData }) => {
  const [activeTab, setActiveTab] = useState<StaffCategoryTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Form State
  const [staffCode, setStaffCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Hair Stylist');
  const [specialization, setSpecialization] = useState('');
  const [salary, setSalary] = useState(25000);
  const [commissionPercentage, setCommissionPercentage] = useState(5);
  const [workingDays, setWorkingDays] = useState('Mon,Tue,Wed,Thu,Fri,Sat');
  const [workingHours, setWorkingHours] = useState('10:00 AM - 07:00 PM');
  const [submitting, setSubmitting] = useState(false);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: staffList.length,
      'Makeup Artist': 0,
      'Hair Stylist': 0,
      'Waxing & Threading Specialist': 0,
      'Fashion Stylist': 0,
      'Helper': 0,
      'Manicure & Pedicure Specialist': 0,
      'Spa Specialist': 0,
    };
    for (const st of staffList) {
      if (counts[st.role] !== undefined) {
        counts[st.role]++;
      }
    }
    return counts;
  }, [staffList]);

  // Filtered staff
  const filteredStaff = useMemo(() => {
    return staffList.filter((st) => {
      // Category filter
      if (activeTab !== 'ALL' && st.role !== activeTab) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = (st.staffCode || '').toLowerCase().includes(q);
        const nameMatch = st.name.toLowerCase().includes(q);
        const roleMatch = st.role.toLowerCase().includes(q);
        const phoneMatch = st.phone.includes(q);
        const specMatch = st.specialization.toLowerCase().includes(q);
        return codeMatch || nameMatch || roleMatch || phoneMatch || specMatch;
      }
      return true;
    });
  }, [staffList, activeTab, searchQuery]);

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    const config = CATEGORY_CONFIG[newRole];
    if (config) {
      setCommissionPercentage(config.defaultCommission);
      if (!editingStaff) {
        const nextNum = String(staffList.length + 1).padStart(3, '0');
        setStaffCode(`${config.codePrefix}-${nextNum}`);
      }
    }
  };

  const handleOpenAdd = () => {
    setEditingStaff(null);
    const defaultRole = activeTab !== 'ALL' ? activeTab : 'Makeup Artist';
    const config = CATEGORY_CONFIG[defaultRole] || CATEGORY_CONFIG['Makeup Artist'];
    const nextNum = String(staffList.length + 1).padStart(3, '0');

    setStaffCode(`${config.codePrefix}-${nextNum}`);
    setName('');
    setPhone('');
    setEmail('');
    setRole(defaultRole);
    setSpecialization('Consultation & Services');
    setSalary(defaultRole === 'Helper' ? 18000 : 30000);
    setCommissionPercentage(config.defaultCommission);
    setWorkingDays('Mon,Tue,Wed,Thu,Fri,Sat');
    setWorkingHours('10:00 AM - 07:00 PM');
    setShowAddModal(true);
  };

  const handleOpenEdit = (st: StaffMember) => {
    setEditingStaff(st);
    setStaffCode(st.staffCode || `STF-${String(st.id).padStart(3, '0')}`);
    setName(st.name);
    setPhone(st.phone);
    setEmail(st.email || '');
    setRole(st.role);
    setSpecialization(st.specialization);
    setSalary(st.salary);
    setCommissionPercentage(st.commissionPercentage);
    setWorkingDays(st.workingDays);
    setWorkingHours(st.workingHours);
    setShowAddModal(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    setSubmitting(true);
    try {
      if (editingStaff) {
        await api.updateStaff(editingStaff.id, {
          staffCode: staffCode.trim() || undefined,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          role,
          specialization,
          salary: Number(salary),
          commissionPercentage: Number(commissionPercentage),
          workingDays,
          workingHours,
        });
      } else {
        await api.createStaff({
          staffCode: staffCode.trim() || undefined,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          role,
          specialization,
          salary: Number(salary),
          commissionPercentage: Number(commissionPercentage),
          workingDays,
          workingHours,
        });
      }
      setShowAddModal(false);
      onRefreshData();
    } catch (e: any) {
      alert(e.message || 'Error saving staff member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Overview Metrics */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-amber-100 text-amber-900 border border-amber-200">
                Staff Management
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {staffList.length} Indian Staff Members Active
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">Salon Stylists & Staff Team</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              5 categories • Automatic commission calculation (5% Artists & Stylists, 4% Helpers)
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              id="staff-add-new-btn"
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4 text-amber-400" />
              <span>Add Staff Member</span>
            </button>
          </div>
        </div>

        {/* 7-Category Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 mt-4 pt-4 border-t border-slate-100">
          {(
            [
              { role: 'Makeup Artist', count: categoryCounts['Makeup Artist'] || 0, comm: '5%', desc: 'Bridal & HD' },
              { role: 'Hair Stylist', count: categoryCounts['Hair Stylist'] || 0, comm: '5%', desc: 'Cuts & Keratin' },
              { role: 'Waxing & Threading Specialist', count: categoryCounts['Waxing & Threading Specialist'] || 0, comm: '5%', desc: 'Rica & Brows' },
              { role: 'Fashion Stylist', count: categoryCounts['Fashion Stylist'] || 0, comm: '5%', desc: 'Draping' },
              { role: 'Manicure & Pedicure Specialist', count: categoryCounts['Manicure & Pedicure Specialist'] || 0, comm: '5%', desc: 'Gel & Nail Art' },
              { role: 'Spa Specialist', count: categoryCounts['Spa Specialist'] || 0, comm: '5%', desc: 'Ayurvedic & Scalp' },
              { role: 'Helper', count: categoryCounts['Helper'] || 0, comm: '4%', desc: 'Floor Assist' },
            ] as const
          ).map((c) => {
            const cfg = CATEGORY_CONFIG[c.role];
            const Icon = cfg.icon;
            const isSelected = activeTab === c.role;
            return (
              <button
                key={c.role}
                id={`staff-cat-metric-${cfg.codePrefix}`}
                onClick={() => setActiveTab(isSelected ? 'ALL' : (c.role as StaffCategoryTab))}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50/60 hover:bg-slate-50 text-slate-800 border-slate-200/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-amber-400' : 'text-slate-500'}`}>
                    {c.role === 'Waxing & Threading Specialist' ? 'Wax & Thread' : c.role}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${isSelected ? 'bg-slate-800 text-amber-300' : 'bg-white border border-slate-200 text-slate-700'}`}>
                    {c.comm}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xl font-black">{c.count}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>{c.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 max-w-full">
          {(
            [
              { id: 'ALL', label: 'All Staff', count: staffList.length },
              { id: 'Makeup Artist', label: 'Makeup Artists', count: categoryCounts['Makeup Artist'] || 0 },
              { id: 'Hair Stylist', label: 'Hair Stylists', count: categoryCounts['Hair Stylist'] || 0 },
              { id: 'Waxing & Threading Specialist', label: 'Waxing & Threading', count: categoryCounts['Waxing & Threading Specialist'] || 0 },
              { id: 'Fashion Stylist', label: 'Fashion Stylists', count: categoryCounts['Fashion Stylist'] || 0 },
              { id: 'Manicure & Pedicure Specialist', label: 'Mani & Pedi', count: categoryCounts['Manicure & Pedicure Specialist'] || 0 },
              { id: 'Spa Specialist', label: 'Spa Specialists', count: categoryCounts['Spa Specialist'] || 0 },
              { id: 'Helper', label: 'Helpers', count: categoryCounts['Helper'] || 0 },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              id={`staff-tab-${tab.id.replace(/\s+/g, '-').toLowerCase()}`}
              onClick={() => setActiveTab(tab.id as StaffCategoryTab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                  activeTab === tab.id ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            id="staff-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, ID, role..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Staff Grid */}
      {filteredStaff.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No staff members found</p>
          <p className="text-xs text-slate-400 mt-1">Try changing your category filter or search query</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStaff.map((st) => {
            const cfg = CATEGORY_CONFIG[st.role] || {
              label: st.role,
              icon: Users,
              color: 'text-slate-700',
              badgeBg: 'bg-slate-50 border-slate-200',
              badgeText: 'text-slate-700',
              defaultCommission: st.commissionPercentage,
              codePrefix: 'STF',
            };
            const displayCode = st.staffCode || `STF-${String(st.id).padStart(3, '0')}`;
            const RoleIcon = cfg.icon;

            return (
              <div
                key={st.id}
                id={`staff-card-${st.id}`}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 p-5 transition-all shadow-2xs flex flex-col justify-between"
              >
                <div>
                  {/* Top Header: ID & Actions */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-11 w-11 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-black text-sm shadow-xs border border-slate-800">
                        {st.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-slate-900 text-sm">{st.name}</h3>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
                            {displayCode}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <RoleIcon className={`h-3 w-3 ${cfg.color}`} />
                          <span className={`text-xs font-semibold ${cfg.color}`}>{st.role}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      id={`staff-edit-btn-${st.id}`}
                      onClick={() => handleOpenEdit(st)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                      title="Edit Staff"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Specialization & Contact */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center space-x-2">
                      <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>
                        Specialty: <strong className="text-slate-800">{st.specialization}</strong>
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{st.phone}</span>
                    </div>
                    {st.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{st.email}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {st.workingHours} ({st.workingDays})
                      </span>
                    </div>
                  </div>

                  {/* Compensation & Commission Rate */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Fixed Salary</span>
                      <strong className="text-slate-900 font-extrabold">{formatCurrency(st.salary)}/mo</strong>
                    </div>
                    <div
                      className={`p-2.5 rounded-xl border ${
                        st.commissionPercentage === 5
                          ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                          : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      }`}
                    >
                      <span className="text-[10px] text-amber-800 font-bold uppercase block">Commission Rate</span>
                      <strong className="text-sm font-black text-amber-950">{st.commissionPercentage}%</strong>
                    </div>
                  </div>

                  {/* Performance Metrics (Calculated from DB Invoices) */}
                  <div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Sales Handled</span>
                      <strong className="text-slate-900 font-extrabold">{formatCurrency(st.revenueGenerated || 0)}</strong>
                    </div>
                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase block">Commission Earned</span>
                      <strong className="text-emerald-800 font-extrabold">{formatCurrency(st.commissionEarned || 0)}</strong>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center text-emerald-600 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Active Staff
                  </span>
                  <span>{st.appointmentCount || 0} Bookings Done</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              id="staff-modal-close"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                Staff Profile
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                {editingStaff ? 'Edit Staff Details' : 'Add Staff Member'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              Configure role, category, compensation, and commission percentage
            </p>

            <form onSubmit={handleSaveStaff} className="space-y-3.5 text-xs">
              {/* Category & Role Selector */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Role / Category *</label>
                <select
                  id="staff-form-role-select"
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                >
                  <option value="Makeup Artist">Makeup Artist (5% Commission)</option>
                  <option value="Hair Stylist">Hair Stylist (5% Commission)</option>
                  <option value="Waxing & Threading Specialist">Waxing & Threading Specialist (5% Commission)</option>
                  <option value="Fashion Stylist">Fashion Stylist (5% Commission)</option>
                  <option value="Manicure & Pedicure Specialist">Manicure & Pedicure Specialist (5% Commission)</option>
                  <option value="Spa Specialist">Spa Specialist (5% Commission)</option>
                  <option value="Helper">Helper (4% Commission)</option>
                </select>
              </div>

              {/* Staff ID and Name */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Staff ID *</label>
                  <input
                    id="staff-form-code"
                    type="text"
                    required
                    value={staffCode}
                    onChange={(e) => setStaffCode(e.target.value)}
                    placeholder="e.g. STF-MUA-001"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    id="staff-form-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ananya Sen"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number *</label>
                  <input
                    id="staff-form-phone"
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98451 10001"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    id="staff-form-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ananya.sen@veloura.in"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Specialization */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Specialization / Expertise</label>
                <input
                  id="staff-form-specialization"
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Bridal & HD Makeup, Balayage, Rica Waxing"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              {/* Salary & Commission */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Monthly Salary (₹)</label>
                  <input
                    id="staff-form-salary"
                    type="number"
                    min="0"
                    value={salary}
                    onChange={(e) => setSalary(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Commission % <span className="text-amber-600 font-normal">({role === 'Helper' ? '4% standard' : '5% standard'})</span>
                  </label>
                  <input
                    id="staff-form-commission"
                    type="number"
                    min="0"
                    max="100"
                    value={commissionPercentage}
                    onChange={(e) => setCommissionPercentage(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-amber-900"
                  />
                </div>
              </div>

              {/* Working Days and Hours */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Working Days</label>
                  <input
                    id="staff-form-working-days"
                    type="text"
                    value={workingDays}
                    onChange={(e) => setWorkingDays(e.target.value)}
                    placeholder="Mon,Tue,Wed,Thu,Fri,Sat"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Working Hours</label>
                  <input
                    id="staff-form-working-hours"
                    type="text"
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                    placeholder="10:00 AM - 07:00 PM"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="staff-form-submit-btn"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
