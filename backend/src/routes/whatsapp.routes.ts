import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { WhatsAppLog } from '../models/WhatsAppLog';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendWhatsApp } from '../services/whatsapp.service';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager', 'cashier'));

const SendSchema = z.object({
  phone: z.string().min(1),
  message: z.string().min(1),
  invoice_no: z.string().optional(),
});

router.post('/send', validate(SendSchema), async (req: Request, res: Response) => {
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
});

export default router;
