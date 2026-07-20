import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Warranty } from '../models/Warranty';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const CreateWarrantySchema = z.object({
  order_id: z.string().optional(),
  product_id: z.string().optional(),
  product_name: z.string().min(1),
  customer_id: z.string().optional(),
  customer_name: z.string().min(1),
  sale_date: z.string().min(1),
  warranty_period_days: z.number().default(365),
  notes: z.string().optional(),
});

const UpdateWarrantySchema = z.object({
  order_id: z.string().optional(),
  product_id: z.string().optional(),
  product_name: z.string().optional(),
  customer_id: z.string().optional(),
  customer_name: z.string().optional(),
  sale_date: z.string().optional(),
  warranty_period_days: z.number().optional(),
  expiry_date: z.string().optional(),
  service_status: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * @openapi
 * /warranties:
 *   get:
 *     tags: [Warranties]
 *     summary: List warranties
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of warranties
 */
router.get('/', async (_req: Request, res: Response) => {
  const warranties = await Warranty.find().sort({ created_at: -1 }).lean();
  res.json(warranties.map((w: any) => ({ id: w.id, order_id: w.order_id, product_id: w.product_id, product_name: w.product_name, customer_id: w.customer_id, customer_name: w.customer_name, sale_date: w.sale_date, warranty_period_days: w.warranty_period_days, expiry_date: w.expiry_date, service_status: w.service_status, notes: w.notes, created_at: w.created_at })));
});

/**
 * @openapi
 * /warranties:
 *   post:
 *     tags: [Warranties]
 *     summary: Create a warranty
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created warranty
 */
router.post('/', validate(CreateWarrantySchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const saleDate = new Date(req.body.sale_date);
  const expiryDate = new Date(saleDate.getTime() + req.body.warranty_period_days * 24 * 60 * 60 * 1000).toISOString();

  const warranty = new Warranty({
    ...req.body,
    id: generateId(),
    expiry_date: expiryDate,
    service_status: 'active',
    created_at: now,
  });
  await warranty.save();

  res.status(201).json({ id: warranty.id, order_id: warranty.order_id, product_id: warranty.product_id, product_name: warranty.product_name, customer_id: warranty.customer_id, customer_name: warranty.customer_name, sale_date: warranty.sale_date, warranty_period_days: warranty.warranty_period_days, expiry_date: warranty.expiry_date, service_status: warranty.service_status, notes: warranty.notes, created_at: warranty.created_at });
});

/**
 * @openapi
 * /warranties/{id}:
 *   patch:
 *     tags: [Warranties]
 *     summary: Update a warranty
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
 *         description: Updated warranty
 *       404:
 *         description: Warranty not found
 */
router.patch('/:id', validate(UpdateWarrantySchema), async (req: Request, res: Response) => {
  const update: any = { ...req.body, updated_at: new Date().toISOString() };
  if (req.body.sale_date && req.body.warranty_period_days) {
    const saleDate = new Date(req.body.sale_date);
    update.expiry_date = new Date(saleDate.getTime() + req.body.warranty_period_days * 24 * 60 * 60 * 1000).toISOString();
  }
  const warranty = await Warranty.findOneAndUpdate({ id: req.params.id }, { $set: update }, { new: true }).lean();
  if (!warranty) { res.status(404).json({ detail: 'Warranty not found' }); return; }
  res.json({ id: warranty.id, order_id: warranty.order_id, product_id: warranty.product_id, product_name: warranty.product_name, customer_id: warranty.customer_id, customer_name: warranty.customer_name, sale_date: warranty.sale_date, warranty_period_days: warranty.warranty_period_days, expiry_date: warranty.expiry_date, service_status: warranty.service_status, notes: warranty.notes, created_at: warranty.created_at });
});

/**
 * @openapi
 * /warranties/{id}:
 *   delete:
 *     tags: [Warranties]
 *     summary: Delete a warranty
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Warranty deleted
 */
router.delete('/:id', async (req: Request, res: Response) => {
  await Warranty.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
