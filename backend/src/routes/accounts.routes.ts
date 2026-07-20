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

/**
 * @openapi
 * /accounts:
 *   get:
 *     tags: [Accounts]
 *     summary: List all accounts
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of accounts
 */
router.get('/', async (_req: Request, res: Response) => {
  const accounts = await Account.find().lean();
  res.json(accounts.map((a: any) => ({ id: a.id, name: a.name, type: a.type, opening_balance: a.opening_balance, current_balance: a.current_balance, created_at: a.created_at })));
});

/**
 * @openapi
 * /accounts:
 *   post:
 *     tags: [Accounts]
 *     summary: Create a new account
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [cash, bank, upi, wallet]
 *               opening_balance:
 *                 type: number
 *     responses:
 *       201:
 *         description: Account created
 */
router.post('/', validate(CreateAccountSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const account = new Account({ ...req.body, id: generateId(), current_balance: req.body.opening_balance, created_at: now });
  await account.save();
  res.status(201).json({ id: account.id, name: account.name, type: account.type, opening_balance: account.opening_balance, current_balance: account.current_balance, created_at: account.created_at });
});

/**
 * @openapi
 * /accounts/{id}:
 *   get:
 *     tags: [Accounts]
 *     summary: Get account by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account details
 *       404:
 *         description: Account not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  const account = await Account.findOne({ id: req.params.id }).lean();
  if (!account) { res.status(404).json({ detail: 'Account not found' }); return; }
  res.json({ id: account.id, name: account.name, type: account.type, opening_balance: account.opening_balance, current_balance: account.current_balance, created_at: account.created_at });
});

/**
 * @openapi
 * /accounts/{id}:
 *   patch:
 *     tags: [Accounts]
 *     summary: Update account
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [cash, bank, upi, wallet]
 *               opening_balance:
 *                 type: number
 *     responses:
 *       200:
 *         description: Account updated
 *       404:
 *         description: Account not found
 */
router.patch('/:id', validate(UpdateAccountSchema), async (req: Request, res: Response) => {
  const update = { ...req.body, updated_at: new Date().toISOString() };
  const account = await Account.findOneAndUpdate({ id: req.params.id }, { $set: update }, { new: true }).lean();
  if (!account) { res.status(404).json({ detail: 'Account not found' }); return; }
  res.json({ id: account.id, name: account.name, type: account.type, opening_balance: account.opening_balance, current_balance: account.current_balance });
});

/**
 * @openapi
 * /accounts/{id}:
 *   delete:
 *     tags: [Accounts]
 *     summary: Delete account
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account deleted
 */
router.delete('/:id', async (req: Request, res: Response) => {
  await Account.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
