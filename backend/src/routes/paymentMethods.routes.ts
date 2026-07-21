import { Router, Request, Response } from 'express';
import { PaymentMethod } from '../models/PaymentMethod';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { scopeFilter } from '../middleware/scope';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

/**
 * @openapi
 * /payment-methods:
 *   get:
 *     tags: [Payment Methods]
 *     summary: List payment methods
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of payment methods
 */
router.get('/', async (_req: Request, res: Response) => {
  const items = await PaymentMethod.find(scopeFilter(_req)).lean();
  res.json(items);
});

/**
 * @openapi
 * /payment-methods:
 *   post:
 *     tags: [Payment Methods]
 *     summary: Create a payment method
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created payment method
 */
router.post('/', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item = new PaymentMethod({ id: generateId(), ...req.body, created_by: req.user?.id, created_at: now });
  await item.save();
  res.status(201).json(item.toJSON());
});

/**
 * @openapi
 * /payment-methods/{id}:
 *   patch:
 *     tags: [Payment Methods]
 *     summary: Update a payment method
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
 *         description: Updated payment method
 *       404:
 *         description: Payment method not found
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const item = await PaymentMethod.findOneAndUpdate(
    { ...scopeFilter(req), id: req.params.id },
    { $set: { ...req.body, updated_at: new Date().toISOString() } },
    { new: true }
  ).lean();
  if (!item) { res.status(404).json({ detail: 'PaymentMethod not found' }); return; }
  res.json(item);
});

/**
 * @openapi
 * /payment-methods/{id}:
 *   delete:
 *     tags: [Payment Methods]
 *     summary: Delete a payment method
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment method deleted
 */
router.delete('/:id', async (req: Request, res: Response) => {
  await PaymentMethod.deleteOne({ ...scopeFilter(req), id: req.params.id });
  res.json({ ok: true });
});

export default router;
