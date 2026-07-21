import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Expense } from '../models/Expense';
import { LedgerEntry } from '../models/LedgerEntry';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { scopeFilter } from '../middleware/scope';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const CreateExpenseSchema = z.object({
  category: z.enum(['rent', 'utility', 'salary', 'misc']),
  account: z.string().min(1),
  amount: z.number().positive(),
  note: z.string().optional(),
  date: z.string().optional(),
});

/**
 * @openapi
 * /expenses:
 *   post:
 *     tags: [Expenses]
 *     summary: Create a new expense
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [rent, utility, salary, misc]
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
 *         description: Expense created
 */
router.post('/', validate(CreateExpenseSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const date = req.body.date || now;
  const expense = new Expense({ ...req.body, date, id: generateId(), created_at: now, created_by_id: (req as any).user?.id, created_by_name: (req as any).user?.name, created_by: req.user!.id });
  await expense.save();
  const expenseLedger = new LedgerEntry({
    id: generateId(),
    date,
    account: expense.category,
    debit: expense.amount,
    credit: 0,
    reference: `Expense-${expense.id}`,
    note: expense.note || '',
    created_by_id: (req as any).user?.id,
    created_by_name: (req as any).user?.name,
    created_at: now,
    created_by: req.user!.id,
  });
  await expenseLedger.save();
  const accountLedger = new LedgerEntry({
    id: generateId(),
    date,
    account: req.body.account,
    debit: 0,
    credit: expense.amount,
    reference: `Expense-${expense.id}`,
    note: expense.note || '',
    created_by_id: (req as any).user?.id,
    created_by_name: (req as any).user?.name,
    created_at: now,
    created_by: req.user!.id,
  });
  await accountLedger.save();
  res.status(201).json({ id: expense.id, category: expense.category, account: expense.account, amount: expense.amount, note: expense.note, date: expense.date, created_at: expense.created_at });
});

/**
 * @openapi
 * /expenses:
 *   get:
 *     tags: [Expenses]
 *     summary: List expenses
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: category
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
 *         description: Array of expenses
 */
router.get('/', async (req: Request, res: Response) => {
  const filter: any = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.date_from || req.query.date_to) {
    filter.date = {};
    if (req.query.date_from) filter.date.$gte = req.query.date_from;
    if (req.query.date_to) filter.date.$lte = req.query.date_to;
  }
  const expenses = await Expense.find({ ...scopeFilter(req), ...filter }).lean();
  res.json(expenses.map((e: any) => ({ id: e.id, category: e.category, account: e.account, amount: e.amount, note: e.note, date: e.date, created_at: e.created_at })));
});

export default router;
