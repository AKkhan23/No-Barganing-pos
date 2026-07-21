import { Router, Request, Response } from 'express';
import { LedgerEntry } from '../models/LedgerEntry';
import { Account } from '../models/Account';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { Expense } from '../models/Expense';
import { Income } from '../models/Income';
import { SaleReturn } from '../models/SaleReturn';
import { Order } from '../models/Order';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { scopeFilter } from '../middleware/scope';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

/**
 * @openapi
 * /accounting/trial-balance:
 *   get:
 *     tags: [Accounting Reports]
 *     summary: Get trial balance
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Trial balance with debit/credit totals
 */
router.get('/trial-balance', async (_req: Request, res: Response) => {
  try {
    const sf = scopeFilter(_req);
    const entries = await LedgerEntry.aggregate([
      { $match: sf },
      { $group: { _id: '$account', total_debit: { $sum: '$debit' }, total_credit: { $sum: '$credit' } } },
    ]);
    const result = await Promise.all(entries.map(async (e: any) => {
      const acct = await Account.findOne({ ...sf, id: e._id }).lean();
      return { account: e._id, account_name: acct?.name || '', total_debit: e.total_debit, total_credit: e.total_credit };
    }));
    const totalDebit = result.reduce((s: number, r: any) => s + r.total_debit, 0);
    const totalCredit = result.reduce((s: number, r: any) => s + r.total_credit, 0);
    res.json({ entries: result, total_debit: totalDebit, total_credit: totalCredit });
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

/**
 * @openapi
 * /accounting/balance-sheet:
 *   get:
 *     tags: [Accounting Reports]
 *     summary: Get balance sheet
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Balance sheet with assets, liabilities, equity
 */
router.get('/balance-sheet', async (_req: Request, res: Response) => {
  try {
    const sf = scopeFilter(_req);
    const entries = await LedgerEntry.aggregate([
      { $match: sf },
      { $group: { _id: '$account', total_debit: { $sum: '$debit' }, total_credit: { $sum: '$credit' } } },
    ]);
    const assets: any[] = [];
    const liabilities: any[] = [];
    for (const e of entries) {
      const acct = await Account.findOne({ ...sf, id: e._id }).lean();
      const balance = e.total_debit - e.total_credit;
      const item = { account: e._id, account_name: acct?.name || '', balance: Math.abs(balance) };
      if (balance >= 0) assets.push(item);
      else liabilities.push(item);
    }
    const totalRevenue = await Order.aggregate([{ $match: sf }, { $group: { _id: null, total: { $sum: '$grand_total' } } }]);
    const totalExpenses = await Expense.aggregate([{ $match: sf }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const equity = (totalRevenue[0]?.total || 0) - (totalExpenses[0]?.total || 0);
    const totalAssets = assets.reduce((s: number, a: any) => s + a.balance, 0) + (equity > 0 ? equity : 0);
    const totalLiabilities = liabilities.reduce((s: number, l: any) => s + l.balance, 0) + (equity < 0 ? Math.abs(equity) : 0);
    res.json({ assets, liabilities, equity, total_assets: totalAssets, total_liabilities: totalLiabilities });
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

/**
 * @openapi
 * /accounting/balance-statement:
 *   get:
 *     tags: [Accounting Reports]
 *     summary: Get balance statement (revenue, cogs, profit)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Balance statement with revenue, COGS, expenses, net profit
 */
router.get('/balance-statement', async (_req: Request, res: Response) => {
  try {
    const sf = scopeFilter(_req);
    const orders = await Order.aggregate([{ $match: sf }, { $group: { _id: null, total: { $sum: '$grand_total' } } }]);
    const purchases = await PurchaseOrder.aggregate([{ $match: sf }, { $group: { _id: null, total: { $sum: '$total' } } }]);
    const expenses = await Expense.aggregate([{ $match: sf }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const incomes = await Income.aggregate([{ $match: sf }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const returns = await SaleReturn.aggregate([{ $match: sf }, { $group: { _id: null, total: { $sum: '$total' } } }]);
    const totalRevenue = (orders[0]?.total || 0);
    const totalCOGS = (purchases[0]?.total || 0);
    const totalExpenses = (expenses[0]?.total || 0);
    const totalIncome = (incomes[0]?.total || 0);
    const totalReturns = (returns[0]?.total || 0);
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses + totalIncome - totalReturns;
    res.json({ revenue: totalRevenue, cogs: totalCOGS, expenses: totalExpenses, other_income: totalIncome, returns: totalReturns, gross_profit: grossProfit, net_profit: netProfit });
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

// Accounting report views
/**
 * @openapi
 * /accounting/account_balances:
 *   get:
 *     tags: [Accounting Reports]
 *     summary: Get account balances
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of account balances
 */
router.get('/account_balances', async (_req: Request, res: Response) => {
  try {
    const sf = scopeFilter(_req);
    const accounts = await Account.find(sf).lean();
    const entries = await LedgerEntry.aggregate([
      { $match: sf },
      { $group: { _id: '$account', total_debit: { $sum: '$debit' }, total_credit: { $sum: '$credit' } } },
    ]);
    const result = accounts.map((a: any) => {
      const e = entries.find((en: any) => en._id === a.id);
      return { account: a.id, name: a.name, balance: (e?.total_debit || 0) - (e?.total_credit || 0) };
    });
    res.json(result);
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

/**
 * @openapi
 * /accounting/income_statement:
 *   get:
 *     tags: [Accounting Reports]
 *     summary: Get income statement
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Income statement with revenue, COGS, gross profit, net profit
 */
router.get('/income_statement', async (_req: Request, res: Response) => {
  try {
    const sf = scopeFilter(_req);
    const revenue = await Order.aggregate([{ $match: sf }, { $group: { _id: null, total: { $sum: '$grand_total' } } }]);
    const purchases = await PurchaseOrder.aggregate([{ $match: sf }, { $group: { _id: null, total: { $sum: '$total' } } }]);
    const expenses = await Expense.aggregate([{ $match: sf }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const incomes = await Income.aggregate([{ $match: sf }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const totalRevenue = revenue[0]?.total || 0;
    const totalCOGS = purchases[0]?.total || 0;
    const totalExpenses = expenses[0]?.total || 0;
    const totalIncome = incomes[0]?.total || 0;
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses + totalIncome;
    res.json({ revenue: totalRevenue, cogs: totalCOGS, gross_profit: grossProfit, expenses: totalExpenses, other_income: totalIncome, net_profit: netProfit });
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

/**
 * @openapi
 * /accounting/cash_flow:
 *   get:
 *     tags: [Accounting Reports]
 *     summary: Get cash flow report
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Cash flow entries grouped by account and date
 */
router.get('/cash_flow', async (_req: Request, res: Response) => {
  try {
    const sf = scopeFilter(_req);
    const flow = await LedgerEntry.aggregate([
      { $match: { ...sf, account: { $in: ['cash', 'bank', 'upi'] } } },
      { $group: { _id: { account: '$account', date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } } }, debit: { $sum: '$debit' }, credit: { $sum: '$credit' } } },
      { $sort: { '_id.date': 1 } },
    ]);
    res.json(flow.map((f: any) => ({ account: f._id.account, date: f._id.date, debit: f.debit, credit: f.credit, net: f.debit - f.credit })));
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

/**
 * @openapi
 * /accounting/aging_summary:
 *   get:
 *     tags: [Accounting Reports]
 *     summary: Get aging summary of outstanding dues
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Aging buckets (0-30, 31-60, 61-90, 90+ days)
 */
router.get('/aging_summary', async (_req: Request, res: Response) => {
  try {
    const orders = await Order.find(scopeFilter(_req)).sort({ created_at: -1 }).limit(100).lean();
    const now = new Date();
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    orders.forEach((o: any) => {
      if (o.due && o.due > 0) {
        const days = Math.floor((now.getTime() - new Date(o.created_at).getTime()) / (1000 * 60 * 60 * 24));
        if (days <= 30) buckets['0-30'] += o.due;
        else if (days <= 60) buckets['31-60'] += o.due;
        else if (days <= 90) buckets['61-90'] += o.due;
        else buckets['90+'] += o.due;
      }
    });
    res.json(Object.entries(buckets).map(([bucket, total]) => ({ bucket, total })));
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

export default router;
