import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Income } from '../models/Income';
import { LedgerEntry } from '../models/LedgerEntry';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { scopeFilter } from '../middleware/scope';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const CreateIncomeSchema = z.object({
  source: z.string().min(1),
  account: z.string().min(1),
  amount: z.number().positive(),
  note: z.string().optional(),
  date: z.string().optional(),
});

/**
 * @openapi
 * /income:
 *   post:
 *     tags: [Income]
 *     summary: Create a new income entry
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               source:
 *                 type: string
 *               account:
 *                 type: string
 *               amount:
 *                 type: number
 *               note:
 *                 type: string
 *               date:
 *                 type: string
 *     responses:
 *       201:
 *         description: Income created
 */
router.post('/', validate(CreateIncomeSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const date = req.body.date || now;
  const income = new Income({ ...req.body, date, id: generateId(), created_at: now, created_by_id: (req as any).user?.id, created_by_name: (req as any).user?.name, created_by: req.user!.id });
  await income.save();
  const debitEntry = new LedgerEntry({
    id: generateId(),
    date,
    account: req.body.account,
    debit: income.amount,
    credit: 0,
    reference: `Income-${income.id}`,
    note: income.note || '',
    created_by_id: (req as any).user?.id,
    created_by_name: (req as any).user?.name,
    created_at: now,
    created_by: req.user!.id,
  });
  await debitEntry.save();
  const creditEntry = new LedgerEntry({
    id: generateId(),
    date,
    account: income.source,
    debit: 0,
    credit: income.amount,
    reference: `Income-${income.id}`,
    note: income.note || '',
    created_by_id: (req as any).user?.id,
    created_by_name: (req as any).user?.name,
    created_at: now,
    created_by: req.user!.id,
  });
  await creditEntry.save();
  res.status(201).json({ id: income.id, source: income.source, account: income.account, amount: income.amount, note: income.note, date: income.date, created_at: income.created_at });
});

/**
 * @openapi
 * /income:
 *   get:
 *     tags: [Income]
 *     summary: List income entries
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of income entries
 */
router.get('/', async (req: Request, res: Response) => {
  const filter: any = {};
  if (req.query.source) filter.source = req.query.source;
  if (req.query.date_from || req.query.date_to) {
    filter.date = {};
    if (req.query.date_from) filter.date.$gte = req.query.date_from;
    if (req.query.date_to) filter.date.$lte = req.query.date_to;
  }
  const incomes = await Income.find({ ...scopeFilter(req), ...filter }).lean();
  res.json(incomes.map((i: any) => ({ id: i.id, source: i.source, account: i.account, amount: i.amount, note: i.note, date: i.date, created_at: i.created_at })));
});

export default router;
