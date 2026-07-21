import { Router, Request, Response } from 'express';
import { Variation } from '../models/Variation';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';


const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

/**
 * @openapi
 * /variations:
 *   get:
 *     tags: [Variations]
 *     summary: List variation templates
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of variation templates
 */
router.get('/', async (req: Request, res: Response) => {
  const items = await Variation.find({}).lean();
  res.json(items);
});

/**
 * @openapi
 * /variations:
 *   post:
 *     tags: [Variations]
 *     summary: Create a variation template
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
 *               variation_values:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Created variation template
 */
router.post('/', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item = new Variation({ id: generateId(), ...req.body, created_at: now, created_by: req.user?.id });
  await item.save();
  res.status(201).json(item.toJSON());
});

/**
 * @openapi
 * /variations/{id}:
 *   patch:
 *     tags: [Variations]
 *     summary: Update a variation template
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
 *               variation_values:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Updated variation template
 *       404:
 *         description: Variation not found
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const item = await Variation.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true }).lean();
  if (!item) { res.status(404).json({ detail: 'Variation not found' }); return; }
  res.json(item);
});

/**
 * @openapi
 * /variations/{id}:
 *   delete:
 *     tags: [Variations]
 *     summary: Delete a variation template
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
router.delete('/:id', async (req: Request, res: Response) => {
  await Variation.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
