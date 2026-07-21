import { Router, Request, Response } from 'express';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { scopeFilter } from '../middleware/scope';
import { Order } from '../models/Order';
import { StockBatch } from '../models/StockBatch';
import { StockMovement } from '../models/StockMovement';
import { LedgerEntry } from '../models/LedgerEntry';
import { Attendance } from '../models/Attendance';
import { Product } from '../models/Product';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { Payroll } from '../models/Payroll';
import { InstallmentPlan } from '../models/InstallmentPlan';
import { Servicing } from '../models/Servicing';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

function dateFilter(start_date?: string, end_date?: string): Record<string, any> {
  const filter: Record<string, any> = {};
  if (start_date) filter.$gte = start_date;
  if (end_date) filter.$lte = end_date;
  return filter;
}

/**
 * @openapi
 * /advanced-reports/z-report:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: Daily Z report with totals, payment methods, and cashier summary
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         description: Date (YYYY-MM-DD, defaults to today)
 *     responses: { 200: { description: Z report data } }
 */
router.get('/z-report', async (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const start = `${date}T00:00:00.000Z`;
    const end = `${date}T23:59:59.999Z`;

    const sf = scopeFilter(req);
    const orders = await Order.find({
      ...sf,
      created_at: { $gte: start, $lte: end },
      status: { $ne: 'cancelled' },
    }).lean();

    const total_sales = orders.reduce((s, o) => s + (o.grand_total || 0), 0);
    const order_count = orders.length;
    const avg_order = order_count > 0 ? total_sales / order_count : 0;

    const payment_methods: Record<string, number> = {};
    const cashier_summary: Record<string, { count: number; total: number }> = {};
    for (const o of orders) {
      const pm = o.payment_method || o.payment_mode || 'unknown';
      payment_methods[pm] = (payment_methods[pm] || 0) + (o.grand_total || 0);
      const cn = o.cashier_name || 'unknown';
      if (!cashier_summary[cn]) cashier_summary[cn] = { count: 0, total: 0 };
      cashier_summary[cn].count++;
      cashier_summary[cn].total += o.grand_total || 0;
    }

    res.json({
      date,
      total_sales,
      order_count,
      avg_order,
      payment_methods,
      cashier_summary,
      orders,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /advanced-reports/daily-summary:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: Daily summary with hourly breakdown
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string }
 *     responses: { 200: { description: Daily summary } }
 */
router.get('/daily-summary', async (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const start = `${date}T00:00:00.000Z`;
    const end = `${date}T23:59:59.999Z`;

    const sf = scopeFilter(req);
    const orders = await Order.find({
      ...sf,
      created_at: { $gte: start, $lte: end },
      status: { $ne: 'cancelled' },
    }).lean();

    const hourly: Record<string, { count: number; total: number }> = {};
    for (const o of orders) {
      const hour = o.created_at ? o.created_at.slice(11, 13) + ':00' : 'unknown';
      if (!hourly[hour]) hourly[hour] = { count: 0, total: 0 };
      hourly[hour].count++;
      hourly[hour].total += o.grand_total || 0;
    }

    const total_sales = orders.reduce((s, o) => s + (o.grand_total || 0), 0);
    const order_count = orders.length;

    res.json({
      date,
      total_sales,
      order_count,
      avg_order: order_count > 0 ? total_sales / order_count : 0,
      hourly_breakdown: Object.entries(hourly)
        .map(([hour, data]) => ({ hour, ...data }))
        .sort((a, b) => a.hour.localeCompare(b.hour)),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /advanced-reports/due-sales:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: Orders with outstanding due amounts
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema: { type: string }
 *       - in: query
 *         name: end_date
 *         schema: { type: string }
 *     responses: { 200: { description: Due sales orders } }
 */
router.get('/due-sales', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    const filter: any = { due: { $gt: 0 } };
    if (start_date || end_date) filter.created_at = dateFilter(start_date as string, end_date as string);
    const sf = scopeFilter(req);
    const orders = await Order.find({ ...sf, ...filter }).sort({ created_at: -1 }).lean();
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /advanced-reports/final-due-sales:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: Customers with aggregate final due amounts
 *     responses: { 200: { description: Customer due summary } }
 */
router.get('/final-due-sales', async (req: Request, res: Response) => {
  try {
    const sf = scopeFilter(req);
    const result = await Order.aggregate([
      { $match: { ...sf, due: { $gt: 0 } } },
      {
        $group: {
          _id: '$customer_name',
          customer_id: { $first: '$customer_id' },
          total_due: { $sum: '$due' },
          order_count: { $sum: 1 },
          last_order: { $max: '$created_at' },
        },
      },
      { $sort: { total_due: -1 } },
      {
        $project: {
          _id: 0,
          customer_name: '$_id',
          customer_id: 1,
          total_due: 1,
          order_count: 1,
          last_order: 1,
        },
      },
    ]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /advanced-reports/service-sales:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: Servicing records with optional date/status filter
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema: { type: string }
 *       - in: query
 *         name: end_date
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses: { 200: { description: Service records } }
 */
router.get('/service-sales', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, status } = req.query;
    const filter: any = {};
    if (start_date || end_date) filter.created_at = dateFilter(start_date as string, end_date as string);
    if (status) filter.status = status;
    const sf = scopeFilter(req);
    const records = await Servicing.find({ ...sf, ...filter }).sort({ created_at: -1 }).lean();
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /advanced-reports/combo-service:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: Servicing grouped by status
 *     responses: { 200: { description: Service group summary } }
 */
router.get('/combo-service', async (req: Request, res: Response) => {
  try {
    const sf = scopeFilter(req);
    const result = await Servicing.aggregate([
      { $match: sf },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total_cost: { $sum: '$cost' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /advanced-reports/expiry-stock:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: Stock batches expiring within X days
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30 }
 *     responses: { 200: { description: Expiring stock batches } }
 */
router.get('/expiry-stock', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const future = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const sf = scopeFilter(req);
    const batches = await StockBatch.aggregate([
      {
        $match: {
          ...sf,
          expiry_date: { $ne: '', $exists: true, $lte: future },
          quantity: { $gt: 0 },
        },
      },
      { $sort: { expiry_date: 1 } },
      {
        $lookup: {
          from: 'products',
          localField: 'product_id',
          foreignField: 'id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          product_id: 1,
          product_name: 1,
          batch_no: 1,
          expiry_date: 1,
          mfg_date: 1,
          quantity: 1,
          cost_price: 1,
          sku: '$product.sku',
          stock: '$product.stock',
        },
      },
    ]);
    res.json(batches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /advanced-reports/employee-sales:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: Sales grouped by cashier/employee
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema: { type: string }
 *       - in: query
 *         name: end_date
 *         schema: { type: string }
 *     responses: { 200: { description: Employee sales summary } }
 */
router.get('/employee-sales', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    const match: any = { status: { $ne: 'cancelled' } };
    if (start_date || end_date) match.created_at = dateFilter(start_date as string, end_date as string);

    const result = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: ['$cashier_name', 'Unknown'] },
          cashier_id: { $first: '$cashier_id' },
          total_sales: { $sum: '$grand_total' },
          order_count: { $sum: 1 },
          avg_sale: { $avg: '$grand_total' },
        },
      },
      { $sort: { total_sales: -1 } },
      {
        $project: {
          _id: 0,
          cashier_name: '$_id',
          cashier_id: 1,
          total_sales: 1,
          order_count: 1,
          avg_sale: { $round: ['$avg_sale', 2] },
        },
      },
    ]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /advanced-reports/customer-due-receive:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: Customer due payments received (from ledger)
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema: { type: string }
 *       - in: query
 *         name: end_date
 *         schema: { type: string }
 *     responses: { 200: { description: Customer due payments } }
 */
router.get('/customer-due-receive', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    const match: any = { party_type: 'customer', credit: { $gt: 0 } };
    if (start_date || end_date) match.created_at = dateFilter(start_date as string, end_date as string);
    const sf = scopeFilter(req);
    Object.assign(match, sf);

    const result = await LedgerEntry.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$party_id',
          total_received: { $sum: '$credit' },
          transaction_count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: 'id',
          as: 'customer',
        },
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          customer_id: '$_id',
          customer_name: { $ifNull: ['$customer.name', 'Unknown'] },
          total_received: 1,
          transaction_count: 1,
        },
      },
      { $sort: { total_received: -1 } },
    ]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /advanced-reports/attendance-report:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: Attendance report with user summary
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema: { type: string }
 *       - in: query
 *         name: end_date
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [present, absent, half-day] }
 *     responses: { 200: { description: Attendance report } }
 */
router.get('/attendance-report', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, status } = req.query;
    const match: any = {};
    if (start_date || end_date) match.date = dateFilter(start_date as string, end_date as string);

    const sf = scopeFilter(req);
    const allRecords = await Attendance.find({ ...sf, ...match }).sort({ date: -1 }).lean();
    const enriched = allRecords.map(r => {
      let computedStatus = 'absent';
      if (r.check_in && r.check_out) computedStatus = 'present';
      else if (r.check_in && !r.check_out) computedStatus = 'half-day';
      return { ...r, computed_status: computedStatus };
    });

    const filtered = status
      ? enriched.filter(r => r.computed_status === status)
      : enriched;

    const summary: Record<string, { present: number; absent: number; half_day: number }> = {};
    for (const r of enriched) {
      const key = r.user_name || r.user_id;
      if (!summary[key]) summary[key] = { present: 0, absent: 0, half_day: 0 };
      if (r.computed_status === 'present') summary[key].present++;
      else if (r.computed_status === 'half-day') summary[key].half_day++;
      else summary[key].absent++;
    }

    res.json({
      records: filtered,
      summary: Object.entries(summary).map(([user_name, data]) => ({ user_name, ...data })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /advanced-reports/product-profit:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: Profit per product (revenue - cost)
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema: { type: string }
 *       - in: query
 *         name: end_date
 *         schema: { type: string }
 *     responses: { 200: { description: Product profit report } }
 */
router.get('/product-profit', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    const match: any = {};
    if (start_date || end_date) match.created_at = dateFilter(start_date as string, end_date as string);
    const sf = scopeFilter(req);
    Object.assign(match, sf);

    const result = await PurchaseOrder.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: { product_id: '$items.product_id', product_name: '$items.product_name' },
          quantity_sold: { $sum: '$items.quantity' },
          total_revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id.product_id',
          foreignField: 'id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          product_id: '$_id.product_id',
          product_name: '$_id.product_name',
          quantity_sold: { $round: ['$quantity_sold', 3] },
          total_revenue: { $round: ['$total_revenue', 2] },
          cost_price: { $ifNull: ['$product.cost', 0] },
          total_cost: {
            $round: [{ $multiply: ['$quantity_sold', { $ifNull: ['$product.cost', 0] }] }, 2],
          },
          profit: {
            $round: [
              {
                $subtract: [
                  '$total_revenue',
                  { $multiply: ['$quantity_sold', { $ifNull: ['$product.cost', 0] }] },
                ],
              },
              2,
            ],
          },
          margin_percent: {
            $round: [
              {
                $cond: [
                  { $gt: ['$total_revenue', 0] },
                  {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $subtract: [
                              '$total_revenue',
                              { $multiply: ['$quantity_sold', { $ifNull: ['$product.cost', 0] }] },
                            ],
                          },
                          '$total_revenue',
                        ],
                      },
                      100,
                    ],
                  },
                  0,
                ],
              },
              2,
            ],
          },
        },
      },
      { $sort: { profit: -1 } },
    ]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /advanced-reports/product-sales:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: Quantity sold per product
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema: { type: string }
 *       - in: query
 *         name: end_date
 *         schema: { type: string }
 *     responses: { 200: { description: Product sales quantities } }
 */
router.get('/product-sales', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    const match: any = { status: { $ne: 'cancelled' } };
    if (start_date || end_date) match.created_at = dateFilter(start_date as string, end_date as string);
    const sf = scopeFilter(req);
    Object.assign(match, sf);

    const result = await Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: { product_id: '$items.product_id', product_name: '$items.product_name' },
          quantity_sold: { $sum: '$items.quantity' },
          total_revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          order_ids: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          _id: 0,
          product_id: '$_id.product_id',
          product_name: '$_id.product_name',
          quantity_sold: { $round: ['$quantity_sold', 3] },
          total_revenue: { $round: ['$total_revenue', 2] },
          order_count: { $size: '$order_ids' },
        },
      },
      { $sort: { quantity_sold: -1 } },
    ]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /advanced-reports/tax-report:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: Tax collected breakdown
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema: { type: string }
 *       - in: query
 *         name: end_date
 *         schema: { type: string }
 *     responses: { 200: { description: Tax report } }
 */
router.get('/tax-report', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    const match: any = { status: { $ne: 'cancelled' } };
    if (start_date || end_date) match.created_at = dateFilter(start_date as string, end_date as string);
    const sf = scopeFilter(req);
    Object.assign(match, sf);

    const summary = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total_tax_collected: { $sum: '$tax_total' },
          total_sales: { $sum: '$grand_total' },
          order_count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          total_tax_collected: { $round: ['$total_tax_collected', 2] },
          total_sales: { $round: ['$total_sales', 2] },
          order_count: 1,
          effective_tax_rate: {
            $round: [
              {
                $cond: [
                  { $gt: ['$total_sales', 0] },
                  {
                    $multiply: [
                      {
                        $divide: [
                          '$total_tax_collected',
                          { $subtract: ['$total_sales', '$total_tax_collected'] },
                        ],
                      },
                      100,
                    ],
                  },
                  0,
                ],
              },
              2,
            ],
          },
        },
      },
    ]);

    const detail = await Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.tax_rate',
          taxable_amount: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          tax_amount: { $sum: '$items.tax' },
          item_count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          tax_rate: '$_id',
          taxable_amount: { $round: ['$taxable_amount', 2] },
          tax_amount: { $round: ['$tax_amount', 2] },
          item_count: 1,
        },
      },
    ]);

    res.json({
      summary: summary[0] || { total_tax_collected: 0, total_sales: 0, order_count: 0, effective_tax_rate: 0 },
      by_tax_rate: detail,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /advanced-reports/detailed-sales:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: All sales with full detail
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema: { type: string }
 *       - in: query
 *         name: end_date
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses: { 200: { description: Detailed sales } }
 */
router.get('/detailed-sales', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, limit } = req.query;
    const match: any = {};
    if (start_date || end_date) match.created_at = dateFilter(start_date as string, end_date as string);

    const sf = scopeFilter(req);
    const query = Order.find({ ...sf, ...match }).sort({ created_at: -1 });
    if (limit) query.limit(parseInt(limit as string));
    const orders = await query.lean();
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /advanced-reports/purchase-by-date:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: Purchases grouped by date
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema: { type: string }
 *       - in: query
 *         name: end_date
 *         schema: { type: string }
 *     responses: { 200: { description: Purchase by date } }
 */
router.get('/purchase-by-date', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    const match: any = {};
    if (start_date || end_date) match.created_at = dateFilter(start_date as string, end_date as string);
    const sf = scopeFilter(req);
    Object.assign(match, sf);

    const result = await PurchaseOrder.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $substr: ['$created_at', 0, 10] },
          total_purchases: { $sum: '$total' },
          order_count: { $sum: 1 },
          avg_purchase: { $avg: '$total' },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          total_purchases: { $round: ['$total_purchases', 2] },
          order_count: 1,
          avg_purchase: { $round: ['$avg_purchase', 2] },
        },
      },
    ]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /advanced-reports/product-purchase:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: Purchase quantity by product
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema: { type: string }
 *       - in: query
 *         name: end_date
 *         schema: { type: string }
 *     responses: { 200: { description: Product purchase quantities } }
 */
