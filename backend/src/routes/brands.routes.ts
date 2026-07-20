import { Router, Request, Response } from 'express';
import { Brand } from '../models/Brand';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

/**
 * @openapi
 * /brands:
 *   get:
 *     tags: [Brands]
 *     summary: List all brands
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of brands
 */
router.get('/', async (_req: Request, res: Response) => {
  const items = await Brand.find({}).lean();
  res.json(items);
});

/**
 * @openapi
 * /brands:
 *   post:
 *     tags: [Brands]
 *     summary: Create a new brand
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       201:
 *         description: Brand created
 */
router.post('/', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item = new Brand({ id: generateId(), ...req.body, created_at: now });
  await item.save();
  res.status(201).json(item.toJSON());
});

/**
 * @openapi
 * /brands/{id}:
 *   patch:
 *     tags: [Brands]
 *     summary: Update a brand
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *     responses:
 *       200:
 *         description: Brand updated
 *       404:
 *         description: Brand not found
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const item = await Brand.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true }).lean();
  if (!item) { res.status(404).json({ detail: 'Brand not found' }); return; }
  res.json(item);
});

/**
 * @openapi
 * /brands/{id}:
 *   delete:
 *     tags: [Brands]
 *     summary: Delete a brand
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Brand deleted
 */
router.delete('/:id', async (req: Request, res: Response) => {
  await Brand.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
