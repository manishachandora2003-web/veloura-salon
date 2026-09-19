import React, { useState } from 'react';
import {
  Shield,
  KeyRound,
  UserCheck,
  XCircle,
  AlertCircle,
  Lock,
  Scissors,
} from 'lucide-react';
import { api, setAuthToken } from '../services/api.ts';
import { StaffMember } from '../types.ts';

interface AuthModalProps {
  initialType?: 'admin' | 'staff';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (role: 'ADMIN' | 'STAFF', staff?: StaffMember) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialType = 'admin',
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [authType, setAuthType] = useState<'admin' | 'staff'>(initialType);

  // Admin Form State
  const [adminPin, setAdminPin] = useState('');

  // Staff Form State
  const [staffCode, setStaffCode] = useState('');
  const [staffPasscode, setStaffPasscode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const val = adminPin.trim();
    try {
      const res = await api.adminLogin({
        pin: val,
        username: 'admin',
        password: val,
      });

      if (res.token) {
        setAuthToken(res.token);
        onSuccess('ADMIN');
        onClose();
      } else {
        throw new Error('No token returned from server.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid security PIN or password');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.staffLogin({
        staffCode: staffCode.trim(),
        passcode: staffPasscode.trim(),
      });

      if (res.token) {
        setAuthToken(res.token);
        onSuccess('STAFF', res.staff);
        onClose();
      } else {
        throw new Error('No token returned from server.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid Staff Code or Password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              {authType === 'admin' ? <Shield className="h-5 w-5" /> : <Scissors className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-slate-900 tracking-tight">
                {authType === 'admin' ? 'Owner / Admin Login' : 'Staff Member Portal Login'}
              </h3>
              <p className="text-[11px] text-slate-500">Veloura 🎀 Secure Access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Portal Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 mb-4 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setAuthType('admin');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              authType === 'admin'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Owner / Admin
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthType('staff');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              authType === 'staff'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Staff Member
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* ADMIN LOGIN FORM */}
        {authType === 'admin' && (
          <form onSubmit={handleAdminSubmit} className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Security PIN / Password *
              </label>
              <div className="relative">
                <KeyRound className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="password"
                  required
                  autoFocus
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="Enter PIN or Password"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Lock className="h-4 w-4" />
              <span>{loading ? 'Verifying...' : 'Unlock Admin Dashboard'}</span>
            </button>
          </form>
        )}

        {/* STAFF LOGIN FORM */}
        {authType === 'staff' && (
          <form onSubmit={handleStaffSubmit} className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Staff Code *
              </label>
              <div className="relative">
                <Scissors className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={staffCode}
                  onChange={(e) => setStaffCode(e.target.value)}
                  placeholder="Enter Staff Code"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Staff Password *
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={staffPasscode}
                  onChange={(e) => setStaffPasscode(e.target.value)}
                  placeholder="Enter Password"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <UserCheck className="h-4 w-4" />
              <span>{loading ? 'Authenticating...' : 'Sign In to Staff Dashboard'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
