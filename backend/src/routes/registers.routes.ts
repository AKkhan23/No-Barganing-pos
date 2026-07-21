import { Router, Request, Response } from 'express';
import { Register } from '../models/Register';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { scopeFilter } from '../middleware/scope';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

/**
 * @openapi
 * /registers:
 *   get:
 *     tags: [Registers]
 *     summary: List registers
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of registers
 */
router.get('/', async (_req: Request, res: Response) => {
  const items = await Register.find(scopeFilter(_req)).lean();
  res.json(items);
});

/**
 * @openapi
 * /registers/current:
 *   get:
 *     tags: [Registers]
 *     summary: Get active register
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Active register object
 *       404:
 *         description: No active register found
 */
router.get('/current', async (_req: Request, res: Response) => {
  const item = await Register.findOne({ ...scopeFilter(_req), is_active: true }).lean();
  if (!item) { res.status(404).json({ detail: 'No active register found' }); return; }
  res.json(item);
});

/**
 * @openapi
 * /registers:
 *   post:
 *     tags: [Registers]
 *     summary: Create a register
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
 *               is_active:
 *                 type: boolean
 *               opening_balance:
 *                 type: number
 *     responses:
 *       201:
 *         description: Created register
 */
router.post('/', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item = new Register({ id: generateId(), ...req.body, created_by: req.user?.id, created_at: now });
  await item.save();
  res.status(201).json(item.toJSON());
});

/**
 * @openapi
 * /registers/{id}:
 *   patch:
 *     tags: [Registers]
 *     summary: Update a register
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Register ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *               opening_balance:
 *                 type: number
 *     responses:
 *       200:
 *         description: Updated register
 *       404:
 *         description: Not found
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const item = await Register.findOneAndUpdate(
    { ...scopeFilter(req), id: req.params.id },
    { $set: { ...req.body, updated_at: new Date().toISOString() } },
    { new: true }
  ).lean();
  if (!item) { res.status(404).json({ detail: 'Register not found' }); return; }
  res.json(item);
});

/**
 * @openapi
 * /registers/{id}:
 *   delete:
 *     tags: [Registers]
 *     summary: Delete a register
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Register ID
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
router.delete('/:id', async (req: Request, res: Response) => {
  await Register.deleteOne({ ...scopeFilter(req), id: req.params.id });
  res.json({ ok: true });
});

export default router;
