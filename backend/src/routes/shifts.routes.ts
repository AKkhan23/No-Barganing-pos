import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ShiftReport } from '../models/ShiftReport';
import { generateId } from '../utils/invoice';
import { verifyJWT } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT);

const OpenShiftSchema = z.object({
  opening_cash: z.number().positive(),
  outlet_id: z.string().optional(),
  note: z.string().optional(),
});

const CloseShiftSchema = z.object({
  closing_cash: z.number(),
  expected_cash: z.number(),
  note: z.string().optional(),
});

router.post('/', validate(OpenShiftSchema), async (req: Request, res: Response) => {
  const existing = await ShiftReport.findOne({ user_id: req.user!.id, status: 'open' }).lean();
  if (existing) {
    res.json({ id: existing.id, outlet_id: existing.outlet_id, user_id: existing.user_id, user_name: existing.user_name, opened_at: existing.opened_at, opening_cash: existing.opening_cash, note: existing.note, status: existing.status, created_at: existing.created_at });
    return;
  }
  const now = new Date().toISOString();
  const shift = new ShiftReport({
    id: generateId(),
    outlet_id: req.body.outlet_id,
    user_id: req.user!.id,
    user_name: req.user!.name,
    opened_at: now,
    opening_cash: req.body.opening_cash,
    note: req.body.note,
    status: 'open',
    created_at: now,
  });
  await shift.save();
  res.status(201).json({ id: shift.id, outlet_id: shift.outlet_id, user_id: shift.user_id, user_name: shift.user_name, opened_at: shift.opened_at, opening_cash: shift.opening_cash, note: shift.note, status: shift.status, created_at: shift.created_at });
});

router.get('/current', async (req: Request, res: Response) => {
  const shift = await ShiftReport.findOne({ user_id: req.user!.id, status: 'open' }).lean();
  if (!shift) { res.status(404).json({ detail: 'No open shift found' }); return; }
  res.json({ id: shift.id, outlet_id: shift.outlet_id, user_id: shift.user_id, user_name: shift.user_name, opened_at: shift.opened_at, opening_cash: shift.opening_cash, note: shift.note, status: shift.status, created_at: shift.created_at });
});

router.post('/:id/close', validate(CloseShiftSchema), async (req: Request, res: Response) => {
  const { closing_cash, expected_cash, note } = req.body;
  const variance = closing_cash - expected_cash;
  const now = new Date().toISOString();
  const shift = await ShiftReport.findOneAndUpdate(
    { id: req.params.id, status: 'open' },
    { $set: { closing_cash, expected_cash, variance, note, closed_at: now, status: 'closed' } },
    { new: true }
  ).lean();
  if (!shift) { res.status(404).json({ detail: 'Open shift not found' }); return; }
  res.json({ id: shift.id, outlet_id: shift.outlet_id, user_id: shift.user_id, user_name: shift.user_name, opened_at: shift.opened_at, closed_at: shift.closed_at, opening_cash: shift.opening_cash, closing_cash: shift.closing_cash, expected_cash: shift.expected_cash, variance: shift.variance, note: shift.note, status: shift.status });
});

export default router;
