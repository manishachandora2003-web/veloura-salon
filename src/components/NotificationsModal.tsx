import React from 'react';
import {
  Bell,
  X,
  CheckCheck,
  AlertTriangle,
  Clock,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { NotificationItem } from '../types.ts';
import { api } from '../services/api.ts';

interface NotificationsModalProps {
  notifications: NotificationItem[];
  onClose: () => void;
  onRefreshData: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  notifications,
  onClose,
  onRefreshData,
}) => {
  const handleMarkAsRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      onRefreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      onRefreshData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 relative max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-base">Salon Notifications</h3>
          </div>
          {notifications.some((n) => !n.isRead) && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center space-x-1"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">All caught up!</p>
              <p className="text-slate-400 mt-0.5">No unread salon alerts right now.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-xl border transition-all text-xs flex items-start justify-between gap-3 ${
                  n.isRead
                    ? 'bg-slate-50/70 border-slate-100 text-slate-600'
                    : 'bg-amber-50/60 border-amber-200 text-slate-900 font-medium'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-slate-900">{n.title}</span>
                    {!n.isRead && (
                      <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0"></span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-slate-400 font-mono block">{n.createdAt}</span>
                </div>

                {!n.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 shrink-0 px-2 py-1 bg-white rounded border border-slate-200"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
