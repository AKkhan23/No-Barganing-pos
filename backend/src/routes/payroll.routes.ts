import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Payroll } from '../models/Payroll';
import { User } from '../models/User';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { scopeFilter } from '../middleware/scope';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const GeneratePayrollSchema = z.object({
  user_ids: z.array(z.string()).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  base: z.number().optional(),
  bonus: z.number().optional(),
  deduction: z.number().optional(),
});

/**
 * @openapi
 * /payroll/generate:
 *   post:
 *     tags: [Payroll]
 *     summary: Generate payroll entries for a month
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [month]
 *             properties:
 *               user_ids:
 *                 type: array
 *                 items: { type: string }
 *               month: { type: string, description: "YYYY-MM format" }
 *               base: { type: number }
 *               bonus: { type: number }
 *               deduction: { type: number }
 *     responses:
 *       201:
 *         description: Payroll entries created
 *       400:
 *         description: No active users found
 */
router.post('/generate', validate(GeneratePayrollSchema), async (req: Request, res: Response) => {
  const { user_ids, month, base: defaultBase, bonus: defaultBonus, deduction: defaultDeduction } = req.body;
  const filter: any = { active: true };
  if (user_ids) filter.id = { $in: user_ids };
  const users = await User.find({ ...scopeFilter(req), ...filter }).lean();
  if (!users.length) { res.status(400).json({ detail: 'No active users found' }); return; }

  const now = new Date().toISOString();
  const entries = [];
  for (const u of users) {
    const base = defaultBase ?? 0;
    const bonus = defaultBonus ?? 0;
    const deduction = defaultDeduction ?? 0;
    const net = base + bonus - deduction;
    entries.push({
      id: generateId(),
      user_id: u.id,
      user_name: u.name,
      month,
      base,
      bonus,
      deduction,
      net,
      paid: false,
      created_by: req.user?.id,
      created_at: now,
    });
  }
  await Payroll.insertMany(entries);
  res.status(201).json(entries.map((e) => ({ ...e, _id: undefined, __v: undefined })));
});

/**
 * @openapi
 * /payroll:
 *   get:
 *     tags: [Payroll]
 *     summary: List payroll entries
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: string }
 *         description: Filter by month (YYYY-MM)
 *       - in: query
 *         name: paid
 *         schema: { type: string, enum: [true, false] }
 *         description: Filter by paid status
 *     responses:
 *       200:
 *         description: Array of payroll entries
 */
router.get('/', async (req: Request, res: Response) => {
  const { month, paid } = req.query;
  const filter: any = {};
  if (month) filter.month = month;
  if (paid !== undefined) filter.paid = paid === 'true';
  const items = await Payroll.find({ ...scopeFilter(req), ...filter }).lean();
  res.json(items.map((e: any) => ({ id: e.id, user_id: e.user_id, user_name: e.user_name, month: e.month, base: e.base, bonus: e.bonus, deduction: e.deduction, net: e.net, paid: e.paid, paid_via: e.paid_via, created_at: e.created_at })));
});

/**
 * @openapi
 * /payroll/{id}/mark-paid:
 *   post:
 *     tags: [Payroll]
 *     summary: Mark a payroll entry as paid
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
 *             required: [paid_via]
 *             properties:
 *               paid_via:
 *                 type: string
 *                 enum: [cash, bank, upi, wallet]
 *     responses:
 *       200:
 *         description: Payroll marked as paid
 *       404:
 *         description: Payroll entry not found
 *       422:
 *         description: Invalid paid_via value
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const update: any = { updated_at: new Date().toISOString() };
  if (req.body.base !== undefined) update.base = req.body.base;
  if (req.body.bonus !== undefined) update.bonus = req.body.bonus;
  if (req.body.deduction !== undefined) update.deduction = req.body.deduction;
  if (req.body.net !== undefined) update.net = req.body.net;
  if (req.body.month !== undefined) update.month = req.body.month;
  const payroll = await Payroll.findOneAndUpdate({ ...scopeFilter(req), id: req.params.id }, { $set: update }, { new: true }).lean();
  if (!payroll) { res.status(404).json({ detail: 'Payroll entry not found' }); return; }
  res.json({ id: payroll.id, user_id: payroll.user_id, user_name: payroll.user_name, month: payroll.month, base: payroll.base, bonus: payroll.bonus, deduction: payroll.deduction, net: payroll.net, paid: payroll.paid, paid_via: payroll.paid_via });
});

router.delete('/:id', async (req: Request, res: Response) => {
  await Payroll.deleteOne({ ...scopeFilter(req), id: req.params.id });
  res.json({ ok: true });
});

router.post('/:id/mark-paid', async (req: Request, res: Response) => {
  const { paid_via } = req.body;
  if (!['cash', 'bank', 'upi', 'wallet'].includes(paid_via)) { res.status(422).json({ detail: 'paid_via must be cash/bank/upi/wallet' }); return; }
  const payroll = await Payroll.findOneAndUpdate({ ...scopeFilter(req), id: req.params.id }, { $set: { paid: true, paid_via } }, { new: true }).lean();
  if (!payroll) { res.status(404).json({ detail: 'Payroll entry not found' }); return; }
  res.json({ id: payroll.id, user_id: payroll.user_id, user_name: payroll.user_name, month: payroll.month, base: payroll.base, bonus: payroll.bonus, deduction: payroll.deduction, net: payroll.net, paid: payroll.paid, paid_via: payroll.paid_via });
});

export default router;
