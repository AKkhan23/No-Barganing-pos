import { Router, Request, Response } from 'express';
import { LedgerEntry } from '../models/LedgerEntry';
import { Account } from '../models/Account';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { Expense } from '../models/Expense';
import { Income } from '../models/Income';
import { SaleReturn } from '../models/SaleReturn';
import { Order } from '../models/Order';
import { verifyJWT, requireRoles } from '../middleware/auth';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

router.get('/trial-balance', async (_req: Request, res: Response) => {
  try {
    const entries = await LedgerEntry.aggregate([
      { $group: { _id: '$account', total_debit: { $sum: '$debit' }, total_credit: { $sum: '$credit' } } },
    ]);
    const result = await Promise.all(entries.map(async (e: any) => {
      const acct = await Account.findOne({ id: e._id }).lean();
      return { account: e._id, account_name: acct?.name || '', total_debit: e.total_debit, total_credit: e.total_credit };
    }));
    const totalDebit = result.reduce((s: number, r: any) => s + r.total_debit, 0);
    const totalCredit = result.reduce((s: number, r: any) => s + r.total_credit, 0);
    res.json({ entries: result, total_debit: totalDebit, total_credit: totalCredit });
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

router.get('/balance-sheet', async (_req: Request, res: Response) => {
  try {
    const entries = await LedgerEntry.aggregate([
      { $group: { _id: '$account', total_debit: { $sum: '$debit' }, total_credit: { $sum: '$credit' } } },
    ]);
    const assets: any[] = [];
    const liabilities: any[] = [];
    for (const e of entries) {
      const acct = await Account.findOne({ id: e._id }).lean();
      const balance = e.total_debit - e.total_credit;
      const item = { account: e._id, account_name: acct?.name || '', balance: Math.abs(balance) };
      if (balance >= 0) assets.push(item);
      else liabilities.push(item);
    }
    const totalRevenue = await Order.aggregate([{ $group: { _id: null, total: { $sum: '$grand_total' } } }]);
    const totalExpenses = await Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
    const equity = (totalRevenue[0]?.total || 0) - (totalExpenses[0]?.total || 0);
    const totalAssets = assets.reduce((s: number, a: any) => s + a.balance, 0) + (equity > 0 ? equity : 0);
    const totalLiabilities = liabilities.reduce((s: number, l: any) => s + l.balance, 0) + (equity < 0 ? Math.abs(equity) : 0);
    res.json({ assets, liabilities, equity, total_assets: totalAssets, total_liabilities: totalLiabilities });
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

router.get('/balance-statement', async (_req: Request, res: Response) => {
  try {
    const orders = await Order.aggregate([{ $group: { _id: null, total: { $sum: '$grand_total' } } }]);
    const purchases = await PurchaseOrder.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]);
    const expenses = await Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
    const incomes = await Income.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
    const returns = await SaleReturn.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]);
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
router.get('/account_balances', async (_req: Request, res: Response) => {
  try {
    const accounts = await Account.find().lean();
    const entries = await LedgerEntry.aggregate([
      { $group: { _id: '$account', total_debit: { $sum: '$debit' }, total_credit: { $sum: '$credit' } } },
    ]);
    const result = accounts.map((a: any) => {
      const e = entries.find((en: any) => en._id === a.id);
      return { account: a.id, name: a.name, balance: (e?.total_debit || 0) - (e?.total_credit || 0) };
    });
    res.json(result);
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

router.get('/income_statement', async (_req: Request, res: Response) => {
  try {
    const revenue = await Order.aggregate([{ $group: { _id: null, total: { $sum: '$grand_total' } } }]);
    const purchases = await PurchaseOrder.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]);
    const expenses = await Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
    const incomes = await Income.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
    const totalRevenue = revenue[0]?.total || 0;
    const totalCOGS = purchases[0]?.total || 0;
    const totalExpenses = expenses[0]?.total || 0;
    const totalIncome = incomes[0]?.total || 0;
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses + totalIncome;
    res.json({ revenue: totalRevenue, cogs: totalCOGS, gross_profit: grossProfit, expenses: totalExpenses, other_income: totalIncome, net_profit: netProfit });
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

router.get('/cash_flow', async (_req: Request, res: Response) => {
  try {
    const flow = await LedgerEntry.aggregate([
      { $match: { account: { $in: ['cash', 'bank', 'upi'] } } },
      { $group: { _id: { account: '$account', date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } } }, debit: { $sum: '$debit' }, credit: { $sum: '$credit' } } },
      { $sort: { '_id.date': 1 } },
    ]);
    res.json(flow.map((f: any) => ({ account: f._id.account, date: f._id.date, debit: f.debit, credit: f.credit, net: f.debit - f.credit })));
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

router.get('/aging_summary', async (_req: Request, res: Response) => {
  try {
    const orders = await Order.find().sort({ created_at: -1 }).limit(100).lean();
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
