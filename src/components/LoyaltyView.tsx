import React, { useState, useEffect } from 'react';
import {
  Award,
  Crown,
  IndianRupee,
  Clock,
  Search,
  Sparkles,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { LoyaltyAccount, LoyaltyTransaction } from '../types.ts';
import { formatCurrency, formatNumber } from '../lib/currency.ts';
import { api } from '../services/api.ts';

export const LoyaltyView: React.FC = () => {
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .getLoyalty()
      .then((data) => {
        setAccounts(data.accounts || []);
        setTransactions(data.transactions || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredAccounts = accounts.filter(
    (a) =>
      a.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      a.customerPhone?.includes(search)
  );

  return (
    <div className="space-y-5">
      {/* Program Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider opacity-90">Veloura 🎀 Rewards</span>
            <Crown className="h-5 w-5 text-amber-200" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold">{accounts.length} Members</div>
            <p className="text-xs text-amber-100 mt-1">Enrolled salon customers with active points</p>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-400/40 text-[11px] text-amber-100 flex justify-between">
            <span>Rate: 1 Pt per ₹100 spent</span>
            <span>1 Pt = ₹1 redemption</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Points Earned</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-900">
              {formatNumber(accounts.reduce((acc, a) => acc + a.totalEarned, 0))} Pts
            </div>
            <p className="text-xs text-slate-500 mt-1">Cumulative points awarded from completed bills</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Real automated database synchronization
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Points Redeemed</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-indigo-600">
              {formatNumber(accounts.reduce((acc, a) => acc + a.totalRedeemed, 0))} Pts
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Worth {formatCurrency(accounts.reduce((acc, a) => acc + a.totalRedeemed, 0))} in checkout discounts
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Encourages repeat salon visits & client retention
          </div>
        </div>
      </div>

      {/* Main Split: Members Ledger & Points History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Accounts Ledger (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Customer Loyalty Balances</h3>
            <div className="relative w-56">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search member..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-slate-400">Loading accounts...</div>
          ) : filteredAccounts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No loyalty accounts found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Tier</th>
                    <th className="py-2.5 px-3">Available Points</th>
                    <th className="py-2.5 px-3">Total Earned</th>
                    <th className="py-2.5 px-3 text-right">Redeem Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAccounts.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{a.customerName}</div>
                        <div className="text-[10px] text-slate-400">{a.customerPhone}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            a.tier === 'Platinum'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : a.tier === 'Gold'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {a.tier}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-amber-600 text-sm">
                        {a.points} Pts
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{a.totalEarned} Pts</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(a.points)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Point Audit Transactions (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden p-4 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Points Audit Trail</h3>
          {transactions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No transactions recorded yet.</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1 text-xs">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">{tx.description}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{tx.createdAt}</span>
                  </div>
                  <span
                    className={`font-extrabold text-xs px-2 py-0.5 rounded ${
                      tx.type === 'EARN'
                        ? 'text-emerald-700 bg-emerald-50'
                        : 'text-rose-700 bg-rose-50'
                    }`}
                  >
                    {tx.type === 'EARN' ? `+${tx.points}` : `-${tx.points}`} Pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
