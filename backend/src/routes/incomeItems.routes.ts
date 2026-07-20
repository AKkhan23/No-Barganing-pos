import { Router, Request, Response } from 'express';
import { IncomeItem } from '../models/IncomeItem';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

/**
 * @openapi
 * /income-items:
 *   get:
 *     tags: [Income Items]
 *     summary: List income items
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of income items
 */
router.get('/', async (_req: Request, res: Response) => {
  const items = await IncomeItem.find({}).lean();
  res.json(items);
});

/**
 * @openapi
 * /income-items:
 *   post:
 *     tags: [Income Items]
 *     summary: Create a new income item
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Income item created
 */
router.post('/', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item = new IncomeItem({ id: generateId(), ...req.body, created_at: now });
  await item.save();
  res.status(201).json(item.toJSON());
});

/**
 * @openapi
 * /income-items/{id}:
 *   patch:
 *     tags: [Income Items]
 *     summary: Update an income item
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
 *         description: Income item updated
 *       404:
 *         description: Income item not found
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const item = await IncomeItem.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true }).lean();
  if (!item) { res.status(404).json({ detail: 'IncomeItem not found' }); return; }
  res.json(item);
});

/**
 * @openapi
 * /income-items/{id}:
 *   delete:
 *     tags: [Income Items]
 *     summary: Delete an income item
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Income item deleted
 */
router.delete('/:id', async (req: Request, res: Response) => {
  await IncomeItem.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
