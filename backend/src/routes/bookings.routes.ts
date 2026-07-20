import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Booking } from '../models/Booking';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { StockMovement } from '../models/StockMovement';
import { generateId, generateInvoiceNo } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT);

const CreateBookingSchema = z.object({
  customer_id: z.string().optional(),
  customer_name: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string(),
    name: z.string(),
    sku: z.string(),
    price: z.number(),
    quantity: z.number().positive(),
    tax_rate: z.number().default(0),
    line_total: z.number(),
  })),
  token_amount: z.number(),
  deposit: z.number(),
  note: z.string().optional(),
});

/**
 * @openapi
 * /bookings:
 *   post:
 *     tags: [Bookings]
 *     summary: Create a booking
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
 *               token_amount: { type: number }
 *               deposit: { type: number }
 *               note: { type: string }
 *     responses:
 *       201:
 *         description: Booking created
 */
router.post('/', validate(CreateBookingSchema), async (req: Request, res: Response) => {
  try {
    const now = new Date().toISOString();
    const booking = new Booking({ ...req.body, id: generateId(), status: 'open', created_by_id: req.user!.id, created_by_name: req.user!.name, created_at: now });
    await booking.save();
    res.status(201).json({ id: booking.id, customer_id: booking.customer_id, customer_name: booking.customer_name, items: booking.items, token_amount: booking.token_amount, deposit: booking.deposit, status: booking.status, note: booking.note, created_at: booking.created_at });
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

/**
 * @openapi
 * /bookings:
 *   get:
 *     tags: [Bookings]
 *     summary: List bookings
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Array of bookings
 */
router.get('/', async (req: Request, res: Response) => {
  const filter: any = {};
  if (req.query.status) filter.status = req.query.status;
  const bookings = await Booking.find(filter).sort({ created_at: -1 }).lean();
  res.json(bookings.map((b: any) => ({ id: b.id, customer_id: b.customer_id, customer_name: b.customer_name, items: b.items, token_amount: b.token_amount, deposit: b.deposit, status: b.status, note: b.note, created_by_id: b.created_by_id, created_by_name: b.created_by_name, created_at: b.created_at })));
});

/**
 * @openapi
 * /bookings/{id}:
 *   get:
 *     tags: [Bookings]
 *     summary: Get a booking by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Booking details
 *       404:
 *         description: Booking not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  const booking = await Booking.findOne({ id: req.params.id }).lean();
  if (!booking) { res.status(404).json({ detail: 'Booking not found' }); return; }
  res.json({ id: booking.id, customer_id: booking.customer_id, customer_name: booking.customer_name, items: booking.items, token_amount: booking.token_amount, deposit: booking.deposit, status: booking.status, note: booking.note, created_by_id: booking.created_by_id, created_by_name: booking.created_by_name, created_at: booking.created_at });
});

/**
 * @openapi
 * /bookings/{id}/convert:
 *   post:
 *     tags: [Bookings]
 *     summary: Convert a booking to an order
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Booking converted to order
 *       404:
 *         description: Booking not found
 *       400:
 *         description: Booking already converted or cancelled
 */
router.post('/:id/convert', async (req: Request, res: Response) => {
  try {
    const booking = await Booking.findOne({ id: req.params.id });
    if (!booking) { res.status(404).json({ detail: 'Booking not found' }); return; }
    if (booking.status !== 'open') { res.status(400).json({ detail: 'Booking is already converted or cancelled' }); return; }
    const now = new Date().toISOString();
    const invoiceNo = await generateInvoiceNo();
    const orderItems = booking.items.map((item: any) => ({
      product_id: item.product_id,
      product_name: item.name,
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      price: item.price,
      tax: 0,
      tax_rate: item.tax_rate || 0,
      total: item.line_total || (item.price * item.quantity),
      line_total: item.line_total || (item.price * item.quantity),
    }));
    const grandTotal = orderItems.reduce((s: number, i: any) => s + i.total, 0);
    const order = new Order({
      id: generateId(), invoice_no: invoiceNo, customer_id: booking.customer_id,
      customer_name: booking.customer_name || 'Walk-in', items: orderItems,
      subtotal: grandTotal, tax_total: 0, discount: 0, discount_percent: 0, discount_amount: 0,
      grand_total: grandTotal, total: grandTotal, paid: 0, due: grandTotal,
      amount_paid: 0, change_due: 0, payment_mode: 'cash', payment_method: 'cash',
      cashier_id: req.user!.id, cashier_name: req.user!.name, status: 'completed',
      created_by_id: req.user!.id, created_at: now,
    });
    await order.save();
    booking.status = 'converted';
    await booking.save();
    for (const item of booking.items) {
      await Product.updateOne({ id: item.product_id }, { $inc: { stock: -item.quantity } });
      await StockMovement.create({
        id: generateId(), product_id: item.product_id, product_name: item.name,
        type: 'sale', quantity: -item.quantity, change: -item.quantity,
        reference: invoiceNo, note: `Converted from booking ${booking.id}`,
        user_id: req.user!.id, user_name: req.user!.name, created_by_id: req.user!.id, created_at: now,
      });
    }
    res.json({ booking: { id: booking.id, status: booking.status }, order: { id: order.id, invoice_no: order.invoice_no, grand_total: order.grand_total } });
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

export default router;
