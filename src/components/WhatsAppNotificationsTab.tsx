import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Radio,
  ArrowRight,
  Clock,
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  Activity,
  Phone,
  Zap,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { SalonSettings } from '../types.ts';

interface WhatsAppNotificationsTabProps {
  settings: SalonSettings | null;
}

interface NotificationLogsData {
  stats: {
    totalLogged: number;
    whatsappDelivered: number;
    smsFallbackDelivered: number;
    fallbackTriggered: number;
    pendingOrFailed: number;
  };
  appointments: Array<{
    id: number;
    bookingCode: string;
    customerName: string;
    customerPhone: string;
    date: string;
    startTime: string;
    status: string;
    totalAmount: number;
    whatsappStatus?: string;
    whatsappMessageId?: string;
    whatsappError?: string;
    whatsappSentAt?: string;
    smsStatus?: string;
    smsMessageId?: string;
    smsError?: string;
    smsSentAt?: string;
    notificationChannel?: string;
    updatedAt?: string;
    createdAt?: string;
  }>;
  activityLogs: Array<{
    id: number;
    action: string;
    description: string;
    entityType?: string;
    entityId?: string;
    createdAt: string;
  }>;
}

export const WhatsAppNotificationsTab: React.FC<WhatsAppNotificationsTabProps> = ({ settings }) => {
  // Config & Diagnostics States
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [waConfig, setWaConfig] = useState<{
    isConfigured: boolean;
    hasAccessToken: boolean;
    hasPhoneNumberId: boolean;
    phoneNumberIdMasked?: string;
    hasTemplate: boolean;
    templateName?: string;
  } | null>(null);

  const [smsConfig, setSmsConfig] = useState<{
    isConfigured: boolean;
    hasAccountSid: boolean;
    hasAuthToken: boolean;
    hasFromNumber: boolean;
    hasMessagingServiceSid: boolean;
    accountSidMasked?: string;
    fromNumberMasked?: string;
  } | null>(null);

  // Live Connection Ping States
  const [pingingMeta, setPingingMeta] = useState(false);
  const [metaPingResult, setMetaPingResult] = useState<{
    connected: boolean;
    status: string;
    error?: string;
    details?: any;
    timestamp?: string;
  } | null>(null);

  const [pingingTwilio, setPingingTwilio] = useState(false);
  const [twilioPingResult, setTwilioPingResult] = useState<{
    connected: boolean;
    status: string;
    error?: string;
    details?: any;
    timestamp?: string;
  } | null>(null);

  // Testing Fallback Console States
  const [testPhone, setTestPhone] = useState(settings?.phone || '9876543210');
  const [testMode, setTestMode] = useState<'fallback' | 'direct_sms'>('fallback');
  const [testingFallback, setTestingFallback] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    testMode: string;
    phone: string;
    activeChannel: 'whatsapp' | 'sms' | 'none';
    fallbackTriggered: boolean;
    summary: string;
    timestamp: string;
    latencyMs: number;
    whatsapp: any;
    sms: any;
  } | null>(null);
  const [showRawTestJson, setShowRawTestJson] = useState(false);

  // Delivery Logs States
  const [logsData, setLogsData] = useState<NotificationLogsData | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logFilter, setLogFilter] = useState<'all' | 'whatsapp' | 'sms_fallback' | 'failed'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [resendingAppointmentId, setResendingAppointmentId] = useState<number | null>(null);
  const [resendStatusMsg, setResendStatusMsg] = useState<{ id: number; message: string; success: boolean } | null>(null);

  // Load configs & logs
  const loadDiagnostics = async () => {
    setLoadingConfig(true);
    try {
      const [waRes, smsRes] = await Promise.all([
        api.getWhatsAppConfig().catch(() => null),
        api.getSMSConfig().catch(() => null),
      ]);
      if (waRes) setWaConfig(waRes);
      if (smsRes) setSmsConfig(smsRes);
    } catch (err) {
      console.error('Failed to load notification configs:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const logsRes = await api.getNotificationLogs(60);
      if (logsRes.success) {
        setLogsData(logsRes);
      }
    } catch (err) {
      console.error('Failed to load notification logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
    loadLogs();
  }, []);

  // Ping Meta Graph API
  const handlePingMeta = async () => {
    setPingingMeta(true);
    setMetaPingResult(null);
    try {
      const res = await api.testMetaWhatsAppConnection();
      setMetaPingResult({
        ...res,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      setMetaPingResult({
        connected: false,
        status: 'Error',
        error: err.message || 'Connection failed',
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setPingingMeta(false);
    }
  };

  // Ping Twilio REST API
  const handlePingTwilio = async () => {
    setPingingTwilio(true);
    setTwilioPingResult(null);
    try {
      const res = await api.testTwilioSMSConnection();
      setTwilioPingResult({
        ...res,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      setTwilioPingResult({
        connected: false,
        status: 'Error',
        error: err.message || 'Connection failed',
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setPingingTwilio(false);
    }
  };

  // Execute Fallback or Direct SMS Test
  const handleRunFallbackTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) return;

    setTestingFallback(true);
    setTestResult(null);
    try {
      const res = await api.testNotificationFallback({
        phone: testPhone.trim(),
        testMode,
      });
      setTestResult(res);
      // Reload logs to show the newly recorded test event
      loadLogs();
    } catch (err: any) {
      setTestResult({
        success: false,
        testMode,
        phone: testPhone,
        activeChannel: 'none',
        fallbackTriggered: testMode === 'fallback',
        summary: err.message || 'Test dispatch execution failed',
        timestamp: new Date().toISOString(),
        latencyMs: 0,
        whatsapp: { success: false, status: 'Test Execution Error', error: err.message },
        sms: { success: false, status: 'Test Execution Error', error: err.message },
      });
    } finally {
      setTestingFallback(false);
    }
  };

  // Resend notification for specific appointment in logs
  const handleResendFromLog = async (appointmentId: number) => {
    setResendingAppointmentId(appointmentId);
    setResendStatusMsg(null);
    try {
      const res = await api.resendWhatsAppConfirmation(appointmentId);
      setResendStatusMsg({
        id: appointmentId,
        message: res.summary || (res.success ? 'Notification dispatched successfully' : 'Notification dispatch failed'),
        success: res.success,
      });
      loadLogs();
    } catch (err: any) {
      setResendStatusMsg({
        id: appointmentId,
        message: err.message || 'Failed to resend notification',
        success: false,
      });
    } finally {
      setResendingAppointmentId(null);
    }
  };

  // Filtered Appointments Log List
  const filteredAppointments = useMemo(() => {
    if (!logsData?.appointments) return [];
    return logsData.appointments.filter((apt) => {
      // Filter by Channel / Status
      if (logFilter === 'whatsapp' && apt.whatsappStatus !== 'WhatsApp Sent') return false;
      if (logFilter === 'sms_fallback' && apt.smsStatus !== 'SMS Sent') return false;
      if (logFilter === 'failed' && apt.whatsappStatus !== 'WhatsApp Failed' && apt.smsStatus !== 'SMS Failed') {
        return false;
      }

      // Search
      if (logSearch.trim()) {
        const q = logSearch.toLowerCase().trim();
        const matchesName = apt.customerName.toLowerCase().includes(q);
        const matchesPhone = apt.customerPhone.toLowerCase().includes(q);
        const matchesCode = (apt.bookingCode || '').toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesCode;
      }

      return true;
    });
  }, [logsData, logFilter, logSearch]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900">WhatsApp & Multi-Channel Notifications</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Diagnostics
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor Meta Graph API connection status, review live delivery logs, and test the automated Twilio SMS fallback pipeline
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <button
            id="notif-refresh-all-btn"
            onClick={() => {
              loadDiagnostics();
              loadLogs();
            }}
            disabled={loadingConfig || loadingLogs}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingConfig || loadingLogs ? 'animate-spin' : ''}`} />
            <span>Refresh Diagnostics</span>
          </button>
        </div>
      </div>

      {/* Summary Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Logged</span>
            <Activity className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {logsData?.stats.totalLogged ?? '...'}
          </p>
          <span className="text-[10px] text-slate-400">Appointment notifications</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">WhatsApp Sent</span>
            <MessageSquare className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {logsData?.stats.whatsappDelivered ?? 0}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium">Meta Cloud API primary</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-2xs bg-blue-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800">SMS Fallback Sent</span>
            <Smartphone className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 mt-1">
            {logsData?.stats.smsFallbackDelivered ?? 0}
          </p>
          <span className="text-[10px] text-blue-600 font-medium">Twilio automated recovery</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-2xs bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Fallback Triggered</span>
            <Zap className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-1">
            {logsData?.stats.fallbackTriggered ?? 0}
          </p>
          <span className="text-[10px] text-amber-600 font-medium">Auto-cascade events</span>
        </div>
      </div>

      {/* Gateway Status Cards (Meta Graph API & Twilio SMS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Meta Graph API (WhatsApp) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Meta WhatsApp Cloud API</h3>
                  <p className="text-[11px] text-slate-500">Primary Channel • Graph API v21.0</p>
                </div>
              </div>
              {waConfig?.isConfigured ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Configured</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center space-x-1">
                  <AlertCircle className="h-3 w-3 text-slate-400" />
                  <span>Pending Setup</span>
                </span>
              )}
            </div>

            <div className="mt-4 space-y-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Phone Number ID:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {waConfig?.phoneNumberIdMasked || 'WHATSAPP_PHONE_NUMBER_ID missing'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Access Token:</span>
                <span className="font-mono text-slate-800 font-semibold">
                  {waConfig?.hasAccessToken ? 'Bearer •••••••• (Detected)' : 'WHATSAPP_ACCESS_TOKEN missing'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Message Template:</span>
                <span className="text-slate-800 font-medium">
                  {waConfig?.templateName || 'Default Direct Text Format'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Endpoint:</span>
                <span className="font-mono text-[11px] text-slate-600">graph.facebook.com/v21.0</span>
              </div>
            </div>

            {/* Live Ping Feedback */}
            {metaPingResult && (
              <div
                className={`mt-3 p-3 rounded-lg text-xs border ${
                  metaPingResult.connected
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className="flex items-center space-x-1">
                    {metaPingResult.connected ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                    )}
                    <span>Meta Graph Status: {metaPingResult.status}</span>
                  </span>
                  <span className="text-[10px] opacity-75">{metaPingResult.timestamp}</span>
                </div>
                {metaPingResult.details?.verifiedName && (
                  <p className="text-[11px]">
                    Verified Account: <strong>{metaPingResult.details.verifiedName}</strong>
                  </p>
                )}
                {metaPingResult.details?.qualityRating && (
                  <p className="text-[11px]">Quality Rating: {metaPingResult.details.qualityRating}</p>
                )}
                {metaPingResult.error && (
                  <p className="text-[11px] mt-0.5 text-amber-800 break-words">{metaPingResult.error}</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Pings Meta endpoint to verify credentials</span>
            <button
              id="ping-meta-api-btn"
              onClick={handlePingMeta}
              disabled={pingingMeta}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Radio className={`h-3 w-3 ${pingingMeta ? 'animate-pulse text-amber-300' : ''}`} />
              <span>{pingingMeta ? 'Pinging Meta...' : 'Ping Meta Graph API'}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Twilio SMS (Automated Fallback) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Twilio SMS Gateway</h3>
                  <p className="text-[11px] text-slate-500">Automated Fallback • REST Messages API</p>
                </div>
              </div>
              {smsConfig?.isConfigured ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center space-x-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Fallback Active</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center space-x-1">
                  <AlertCircle className="h-3 w-3 text-slate-400" />
                  <span>Pending Setup</span>
                </span>
              )}
            </div>

            <div className="mt-4 space-y-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Account SID:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {smsConfig?.accountSidMasked || 'TWILIO_ACCOUNT_SID missing'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Auth Token:</span>
                <span className="font-mono text-slate-800 font-semibold">
                  {smsConfig?.hasAuthToken ? 'Basic Auth •••••••• (Detected)' : 'TWILIO_AUTH_TOKEN missing'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Sender Number:</span>
                <span className="font-mono text-slate-800 font-semibold">
                  {smsConfig?.fromNumberMasked || 'TWILIO_PHONE_NUMBER missing'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Trigger Rule:</span>
                <span className="text-slate-800 font-medium">
                  Auto-cascades if WhatsApp is Failed or Not Configured
                </span>
              </div>
            </div>

            {/* Live Twilio Ping Feedback */}
            {twilioPingResult && (
              <div
                className={`mt-3 p-3 rounded-lg text-xs border ${
                  twilioPingResult.connected
                    ? 'bg-blue-50 text-blue-900 border-blue-200'
                    : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className="flex items-center space-x-1">
                    {twilioPingResult.connected ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                    )}
                    <span>Twilio Status: {twilioPingResult.status}</span>
                  </span>
                  <span className="text-[10px] opacity-75">{twilioPingResult.timestamp}</span>
                </div>
                {twilioPingResult.details?.accountName && (
                  <p className="text-[11px]">
                    Account Name: <strong>{twilioPingResult.details.accountName}</strong>
                  </p>
                )}
                {twilioPingResult.error && (
                  <p className="text-[11px] mt-0.5 text-amber-800 break-words">{twilioPingResult.error}</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Verifies Twilio REST account authentication</span>
            <button
              id="ping-twilio-api-btn"
              onClick={handlePingTwilio}
              disabled={pingingTwilio}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Radio className={`h-3 w-3 ${pingingTwilio ? 'animate-pulse text-amber-300' : ''}`} />
              <span>{pingingTwilio ? 'Pinging Twilio...' : 'Ping Twilio API'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Testing Bench: Test Twilio SMS Fallback Mechanism */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-slate-900 text-sm">Test Twilio SMS Fallback Mechanism</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                Admin Testing Sandbox
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Execute a simulated appointment confirmation to test the cascade from WhatsApp to Twilio SMS
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium">Pipeline:</span>
            <span className="text-xs font-mono font-bold bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 flex items-center space-x-1">
              <span>WhatsApp</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
              <span className="text-blue-600">Twilio SMS</span>
            </span>
          </div>
        </div>

        <form onSubmit={handleRunFallbackTest} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Phone input */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Recipient Mobile Phone Number *
              </label>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    id="test-phone-input"
                    type="text"
                    required
                    placeholder="+91 98765 43210 or 10-digit mobile"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {settings?.phone && (
                  <button
                    type="button"
                    onClick={() => setTestPhone(settings.phone)}
                    className="px-2.5 py-2 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold shrink-0"
                    title="Use Salon Contact Phone"
                  >
                    Use Salon Phone
                  </button>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Normalized automatically: E.164 without '+' for WhatsApp, with '+' for Twilio SMS.
              </span>
            </div>

            {/* Test Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Testing Mode</label>
              <select
                id="test-mode-select"
                value={testMode}
                onChange={(e) => setTestMode(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-semibold bg-white text-slate-800"
              >
                <option value="fallback">Automated Fallback (Full Workflow)</option>
                <option value="direct_sms">Direct Twilio SMS Ping</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {testMode === 'fallback'
                  ? 'Attempts WhatsApp; triggers Twilio SMS if WhatsApp fails'
                  : 'Bypasses WhatsApp and tests Twilio SMS dispatch directly'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Dispatches a test appointment payload (₹2300, 75 mins, Velvet Hair Spa)
            </span>
            <button
              id="run-fallback-test-btn"
              type="submit"
              disabled={testingFallback}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Send className={`h-3.5 w-3.5 ${testingFallback ? 'animate-pulse text-blue-400' : 'text-blue-400'}`} />
              <span>{testingFallback ? 'Executing Test Pipeline...' : 'Run Notification Test'}</span>
            </button>
          </div>
        </form>

        {/* Test Result Inspector */}
        {testResult && (
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-slate-900 flex items-center space-x-1.5">
                <Activity className="h-4 w-4 text-blue-600" />
                <span>Test Execution Trace</span>
                <span className="text-[10px] font-normal text-slate-400">({testResult.latencyMs}ms)</span>
              </h4>
              <button
                onClick={() => setShowRawTestJson(!showRawTestJson)}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <span>{showRawTestJson ? 'Hide Raw Trace' : 'View Raw JSON'}</span>
                {showRawTestJson ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>

            {/* Visual Workflow Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Step 1: WhatsApp Primary */}
              <div
                className={`p-3 rounded-lg border ${
                  testResult.whatsapp?.success
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span>1. WhatsApp Primary</span>
                  {testResult.whatsapp?.success ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800">Sent</span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-slate-200 text-slate-700">
                      {testResult.whatsapp?.status || 'Bypassed'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 break-words">
                  {testResult.whatsapp?.messageId
                    ? `Message ID: ${testResult.whatsapp.messageId}`
                    : testResult.whatsapp?.error || 'Primary gateway attempt'}
                </p>
              </div>

              {/* Step 2: Fallback Decision */}
              <div
                className={`p-3 rounded-lg border ${
                  testResult.fallbackTriggered
                    ? 'bg-amber-50/50 border-amber-200 text-amber-900'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span>2. Fallback Cascade</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-sm font-bold ${
                      testResult.fallbackTriggered
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {testResult.fallbackTriggered ? 'Triggered' : 'Not Required'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {testResult.fallbackTriggered
                    ? 'WhatsApp status prompted automated Twilio SMS fallback'
                    : 'WhatsApp was successful or direct SMS mode was selected'}
                </p>
              </div>

              {/* Step 3: Twilio SMS Outcome */}
              <div
                className={`p-3 rounded-lg border ${
                  testResult.sms?.success
                    ? 'bg-blue-50/50 border-blue-200 text-blue-900'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span>3. Twilio SMS Fallback</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-sm font-bold ${
                      testResult.sms?.success
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {testResult.sms?.status || 'Pending'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 break-words">
                  {testResult.sms?.messageId
                    ? `Twilio SID: ${testResult.sms.messageId}`
                    : testResult.sms?.error || 'SMS fallback status'}
                </p>
              </div>
            </div>

            {/* Summary Banner */}
            <div
              className={`p-3 rounded-lg text-xs font-semibold flex items-center space-x-2 border ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-800 border-slate-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-slate-500 shrink-0" />
              )}
              <span>{testResult.summary}</span>
            </div>

            {showRawTestJson && (
              <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[10px] rounded-lg overflow-x-auto max-h-48 border border-slate-800">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Message Delivery Logs Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-slate-900 text-sm">Recent Message Delivery Logs</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                {filteredAppointments.length} events
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time audit log of customer appointment notifications across Meta WhatsApp and Twilio SMS
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadLogs}
              disabled={loadingLogs}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Refresh Logs"
            >
              <RefreshCw className={`h-4 w-4 ${loadingLogs ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              id="filter-log-all"
              onClick={() => setLogFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                logFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Logs
            </button>
            <button
              id="filter-log-wa"
              onClick={() => setLogFilter('whatsapp')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                logFilter === 'whatsapp'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              WhatsApp Sent
            </button>
            <button
              id="filter-log-sms"
              onClick={() => setLogFilter('sms_fallback')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                logFilter === 'sms_fallback'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              SMS Fallback Sent
            </button>
            <button
              id="filter-log-failed"
              onClick={() => setLogFilter('failed')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                logFilter === 'failed'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Failed / Alerts
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-3.5 w-3.5" />
            </div>
            <input
              type="text"
              placeholder="Search by name, phone, code..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        {/* Resend Status Notification Banner */}
        {resendStatusMsg && (
          <div
            className={`mt-3 p-3 rounded-lg text-xs font-semibold flex items-center justify-between border ${
              resendStatusMsg.success
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span>{resendStatusMsg.message}</span>
            <button
              onClick={() => setResendStatusMsg(null)}
              className="text-slate-400 hover:text-slate-600 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Logs Table */}
        <div className="mt-4 overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Recipient / Customer</th>
                <th className="py-2.5 px-3">Booking Code</th>
                <th className="py-2.5 px-3">Primary (WhatsApp)</th>
                <th className="py-2.5 px-3">Fallback (Twilio SMS)</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {loadingLogs ? 'Loading notification delivery logs...' : 'No notification logs match your filters.'}
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Date & Time */}
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{apt.date}</div>
                      <div className="text-[11px] text-slate-400">{apt.startTime}</div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{apt.customerName}</div>
                      <div className="font-mono text-[11px] text-slate-500">{apt.customerPhone}</div>
                    </td>

                    {/* Booking Code */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        {apt.bookingCode || `#${apt.id}`}
                      </span>
                    </td>

                    {/* WhatsApp Status */}
                    <td className="py-3 px-3">
                      {apt.whatsappStatus === 'WhatsApp Sent' ? (
                        <div className="flex items-center space-x-1 text-emerald-700 font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="text-[11px]">Sent</span>
                          {apt.whatsappMessageId && (
                            <span className="text-[10px] font-mono text-emerald-600/80 truncate max-w-[80px]" title={apt.whatsappMessageId}>
                              ({apt.whatsappMessageId.slice(-6)})
                            </span>
                          )}
                        </div>
                      ) : apt.whatsappStatus === 'WhatsApp Failed' ? (
                        <div className="text-rose-700">
                          <div className="flex items-center space-x-1 font-bold">
                            <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                            <span className="text-[11px]">Failed</span>
                          </div>
                          {apt.whatsappError && (
                            <p className="text-[10px] text-rose-600/80 truncate max-w-[140px]" title={apt.whatsappError}>
                              {apt.whatsappError}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">
                          {apt.whatsappStatus || 'Not Configured'}
                        </span>
                      )}
                    </td>

                    {/* SMS Status */}
                    <td className="py-3 px-3">
                      {apt.smsStatus === 'SMS Sent' ? (
                        <div className="flex items-center space-x-1 text-blue-700 font-bold">
                          <Smartphone className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span className="text-[11px]">Fallback Sent</span>
                          {apt.smsMessageId && (
                            <span className="text-[10px] font-mono text-blue-600/80 truncate max-w-[80px]" title={apt.smsMessageId}>
                              ({apt.smsMessageId.slice(-6)})
                            </span>
                          )}
                        </div>
                      ) : apt.smsStatus === 'SMS Failed' ? (
                        <div className="text-amber-700">
                          <div className="flex items-center space-x-1 font-bold">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span className="text-[11px]">Fallback Failed</span>
                          </div>
                          {apt.smsError && (
                            <p className="text-[10px] text-amber-600/80 truncate max-w-[140px]" title={apt.smsError}>
                              {apt.smsError}
                            </p>
                          )}
                        </div>
                      ) : apt.whatsappStatus === 'WhatsApp Sent' ? (
                        <span className="text-[10px] text-slate-300">Not Needed</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          {apt.smsStatus || 'Triggered'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        id={`resend-log-btn-${apt.id}`}
                        onClick={() => handleResendFromLog(apt.id)}
                        disabled={resendingAppointmentId === apt.id}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-[11px] transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center space-x-1"
                        title="Re-dispatch notification through automated cascade"
                      >
                        <RefreshCw className={`h-3 w-3 ${resendingAppointmentId === apt.id ? 'animate-spin' : ''}`} />
                        <span>Resend</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Audit Log Activities (Testing & System events) */}
        {logsData?.activityLogs && logsData.activityLogs.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 mb-2.5 flex items-center space-x-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Recent Notification Activity Events & Test Runs</span>
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {logsData.activityLogs.map((act) => (
                <div
                  key={act.id}
                  className="text-[11px] p-2 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                      {act.action}
                    </span>
                    <span className="text-slate-700 truncate">{act.description}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                    {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
