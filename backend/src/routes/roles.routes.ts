import { Router, Request, Response } from 'express';
import { Role } from '../models/Role';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';

const router = Router();
router.use(verifyJWT, requireRoles('admin'));

/**
 * @openapi
 * /roles:
 *   get:
 *     tags: [Roles]
 *     summary: List roles
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of roles
 */
router.get('/', async (_req: Request, res: Response) => {
  const items = await Role.find({}).lean();
  res.json(items);
});

/**
 * @openapi
 * /roles:
 *   post:
 *     tags: [Roles]
 *     summary: Create a role
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created role
 */
router.post('/', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item = new Role({ id: generateId(), ...req.body, created_at: now, updated_at: now });
  await item.save();
  res.status(201).json(item.toJSON());
});

/**
 * @openapi
 * /roles/{id}:
 *   patch:
 *     tags: [Roles]
 *     summary: Update a role
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
 *         description: Updated role
 *       404:
 *         description: Role not found
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const item = await Role.findOneAndUpdate({ id: req.params.id }, { $set: { ...req.body, updated_at: new Date().toISOString() } }, { new: true }).lean();
  if (!item) { res.status(404).json({ detail: 'Role not found' }); return; }
  res.json(item);
});

/**
 * @openapi
 * /roles/{id}:
 *   delete:
 *     tags: [Roles]
 *     summary: Delete a role
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role deleted
 *       400:
 *         description: Cannot delete system role
 *       404:
 *         description: Role not found
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const role = await Role.findOne({ id: req.params.id }).lean();
  if (!role) { res.status(404).json({ detail: 'Role not found' }); return; }
  if (role.is_system) { res.status(400).json({ detail: 'Cannot delete system role' }); return; }
  await Role.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
