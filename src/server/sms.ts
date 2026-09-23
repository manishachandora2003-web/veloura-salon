/**
 * Veloura 🎀 — Twilio SMS Service Integration
 * Automated SMS fallback mechanism for appointment confirmations
 * triggered when WhatsApp is failed or not configured.
 *
 * Requirements:
 * - Real Twilio REST API (https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json)
 * - Strict E.164 phone normalization with leading '+'
 * - Delivery status tracking ('SMS Sent' | 'SMS Failed' | 'SMS Not Configured' | 'Invalid Number')
 * - Zero secret or token leakage in logs or error responses
 * - Lazy initialization to prevent startup crashes when keys are missing
 */

export interface SMSSendResult {
  success: boolean;
  status: 'SMS Sent' | 'SMS Failed' | 'SMS Not Configured' | 'Invalid Number';
  messageId?: string;
  error?: string;
  provider: 'Twilio';
  sentAt?: string;
}

export interface AppointmentSMSPayload {
  customerName: string;
  customerPhone: string;
  bookingCode: string;
  services: Array<{ serviceName: string; price: number; duration: number }>;
  staffName: string;
  date: string;
  startTime: string;
  totalDuration: number;
  totalAmount: number;
  status: string;
  salonName?: string;
  salonPhone?: string;
  salonAddress?: string;
}

/**
 * Validates and normalizes customer phone numbers to strict E.164 format (+[country_code][number])
 * as required by the Twilio REST API.
 */
export function normalizePhoneNumberForSMS(rawPhone: string): {
  isValid: boolean;
  normalized?: string; // e.g. +919876543210
  display?: string;    // e.g. +91 98765 43210
  error?: string;
} {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove whitespace, dashes, parentheses, dots
  let digits = rawPhone.replace(/[\s\-\(\)\.]/g, '');

  // Strip leading plus for digit inspection
  let hasPlus = digits.startsWith('+');
  if (hasPlus) {
    digits = digits.slice(1);
  }

  // If starts with 0 and length is 11 (e.g. Indian STD prefix 08847492214)
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  // 10 digits starting with 6, 7, 8, 9 -> standard Indian mobile
  if (/^[6-9]\d{9}$/.test(digits)) {
    return {
      isValid: true,
      normalized: `+91${digits}`,
      display: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
    };
  }

  // 12 digits starting with 91 followed by 6-9
  if (/^91[6-9]\d{9}$/.test(digits)) {
    const mainDigits = digits.slice(2);
    return {
      isValid: true,
      normalized: `+${digits}`,
      display: `+91 ${mainDigits.slice(0, 5)} ${mainDigits.slice(5)}`,
    };
  }

  // International format: 10 to 15 digits
  if (/^\d{10,15}$/.test(digits)) {
    return {
      isValid: true,
      normalized: `+${digits}`,
      display: `+${digits}`,
    };
  }

  return {
    isValid: false,
    error: 'Phone number must be a valid 10-digit mobile number.',
  };
}

/**
 * Diagnostic status for Twilio SMS configuration without exposing tokens.
 */
export function getTwilioConfigStatus(): {
  isConfigured: boolean;
  hasAccountSid: boolean;
  hasAuthToken: boolean;
  hasFromNumber: boolean;
  hasMessagingServiceSid: boolean;
  accountSidMasked?: string;
  fromNumberMasked?: string;
} {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const fromNumber = (
    process.env.TWILIO_PHONE_NUMBER ||
    process.env.TWILIO_FROM_PHONE_NUMBER ||
    ''
  ).trim();
  const messagingServiceSid = (process.env.TWILIO_MESSAGING_SERVICE_SID || '').trim();

  const hasSender = Boolean(fromNumber || messagingServiceSid);
  const isConfigured = Boolean(accountSid && authToken && hasSender);

  const accountSidMasked = accountSid
    ? accountSid.length > 8
      ? `${accountSid.slice(0, 4)}...${accountSid.slice(-4)}`
      : 'AC***'
    : undefined;

  const fromNumberMasked = fromNumber
    ? fromNumber.length > 6
      ? `${fromNumber.slice(0, 3)}...${fromNumber.slice(-3)}`
      : '***'
    : messagingServiceSid
    ? `Service: ${messagingServiceSid.slice(0, 4)}...`
    : undefined;

  return {
    isConfigured,
    hasAccountSid: Boolean(accountSid),
    hasAuthToken: Boolean(authToken),
    hasFromNumber: Boolean(fromNumber),
    hasMessagingServiceSid: Boolean(messagingServiceSid),
    accountSidMasked,
    fromNumberMasked,
  };
}

/**
 * Sends a real SMS appointment confirmation via Twilio REST API.
 * Designed to be called as a fallback when WhatsApp is failed or not configured.
 */
