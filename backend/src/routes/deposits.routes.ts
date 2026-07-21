import { Router, Request, Response } from 'express';
import { Deposit } from '../models/Deposit';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { scopeFilter } from '../middleware/scope';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

/**
 * @openapi
 * /deposits:
 *   get:
 *     tags: [Deposits]
 *     summary: List all deposits
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of deposits
 */
router.get('/', async (_req: Request, res: Response) => {
  const items = await Deposit.find(scopeFilter(_req)).lean();
  res.json(items);
});

/**
 * @openapi
 * /deposits:
 *   post:
 *     tags: [Deposits]
 *     summary: Create a deposit
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customer_name: { type: string }
 *               amount: { type: number }
 *               mode: { type: string }
 *               note: { type: string }
 *     responses:
 *       201:
 *         description: Deposit created
 */
router.post('/', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item = new Deposit({ id: generateId(), ...req.body, created_at: now, created_by: req.user!.id });
  await item.save();
  res.status(201).json(item.toJSON());
});

/**
 * @openapi
 * /deposits/{id}:
 *   patch:
 *     tags: [Deposits]
 *     summary: Update a deposit
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Deposit ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customer_name: { type: string }
 *               amount: { type: number }
 *               mode: { type: string }
 *               note: { type: string }
 *     responses:
 *       200:
 *         description: Deposit updated
 *       404:
 *         description: Deposit not found
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const item = await Deposit.findOneAndUpdate(
    { ...scopeFilter(req), id: req.params.id },
    { $set: { ...req.body, updated_at: new Date().toISOString() } },
    { new: true }
  ).lean();
  if (!item) { res.status(404).json({ detail: 'Deposit not found' }); return; }
  res.json(item);
});

/**
 * @openapi
 * /deposits/{id}:
 *   delete:
 *     tags: [Deposits]
 *     summary: Delete a deposit
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Deposit ID
 *     responses:
 *       200:
 *         description: Deposit deleted
 */
router.delete('/:id', async (req: Request, res: Response) => {
  await Deposit.deleteOne({ ...scopeFilter(req), id: req.params.id });
  res.json({ ok: true });
});

export default router;
