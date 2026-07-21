import { Router, Request, Response } from 'express';
import { Unit } from '../models/Unit';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';


const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

/**
 * @openapi
 * /units:
 *   get:
 *     tags: [Units]
 *     summary: List all units
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of units
 */
router.get('/', async (req: Request, res: Response) => {
  const items = await Unit.find({}).lean();
  res.json(items);
});

/**
 * @openapi
 * /units:
 *   post:
 *     tags: [Units]
 *     summary: Create a new unit
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [unit_name]
 *             properties:
 *               unit_name: { type: string }
 *     responses:
 *       201:
 *         description: Unit created
 */
router.post('/', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item = new Unit({ id: generateId(), ...req.body, created_at: now, created_by: req.user?.id });
  await item.save();
  res.status(201).json(item.toJSON());
});

/**
 * @openapi
 * /units/{id}:
 *   patch:
 *     tags: [Units]
 *     summary: Update a unit
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
 *               unit_name: { type: string }
 *     responses:
 *       200:
 *         description: Unit updated
 *       404:
 *         description: Unit not found
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const item = await Unit.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true }).lean();
  if (!item) { res.status(404).json({ detail: 'Unit not found' }); return; }
  res.json(item);
});

/**
 * @openapi
 * /units/{id}:
 *   delete:
 *     tags: [Units]
 *     summary: Delete a unit
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Unit deleted
 */
router.delete('/:id', async (req: Request, res: Response) => {
  await Unit.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
