import axios from 'axios';
import https from 'https';
import { Settings } from '../models/Settings';
import logger from '../utils/logger';

const httpClient = axios.create({
  timeout: 30000,
  httpsAgent: new https.Agent({ keepAlive: true, keepAliveMsecs: 5000 }),
});

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
      await httpClient.post(url, { chatId: `${cleanPhone}@c.us`, text: message }, { headers });
      logger.info(`WhatsApp sent to ${phone}${invoiceNo ? ' (invoice: ' + invoiceNo + ')' : ''} via Open WA`);
      return { ok: true };
    }

    if (cfg.apiUrl) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}`;
      await httpClient.post(cfg.apiUrl, { phone, message, invoice_no: invoiceNo }, { headers });
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
      await httpClient.post(url, payload, {
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
    const raw = err?.response?.data ? JSON.stringify(err.response.data) : '';
    const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
    const detail = isTimeout ? `WhatsApp server timeout (15s) - openwa.eskillsweb.online slow/down, try again. ${raw}` : (err?.response?.data?.error?.message || err?.response?.data?.message || err?.response?.data?.detail || raw || err.message || 'Unknown error');
    logger.error(`WhatsApp send failed: ${detail} | status=${err?.response?.status} code=${err.code}`);
    return { ok: false, error: detail.slice(0,400) };
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

    try {
      await httpClient.post(url, { chatId: `${cleanPhone}@c.us`, url: documentUrl, filename, caption: caption || '' }, { headers });
    } catch (e: any) {
      const isUrlError = e?.response?.status === 400;
      const respData = e?.response?.data ? JSON.stringify(e.response.data).slice(0, 500) : '';
      if (isUrlError) logger.warn(`WhatsApp doc URL failed (${respData}), trying base64 fallback`);
      if (!isUrlError) throw e;
      // fallback: read PDF and send as base64
      try {
        const pdfPath = documentUrl.split('/api/receipts/file/')[1] ? require('path').join(process.cwd(), 'uploads', 'receipts', documentUrl.split('/api/receipts/file/')[1].split('?')[0]) : '';
        const b64 = require('fs').readFileSync(pdfPath, { encoding: 'base64' });
        await httpClient.post(url, { chatId: `${cleanPhone}@c.us`, document: b64, filename, caption: caption || '', mimetype: 'application/pdf' }, { headers });
        // also try alternative field names if first fails
      } catch (fallbackErr: any) {
        const d2 = fallbackErr?.response?.data ? JSON.stringify(fallbackErr.response.data).slice(0, 500) : fallbackErr.message;
        logger.error(`WhatsApp document base64 fallback failed: ${d2}`);
        throw fallbackErr?.response?.data ? fallbackErr : e;
      }
    }
    logger.info(`WhatsApp document sent to ${phone}: ${filename}`);
    return { ok: true };
  } catch (err: any) {
    const raw = err?.response?.data ? JSON.stringify(err.response.data) : '';
    const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
    const detail = isTimeout ? `WhatsApp server timeout (30s) - openwa.eskillsweb.online slow/down. ${raw}` : (err?.response?.data?.error?.message || err?.response?.data?.message || err?.response?.data?.detail || raw || err.message || 'Unknown error');
    logger.error(`WhatsApp document send failed: ${detail} | status=${err?.response?.status} code=${err.code} | url=${documentUrl}`);
    return { ok: false, error: detail.slice(0, 400) };
  }
}

export async function checkConnection(): Promise<{ connected: boolean; number?: string; method?: string; error?: string }> {
  try {
    const cfg = await getConfig();
    if (cfg.apiUrl && cfg.sessionId) {
      const url = `${cfg.apiUrl.replace(/\/+$/, '')}/api/sessions/${cfg.sessionId}`;
      const headers: Record<string, string> = {};
      if (cfg.apiKey) headers['X-API-Key'] = cfg.apiKey;
      const resp = await httpClient.get(url, { headers });
      const data = resp.data;
      const number = data?.me?.id || data?.me?.pushname || data?.id || data?.number || '';
      return { connected: true, number: String(number).replace('@c.us', ''), method: 'Open WA' };
    }
    if (cfg.phoneNumberId) {
      return { connected: true, number: cfg.phoneNumberId, method: 'Cloud API' };
    }
    return { connected: false, error: 'No WhatsApp configuration found' };
  } catch (err: any) {
    const detail = err?.response?.data?.error?.message || err?.response?.data?.detail || err.message || 'Connection failed';
    return { connected: false, error: detail };
  }
}
