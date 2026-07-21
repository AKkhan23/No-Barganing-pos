import { Router, Request, Response } from 'express';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { scopeFilter } from '../middleware/scope';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

/**
 * @openapi
 * /dashboard/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get dashboard statistics (totals, low stock, sales chart, top products)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *         description: Start date (ISO)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *         description: End date (ISO)
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const dateFrom = (req.query.date_from as string) || sevenDaysAgo;
  const dateTo = (req.query.date_to as string);
  const dateFilter: any = { created_at: { $gte: dateFrom } };
  if (dateTo) dateFilter.created_at.$lte = dateTo;
  const isDefaultRange = !req.query.date_from && !req.query.date_to;

  const rangeStart = new Date(dateFrom);
  const rangeEnd = dateTo ? new Date(dateTo) : new Date(now);
  const diffDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const numDays = Math.min(Math.max(diffDays, 1), 90);

  const sf = scopeFilter(req);
  const [totalProducts, dbCustomers, orderNames, revenueData, lowStockProducts, rangeOrders, topProductsAgg] = await Promise.all([
    Product.countDocuments(sf),
    Customer.countDocuments(sf),
    Order.distinct('customer_name', sf),
    Order.aggregate([
      { $match: sf },
      { $group: { _id: null, total: { $sum: '$grand_total' }, count: { $sum: 1 } } },
    ]),
    (Product.find({ $and: [sf, { $expr: { $lte: ['$stock', '$low_stock_threshold'] } }] } as any).lean() as Promise<any[]>),
    Order.find({ ...sf, ...dateFilter }).sort({ created_at: 1 }).lean(),
    Order.aggregate([
      { $match: { ...sf, ...dateFilter } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product_name', total_qty: { $sum: '$items.quantity' }, total_rev: { $sum: '$items.total' } } },
      { $sort: { total_rev: -1 } },
      { $limit: 5 },
    ]),
  ]);
  const totalCustomers = orderNames.filter((n: string) => n).length;

  const salesByDay: Record<string, number> = {};
  for (let i = 0; i < numDays; i++) {
    const d = new Date(rangeStart.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    salesByDay[key] = 0;
  }
  for (const o of rangeOrders) {
    const day = o.created_at.slice(0, 10);
    if (salesByDay[day] !== undefined) salesByDay[day] += Number(o.grand_total) || 0;
  }

  const rangeRevenue = rangeOrders.reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0);
  const totalRevenue = revenueData[0]?.total || 0;
  const totalOrders = revenueData[0]?.count || 0;

  res.json({
    revenue_today: rangeOrders.filter((o: any) => o.created_at >= todayStart).reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0),
    orders_today: rangeOrders.filter((o: any) => o.created_at >= todayStart).length,
    total_products: totalProducts,
    total_customers: totalCustomers,
    total_revenue: isDefaultRange ? totalRevenue : rangeRevenue,
    total_orders: isDefaultRange ? totalOrders : rangeOrders.length,
    low_stock_count: lowStockProducts.length,
    low_stock_products: lowStockProducts.map((p: any) => ({ id: p.id, name: p.name, sku: p.sku, stock: p.stock, low_stock_threshold: p.low_stock_threshold, sell_by: p.sell_by })),
    sales_last_7_days: salesByDay,
    top_products: topProductsAgg.map((p: any) => ({ name: p._id, total_qty: p.total_qty, total_revenue: p.total_rev })),
  });
});

export default router;
