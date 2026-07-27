import { Router, Request, Response } from 'express';
import { Rack } from '../models/Rack';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { z } from 'zod';
import { validate } from '../middleware/validate';

const CreateRackSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

const UpdateRackSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
});

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

/**
 * @openapi
 * /racks:
 *   get:
 *     tags: [Racks]
 *     summary: List racks
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of racks
 */
router.get('/', async (_req: Request, res: Response) => {
  const items = await Rack.find({}).lean();
  res.json(items);
});

/**
 * @openapi
 * /racks:
 *   post:
 *     tags: [Racks]
 *     summary: Create a rack
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
 *     responses:
 *       201:
 *         description: Created rack
 */
router.post('/', validate(CreateRackSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item = new Rack({ id: generateId(), ...req.body, created_by: req.user?.id, created_at: now });
  await item.save();
  res.status(201).json(item.toJSON());
});

/**
 * @openapi
 * /racks/{id}:
 *   patch:
 *     tags: [Racks]
 *     summary: Update a rack
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
 *     responses:
 *       200:
 *         description: Updated rack
 *       404:
 *         description: Rack not found
 */
router.patch('/:id', validate(UpdateRackSchema), async (req: Request, res: Response) => {
  const item = await Rack.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true }).lean();
  if (!item) { res.status(404).json({ detail: 'Rack not found' }); return; }
  res.json(item);
});

/**
 * @openapi
 * /racks/{id}:
 *   delete:
 *     tags: [Racks]
 *     summary: Delete a rack
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
  await Rack.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
