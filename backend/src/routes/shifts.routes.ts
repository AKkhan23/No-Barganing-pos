import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ShiftReport } from '../models/ShiftReport';
import { generateId } from '../utils/invoice';
import { verifyJWT } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { scopeFilter } from '../middleware/scope';

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

/**
 * @openapi
 * /shifts:
 *   post:
 *     tags: [Shifts]
 *     summary: Open a new shift
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [opening_cash]
 *             properties:
 *               opening_cash: { type: number }
 *               outlet_id: { type: string }
 *               note: { type: string }
 *     responses:
 *       201:
 *         description: Shift opened
 *       200:
 *         description: Existing open shift returned
 */
router.post('/', validate(OpenShiftSchema), async (req: Request, res: Response) => {
  const existing = await ShiftReport.findOne({ ...scopeFilter(req), user_id: req.user!.id, status: 'open' }).lean();
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
    created_by: req.user?.id,
    created_at: now,
  });
  await shift.save();
  res.status(201).json({ id: shift.id, outlet_id: shift.outlet_id, user_id: shift.user_id, user_name: shift.user_name, opened_at: shift.opened_at, opening_cash: shift.opening_cash, note: shift.note, status: shift.status, created_at: shift.created_at });
});

/**
 * @openapi
 * /shifts/current:
 *   get:
 *     tags: [Shifts]
 *     summary: Get current open shift for the logged-in user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Open shift data
 *       404:
 *         description: No open shift found
 */
router.get('/current', async (req: Request, res: Response) => {
  const shift = await ShiftReport.findOne({ ...scopeFilter(req), user_id: req.user!.id, status: 'open' }).lean();
  if (!shift) { res.status(404).json({ detail: 'No open shift found' }); return; }
  res.json({ id: shift.id, outlet_id: shift.outlet_id, user_id: shift.user_id, user_name: shift.user_name, opened_at: shift.opened_at, opening_cash: shift.opening_cash, note: shift.note, status: shift.status, created_at: shift.created_at });
});

/**
 * @openapi
 * /shifts/{id}/close:
 *   post:
 *     tags: [Shifts]
 *     summary: Close an open shift
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [closing_cash, expected_cash]
 *             properties:
 *               closing_cash: { type: number }
 *               expected_cash: { type: number }
 *               note: { type: string }
 *     responses:
 *       200:
 *         description: Shift closed
 *       404:
 *         description: Open shift not found
 */
router.post('/:id/close', validate(CloseShiftSchema), async (req: Request, res: Response) => {
  const { closing_cash, expected_cash, note } = req.body;
  const variance = closing_cash - expected_cash;
  const now = new Date().toISOString();
  const shift = await ShiftReport.findOneAndUpdate(
    { ...scopeFilter(req), id: req.params.id, status: 'open' },
    { $set: { closing_cash, expected_cash, variance, note, closed_at: now, status: 'closed' } },
    { new: true }
  ).lean();
  if (!shift) { res.status(404).json({ detail: 'Open shift not found' }); return; }
  res.json({ id: shift.id, outlet_id: shift.outlet_id, user_id: shift.user_id, user_name: shift.user_name, opened_at: shift.opened_at, closed_at: shift.closed_at, opening_cash: shift.opening_cash, closing_cash: shift.closing_cash, expected_cash: shift.expected_cash, variance: shift.variance, note: shift.note, status: shift.status });
});

export default router;
