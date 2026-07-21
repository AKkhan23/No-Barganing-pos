import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { Product } from '../models/Product';
import { StockMovement } from '../models/StockMovement';
import { Supplier } from '../models/Supplier';
import { LedgerEntry } from '../models/LedgerEntry';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { scopeFilter } from '../middleware/scope';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const PurchaseItemSchema = z.object({
  product_id: z.string(),
  quantity: z.number().positive(),
  cost: z.number().min(0),
  tax_rate: z.number().default(0),
});

const CreatePurchaseSchema = z.object({
  supplier_id: z.string(),
  items: z.array(PurchaseItemSchema).min(1),
  reference: z.string().optional(),
  note: z.string().optional(),
});

const UpdatePurchaseSchema = z.object({
  supplier_id: z.string().optional(),
  items: z.array(PurchaseItemSchema).optional(),
  reference: z.string().optional(),
  note: z.string().optional(),
});

/**
 * @openapi
 * /purchases:
 *   post:
 *     tags: [Purchases]
 *     summary: Create a purchase order
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               supplier_id: { type: string }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product_id: { type: string }
 *                     quantity: { type: number }
 *                     cost: { type: number }
 *                     tax_rate: { type: number }
 *               reference: { type: string }
 *               note: { type: string }
 *     responses:
 *       201:
 *         description: Created purchase order
 *       404:
 *         description: Supplier not found
 */
router.post('/', validate(CreatePurchaseSchema), async (req: Request, res: Response) => {
  const { supplier_id, items, reference, note } = req.body;
  const supplier = await Supplier.findOne({ ...scopeFilter(req), id: supplier_id }).lean();
  if (!supplier) { res.status(404).json({ detail: 'Supplier not found' }); return; }

  const enriched = [];
  let subtotal = 0;
  let tax_total = 0;
  for (const item of items) {
    const product = await Product.findOne({ ...scopeFilter(req), id: item.product_id }).lean();
    if (!product) { res.status(400).json({ detail: `Product not found: ${item.product_id}` }); return; }
    const line_total = item.quantity * item.cost;
    const tax = line_total * (item.tax_rate / 100);
    subtotal += line_total;
    tax_total += tax;
    enriched.push({ product_id: item.product_id, name: product.name, sku: product.sku, quantity: item.quantity, cost: item.cost, tax_rate: item.tax_rate, line_total });
  }
  const total = subtotal + tax_total;
  const now = new Date().toISOString();
  const po = new PurchaseOrder({
    id: generateId(),
    supplier_id,
    supplier_name: supplier.name,
    reference,
    status: 'draft',
    items: enriched,
    subtotal,
    tax_total,
    total,
    note,
    created_by_id: req.user?.id,
    created_by: req.user?.id,
    created_by_name: req.user?.name,
    created_at: now,
  });
  await po.save();
  res.status(201).json({ id: po.id, supplier_id: po.supplier_id, supplier_name: po.supplier_name, reference: po.reference, status: po.status, items: po.items, subtotal: po.subtotal, tax_total: po.tax_total, total: po.total, note: po.note, created_at: po.created_at });
});

/**
 * @openapi
 * /purchases:
 *   get:
 *     tags: [Purchases]
 *     summary: List purchase orders
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: supplier_id
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of purchase orders
 */
router.get('/', async (req: Request, res: Response) => {
  const { supplier_id, status } = req.query;
  const filter: any = {};
  if (supplier_id) filter.supplier_id = supplier_id;
  if (status) filter.status = status;
  const items = await PurchaseOrder.find({ ...scopeFilter(req), ...filter }).lean();
  res.json(items.map((po: any) => ({ id: po.id, supplier_id: po.supplier_id, supplier_name: po.supplier_name, reference: po.reference, status: po.status, items: po.items, subtotal: po.subtotal, tax_total: po.tax_total, total: po.total, note: po.note, created_at: po.created_at })));
});

/**
 * @openapi
 * /purchases/{id}:
 *   get:
 *     tags: [Purchases]
 *     summary: Get a purchase order by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Purchase order details
 *       404:
 *         description: Purchase order not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  const po = await PurchaseOrder.findOne({ ...scopeFilter(req), id: req.params.id }).lean();
  if (!po) { res.status(404).json({ detail: 'Purchase order not found' }); return; }
  res.json({ id: po.id, supplier_id: po.supplier_id, supplier_name: po.supplier_name, reference: po.reference, status: po.status, items: po.items, subtotal: po.subtotal, tax_total: po.tax_total, total: po.total, note: po.note, created_at: po.created_at });
});

/**
 * @openapi
 * /purchases/{id}:
 *   patch:
 *     tags: [Purchases]
 *     summary: Update a draft purchase order
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
 *               supplier_id: { type: string }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product_id: { type: string }
 *                     quantity: { type: number }
 *                     cost: { type: number }
 *                     tax_rate: { type: number }
 *               reference: { type: string }
 *               note: { type: string }
 *     responses:
 *       200:
 *         description: Updated purchase order
 *       404:
 *         description: Purchase order not found
 */