router.get('/product-purchase', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    const match: any = { status: { $ne: 'cancelled' } };
    if (start_date || end_date) match.created_at = dateFilter(start_date as string, end_date as string);
    const sf = scopeFilter(req);
    Object.assign(match, sf);

    const result = await Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: { product_id: '$items.product_id', product_name: '$items.name' },
          quantity_purchased: { $sum: '$items.quantity' },
          total_cost: { $sum: { $multiply: ['$items.quantity', '$items.cost'] } },
          purchase_count: { $sum: 1 },
        },
      },
      { $sort: { quantity_purchased: -1 } },
      {
        $project: {
          _id: 0,
          product_id: '$_id.product_id',
          product_name: '$_id.product_name',
          quantity_purchased: { $round: ['$quantity_purchased', 3] },
          total_cost: { $round: ['$total_cost', 2] },
          purchase_count: 1,
        },
      },
    ]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /advanced-reports/salary-report:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: Salary/payroll payments report
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: string }
 *         description: Month name or number
 *       - in: query
 *         name: year
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [paid, unpaid] }
 *     responses: { 200: { description: Salary report } }
 */
router.get('/salary-report', async (req: Request, res: Response) => {
  try {
    const { month, year, status } = req.query;
    const match: any = {};
    if (month) match.month = month;
    if (year) match.month = year;
    if (status !== undefined && status !== null && status !== '') {
      match.paid = status === 'paid';
    }

    const sf = scopeFilter(req);
    const records = await Payroll.find({ ...sf, ...match }).sort({ created_at: -1 }).lean();
    const total_base = records.reduce((s, r) => s + (r.base || 0), 0);
    const total_net = records.reduce((s, r) => s + (r.net || 0), 0);
    const total_deduction = records.reduce((s, r) => s + (r.deduction || 0), 0);
    const total_bonus = records.reduce((s, r) => s + (r.bonus || 0), 0);

    res.json({
      records,
      summary: {
        total_base,
        total_bonus,
        total_deduction,
        total_net,
        count: records.length,
        paid_count: records.filter(r => r.paid).length,
        unpaid_count: records.filter(r => !r.paid).length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /advanced-reports/installment-report:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: Installment summary grouped by status
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses: { 200: { description: Installment report } }
 */
router.get('/installment-report', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const match: any = {};
    if (status) match.status = status;
    const sf = scopeFilter(req);
    Object.assign(match, sf);

    const result = await InstallmentPlan.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total_amount: { $sum: '$total_amount' },
          total_down_payment: { $sum: '$down_payment' },
          total_installments: { $sum: '$total_installments' },
          total_installments_paid: { $sum: '$installments_paid' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /advanced-reports/installment-due:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: Overdue and pending installments
 *     responses: { 200: { description: Due installments } }
 */
router.get('/installment-due', async (req: Request, res: Response) => {
  try {
    const now = new Date().toISOString();

    const sf = scopeFilter(req);
    const overdue = await InstallmentPlan.aggregate([
      {
        $match: {
          ...sf,
          status: { $in: ['active', 'overdue'] },
          due_date: { $ne: '', $exists: true, $lt: now },
        },
      },
      { $sort: { due_date: 1 } },
      {
        $project: {
          _id: 0,
          id: 1,
          customer_id: 1,
          customer_name: 1,
          total_amount: 1,
          down_payment: 1,
          installment_amount: 1,
          total_installments: 1,
          installments_paid: 1,
          status: 1,
          due_date: 1,
          remaining_amount: {
            $subtract: [
              '$total_amount',
              {
                $add: [
                  '$down_payment',
                  { $multiply: ['$installment_amount', '$installments_paid'] },
                ],
              },
            ],
          },
          remaining_installments: { $subtract: ['$total_installments', '$installments_paid'] },
        },
      },
    ]);

    const pending = await InstallmentPlan.aggregate([
      {
        $match: {
          ...sf,
          status: { $in: ['active', 'overdue'] },
          $expr: { $lt: ['$installments_paid', '$total_installments'] },
        },
      },
      { $sort: { created_at: -1 } },
      {
        $project: {
          _id: 0,
          id: 1,
          customer_id: 1,
          customer_name: 1,
          total_amount: 1,
          down_payment: 1,
          installment_amount: 1,
          total_installments: 1,
          installments_paid: 1,
          status: 1,
          due_date: 1,
          remaining_installments: { $subtract: ['$total_installments', '$installments_paid'] },
        },
      },
    ]);

    const total_pending = pending.reduce((s, r) => {
      const remaining = (r.total_installments || 0) - (r.installments_paid || 0);
      return s + remaining * (r.installment_amount || 0);
    }, 0);

    res.json({
      overdue,
      pending,
      total_overdue: overdue.reduce((s, r) => s + (r.remaining_amount || 0), 0),
      total_pending,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /advanced-reports/item-tracing:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: Stock movement tracing by product
 *     parameters:
 *       - in: query
 *         name: product_id
 *         required: false
 *         schema: { type: string }
 *       - in: query
 *         name: start_date
 *         schema: { type: string }
 *       - in: query
 *         name: end_date
 *         schema: { type: string }
 *     responses: { 200: { description: Item trace } }
 */
router.get('/item-tracing', async (req: Request, res: Response) => {
  try {
    const { product_id, start_date, end_date } = req.query;
    const match: any = {};
    if (product_id) match.product_id = product_id;
    if (start_date || end_date) match.created_at = dateFilter(start_date as string, end_date as string);

    const sfStock = scopeFilter(req);
    const movements = await StockMovement.find({ ...sfStock, ...match }).sort({ created_at: -1 }).lean();

    const orderMatch: any = { status: { $ne: 'cancelled' } };
    if (product_id) orderMatch['items.product_id'] = product_id;
    if (start_date || end_date) orderMatch.created_at = dateFilter(start_date as string, end_date as string);
    Object.assign(orderMatch, scopeFilter(req));

    const orderItems = await Order.aggregate([
      { $match: orderMatch },
      { $unwind: '$items' },
      ...(product_id ? [{ $match: { 'items.product_id': product_id } }] : []),
      {
        $project: {
          _id: 0,
          product_id: '$items.product_id',
          product_name: '$items.product_name',
          type: { $literal: 'sold' },
          quantity: '$items.quantity',
          reference: '$invoice_no',
          created_at: 1,
        },
      },
      { $sort: { created_at: -1 } },
    ]);

    const combined = [
      ...movements.map(m => ({
        product_id: m.product_id,
        product_name: m.product_name,
        type: m.type === 'in' ? 'received' : m.type === 'out' ? 'issued' : m.type,
        quantity: m.change || m.quantity || 0,
        reference: m.reference || m.ref || '',
        created_at: m.created_at,
        source: 'stock_movement',
      })),
      ...orderItems,
    ].sort((a, b) => ((b.created_at || '') > (a.created_at || '') ? 1 : -1));

    res.json(combined);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /advanced-reports/price-history:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: Price history from order items
 *     parameters:
 *       - in: query
 *         name: product_id
 *         required: true
 *         schema: { type: string }
 *     responses: { 200: { description: Price history } }
 */
router.get('/price-history', async (req: Request, res: Response) => {
  try {
    const { product_id } = req.query;
    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required' });
    }

    const sf = scopeFilter(req);
    const result = await Order.aggregate([
      { $match: { ...sf, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $match: { 'items.product_id': product_id } },
      {
        $group: {
          _id: {
            price: '$items.price',
            date: { $substr: ['$created_at', 0, 10] },
          },
          product_name: { $first: '$items.product_name' },
          date: { $first: { $substr: ['$created_at', 0, 10] } },
          price: { $first: '$items.price' },
          invoice_no: { $first: '$invoice_no' },
          quantity: { $sum: '$items.quantity' },
        },
      },
      { $sort: { date: -1, price: -1 } },
      {
        $project: {
          _id: 0,
          product_id: product_id,
          product_name: 1,
          price: { $round: ['$price', 2] },
          date: 1,
          invoice_no: 1,
          quantity: { $round: ['$quantity', 3] },
        },
      },
    ]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /advanced-reports/stock-report:
 *   get:
 *     tags: [Advanced Reports]
 *     summary: Current stock levels for all products
 *     responses: { 200: { description: Stock report } }
 */
router.get('/stock-report', async (req: Request, res: Response) => {
  try {
    const products = await Product.find(scopeFilter(req)).sort({ name: 1 }).lean();
    const total_stock_value = products.reduce((s, p) => s + ((p.stock || 0) * (p.cost || 0)), 0);
    const total_stock_retail = products.reduce((s, p) => s + ((p.stock || 0) * (p.price || 0)), 0);

    res.json({
      total_products: products.length,
      total_stock_quantity: products.reduce((s, p) => s + (p.stock || 0), 0),
      total_stock_value,
      total_stock_retail,
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        stock: p.stock,
        cost: p.cost,
        price: p.price,
        stock_value: (p.stock || 0) * (p.cost || 0),
        retail_value: (p.stock || 0) * (p.price || 0),
        low_stock: p.stock <= (p.low_stock_threshold || 5),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
