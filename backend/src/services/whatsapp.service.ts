import axios from 'axios';
import { Settings } from '../models/Settings';
import logger from '../utils/logger';

export async function sendWhatsApp(phone: string, message: string, invoiceNo?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const settings = await Settings.findOne({}).lean();
    const config = (settings as any)?.whatsapp_config || {};
    const apiKey = config.api_key || '';
    const phoneNumberId = config.phone_number_id || '';

    if (!apiKey) {
      return { ok: false, error: 'WhatsApp API key not configured. Go to Settings > WhatsApp.' };
    }

    // Try WhatsApp Cloud API format first
    if (phoneNumberId) {
      const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        to: phone.replace(/[^0-9]/g, ''),
        type: 'text',
        text: { body: message },
      };
      await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      logger.info(`WhatsApp sent to ${phone}${invoiceNo ? ' (invoice: ' + invoiceNo + ')' : ''}`);
      return { ok: true };
    }

    // Fallback: custom API URL
    const apiUrl = config.api_url || '';
    if (apiUrl) {
      await axios.post(apiUrl, { phone, message, invoice_no: invoiceNo }, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      logger.info(`WhatsApp sent to ${phone} via custom API`);
      return { ok: true };
    }

    return { ok: false, error: 'WhatsApp Phone Number ID or API URL not configured.' };
  } catch (err: any) {
    const detail = err?.response?.data?.error?.message || err?.response?.data?.detail || err.message || 'Unknown error';
    logger.error(`WhatsApp send failed: ${detail}`);
    return { ok: false, error: detail };
  }
}
