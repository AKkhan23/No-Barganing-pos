import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { InstallmentPlan } from '../models/InstallmentPlan';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const CreateInstallmentSchema = z.object({
  order_id: z.string().optional(),
  customer_id: z.string().optional(),
  customer_name: z.string().optional(),
  total_amount: z.number(),
  down_payment: z.number(),
  installment_amount: z.number(),
  total_installments: z.number(),
  due_date: z.string().optional(),
});

const UpdateInstallmentSchema = z.object({
  order_id: z.string().optional(),
  customer_id: z.string().optional(),
  customer_name: z.string().optional(),
  total_amount: z.number().optional(),
  down_payment: z.number().optional(),
  installment_amount: z.number().optional(),
  total_installments: z.number().optional(),
  installments_paid: z.number().optional(),
  status: z.string().optional(),
  due_date: z.string().optional(),
});

/**
 * @openapi
 * /installments:
 *   get:
 *     tags: [Installments]
 *     summary: List installment plans
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of installment plans
 */
router.get('/', async (req: Request, res: Response) => {
  const plans = await InstallmentPlan.find().lean();
  res.json(plans.map((p: any) => ({ id: p.id, order_id: p.order_id, customer_id: p.customer_id, customer_name: p.customer_name, total_amount: p.total_amount, down_payment: p.down_payment, installment_amount: p.installment_amount, total_installments: p.total_installments, installments_paid: p.installments_paid, status: p.status, due_date: p.due_date, created_at: p.created_at })));
});

/**
 * @openapi
 * /installments:
 *   post:
 *     tags: [Installments]
 *     summary: Create an installment plan
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created installment plan
 */
router.post('/', validate(CreateInstallmentSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const plan = new InstallmentPlan({ ...req.body, id: generateId(), status: 'active', installments_paid: 0, created_at: now });
  await plan.save();
  res.status(201).json({ id: plan.id, order_id: plan.order_id, customer_id: plan.customer_id, customer_name: plan.customer_name, total_amount: plan.total_amount, down_payment: plan.down_payment, installment_amount: plan.installment_amount, total_installments: plan.total_installments, installments_paid: plan.installments_paid, status: plan.status, due_date: plan.due_date, created_at: plan.created_at });
});

/**
 * @openapi
 * /installments/{id}:
 *   patch:
 *     tags: [Installments]
 *     summary: Update an installment plan
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
 *         description: Updated installment plan
 *       404:
 *         description: Installment plan not found
 */
router.patch('/:id', validate(UpdateInstallmentSchema), async (req: Request, res: Response) => {
  const update: any = { ...req.body };
  if (update.status === 'paid') {
    update.installments_paid = update.total_installments || (await InstallmentPlan.findOne({ id: req.params.id }))?.total_installments || 0;
  }
  const plan = await InstallmentPlan.findOneAndUpdate({ id: req.params.id }, { $set: update }, { new: true }).lean();
  if (!plan) { res.status(404).json({ detail: 'Installment plan not found' }); return; }
  res.json({ id: plan.id, order_id: plan.order_id, customer_id: plan.customer_id, customer_name: plan.customer_name, total_amount: plan.total_amount, down_payment: plan.down_payment, installment_amount: plan.installment_amount, total_installments: plan.total_installments, installments_paid: plan.installments_paid, status: plan.status, due_date: plan.due_date, created_at: plan.created_at });
});

/**
 * @openapi
 * /installments/{id}:
 *   delete:
 *     tags: [Installments]
 *     summary: Delete an installment plan
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Installment plan deleted
 */
router.delete('/:id', async (req: Request, res: Response) => {
  await InstallmentPlan.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
