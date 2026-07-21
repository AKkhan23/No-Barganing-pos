import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Quotation } from '../models/Quotation';
import { generateId, generateInvoiceNo } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { scopeFilter } from '../middleware/scope';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const CreateQuotationSchema = z.object({
  customer_id: z.string().optional(),
  customer_name: z.string(),
  items: z.array(z.object({
    product_id: z.string().optional(),
    product_name: z.string(),
    quantity: z.number().default(1),
    price: z.number().default(0),
    tax: z.number().default(0),
    total: z.number().default(0),
  })),
  subtotal: z.number(),
  tax_total: z.number(),
  discount: z.number().default(0),
  grand_total: z.number(),
  valid_until: z.string(),
  notes: z.string().optional(),
});

const UpdateQuotationSchema = z.object({
  customer_id: z.string().optional(),
  customer_name: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string().optional(),
    product_name: z.string(),
    quantity: z.number().default(1),
    price: z.number().default(0),
    tax: z.number().default(0),
    total: z.number().default(0),
  })).optional(),
  subtotal: z.number().optional(),
  tax_total: z.number().optional(),
  discount: z.number().optional(),
  grand_total: z.number().optional(),
  valid_until: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * @openapi
 * /quotations:
 *   get:
 *     tags: [Quotations]
 *     summary: List all quotations
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of quotations
 */
router.get('/', async (req: Request, res: Response) => {
  const items = await Quotation.find(scopeFilter(req)).lean();
  res.json(items.map((q: any) => ({ id: q.id, quote_no: q.quote_no, customer_id: q.customer_id, customer_name: q.customer_name, items: q.items, subtotal: q.subtotal, tax_total: q.tax_total, discount: q.discount, grand_total: q.grand_total, status: q.status, valid_until: q.valid_until, notes: q.notes, created_at: q.created_at })));
});

/**
 * @openapi
 * /quotations:
 *   post:
 *     tags: [Quotations]
 *     summary: Create a quotation
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customer_id: { type: string }
 *               customer_name: { type: string }
 *               items: { type: array, items: { type: object } }
 *               subtotal: { type: number }
 *               tax_total: { type: number }
 *               discount: { type: number }
 *               grand_total: { type: number }
 *               valid_until: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Quotation created
 */
router.post('/', validate(CreateQuotationSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const count = await Quotation.countDocuments(scopeFilter(req));
  const quote_no = `Q-${now.slice(0, 4).replace(/-/g, '')}-${String(count + 1).padStart(6, '0')}`;
  const q = new Quotation({ ...req.body, id: generateId(), quote_no, status: 'draft', created_by: req.user?.id, created_at: now, created_by_id: req.user?.id });
  await q.save();
  res.status(201).json({ id: q.id, quote_no: q.quote_no, customer_id: q.customer_id, customer_name: q.customer_name, items: q.items, subtotal: q.subtotal, tax_total: q.tax_total, discount: q.discount, grand_total: q.grand_total, status: q.status, valid_until: q.valid_until, notes: q.notes, created_at: q.created_at });
});

/**
 * @openapi
 * /quotations/{id}:
 *   get:
 *     tags: [Quotations]
 *     summary: Get a quotation by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Quotation details
 *       404:
 *         description: Quotation not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  const q = await Quotation.findOne({ ...scopeFilter(req), id: req.params.id }).lean();
  if (!q) { res.status(404).json({ detail: 'Quotation not found' }); return; }
  res.json({ id: q.id, quote_no: q.quote_no, customer_id: q.customer_id, customer_name: q.customer_name, items: q.items, subtotal: q.subtotal, tax_total: q.tax_total, discount: q.discount, grand_total: q.grand_total, status: q.status, valid_until: q.valid_until, notes: q.notes, created_at: q.created_at });
});

/**
 * @openapi
 * /quotations/{id}:
 *   patch:
 *     tags: [Quotations]
 *     summary: Update a quotation
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
 *               customer_id: { type: string }
 *               customer_name: { type: string }
 *               items: { type: array, items: { type: object } }
 *               subtotal: { type: number }
 *               tax_total: { type: number }
 *               discount: { type: number }
 *               grand_total: { type: number }
 *               valid_until: { type: string }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Quotation updated
 *       404:
 *         description: Quotation not found
 */
router.patch('/:id', validate(UpdateQuotationSchema), async (req: Request, res: Response) => {
  const q = await Quotation.findOneAndUpdate({ ...scopeFilter(req), id: req.params.id }, { $set: req.body }, { new: true }).lean();
  if (!q) { res.status(404).json({ detail: 'Quotation not found' }); return; }
  res.json({ id: q.id, quote_no: q.quote_no, customer_id: q.customer_id, customer_name: q.customer_name, items: q.items, subtotal: q.subtotal, tax_total: q.tax_total, discount: q.discount, grand_total: q.grand_total, status: q.status, valid_until: q.valid_until, notes: q.notes });
});

/**
 * @openapi
 * /quotations/{id}:
 *   delete:
 *     tags: [Quotations]
 *     summary: Delete a quotation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Quotation deleted
 *       404:
 *         description: Quotation not found
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const q = await Quotation.findOneAndDelete({ ...scopeFilter(req), id: req.params.id });
  if (!q) { res.status(404).json({ detail: 'Quotation not found' }); return; }
  res.json({ ok: true });
});

export default router;
