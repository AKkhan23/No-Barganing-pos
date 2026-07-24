import axios from 'axios';
import { Settings } from '../models/Settings';
import logger from '../utils/logger';

async function getConfig() {
  const settings = await Settings.findOne({}).lean();
  const config = (settings as any)?.whatsapp_config || {};
  return {
    apiKey: config.api_key || '',
    phoneNumberId: config.phone_number_id || '',
    apiUrl: config.api_url || '',
    sessionId: config.session_id || '',
  };
}

export async function sendWhatsApp(phone: string, message: string, invoiceNo?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const cfg = await getConfig();
    logger.info(`WhatsApp config — apiUrl: ${cfg.apiUrl || '(empty)'}, sessionId: ${cfg.sessionId || '(empty)'}, apiKey: ${cfg.apiKey ? '***' : '(empty)'}`);

    const cleanPhone = phone.replace(/[^0-9]/g, '');

    if (cfg.apiUrl && cfg.sessionId) {
      const url = `${cfg.apiUrl.replace(/\/+$/, '')}/api/sessions/${cfg.sessionId}/messages/send-text`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (cfg.apiKey) headers['X-API-Key'] = cfg.apiKey;
      await axios.post(url, { chatId: `${cleanPhone}@c.us`, text: message }, { headers });
      logger.info(`WhatsApp sent to ${phone}${invoiceNo ? ' (invoice: ' + invoiceNo + ')' : ''} via Open WA`);
      return { ok: true };
    }

    if (cfg.apiUrl) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}`;
      await axios.post(cfg.apiUrl, { phone, message, invoice_no: invoiceNo }, { headers });
      logger.info(`WhatsApp sent to ${phone}${invoiceNo ? ' (invoice: ' + invoiceNo + ')' : ''} via custom API`);
      return { ok: true };
    }

    if (cfg.phoneNumberId) {
      if (!cfg.apiKey) {
        return { ok: false, error: 'WhatsApp API key not configured. Go to Settings > WhatsApp.' };
      }
      const url = `https://graph.facebook.com/v21.0/${cfg.phoneNumberId}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: { body: message },
      };
      await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      logger.info(`WhatsApp sent to ${phone}${invoiceNo ? ' (invoice: ' + invoiceNo + ')' : ''} via Cloud API`);
      return { ok: true };
    }

    return { ok: false, error: 'WhatsApp not configured. Provide API URL (Settings > WhatsApp) or API Key + Phone Number ID.' };
  } catch (err: any) {
    const detail = err?.response?.data?.error?.message || err?.response?.data?.detail || err.message || 'Unknown error';
    logger.error(`WhatsApp send failed: ${detail}`);
    return { ok: false, error: detail };
  }
}

export async function sendWhatsAppDocument(phone: string, documentUrl: string, filename: string, caption?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const cfg = await getConfig();

    if (!cfg.apiUrl || !cfg.sessionId) {
      return { ok: false, error: 'Open WA not configured (require api_url + session_id).' };
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `${cfg.apiUrl.replace(/\/+$/, '')}/api/sessions/${cfg.sessionId}/messages/send-document`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cfg.apiKey) headers['X-API-Key'] = cfg.apiKey;

    await axios.post(url, { chatId: `${cleanPhone}@c.us`, url: documentUrl, filename, caption: caption || '' }, { headers });
    logger.info(`WhatsApp document sent to ${phone}: ${filename}`);
    return { ok: true };
  } catch (err: any) {
    const detail = err?.response?.data?.error?.message || err?.response?.data?.detail || err.message || 'Unknown error';
    logger.error(`WhatsApp document send failed: ${detail}`);
    return { ok: false, error: detail };
  }
}
