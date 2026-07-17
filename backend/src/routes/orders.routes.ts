import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { StockMovement } from '../models/StockMovement';
import { generateId, generateInvoiceNo } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

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
  const orders = await Order.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).select('-_id -__v').lean();
  res.json(orders);
});

router.get('/:id', async (req: Request, res: Response) => {
  const order = await Order.findOne({ id: req.params.id }).select('-_id -__v').lean();
  if (!order) { res.status(404).json({ detail: 'Order not found' }); return; }
  res.json(order);
});

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
    created_at: now,
  };
  for (const item of items) {
    const product = await Product.findOne({ id: item.product_id }).lean();
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
    await Product.findOneAndUpdate({ id: item.product_id }, { $inc: { stock: -item.quantity }, $set: { updated_at: now } });
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
      { id: orderData.customer_id },
      { $inc: { total_spent: grand_total, receivable: orderData.due } }
    );
  } else if (orderData.due > 0 && orderData.customer_name) {
    const custPhone = (req.body as any).customer_phone || '-';
    const existing = await Customer.findOne({ name: orderData.customer_name }).lean();
    if (existing) {
      await Customer.findOneAndUpdate(
        { name: orderData.customer_name },
        { $inc: { total_spent: grand_total, receivable: orderData.due } }
      );
    } else {
      await Customer.create({
        id: generateId(),
        name: orderData.customer_name,
        phone: custPhone,
        total_spent: grand_total,
        receivable: orderData.due,
        created_at: now,
        updated_at: now,
      });
    }
  }
  const { _id, __v, ...data } = order.toJSON();
  res.status(201).json(data);
});

export default router;
