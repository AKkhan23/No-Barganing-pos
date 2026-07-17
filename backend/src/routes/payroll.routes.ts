import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Payroll } from '../models/Payroll';
import { User } from '../models/User';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const GeneratePayrollSchema = z.object({
  user_ids: z.array(z.string()).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  base: z.number().optional(),
  bonus: z.number().optional(),
  deduction: z.number().optional(),
});

router.post('/generate', validate(GeneratePayrollSchema), async (req: Request, res: Response) => {
  const { user_ids, month, base: defaultBase, bonus: defaultBonus, deduction: defaultDeduction } = req.body;
  const filter: any = { active: true };
  if (user_ids) filter.id = { $in: user_ids };
  const users = await User.find(filter).lean();
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
      created_at: now,
    });
  }
  await Payroll.insertMany(entries);
  res.status(201).json(entries.map((e) => ({ ...e, _id: undefined, __v: undefined })));
});

router.get('/', async (req: Request, res: Response) => {
  const { month, paid } = req.query;
  const filter: any = {};
  if (month) filter.month = month;
  if (paid !== undefined) filter.paid = paid === 'true';
  const items = await Payroll.find(filter).lean();
  res.json(items.map((e: any) => ({ id: e.id, user_id: e.user_id, user_name: e.user_name, month: e.month, base: e.base, bonus: e.bonus, deduction: e.deduction, net: e.net, paid: e.paid, paid_via: e.paid_via, created_at: e.created_at })));
});

router.post('/:id/mark-paid', async (req: Request, res: Response) => {
  const { paid_via } = req.body;
  if (!['cash', 'bank', 'upi', 'wallet'].includes(paid_via)) { res.status(422).json({ detail: 'paid_via must be cash/bank/upi/wallet' }); return; }
  const payroll = await Payroll.findOneAndUpdate({ id: req.params.id }, { $set: { paid: true, paid_via } }, { new: true }).lean();
  if (!payroll) { res.status(404).json({ detail: 'Payroll entry not found' }); return; }
  res.json({ id: payroll.id, user_id: payroll.user_id, user_name: payroll.user_name, month: payroll.month, base: payroll.base, bonus: payroll.bonus, deduction: payroll.deduction, net: payroll.net, paid: payroll.paid, paid_via: payroll.paid_via });
});

export default router;