export async function sendTwilioSMSAppointmentConfirmation(
  payload: AppointmentSMSPayload
): Promise<SMSSendResult> {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const fromNumber = (
    process.env.TWILIO_PHONE_NUMBER ||
    process.env.TWILIO_FROM_PHONE_NUMBER ||
    ''
  ).trim();
  const messagingServiceSid = (process.env.TWILIO_MESSAGING_SERVICE_SID || '').trim();

  // 1. Verify Configuration
  if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid)) {
    return {
      success: false,
      status: 'SMS Not Configured',
      error: 'Twilio SMS credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER) are not configured in the server environment.',
      provider: 'Twilio',
    };
  }

  // 2. Validate and Normalize Recipient Number
  const phoneCheck = normalizePhoneNumberForSMS(payload.customerPhone);
  if (!phoneCheck.isValid || !phoneCheck.normalized) {
    return {
      success: false,
      status: 'Invalid Number',
      error: phoneCheck.error || 'Invalid customer phone number for Twilio SMS delivery.',
      provider: 'Twilio',
    };
  }

  // 3. Format SMS Content
  const serviceSummary =
    payload.services && payload.services.length > 0
      ? payload.services.map((s) => s.serviceName).join(', ')
      : 'Salon Services';

  const salonName = payload.salonName || 'Veloura 🎀';
  const messageBody =
`${salonName} Appointment Confirmed!
Booking ID: ${payload.bookingCode}
Customer: ${payload.customerName.trim()}
Service(s): ${serviceSummary}
Specialist: ${payload.staffName}
Date: ${payload.date} at ${payload.startTime} (${payload.totalDuration} mins)
Total: ₹${payload.totalAmount}
Status: ${payload.status}
Thank you for choosing Veloura!`.trim();

  // 4. Build Request Params for Twilio REST API
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;

  const params = new URLSearchParams();
  params.append('To', phoneCheck.normalized);
  params.append('Body', messageBody);

  if (messagingServiceSid) {
    params.append('MessagingServiceSid', messagingServiceSid);
  } else {
    params.append('From', fromNumber);
  }

  const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: params.toString(),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        data?.message ||
        `Twilio API returned HTTP ${response.status}: ${response.statusText}`;

      return {
        success: false,
        status: 'SMS Failed',
        error: errorMsg,
        provider: 'Twilio',
      };
    }

    const messageId = data?.sid || `SM${Date.now()}`;
    return {
      success: true,
      status: 'SMS Sent',
      messageId,
      provider: 'Twilio',
      sentAt: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'SMS Failed',
      error: err?.message || 'Network communication error connecting to Twilio SMS API endpoint.',
      provider: 'Twilio',
    };
  }
}

/**
 * Tests Twilio SMS connection and account validity.
 */
export async function testTwilioSMSConnection(): Promise<{
  connected: boolean;
  status: string;
  error?: string;
  details: {
    accountSidMasked?: string;
    fromNumberMasked?: string;
    hasAuthToken: boolean;
    hasSender: boolean;
    accountName?: string;
    accountStatus?: string;
  };
}> {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const fromNumber = (
    process.env.TWILIO_PHONE_NUMBER ||
    process.env.TWILIO_FROM_PHONE_NUMBER ||
    ''
  ).trim();
  const messagingServiceSid = (process.env.TWILIO_MESSAGING_SERVICE_SID || '').trim();

  const accountSidMasked = accountSid
    ? accountSid.length > 8
      ? `${accountSid.slice(0, 4)}...${accountSid.slice(-4)}`
      : 'AC***'
    : undefined;

  const fromNumberMasked = fromNumber
    ? fromNumber.length > 6
      ? `${fromNumber.slice(0, 3)}...${fromNumber.slice(-3)}`
      : '***'
    : messagingServiceSid
    ? `Service: ${messagingServiceSid.slice(0, 4)}...`
    : undefined;

  if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid)) {
    return {
      connected: false,
      status: 'Not Configured',
      error: 'Twilio SMS credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or sender number) are not configured in the server environment.',
      details: {
        accountSidMasked,
        fromNumberMasked,
        hasAuthToken: Boolean(authToken),
        hasSender: Boolean(fromNumber || messagingServiceSid),
      },
    };
  }

  try {
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}.json`;
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg =
        data?.message || `Twilio API returned HTTP ${response.status}: ${response.statusText}`;

      return {
        connected: false,
        status: 'Authentication Failed',
        error: errMsg,
        details: {
          accountSidMasked,
          fromNumberMasked,
          hasAuthToken: true,
          hasSender: true,
        },
      };
    }

    return {
      connected: true,
      status: 'Connected & Active',
      details: {
        accountSidMasked,
        fromNumberMasked,
        hasAuthToken: true,
        hasSender: true,
        accountName: data.friendly_name || 'Twilio Production Account',
        accountStatus: data.status || 'active',
      },
    };
  } catch (err: any) {
    return {
      connected: false,
      status: 'Network Error',
      error: err?.message || 'Failed to connect to Twilio API endpoint.',
      details: {
        accountSidMasked,
        fromNumberMasked,
        hasAuthToken: true,
        hasSender: true,
      },
    };
  }
}
