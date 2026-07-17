import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SaleReturn } from '../models/SaleReturn';
import { Product } from '../models/Product';
import { StockMovement } from '../models/StockMovement';
import { Order } from '../models/Order';
import { Customer } from '../models/Customer';
import { LedgerEntry } from '../models/LedgerEntry';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const SRItemSchema = z.object({
  product_id: z.string(),
  quantity: z.number().positive(),
  price: z.number().min(0),
  tax_rate: z.number().default(0),
});

const CreateSaleReturnSchema = z.object({
  order_id: z.string(),
  items: z.array(SRItemSchema).min(1),
  refund_mode: z.enum(['cash', 'card', 'upi', 'wallet']),
  note: z.string().optional(),
});

router.post('/', validate(CreateSaleReturnSchema), async (req: Request, res: Response) => {
  const { order_id, items, refund_mode, note } = req.body;
  const order = await Order.findOne({ id: order_id }).lean();
  if (!order) { res.status(404).json({ detail: 'Order not found' }); return; }

  const enriched = [];
  let subtotal = 0;
  let tax_total = 0;
  const now = new Date().toISOString();

  for (const item of items) {
    const product = await Product.findOne({ id: item.product_id }).lean();
    if (!product) { res.status(400).json({ detail: `Product not found: ${item.product_id}` }); return; }
    const line_total = item.quantity * item.price;
    const tax = line_total * (item.tax_rate / 100);
    subtotal += line_total;
    tax_total += tax;
    enriched.push({ product_id: item.product_id, name: product.name, sku: product.sku, quantity: item.quantity, price: item.price, tax_rate: item.tax_rate, line_total });

    await Product.findOneAndUpdate({ id: item.product_id }, { $inc: { stock: item.quantity } });

    const sm = new StockMovement({
      id: generateId(),
      product_id: item.product_id,
      product_name: product.name,
      type: 'sale_return',
      reason: 'sale_return',
      change: item.quantity,
      quantity: item.quantity,
      reference: order_id,
      user_id: req.user?.id || '',
      user_name: req.user?.name || '',
      created_by_id: req.user?.id,
      created_at: now,
    });
    await sm.save();
  }

  const total = subtotal + tax_total;

  if (order.customer_id) {
    await Customer.findOneAndUpdate({ id: order.customer_id }, { $inc: { receivable: -total } });
  }

  const le = new LedgerEntry({
    id: generateId(),
    date: now,
    account: 'Sales Returns',
    party_type: order.customer_id ? 'customer' : undefined,
    party_id: order.customer_id,
    debit: total,
    credit: 0,
    reference: order_id,
    note: note || 'Sale return',
    created_by_id: req.user?.id,
    created_by_name: req.user?.name,
    created_at: now,
  });
  await le.save();

  const sr = new SaleReturn({
    id: generateId(),
    order_id,
    invoice_no: order.invoice_no,
    customer_id: order.customer_id,
    customer_name: order.customer_name,
    items: enriched,
    subtotal,
    tax_total,
    total,
    refund_mode,
    note,
    created_at: now,
    created_by_id: req.user?.id,
    created_by_name: req.user?.name,
  });
  await sr.save();
  res.status(201).json({ id: sr.id, order_id: sr.order_id, invoice_no: sr.invoice_no, customer_id: sr.customer_id, customer_name: sr.customer_name, items: sr.items, subtotal: sr.subtotal, tax_total: sr.tax_total, total: sr.total, refund_mode: sr.refund_mode, note: sr.note, created_at: sr.created_at });
});

router.get('/', async (req: Request, res: Response) => {
  const { order_id } = req.query;
  const filter: any = {};
  if (order_id) filter.order_id = order_id;
  const items = await SaleReturn.find(filter).lean();
  res.json(items.map((sr: any) => ({ id: sr.id, order_id: sr.order_id, invoice_no: sr.invoice_no, customer_id: sr.customer_id, customer_name: sr.customer_name, items: sr.items, subtotal: sr.subtotal, tax_total: sr.tax_total, total: sr.total, refund_mode: sr.refund_mode, note: sr.note, created_at: sr.created_at })));
});

router.get('/:id', async (req: Request, res: Response) => {
  const sr = await SaleReturn.findOne({ id: req.params.id }).lean();
  if (!sr) { res.status(404).json({ detail: 'Sale return not found' }); return; }
  res.json({ id: sr.id, order_id: sr.order_id, invoice_no: sr.invoice_no, customer_id: sr.customer_id, customer_name: sr.customer_name, items: sr.items, subtotal: sr.subtotal, tax_total: sr.tax_total, total: sr.total, refund_mode: sr.refund_mode, note: sr.note, created_at: sr.created_at });
});

export default router;
