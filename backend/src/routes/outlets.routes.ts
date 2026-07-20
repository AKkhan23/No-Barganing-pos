import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Outlet } from '../models/Outlet';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const phoneRegex = /^[0-9]{10}$/;

const CreateOutletSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  address: z.string().min(1, 'Address is required').max(500, 'Address too long'),
  phone: z.string().regex(phoneRegex, 'Phone must be exactly 10 digits').optional().or(z.literal('')),
  gstin: z.string().regex(gstinRegex, 'GSTIN must be 15 characters (e.g. 27ABCDE1234F1Z5)').optional().or(z.literal('')),
  is_active: z.boolean().optional(),
});

const UpdateOutletSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  address: z.string().min(1, 'Address is required').max(500, 'Address too long').optional(),
  phone: z.string().regex(phoneRegex, 'Phone must be exactly 10 digits').optional().or(z.literal('')),
  gstin: z.string().regex(gstinRegex, 'GSTIN must be 15 characters (e.g. 27ABCDE1234F1Z5)').optional().or(z.literal('')),
  is_active: z.boolean().optional(),
});

/**
 * @openapi
 * /outlets:
 *   get:
 *     tags: [Outlets]
 *     summary: List all outlets
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of outlets
 */
router.get('/', async (_req: Request, res: Response) => {
  const outlets = await Outlet.find().lean();
  res.json(outlets.map((o: any) => ({ id: o.id, name: o.name, address: o.address, phone: o.phone, gstin: o.gstin, is_active: o.is_active, created_at: o.created_at })));
});

/**
 * @openapi
 * /outlets/current:
 *   get:
 *     tags: [Outlets]
 *     summary: Get active outlet
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Active outlet details
 */
router.get('/current', async (_req: Request, res: Response) => {
  const outlet = await Outlet.findOne({ is_active: true }).lean();
  if (!outlet) {
    const anyOutlet = await Outlet.findOne().lean();
    if (!anyOutlet) { res.status(404).json({ detail: 'No outlets found' }); return; }
    res.json({ id: anyOutlet.id, name: anyOutlet.name, address: anyOutlet.address, phone: anyOutlet.phone, gstin: anyOutlet.gstin, is_active: anyOutlet.is_active, created_at: anyOutlet.created_at });
    return;
  }
  res.json({ id: outlet.id, name: outlet.name, address: outlet.address, phone: outlet.phone, gstin: outlet.gstin, is_active: outlet.is_active, created_at: outlet.created_at });
});

/**
 * @openapi
 * /outlets/{id}:
 *   get:
 *     tags: [Outlets]
 *     summary: Get outlet by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Outlet details
 *       404:
 *         description: Outlet not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  const outlet = await Outlet.findOne({ id: req.params.id }).lean();
  if (!outlet) { res.status(404).json({ detail: 'Outlet not found' }); return; }
  res.json({ id: outlet.id, name: outlet.name, address: outlet.address, phone: outlet.phone, gstin: outlet.gstin, is_active: outlet.is_active, created_at: outlet.created_at });
});

/**
 * @openapi
 * /outlets:
 *   post:
 *     tags: [Outlets]
 *     summary: Create a new outlet
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               address: { type: string }
 *               phone: { type: string }
 *               gstin: { type: string }
 *               is_active: { type: boolean }
 *     responses:
 *       201:
 *         description: Outlet created
 */
router.post('/', validate(CreateOutletSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const outlet = new Outlet({ ...req.body, id: generateId(), created_at: now });
  await outlet.save();
  res.status(201).json({ id: outlet.id, name: outlet.name, address: outlet.address, phone: outlet.phone, gstin: outlet.gstin, is_active: outlet.is_active, created_at: outlet.created_at });
});

/**
 * @openapi
 * /outlets/{id}:
 *   patch:
 *     tags: [Outlets]
 *     summary: Update an outlet
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
 *               address: { type: string }
 *               phone: { type: string }
 *               gstin: { type: string }
 *               is_active: { type: boolean }
 *     responses:
 *       200:
 *         description: Outlet updated
 *       404:
 *         description: Outlet not found
 */
router.patch('/:id', validate(UpdateOutletSchema), async (req: Request, res: Response) => {
  const outlet = await Outlet.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true }).lean();
  if (!outlet) { res.status(404).json({ detail: 'Outlet not found' }); return; }
  res.json({ id: outlet.id, name: outlet.name, address: outlet.address, phone: outlet.phone, gstin: outlet.gstin, is_active: outlet.is_active, created_at: outlet.created_at });
});

/**
 * @openapi
 * /outlets/{id}:
 *   delete:
 *     tags: [Outlets]
 *     summary: Delete an outlet
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Outlet deleted
 */
router.delete('/:id', async (req: Request, res: Response) => {
  await Outlet.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
