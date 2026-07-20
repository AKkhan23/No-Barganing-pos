import { Router, Request, Response } from 'express';
import { MultipleCurrency } from '../models/MultipleCurrency';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

/**
 * @openapi
 * /multiple-currencies:
 *   get:
 *     tags: [Multiple Currencies]
 *     summary: List multiple currencies
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of currencies
 */
router.get('/', async (_req: Request, res: Response) => {
  const items = await MultipleCurrency.find({}).lean();
  res.json(items);
});

/**
 * @openapi
 * /multiple-currencies:
 *   post:
 *     tags: [Multiple Currencies]
 *     summary: Create a currency
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
 *               code:
 *                 type: string
 *               symbol:
 *                 type: string
 *               exchange_rate:
 *                 type: number
 *               is_default:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Created currency
 */
router.post('/', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item = new MultipleCurrency({ id: generateId(), ...req.body, created_at: now });
  await item.save();
  res.status(201).json(item.toJSON());
});

/**
 * @openapi
 * /multiple-currencies/{id}:
 *   patch:
 *     tags: [Multiple Currencies]
 *     summary: Update a currency
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Currency ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               symbol:
 *                 type: string
 *               exchange_rate:
 *                 type: number
 *               is_default:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated currency
 *       404:
 *         description: Not found
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const item = await MultipleCurrency.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true }).lean();
  if (!item) { res.status(404).json({ detail: 'MultipleCurrency not found' }); return; }
  res.json(item);
});

/**
 * @openapi
 * /multiple-currencies/{id}:
 *   delete:
 *     tags: [Multiple Currencies]
 *     summary: Delete a currency
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Currency ID
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
router.delete('/:id', async (req: Request, res: Response) => {
  await MultipleCurrency.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
