import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { WhatsAppLog } from '../models/WhatsAppLog';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendWhatsApp, sendWhatsAppDocument, checkConnection } from '../services/whatsapp.service';
import { generateReceiptPdf } from '../utils/receiptPdf';
import logger from '../utils/logger';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager', 'cashier'));

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const result = await checkConnection();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

const SendSchema = z.object({
  phone: z.string().min(1),
  message: z.string().min(1),
  invoice_no: z.string().optional(),
});

router.post('/send', validate(SendSchema), async (req: Request, res: Response) => {
  try {
    const now = new Date().toISOString();
    const { phone, message, invoice_no } = req.body;
    const result = await sendWhatsApp(phone, message, invoice_no);
    const log = new WhatsAppLog({
      id: generateId(),
      phone,
      message,
      invoice_no,
      status: result.ok ? 'sent' : 'failed',
      error: result.error,
      created_at: now,
      created_by: req.user?.id,
    });
    await log.save();
    if (result.ok) {
      res.json({ ok: true });
    } else {
      res.status(400).json({ detail: result.error || 'Failed to send WhatsApp message' });
    }
  } catch (err: any) {
    logger.error(`WhatsApp route error: ${err.message || err}`);
    res.status(500).json({ detail: `Internal error: ${err.message || 'Unknown'}` });
  }
});

const SendPdfSchema = z.object({
  phone: z.string().min(1),
  invoice_no: z.string().optional(),
  outletName: z.string(),
  outletAddress: z.string().optional(),
  outletPhone: z.string().optional(),
  outletGstin: z.string().optional(),
  dateStr: z.string(),
  timeStr: z.string(),
  cashier: z.string(),
  customerName: z.string().optional(),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    price: z.number(),
    line_total: z.number(),
    sell_by: z.string().optional(),
    unit: z.string().optional(),
  })),
  itemsTotal: z.number(),
  discountAmount: z.number(),
  discountPercent: z.number(),
  taxTotal: z.number(),
  netPayable: z.number(),
  paid: z.number(),
  change: z.number(),
  footer: z.string().optional(),
  currencySymbol: z.string().default('₹'),
  baseUrl: z.string().optional(),
});

router.post('/send-pdf', validate(SendPdfSchema), async (req: Request, res: Response) => {
  try {
    const now = new Date().toISOString();
    const { phone, invoice_no, baseUrl: _ignoredBaseUrl, ...receiptData } = req.body;
    const pdfData = { ...receiptData, invoiceNo: receiptData.invoiceNo || invoice_no || '' };

    const filename = generateReceiptPdf(pdfData);
    // Always use backend origin — frontend's window.location is Vercel, not Render, so ignore it
    const backendOrigin = (process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
    const documentUrl = `${backendOrigin}/api/receipts/file/${filename}`;

    const result = await sendWhatsAppDocument(phone, documentUrl, `${invoice_no || 'receipt'}.pdf`, `Receipt ${invoice_no || ''}`);

    const log = new WhatsAppLog({
      id: generateId(),
      phone,
      message: `PDF receipt: ${invoice_no || ''}`,
      invoice_no,
      status: result.ok ? 'sent' : 'failed',
      error: result.error,
      created_at: now,
      created_by: req.user?.id,
    });
    await log.save();

    if (result.ok) {
      res.json({ ok: true, filename });
    } else {
      res.status(400).json({ detail: result.error || 'Failed to send receipt PDF' });
    }
  } catch (err: any) {
    logger.error(`WhatsApp PDF route error: ${err.message || err}`);
    res.status(500).json({ detail: `Internal error: ${err.message || 'Unknown'}` });
  }
});

export default router;
