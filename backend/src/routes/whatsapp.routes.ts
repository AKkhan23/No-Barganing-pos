import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { WhatsAppLog } from '../models/WhatsAppLog';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { scopeFilter } from '../middleware/scope';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager', 'cashier'));

const SendSchema = z.object({
  phone: z.string().min(1),
  message: z.string().min(1),
  invoice_no: z.string().optional(),
});

/**
 * @openapi
 * /whatsapp/send:
 *   post:
 *     tags: [WhatsApp]
 *     summary: Send a WhatsApp message (stubbed)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, message]
 *             properties:
 *               phone: { type: string }
 *               message: { type: string }
 *               invoice_no: { type: string }
 *     responses:
 *       200:
 *         description: Stubbed success
 */
router.post('/send', validate(SendSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const log = new WhatsAppLog({
    ...req.body,
    id: generateId(),
    status: 'stubbed',
    created_at: now,
    created_by: req.user?.id,
  });
  await log.save();
  res.json({ ok: true, stubbed: true });
});

export default router;