router.patch('/:id', validate(UpdatePurchaseSchema), async (req: Request, res: Response) => {
  const existing = await PurchaseOrder.findOne({ ...scopeFilter(req), id: req.params.id }).lean();
  if (!existing) { res.status(404).json({ detail: 'Purchase order not found' }); return; }
  if (existing.status !== 'draft') { res.status(400).json({ detail: 'Only draft purchase orders can be updated' }); return; }

  const update: any = { ...req.body };
  if (update.items) {
    const enriched = [];
    let subtotal = 0;
    let tax_total = 0;
    for (const item of update.items) {
      const product = await Product.findOne({ ...scopeFilter(req), id: item.product_id }).lean();
      if (!product) { res.status(400).json({ detail: `Product not found: ${item.product_id}` }); return; }
      const line_total = item.quantity * item.cost;
      const tax = line_total * (item.tax_rate / 100);
      subtotal += line_total;
      tax_total += tax;
      enriched.push({ product_id: item.product_id, name: product.name, sku: product.sku, quantity: item.quantity, cost: item.cost, tax_rate: item.tax_rate, line_total });
    }
    update.items = enriched;
    update.subtotal = subtotal;
    update.tax_total = tax_total;
    update.total = subtotal + tax_total;
  }
  const po = await PurchaseOrder.findOneAndUpdate({ ...scopeFilter(req), id: req.params.id }, { $set: update }, { new: true }).lean();
  res.json({ id: po!.id, supplier_id: po!.supplier_id, supplier_name: po!.supplier_name, reference: po!.reference, status: po!.status, items: po!.items, subtotal: po!.subtotal, tax_total: po!.tax_total, total: po!.total, note: po!.note, created_at: po!.created_at });
});

/**
 * @openapi
 * /purchases/{id}:
 *   delete:
 *     tags: [Purchases]
 *     summary: Delete a draft purchase order
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deletion confirmed
 *       404:
 *         description: Purchase order not found
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const po = await PurchaseOrder.findOne({ ...scopeFilter(req), id: req.params.id }).lean();
  if (!po) { res.status(404).json({ detail: 'Purchase order not found' }); return; }
  if (po.status === 'received') { res.status(400).json({ detail: 'Cannot delete a received purchase order' }); return; }
  await PurchaseOrder.deleteOne({ ...scopeFilter(req), id: req.params.id });
  res.json({ ok: true });
});

/**
 * @openapi
 * /purchases/{id}/receive:
 *   post:
 *     tags: [Purchases]
 *     summary: Receive a purchase order (updates stock, creates ledger entries)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Purchase order received
 *       404:
 *         description: Purchase order not found
 */
router.post('/:id/receive', async (req: Request, res: Response) => {
  const po = await PurchaseOrder.findOne({ ...scopeFilter(req), id: req.params.id }).lean();
  if (!po) { res.status(404).json({ detail: 'Purchase order not found' }); return; }
  if (po.status !== 'draft') { res.status(400).json({ detail: 'Purchase order already received' }); return; }

  const now = new Date().toISOString();
  for (const item of po.items) {
    await Product.findOneAndUpdate({ ...scopeFilter(req), id: item.product_id }, { $inc: { stock: item.quantity } });
    const sm = new StockMovement({
      id: generateId(),
      product_id: item.product_id,
      product_name: item.name,
      type: 'purchase_in',
      reason: 'purchase_receive',
      change: item.quantity,
      quantity: item.quantity,
      reference: po.id,
      user_id: req.user?.id || '',
      user_name: req.user?.name || '',
      created_by_id: req.user?.id,
      created_by: req.user?.id,
      created_at: now,
    });
    await sm.save();
  }

  await Supplier.findOneAndUpdate({ ...scopeFilter(req), id: po.supplier_id }, { $inc: { current_balance: po.total } });

  const le = new LedgerEntry({
    id: generateId(),
    date: now,
    account: 'Purchases',
    debit: po.total,
    credit: 0,
    reference: po.id,
    note: 'Purchase order received',
    created_by_id: req.user?.id,
    created_by: req.user?.id,
    created_by_name: req.user?.name,
    created_at: now,
  });
  await le.save();

  const le2 = new LedgerEntry({
    id: generateId(),
    date: now,
    account: 'Supplier Payable',
    party_type: 'supplier',
    party_id: po.supplier_id,
    debit: 0,
    credit: po.total,
    reference: po.id,
    note: 'Purchase order received',
    created_by_id: req.user?.id,
    created_by: req.user?.id,
    created_by_name: req.user?.name,
    created_at: now,
  });
  await le2.save();

  await PurchaseOrder.findOneAndUpdate({ ...scopeFilter(req), id: req.params.id }, { $set: { status: 'received' } });
  res.json({ ok: true });
});

export default router;
