import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DeliveryPartner } from '../models/DeliveryPartner';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const CreatePartnerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  vehicle_no: z.string().optional(),
  commission_type: z.string().default('fixed'),
  commission_value: z.number().default(0),
  active: z.boolean().default(true),
});

const UpdatePartnerSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  vehicle_no: z.string().optional(),
  commission_type: z.string().optional(),
  commission_value: z.number().optional(),
  active: z.boolean().optional(),
});

/**
 * @openapi
 * /delivery-partners:
 *   get:
 *     tags: [Delivery Partners]
 *     summary: List delivery partners
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: active_only
 *         schema:
 *           type: string
 *         description: Filter active partners only
 *     responses:
 *       200:
 *         description: Array of delivery partners
 */
router.get('/', async (req: Request, res: Response) => {
  const filter: any = {};
  if (req.query.active_only === 'true') filter.active = true;
  const partners = await DeliveryPartner.find(filter).lean();
  res.json(partners.map((p: any) => ({ id: p.id, name: p.name, phone: p.phone, email: p.email, address: p.address, vehicle_no: p.vehicle_no, commission_type: p.commission_type, commission_value: p.commission_value, active: p.active, created_at: p.created_at })));
});

/**
 * @openapi
 * /delivery-partners:
 *   post:
 *     tags: [Delivery Partners]
 *     summary: Create a delivery partner
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
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *               vehicle_no:
 *                 type: string
 *               commission_type:
 *                 type: string
 *               commission_value:
 *                 type: number
 *               active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Created delivery partner
 */
router.post('/', validate(CreatePartnerSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const partner = new DeliveryPartner({ ...req.body, id: generateId(), created_at: now });
  await partner.save();
  res.status(201).json({ id: partner.id, name: partner.name, phone: partner.phone, email: partner.email, address: partner.address, vehicle_no: partner.vehicle_no, commission_type: partner.commission_type, commission_value: partner.commission_value, active: partner.active, created_at: partner.created_at });
});

/**
 * @openapi
 * /delivery-partners/{id}:
 *   patch:
 *     tags: [Delivery Partners]
 *     summary: Update a delivery partner
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Delivery partner ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *               vehicle_no:
 *                 type: string
 *               commission_type:
 *                 type: string
 *               commission_value:
 *                 type: number
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated delivery partner
 *       404:
 *         description: Not found
 */
router.patch('/:id', validate(UpdatePartnerSchema), async (req: Request, res: Response) => {
  const partner = await DeliveryPartner.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true }).lean();
  if (!partner) { res.status(404).json({ detail: 'Delivery partner not found' }); return; }
  res.json({ id: partner.id, name: partner.name, phone: partner.phone, email: partner.email, address: partner.address, vehicle_no: partner.vehicle_no, commission_type: partner.commission_type, commission_value: partner.commission_value, active: partner.active });
});

/**
 * @openapi
 * /delivery-partners/{id}:
 *   delete:
 *     tags: [Delivery Partners]
 *     summary: Delete a delivery partner
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Delivery partner ID
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
router.delete('/:id', async (req: Request, res: Response) => {
  await DeliveryPartner.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
