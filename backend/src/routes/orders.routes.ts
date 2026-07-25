import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { StockMovement } from '../models/StockMovement';
import { generateId, generateInvoiceNo } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { scopeFilter } from '../middleware/scope';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager', 'cashier'));

const OrderItemSchema = z.object({
  product_id: z.string(),
  product_name: z.string().optional(),
  name: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.number().positive(),
  price: z.number(),
  tax: z.number().default(0),
  tax_rate: z.number().default(0),
  total: z.number().optional(),
  line_total: z.number().default(0),
  unit: z.string().optional(),
  sell_by: z.string().optional(),
});

const CreateOrderSchema = z.object({
  customer_id: z.string().nullable().optional(),
  customer_name: z.string().default('Walk-in'),
  items: z.array(OrderItemSchema).min(1),
  subtotal: z.number().optional(),
  tax_total: z.number().default(0),
  discount_percent: z.number().default(0),
  discount_amount: z.number().default(0),
  discount: z.number().default(0),
  grand_total: z.number().optional(),
  total: z.number().default(0),
  paid: z.number().default(0),
  amount_paid: z.number().default(0),
  change_due: z.number().default(0),
  payment_mode: z.string().default('cash'),
  payment_method: z.string().default('cash'),
  status: z.string().default('completed'),
  note: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * @openapi
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: List orders with optional filters
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *         description: Items per page
 *       - in: query
 *         name: date_from
 *         schema: { type: string, format: date }
 *         description: Start date filter
 *       - in: query
 *         name: date_to
 *         schema: { type: string, format: date }
 *         description: End date filter
 *       - in: query
 *         name: cashier_id
 *         schema: { type: string }
 *         description: Filter by cashier
 *       - in: query
 *         name: payment_mode
 *         schema: { type: string }
 *         description: Filter by payment mode
 *     responses:
 *       200:
 *         description: Array of orders
 */
router.get('/', async (req: Request, res: Response) => {
  const { date_from, date_to, cashier_id, payment_mode, limit: qLimit } = req.query;
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(qLimit as string || '50', 10);
  const skip = (page - 1) * limit;
  const filter: any = {};
  if (date_from) filter.created_at = { $gte: date_from };
  if (date_to) filter.created_at = { ...filter.created_at, $lte: date_to };
  if (cashier_id) filter.cashier_id = cashier_id;
  if (payment_mode) {
    filter.$or = [{ payment_mode }, { payment_method: payment_mode }];
  }
  const orders = await Order.find({ ...scopeFilter(req), ...filter }).sort({ created_at: -1 }).skip(skip).limit(limit).select('-_id -__v').lean();
  res.json(orders);
});

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get a single order by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  const order = await Order.findOne({ ...scopeFilter(req), id: req.params.id }).select('-_id -__v').lean();
  if (!order) { res.status(404).json({ detail: 'Order not found' }); return; }
  res.json(order);
});

/**
 * @openapi
 * /orders:
 *   post:
 *     tags: [Orders]
 *     summary: Create a new order (POS sale)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               customer_id: { type: string, nullable: true }
 *               customer_name: { type: string, default: "Walk-in" }
 *               customer_phone: { type: string }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [product_id, quantity, price]
 *                   properties:
 *                     product_id: { type: string }
 *                     product_name: { type: string }
 *                     quantity: { type: number }
 *                     price: { type: number }
 *                     tax: { type: number }
 *                     tax_rate: { type: number }
 *                     line_total: { type: number }
 *                     unit: { type: string }
 *                     sell_by: { type: string }
 *               subtotal: { type: number }
 *               tax_total: { type: number, default: 0 }
 *               discount_percent: { type: number, default: 0 }
 *               paid: { type: number, default: 0 }
 *               payment_mode: { type: string, default: "cash" }
 *               status: { type: string, default: "completed" }
 *               note: { type: string }
 *     responses:
 *       201:
 *         description: Order created
 *       400:
 *         description: Insufficient stock or product not found
 *       422:
 *         description: Validation error
 */
