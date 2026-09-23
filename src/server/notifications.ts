/**
 * Veloura 🎀 — Unified Appointment Notification Workflow
 * Handles primary WhatsApp notifications with automated Twilio SMS fallback.
 *
 * Rules:
 * 1. Primary: WhatsApp via Meta Graph API
 * 2. Fallback: Automatically triggered via Twilio SMS if WhatsApp status is
 *    'WhatsApp Failed' or 'WhatsApp Not Configured'.
 * 3. Accurate delivery status tracking and database persistence for both channels.
 */

import {
  sendWhatsAppAppointmentConfirmation,
  getWhatsAppConfigStatus,
  WhatsAppSendResult,
  AppointmentWhatsAppPayload,
} from './whatsapp.ts';

import {
  sendTwilioSMSAppointmentConfirmation,
  getTwilioConfigStatus,
  SMSSendResult,
  AppointmentSMSPayload,
} from './sms.ts';

export interface UnifiedNotificationResult {
  whatsapp: WhatsAppSendResult;
  sms: SMSSendResult;
  fallbackTriggered: boolean;
  activeChannel: 'whatsapp' | 'sms' | 'none';
  summary: string;
}

/**
 * Dispatches an appointment confirmation using the primary WhatsApp channel,
 * and automatically triggers an SMS message via Twilio if WhatsApp returns
 * 'WhatsApp Failed' or 'WhatsApp Not Configured'.
 */
export async function dispatchAppointmentNotificationWithFallback(
  payload: AppointmentWhatsAppPayload
): Promise<UnifiedNotificationResult> {
  // Step 1: Attempt WhatsApp Confirmation
  let whatsappResult: WhatsAppSendResult;
  try {
    whatsappResult = await sendWhatsAppAppointmentConfirmation(payload);
  } catch (err: any) {
    whatsappResult = {
      success: false,
      status: 'WhatsApp Failed',
      error: err?.message || 'Unexpected failure calling WhatsApp gateway',
    };
  }

  // Step 2: Check whether Fallback to Twilio SMS is required
  const shouldTriggerFallback =
    whatsappResult.status === 'WhatsApp Failed' ||
    whatsappResult.status === 'WhatsApp Not Configured';

  let smsResult: SMSSendResult = {
    success: false,
    status: 'SMS Not Configured',
    provider: 'Twilio',
  };

  let fallbackTriggered = false;

  if (shouldTriggerFallback) {
    fallbackTriggered = true;
    console.log(
      `[Notification Fallback] WhatsApp returned '${whatsappResult.status}'. Triggering automated SMS fallback via Twilio for ${payload.customerName} (${payload.customerPhone})...`
    );

    try {
      const smsPayload: AppointmentSMSPayload = { ...payload };
      smsResult = await sendTwilioSMSAppointmentConfirmation(smsPayload);
      console.log(
        `[Notification Fallback] Twilio SMS result: ${smsResult.status} (ID: ${smsResult.messageId || 'N/A'})`
      );
    } catch (smsErr: any) {
      smsResult = {
        success: false,
        status: 'SMS Failed',
        error: smsErr?.message || 'Unexpected failure calling Twilio SMS gateway',
        provider: 'Twilio',
      };
    }
  }

  // Step 3: Determine primary active delivery channel
  let activeChannel: 'whatsapp' | 'sms' | 'none' = 'none';
  let summary = '';

  if (whatsappResult.success) {
    activeChannel = 'whatsapp';
    summary = `WhatsApp notification sent successfully (ID: ${whatsappResult.messageId || 'Delivered'})`;
  } else if (smsResult.success) {
    activeChannel = 'sms';
    summary = `WhatsApp ${whatsappResult.status.toLowerCase()}; SMS fallback sent successfully via Twilio (SID: ${smsResult.messageId || 'Delivered'})`;
  } else if (fallbackTriggered) {
    summary = `WhatsApp: ${whatsappResult.status}. SMS Fallback: ${smsResult.status} (${smsResult.error || 'Check Twilio credentials'})`;
  } else {
    summary = `WhatsApp: ${whatsappResult.status} (${whatsappResult.error || 'Delivery pending'})`;
  }

  return {
    whatsapp: whatsappResult,
    sms: smsResult,
    fallbackTriggered,
    activeChannel,
    summary,
  };
}

/**
 * Returns configuration diagnostics for both WhatsApp and Twilio SMS.
 */
export function getNotificationSystemsConfig() {
  const whatsapp = getWhatsAppConfigStatus();
  const twilio = getTwilioConfigStatus();

  return {
    whatsapp,
    twilio,
    fallbackEnabled: true,
  };
}
