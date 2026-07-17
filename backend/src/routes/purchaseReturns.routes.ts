import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PurchaseReturn } from '../models/PurchaseReturn';
import { Product } from '../models/Product';
import { StockMovement } from '../models/StockMovement';
import { Supplier } from '../models/Supplier';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const PRItemSchema = z.object({
  product_id: z.string(),
  quantity: z.number().positive(),
  cost: z.number().min(0),
});

const CreatePurchaseReturnSchema = z.object({
  supplier_id: z.string(),
  items: z.array(PRItemSchema).min(1),
  purchase_order_id: z.string().optional(),
  reason: z.string().optional(),
  note: z.string().optional(),
});

router.post('/', validate(CreatePurchaseReturnSchema), async (req: Request, res: Response) => {
  const { supplier_id, items, purchase_order_id, reason, note } = req.body;
  const supplier = await Supplier.findOne({ id: supplier_id }).lean();
  if (!supplier) { res.status(404).json({ detail: 'Supplier not found' }); return; }

  const enriched = [];
  let subtotal = 0;
  for (const item of items) {
    const product = await Product.findOne({ id: item.product_id }).lean();
    if (!product) { res.status(400).json({ detail: `Product not found: ${item.product_id}` }); return; }
    const line_total = item.quantity * item.cost;
    subtotal += line_total;
    enriched.push({ product_id: item.product_id, name: product.name, sku: product.sku, quantity: item.quantity, cost: item.cost, line_total });

    await Product.findOneAndUpdate({ id: item.product_id }, { $inc: { stock: -item.quantity } });

    const sm = new StockMovement({
      id: generateId(),
      product_id: item.product_id,
      product_name: product.name,
      type: 'purchase_return',
      reason: reason || 'purchase_return',
      change: -item.quantity,
      quantity: item.quantity,
      reference: purchase_order_id || '',
      user_id: req.user?.id || '',
      user_name: req.user?.name || '',
      created_by_id: req.user?.id,
      created_at: new Date().toISOString(),
    });
    await sm.save();
  }

  const total = subtotal;
  await Supplier.findOneAndUpdate({ id: supplier_id }, { $inc: { current_balance: -total } });

  const now = new Date().toISOString();
  const pr = new PurchaseReturn({
    id: generateId(),
    supplier_id,
    supplier_name: supplier.name,
    purchase_order_id,
    items: enriched,
    subtotal,
    tax_total: 0,
    total,
    reason,
    note,
    created_at: now,
    created_by_id: req.user?.id,
    created_by_name: req.user?.name,
  });
  await pr.save();
  res.status(201).json({ id: pr.id, supplier_id: pr.supplier_id, supplier_name: pr.supplier_name, purchase_order_id: pr.purchase_order_id, items: pr.items, subtotal: pr.subtotal, tax_total: pr.tax_total, total: pr.total, reason: pr.reason, note: pr.note, created_at: pr.created_at });
});

router.get('/', async (req: Request, res: Response) => {
  const items = await PurchaseReturn.find().lean();
  res.json(items.map((pr: any) => ({ id: pr.id, supplier_id: pr.supplier_id, supplier_name: pr.supplier_name, purchase_order_id: pr.purchase_order_id, items: pr.items, subtotal: pr.subtotal, tax_total: pr.tax_total, total: pr.total, reason: pr.reason, note: pr.note, created_at: pr.created_at })));
});

router.delete('/:id', async (req: Request, res: Response) => {
  const pr = await PurchaseReturn.findOne({ id: req.params.id }).lean();
  if (!pr) { res.status(404).json({ detail: 'Purchase return not found' }); return; }
  await PurchaseReturn.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

router.get('/:id', async (req: Request, res: Response) => {
  const pr = await PurchaseReturn.findOne({ id: req.params.id }).lean();
  if (!pr) { res.status(404).json({ detail: 'Purchase return not found' }); return; }
  res.json({ id: pr.id, supplier_id: pr.supplier_id, supplier_name: pr.supplier_name, purchase_order_id: pr.purchase_order_id, items: pr.items, subtotal: pr.subtotal, tax_total: pr.tax_total, total: pr.total, reason: pr.reason, note: pr.note, created_at: pr.created_at });
});

export default router;
