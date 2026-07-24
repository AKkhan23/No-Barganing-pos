import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { generateReceiptPdf } from '../utils/receiptPdf';
import logger from '../utils/logger';

const router = Router();

const CHARS = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, '');

const GenerateSchema = z.object({
  outletName: z.string(),
  outletAddress: z.string().optional(),
  outletPhone: z.string().optional(),
  outletGstin: z.string().optional(),
  invoiceNo: z.string(),
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
});

router.post('/generate', verifyJWT, validate(GenerateSchema), async (req: Request, res: Response) => {
  try {
    const filename = generateReceiptPdf(req.body);
    res.json({ filename, url: `/api/receipts/file/${filename}` });
  } catch (err: any) {
    logger.error(`Receipt PDF generation failed: ${err.message}`);
    res.status(500).json({ detail: 'Failed to generate receipt PDF' });
  }
});

router.get('/file/:filename', async (req: Request, res: Response) => {
  const { filename } = req.params;
  const safeName = CHARS(filename.replace('.pdf', '')) + '.pdf';
  const filepath = path.join(process.cwd(), 'uploads', 'receipts', safeName);
  if (!fs.existsSync(filepath)) {
    res.status(404).json({ detail: 'Receipt not found' });
    return;
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
  fs.createReadStream(filepath).pipe(res);
});

export default router;
