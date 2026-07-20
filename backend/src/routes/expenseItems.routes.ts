import { Router, Request, Response } from 'express';
import { ExpenseItem } from '../models/ExpenseItem';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

/**
 * @openapi
 * /expense-items:
 *   get:
 *     tags: [Expense Items]
 *     summary: List expense items
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of expense items
 */
router.get('/', async (_req: Request, res: Response) => {
  const items = await ExpenseItem.find({}).lean();
  res.json(items);
});

/**
 * @openapi
 * /expense-items:
 *   post:
 *     tags: [Expense Items]
 *     summary: Create a new expense item
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Expense item created
 */
router.post('/', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item = new ExpenseItem({ id: generateId(), ...req.body, created_at: now });
  await item.save();
  res.status(201).json(item.toJSON());
});

/**
 * @openapi
 * /expense-items/{id}:
 *   patch:
 *     tags: [Expense Items]
 *     summary: Update an expense item
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
 *     responses:
 *       200:
 *         description: Expense item updated
 *       404:
 *         description: Expense item not found
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const item = await ExpenseItem.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true }).lean();
  if (!item) { res.status(404).json({ detail: 'ExpenseItem not found' }); return; }
  res.json(item);
});

/**
 * @openapi
 * /expense-items/{id}:
 *   delete:
 *     tags: [Expense Items]
 *     summary: Delete an expense item
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expense item deleted
 */
router.delete('/:id', async (req: Request, res: Response) => {
  await ExpenseItem.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