router.post('/', validate(CreateOrderSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const invoice_no = await generateInvoiceNo();
  const items = req.body.items.map((item: any) => ({
    ...item,
    product_name: item.product_name || item.name || '',
    name: item.name || item.product_name || '',
    total: item.total ?? item.line_total ?? 0,
    line_total: item.line_total ?? item.total ?? 0,
  }));
  const subtotal = req.body.subtotal ?? items.reduce((s: number, i: any) => s + i.total, 0);
  const discount_pct = req.body.discount_percent || 0;
  const discount_amount = discount_pct > 0 ? (subtotal * discount_pct) / 100 : 0;
  const grand_total = req.body.grand_total ?? subtotal - discount_amount + (req.body.tax_total || 0);
  const paid = req.body.amount_paid || req.body.paid || 0;
  const orderData = {
    ...req.body,
    items,
    subtotal,
    discount_amount,
    grand_total,
    total: grand_total,
    paid,
    amount_paid: paid,
    customer_id: req.body.customer_id || undefined,
    id: generateId(),
    invoice_no,
    due: grand_total - paid,
    cashier_id: req.user?.id || '',
    cashier_name: req.user?.name || '',
    created_by_id: req.user?.id,
    created_by: req.user?.id,
    created_at: now,
  };
  for (const item of items) {
    const product = await Product.findOne({ ...scopeFilter(req), id: item.product_id }).lean();
    if (!product) {
      res.status(400).json({ detail: `Product not found: ${item.product_name || item.name || item.product_id}` });
      return;
    }
    if (product.stock < item.quantity) {
      res.status(400).json({ detail: `Insufficient stock for ${product.name} (available: ${product.stock}, requested: ${item.quantity})` });
      return;
    }
  }

  const order = new Order(orderData);
  await order.save();

  for (const item of items) {
    await Product.findOneAndUpdate({ ...scopeFilter(req), id: item.product_id }, { $inc: { stock: -item.quantity }, $set: { updated_at: now } });
    await StockMovement.create({
      id: generateId(),
      product_id: item.product_id,
      product_name: item.product_name || item.name || '',
      type: 'sale',
      reason: 'sale',
      change: -item.quantity,
      quantity: -item.quantity,
      reference: invoice_no,
      user_id: req.user?.id || '',
      user_name: req.user?.name || '',
      created_by_id: req.user?.id,
      created_at: now,
    });
  }

  if (orderData.customer_id) {
    await Customer.findOneAndUpdate(
      { ...scopeFilter(req), id: orderData.customer_id },
      { $inc: { total_spent: grand_total, receivable: orderData.due } }
    );
  } else if (orderData.due > 0 && orderData.customer_name) {
    const custPhone = (req.body as any).customer_phone || '-';
    const existing = await Customer.findOne({ ...scopeFilter(req), name: orderData.customer_name }).lean();
    if (existing) {
      await Customer.findOneAndUpdate(
        { ...scopeFilter(req), name: orderData.customer_name },
        { $inc: { total_spent: grand_total, receivable: orderData.due } }
      );
    } else {
      await Customer.create({
        id: generateId(),
        name: orderData.customer_name,
        phone: custPhone,
        total_spent: grand_total,
        receivable: orderData.due,
        created_by: req.user?.id,
        created_at: now,
        updated_at: now,
      });
    }
  }
  const { _id, __v, ...data } = order.toJSON();
  res.status(201).json(data);
});

router.post('/backfill-line-total', verifyJWT, requireRoles('admin', 'super_admin'), async (_req: Request, res: Response) => {
  try {
    const orders = await Order.find({ 'items.line_total': { $in: [0, null, undefined] } }).lean();
    let count = 0;
    for (const order of orders) {
      const updatedItems = (order as any).items.map((item: any) => ({
        ...item,
        line_total: item.line_total || item.total || 0,
      }));
      await Order.updateOne({ _id: order._id }, { $set: { items: updatedItems } });
      count++;
    }
    res.json({ ok: true, backfilled_orders: count });
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});

export default router;
