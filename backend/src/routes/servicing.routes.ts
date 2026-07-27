import { Router, Request, Response } from 'express';
import { Servicing } from '../models/Servicing';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { scopeFilter } from '../middleware/scope';
import { z } from 'zod';
import { validate } from '../middleware/validate';

const CreateServicingSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number').optional().or(z.literal('')),
  product_name: z.string().min(1, 'Product name is required'),
  issue: z.string().min(1, 'Issue description is required'),
  status: z.string().optional(),
  received_date: z.string().min(1, 'Received date is required'),
  expected_date: z.string().optional(),
  cost: z.number().optional(),
  notes: z.string().optional(),
});

const UpdateServicingSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required').optional(),
  customer_phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number').optional().or(z.literal('')),
  product_name: z.string().min(1, 'Product name is required').optional(),
  issue: z.string().min(1, 'Issue description is required').optional(),
  status: z.string().optional(),
  received_date: z.string().min(1, 'Received date is required').optional(),
  expected_date: z.string().optional(),
  cost: z.number().optional(),
  notes: z.string().optional(),
});

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

/**
 * @openapi
 * /servicing:
 *   get:
 *     tags: [Servicing]
 *     summary: List servicing records
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of servicing records
 */
router.get('/', async (_req: Request, res: Response) => {
  const items = await Servicing.find(scopeFilter(_req)).lean();
  res.json(items);
});

/**
 * @openapi
 * /servicing:
 *   post:
 *     tags: [Servicing]
 *     summary: Create a servicing record
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created servicing record
 */
router.post('/', validate(CreateServicingSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item = new Servicing({ id: generateId(), ...req.body, created_by: req.user?.id, created_at: now });
  await item.save();
  res.status(201).json(item.toJSON());
});

/**
 * @openapi
 * /servicing/{id}:
 *   patch:
 *     tags: [Servicing]
 *     summary: Update a servicing record
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
 *         description: Updated servicing record
 *       404:
 *         description: Servicing not found
 */
router.patch('/:id', validate(UpdateServicingSchema), async (req: Request, res: Response) => {
  const item = await Servicing.findOneAndUpdate(
    { ...scopeFilter(req), id: req.params.id },
    { $set: { ...req.body, updated_at: new Date().toISOString() } },
    { new: true }
  ).lean();
  if (!item) { res.status(404).json({ detail: 'Servicing not found' }); return; }
  res.json(item);
});

/**
 * @openapi
 * /servicing/{id}/status:
 *   patch:
 *     tags: [Servicing]
 *     summary: Update servicing status
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
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed, delivered]
 *     responses:
 *       200:
 *         description: Updated servicing status
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Servicing not found
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['pending', 'in_progress', 'completed', 'delivered'].includes(status)) {
    res.status(400).json({ detail: 'Invalid status' });
    return;
  }
  const item = await Servicing.findOneAndUpdate(
    { ...scopeFilter(req), id: req.params.id },
    { $set: { status, updated_at: new Date().toISOString() } },
    { new: true }
  ).lean();
  if (!item) { res.status(404).json({ detail: 'Servicing not found' }); return; }
  res.json(item);
});

/**
 * @openapi
 * /servicing/{id}:
 *   delete:
 *     tags: [Servicing]
 *     summary: Delete a servicing record
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Servicing record deleted
 */
router.delete('/:id', async (req: Request, res: Response) => {
  await Servicing.deleteOne({ ...scopeFilter(req), id: req.params.id });
  res.json({ ok: true });
});

export default router;
