import { Router, Request, Response } from 'express';
import { Order } from '../models/Order';
import { verifyJWT, requireRoles } from '../middleware/auth';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

router.get('/sales', async (req: Request, res: Response) => {
  const { date_from, date_to, start_date, end_date } = req.query;
  const filter: any = {};
  const from = date_from || start_date;
  const to = date_to || end_date;
  if (from) filter.created_at = { $gte: from };
  if (to) filter.created_at = { ...filter.created_at, $lte: to };

  const orders = await Order.find(filter).sort({ created_at: -1 }).lean();

  const totalRevenue = orders.reduce((s, o) => s + (Number(o.grand_total) || 0), 0);
  const totalTax = orders.reduce((s, o) => s + (Number(o.tax_total) || 0), 0);
  const byPaymentMode: Record<string, { count: number; total: number }> = {};
  const byCashier: Record<string, { count: number; total: number }> = {};
  const topItems: Record<string, { qty: number; total: number }> = {};

  for (const o of orders) {
    const mode = o.payment_mode || o.payment_method || 'cash';
    if (!byPaymentMode[mode]) byPaymentMode[mode] = { count: 0, total: 0 };
    byPaymentMode[mode].count += 1;
    byPaymentMode[mode].total += o.grand_total;

    const cashier = o.cashier_name || o.created_by_id || 'unknown';
    if (!byCashier[cashier]) byCashier[cashier] = { count: 0, total: 0 };
    byCashier[cashier].count += 1;
    byCashier[cashier].total += o.grand_total;

    if (o.items) {
      for (const item of o.items) {
        const pname = item.product_name || item.name || 'unknown';
        if (!topItems[pname]) topItems[pname] = { qty: 0, total: 0 };
        topItems[pname].qty += item.quantity || 0;
        topItems[pname].total += item.total || item.line_total || 0;
      }
    }
  }

  const topItemsSorted = Object.entries(topItems)
    .map(([name, v]) => ({ name, total_qty: v.qty, total_revenue: v.total }))
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 10);

  res.json({
    total_orders: orders.length,
    total_revenue: totalRevenue,
    total_paid: orders.reduce((s, o) => s + (Number(o.paid) || 0), 0),
    total_due: orders.reduce((s, o) => s + (Number(o.due) || 0), 0),
    total_tax: totalTax,
    by_payment_mode: Object.entries(byPaymentMode).map(([mode, v]) => ({ mode, total: v.total })),
    by_cashier: Object.entries(byCashier).map(([cashier, v]) => ({ cashier, total: v.total })),
    top_items: topItemsSorted.map((t) => ({ name: t.name, quantity: t.total_qty })),
    orders: orders.map((o: any) => {
      const { _id, __v, ...rest } = o;
      return rest;
    }),
  });
});

export default router;
