import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Account } from '../models/Account';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const CreateAccountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['cash', 'bank', 'upi', 'wallet']),
  opening_balance: z.number().default(0),
});

const UpdateAccountSchema = z.object({
  name: z.string().optional(),
  type: z.enum(['cash', 'bank', 'upi', 'wallet']).optional(),
  opening_balance: z.number().optional(),
});

router.get('/', async (_req: Request, res: Response) => {
  const accounts = await Account.find().lean();
  res.json(accounts.map((a: any) => ({ id: a.id, name: a.name, type: a.type, opening_balance: a.opening_balance, current_balance: a.current_balance, created_at: a.created_at })));
});

router.post('/', validate(CreateAccountSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const account = new Account({ ...req.body, id: generateId(), current_balance: req.body.opening_balance, created_at: now });
  await account.save();
  res.status(201).json({ id: account.id, name: account.name, type: account.type, opening_balance: account.opening_balance, current_balance: account.current_balance, created_at: account.created_at });
});

router.get('/:id', async (req: Request, res: Response) => {
  const account = await Account.findOne({ id: req.params.id }).lean();
  if (!account) { res.status(404).json({ detail: 'Account not found' }); return; }
  res.json({ id: account.id, name: account.name, type: account.type, opening_balance: account.opening_balance, current_balance: account.current_balance, created_at: account.created_at });
});

router.patch('/:id', validate(UpdateAccountSchema), async (req: Request, res: Response) => {
  const update = { ...req.body, updated_at: new Date().toISOString() };
  const account = await Account.findOneAndUpdate({ id: req.params.id }, { $set: update }, { new: true }).lean();
  if (!account) { res.status(404).json({ detail: 'Account not found' }); return; }
  res.json({ id: account.id, name: account.name, type: account.type, opening_balance: account.opening_balance, current_balance: account.current_balance });
});

router.delete('/:id', async (req: Request, res: Response) => {
  await Account.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
