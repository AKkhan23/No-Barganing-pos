import { Router, Request, Response } from 'express';
import { Order } from '../models/Order';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { DamageStock } from '../models/DamageStock';
import { Expense } from '../models/Expense';
import { Income } from '../models/Income';
import { StockMovement } from '../models/StockMovement';
import { Customer } from '../models/Customer';
import { LedgerEntry } from '../models/LedgerEntry';
import { verifyJWT, requireRoles } from '../middleware/auth';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

router.get('/comparison', async (req: Request, res: Response) => {
  try {
    const dateFrom = req.query.date_from as string;
    const dateTo = req.query.date_to as string;
    const dateFilter: any = {};
    if (dateFrom || dateTo) {
      dateFilter.created_at = {};
      if (dateFrom) dateFilter.created_at.$gte = dateFrom;
      if (dateTo) dateFilter.created_at.$lte = dateTo;
    }
    const [purchases, sales, damages, expenses, incomes, stockMovements] = await Promise.all([
      PurchaseOrder.aggregate([{ $match: dateFilter }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Order.aggregate([{ $match: dateFilter }, { $group: { _id: null, total: { $sum: '$grand_total' } } }]),
      DamageStock.aggregate([{ $match: dateFilter }, { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', 1] } } } }]),
      Expense.aggregate([{ $match: dateFilter }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Income.aggregate([{ $match: dateFilter }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      StockMovement.aggregate([{ $match: dateFilter }, { $group: { _id: null, total: { $sum: '$change' } } }]),
    ]);
    res.json({
      total_purchases: purchases[0]?.total || 0,
      total_sales: sales[0]?.total || 0,
      total_damages: damages[0]?.total || 0,
      total_expenses: expenses[0]?.total || 0,
      total_income: incomes[0]?.total || 0,
      total_stock_movements: stockMovements[0]?.total || 0,
    });
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

/**
 * @openapi
 * /bi-dashboard/top-products:
 *   get:
 *     tags: [BI Dashboard]
 *     summary: Get top selling products by quantity
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of top products to return (default 10)
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
 *         description: Top products list
 */
router.get('/top-products', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string || '10', 10);
    const dateFrom = req.query.date_from as string;
    const dateTo = req.query.date_to as string;
    const match: any = {};
    if (dateFrom || dateTo) {
      match.created_at = {};
      if (dateFrom) match.created_at.$gte = dateFrom;
      if (dateTo) match.created_at.$lte = dateTo;
    }
    const topProducts = await Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $group: { _id: '$items.product_name', total_quantity: { $sum: '$items.quantity' }, total_revenue: { $sum: '$items.line_total' } } },
      { $sort: { total_quantity: -1 } },
      { $limit: limit },
    ]);
    res.json(topProducts.map((p: any) => ({ product_name: p._id, total_quantity: p.total_quantity, total_revenue: p.total_revenue })));
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

router.get('/top-customers', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string || '10', 10);
    const customers = await Customer.find().sort({ total_spent: -1 }).limit(limit).lean();
    res.json(customers.map((c: any) => ({ id: c.id, name: c.name, phone: c.phone, total_spent: c.total_spent, receivable: c.receivable })));
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

router.get('/profit-margin', async (req: Request, res: Response) => {
  try {
    const dateFrom = req.query.date_from as string;
    const dateTo = req.query.date_to as string;
    const dateFilter: any = {};
    if (dateFrom || dateTo) {
      dateFilter.created_at = {};
      if (dateFrom) dateFilter.created_at.$gte = dateFrom;
      if (dateTo) dateFilter.created_at.$lte = dateTo;
    }
    const [revenueAgg, cogsAgg, expensesAgg] = await Promise.all([
      Order.aggregate([{ $match: dateFilter }, { $group: { _id: null, total: { $sum: '$grand_total' } } }]),
      PurchaseOrder.aggregate([{ $match: dateFilter }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Expense.aggregate([{ $match: dateFilter }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);
    const revenue = revenueAgg[0]?.total || 0;
    const cogs = cogsAgg[0]?.total || 0;
    const expenses = expensesAgg[0]?.total || 0;
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses;
    const grossMargin = revenue > 0 ? ((grossProfit / revenue) * 100) : 0;
    const netMargin = revenue > 0 ? ((netProfit / revenue) * 100) : 0;
    res.json({ revenue, cogs, expenses, gross_profit: grossProfit, net_profit: netProfit, gross_margin_percent: Math.round(grossMargin * 100) / 100, net_margin_percent: Math.round(netMargin * 100) / 100 });
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

router.get('/cash-flow', async (req: Request, res: Response) => {
  try {
    const dateFrom = req.query.date_from as string;
    const dateTo = req.query.date_to as string;
    const dateFilter: any = {};
    if (dateFrom) dateFilter.$gte = dateFrom;
    if (dateTo) dateFilter.$lte = dateTo;
    const match: any = { account: { $in: ['cash', 'bank', 'upi'] } };
    if (Object.keys(dateFilter).length) match.date = dateFilter;
    const flow = await LedgerEntry.aggregate([
      { $match: match },
      { $group: { _id: { account: '$account', date: '$date' }, total_debit: { $sum: '$debit' }, total_credit: { $sum: '$credit' } } },
      { $sort: { '_id.date': 1 } },
    ]);
    res.json(flow.map((f: any) => ({ account: f._id.account, date: f._id.date, debit: f.total_debit, credit: f.total_credit, net: f.total_debit - f.total_credit })));
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

export default router;
