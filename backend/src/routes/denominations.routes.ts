import { Router, Request, Response } from 'express';
import { Denomination } from '../models/Denomination';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

/**
 * @openapi
 * /denominations:
 *   get:
 *     tags: [Denominations]
 *     summary: List denominations
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of denominations
 */
router.get('/', async (_req: Request, res: Response) => {
  const items = await Denomination.find({}).lean();
  res.json(items);
});

/**
 * @openapi
 * /denominations:
 *   post:
 *     tags: [Denominations]
 *     summary: Create a denomination
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value:
 *                 type: number
 *               type:
 *                 type: string
 *               count:
 *                 type: number
 *     responses:
 *       201:
 *         description: Created denomination
 */
router.post('/', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item = new Denomination({ id: generateId(), ...req.body, created_at: now });
  await item.save();
  res.status(201).json(item.toJSON());
});

/**
 * @openapi
 * /denominations/{id}:
 *   patch:
 *     tags: [Denominations]
 *     summary: Update a denomination
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Denomination ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value:
 *                 type: number
 *               type:
 *                 type: string
 *               count:
 *                 type: number
 *     responses:
 *       200:
 *         description: Updated denomination
 *       404:
 *         description: Not found
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const item = await Denomination.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true }).lean();
  if (!item) { res.status(404).json({ detail: 'Denomination not found' }); return; }
  res.json(item);
});

/**
 * @openapi
 * /denominations/{id}:
 *   delete:
 *     tags: [Denominations]
 *     summary: Delete a denomination
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Denomination ID
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
router.delete('/:id', async (req: Request, res: Response) => {
  await Denomination.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
