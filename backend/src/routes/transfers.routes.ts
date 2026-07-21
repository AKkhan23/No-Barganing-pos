import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Transfer } from '../models/Transfer';
import { LedgerEntry } from '../models/LedgerEntry';
import { Account } from '../models/Account';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { scopeFilter } from '../middleware/scope';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const CreateTransferSchema = z.object({
  from_account: z.string().min(1),
  to_account: z.string().min(1),
  amount: z.number().positive(),
  note: z.string().optional(),
});

/**
 * @openapi
 * /transfers:
 *   get:
 *     tags: [Transfers]
 *     summary: List account transfers
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: from_account
 *         schema: { type: string }
 *       - in: query
 *         name: to_account
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of transfers
 */
router.get('/', async (req: Request, res: Response) => {
  const filter: any = { ...scopeFilter(req) };
  if (req.query.from_account) { filter.from_account = req.query.from_account; }
  if (req.query.to_account) { filter.to_account = req.query.to_account; }
  const transfers = await Transfer.find(filter).sort({ created_at: -1 }).lean();
  res.json(transfers.map((t: any) => ({ id: t.id, outlet_id: t.outlet_id, from_account: t.from_account, to_account: t.to_account, amount: t.amount, note: t.note, created_at: t.created_at, created_by_id: t.created_by_id, created_by_name: t.created_by_name })));
});

/**
 * @openapi
 * /transfers:
 *   post:
 *     tags: [Transfers]
 *     summary: Create an account transfer
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [from_account, to_account, amount]
 *             properties:
 *               from_account: { type: string }
 *               to_account: { type: string }
 *               amount: { type: number }
 *               note: { type: string }
 *     responses:
 *       201:
 *         description: Transfer created
 *       400:
 *         description: Insufficient balance
 *       404:
 *         description: Account not found
 */
router.post('/', validate(CreateTransferSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();

  const fromAccount = await Account.findOne({ ...scopeFilter(req), id: req.body.from_account });
  if (!fromAccount) { res.status(404).json({ detail: 'From account not found' }); return; }
  const toAccount = await Account.findOne({ ...scopeFilter(req), id: req.body.to_account });
  if (!toAccount) { res.status(404).json({ detail: 'To account not found' }); return; }
  if (fromAccount.current_balance < req.body.amount) { res.status(400).json({ detail: 'Insufficient balance in from account' }); return; }

  const transfer = new Transfer({
    ...req.body,
    id: generateId(),
    created_at: now,
    created_by: req.user?.id,
  });
  await transfer.save();

  fromAccount.current_balance -= req.body.amount;
  await fromAccount.save();
  toAccount.current_balance += req.body.amount;
  await toAccount.save();

  const debitEntry = new LedgerEntry({
    id: generateId(),
    date: now,
    account: fromAccount.name,
    debit: 0,
    credit: req.body.amount,
    reference: `Transfer-${transfer.id}`,
    note: req.body.note || `Transfer to ${toAccount.name}`,
    created_at: now,
    created_by: req.user?.id,
  });
  await debitEntry.save();

  const creditEntry = new LedgerEntry({
    id: generateId(),
    date: now,
    account: toAccount.name,
    debit: req.body.amount,
    credit: 0,
    reference: `Transfer-${transfer.id}`,
    note: req.body.note || `Transfer from ${fromAccount.name}`,
    created_at: now,
    created_by: req.user?.id,
  });
  await creditEntry.save();

  res.status(201).json({ id: transfer.id, outlet_id: transfer.outlet_id, from_account: transfer.from_account, to_account: transfer.to_account, amount: transfer.amount, note: transfer.note, created_at: transfer.created_at, created_by_id: transfer.created_by_id, created_by_name: transfer.created_by_name });
});

export default router;
