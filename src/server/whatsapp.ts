/**
 * Veloura 🎀 — WhatsApp Business Cloud API Integration
 * Official Meta Graph API integration for real WhatsApp appointment notifications.
 *
 * Requirements:
 * - Real Meta Graph API (v21.0)
 * - Strict phone number validation and normalization (E.164 without leading plus for Meta)
 * - Real delivery status tracking (WhatsApp Sent, WhatsApp Failed, WhatsApp Not Configured, Invalid Number)
 * - Zero secret leakage (never log or expose tokens)
 */

export interface WhatsAppSendResult {
  success: boolean;
  status: 'WhatsApp Sent' | 'WhatsApp Failed' | 'WhatsApp Not Configured' | 'Invalid Number';
  messageId?: string;
  error?: string;
}

export interface AppointmentWhatsAppPayload {
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
 * Validates and normalizes customer phone number for Meta WhatsApp Cloud API.
 * For Indian numbers (10 digits starting with 6-9), produces '91XXXXXXXXXX'.
 * Meta WhatsApp Cloud API expects country code without leading '+'.
 */
export function normalizePhoneNumber(rawPhone: string): {
  isValid: boolean;
  normalized?: string; // For API (e.g. 918847492214)
  display?: string;    // For UI (e.g. +91 88474 92214)
  error?: string;
} {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove whitespace, dashes, parentheses, dots
  let digits = rawPhone.replace(/[\s\-\(\)\.]/g, '');

  // Strip leading plus if present
  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  }

  // If starts with 0 and length is 11 (e.g. Indian STD prefix 08847492214)
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  // If 10 digits and starts with 6, 7, 8, 9 -> standard Indian mobile
  if (/^[6-9]\d{9}$/.test(digits)) {
    return {
      isValid: true,
      normalized: `91${digits}`,
      display: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
    };
  }

  // If 12 digits starting with 91 followed by 6-9
  if (/^91[6-9]\d{9}$/.test(digits)) {
    const mainDigits = digits.slice(2);
    return {
      isValid: true,
      normalized: digits,
      display: `+91 ${mainDigits.slice(0, 5)} ${mainDigits.slice(5)}`,
    };
  }

  // International standard: between 10 and 15 digits
  if (/^\d{10,15}$/.test(digits)) {
    return {
      isValid: true,
      normalized: digits,
      display: `+${digits}`,
    };
  }

  return {
    isValid: false,
    error: 'Phone number must be a valid 10-digit mobile number.',
  };
}

/**
 * Returns safe diagnostic information about WhatsApp configuration
 * without exposing access tokens or secrets.
 */
export function getWhatsAppConfigStatus(): {
  isConfigured: boolean;
  hasAccessToken: boolean;
  hasPhoneNumberId: boolean;
  phoneNumberIdMasked?: string;
  hasTemplate: boolean;
  templateName?: string;
} {
  const token = (process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_TOKEN || '').trim();
  const phoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const templateName = (process.env.WHATSAPP_TEMPLATE_NAME || '').trim();

  const isConfigured = Boolean(token && phoneId);
  const phoneNumberIdMasked = phoneId
    ? phoneId.length > 6
      ? `${phoneId.slice(0, 3)}...${phoneId.slice(-3)}`
      : '***'
    : undefined;

  return {
    isConfigured,
    hasAccessToken: Boolean(token),
    hasPhoneNumberId: Boolean(phoneId),
    phoneNumberIdMasked,
    hasTemplate: Boolean(templateName),
    templateName: templateName || undefined,
  };
}

/**
 * Sends a real WhatsApp appointment confirmation via Meta WhatsApp Cloud API.
 */
export async function sendWhatsAppAppointmentConfirmation(
  payload: AppointmentWhatsAppPayload
): Promise<WhatsAppSendResult> {
  const token = (process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_TOKEN || '').trim();
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const templateName = (process.env.WHATSAPP_TEMPLATE_NAME || '').trim();

  // 1. Check Configuration
  if (!token || !phoneNumberId) {
    return {
      success: false,
      status: 'WhatsApp Not Configured',
      error: 'WhatsApp Business API credentials (WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID) are not configured in the server environment.',
    };
  }

  // 2. Validate Customer Mobile Number
  const phoneCheck = normalizePhoneNumber(payload.customerPhone);
  if (!phoneCheck.isValid || !phoneCheck.normalized) {
    return {
      success: false,
      status: 'Invalid Number',
      error: phoneCheck.error || 'Invalid customer phone number for WhatsApp delivery.',
    };
  }

  // 3. Format Message Content
  const serviceSummary = payload.services && payload.services.length > 0
    ? payload.services.map((s) => s.serviceName).join(', ')
    : 'Salon Services';

  const messageText =
`Hello ${payload.customerName.trim()} 👋

Your appointment at Veloura 🎀 has been booked successfully.

Booking ID: ${payload.bookingCode}
Service(s): ${serviceSummary}
Specialist: ${payload.staffName}
Date: ${payload.date}
Time: ${payload.startTime}
Duration: ${payload.totalDuration} mins
Total: ₹${payload.totalAmount}
Status: ${payload.status}

Thank you for choosing Veloura 🎀.`;

  // 4. Dispatch to Meta WhatsApp Cloud API
  const endpoint = `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneNumberId)}/messages`;

  let requestBody: any;
  if (templateName) {
    // Approved Meta WhatsApp message template
    requestBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneCheck.normalized,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: payload.customerName },
              { type: 'text', text: payload.bookingCode },
              { type: 'text', text: serviceSummary },
              { type: 'text', text: payload.staffName },
              { type: 'text', text: payload.date },
              { type: 'text', text: payload.startTime },
              { type: 'text', text: `${payload.totalDuration} mins` },
              { type: 'text', text: `₹${payload.totalAmount}` },
              { type: 'text', text: payload.status },
            ],
          },
        ],
      },
    };
  } else {
    // Standard text message
    requestBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneCheck.normalized,
      type: 'text',
      text: {
        preview_url: false,
        body: messageText,
      },
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        responseData?.error?.message ||
        responseData?.error?.error_user_msg ||
        `Meta Graph API returned HTTP ${response.status}: ${response.statusText}`;

      return {
        success: false,
        status: 'WhatsApp Failed',
        error: errorMsg,
      };
    }

    const messageId = responseData?.messages?.[0]?.id || `wamid.${Date.now()}`;
    return {
      success: true,
      status: 'WhatsApp Sent',
      messageId,
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'WhatsApp Failed',
      error: err?.message || 'Network communication error with Meta WhatsApp API endpoint.',
    };
  }
}
