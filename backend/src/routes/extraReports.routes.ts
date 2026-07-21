import { Router, Request, Response } from 'express';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { Order } from '../models/Order';
import { LedgerEntry } from '../models/LedgerEntry';
import { Account } from '../models/Account';
import { Expense } from '../models/Expense';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { Deposit } from '../models/Deposit';
import { ShiftReport } from '../models/ShiftReport';
import { Supplier } from '../models/Supplier';
import { Customer } from '../models/Customer';
import { SupplierPayment } from '../models/SupplierPayment';
import { scopeFilter } from '../middleware/scope';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

/**
 * @openapi
 * /extra-reports/cash-flow:
 *   get:
 *     tags: [Extra Reports]
 *     summary: Get daily cash flow (sales, expenses, purchases, net)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *         description: Start date (ISO)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *         description: End date (ISO)
 *     responses:
 *       200:
 *         description: Cash flow data
 */
router.get('/cash-flow', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    const filter: any = {};
    if (start_date) filter.created_at = { $gte: start_date };
    if (end_date) filter.created_at = { ...filter.created_at, $lte: end_date };

    const sf = scopeFilter(req);
    const sales = await Order.aggregate([
      { $match: { ...sf, ...filter, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: { $substr: ['$created_at', 0, 10] },
          total: { $sum: '$grand_total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const expenses = await Expense.aggregate([
      { $match: { ...sf, ...filter } },
      {
        $group: {
          _id: { $substr: ['$created_at', 0, 10] },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const purchases = await PurchaseOrder.aggregate([
      { $match: { ...sf, ...filter, status: { $in: ['received', 'completed'] } } },
      {
        $group: {
          _id: { $substr: ['$created_at', 0, 10] },
          total: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dateMap: Record<string, { sales: number; expenses: number; purchases: number }> = {};

    for (const s of sales) {
      if (!dateMap[s._id]) dateMap[s._id] = { sales: 0, expenses: 0, purchases: 0 };
      dateMap[s._id].sales = s.total;
    }
    for (const e of expenses) {
      if (!dateMap[e._id]) dateMap[e._id] = { sales: 0, expenses: 0, purchases: 0 };
      dateMap[e._id].expenses = e.total;
    }
    for (const p of purchases) {
      if (!dateMap[p._id]) dateMap[p._id] = { sales: 0, expenses: 0, purchases: 0 };
      dateMap[p._id].purchases = p.total;
    }

    const allDates = [...new Set([...sales.map(s => s._id), ...expenses.map(e => e._id), ...purchases.map(p => p._id)])].sort();

    const result = allDates.map(date => ({
      date,
      sales: dateMap[date].sales,
      expenses: dateMap[date].expenses,
      purchases: dateMap[date].purchases,
      net: dateMap[date].sales - dateMap[date].expenses - dateMap[date].purchases,
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /extra-reports/customer-balance:
 *   get:
 *     tags: [Extra Reports]
 *     summary: Get customer balance report
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Customer balances
 */
router.get('/customer-balance', async (req: Request, res: Response) => {
  try {
    const sf = scopeFilter(req);
    const result = await LedgerEntry.aggregate([
      { $match: { ...sf, party_type: 'customer' } },
      {
        $group: {
          _id: '$party_id',
          total_debit: { $sum: '$debit' },
          total_credit: { $sum: '$credit' },
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
          party_id: '$_id',
          customer_name: { $ifNull: ['$customer.name', 'Unknown'] },
          total_debit: 1,
          total_credit: 1,
          balance: { $subtract: ['$total_debit', '$total_credit'] },
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
 * /extra-reports/customer-ledger/{customerId}:
 *   get:
 *     tags: [Extra Reports]
 *     summary: Get customer ledger with running balance
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer ledger entries
 */
router.get('/customer-ledger/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const entries = await LedgerEntry.find({ ...scopeFilter(req), party_type: 'customer', party_id: customerId })
      .sort({ created_at: 1 })
      .lean();

    let running = 0;
    const result = entries.map(e => {
      running += (e.debit || 0) - (e.credit || 0);
      return { ...e, running_balance: running };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /extra-reports/supplier-balance:
 *   get:
 *     tags: [Extra Reports]
 *     summary: Get supplier balance report
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Supplier balances
 */
router.get('/supplier-balance', async (req: Request, res: Response) => {
  try {
    const sf = scopeFilter(req);
    const result = await LedgerEntry.aggregate([
      { $match: { ...sf, party_type: 'supplier' } },
      {
        $group: {
          _id: '$party_id',
          total_debit: { $sum: '$debit' },
          total_credit: { $sum: '$credit' },
        },
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: 'id',
          as: 'supplier',
        },
      },
      { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          party_id: '$_id',
          supplier_name: { $ifNull: ['$supplier.name', 'Unknown'] },
          total_debit: 1,
          total_credit: 1,
          balance: { $subtract: ['$total_debit', '$total_credit'] },
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
 * /extra-reports/supplier-ledger/{supplierId}:
 *   get:
 *     tags: [Extra Reports]
 *     summary: Get supplier ledger with running balance
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: supplierId
 *         required: true
 *         schema:
 *           type: string
 *         description: Supplier ID
 *     responses:
 *       200:
 *         description: Supplier ledger entries
 */
router.get('/supplier-ledger/:supplierId', async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;
    const entries = await LedgerEntry.find({ ...scopeFilter(req), party_type: 'supplier', party_id: supplierId })
      .sort({ created_at: 1 })
      .lean();

    let running = 0;
    const result = entries.map(e => {
      running += (e.debit || 0) - (e.credit || 0);
      return { ...e, running_balance: running };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /extra-reports/balance-statement:
 *   get:
 *     tags: [Extra Reports]
 *     summary: Get balance statement (assets, liabilities, equity)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Balance statement data
 */
router.get('/balance-statement', async (req: Request, res: Response) => {
  try {
    const sf = scopeFilter(req);
    const accounts = await Account.find(sf).lean();
    const totalAssets = accounts.reduce((s, a) => s + (Number(a.current_balance) || 0), 0);

    const supplierPayments = await SupplierPayment.aggregate([
      { $match: sf },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const totalLiabilities = supplierPayments.length > 0 ? supplierPayments[0].total : 0;
    const totalEquity = totalAssets - totalLiabilities;

    res.json({
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      total_equity: totalEquity,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /extra-reports/deposit-report:
 *   get:
 *     tags: [Extra Reports]
 *     summary: Get deposit report
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *         description: Start date (ISO)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *         description: End date (ISO)
 *     responses:
 *       200:
 *         description: Deposit report data
 */
router.get('/deposit-report', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    const filter: any = {};
    if (start_date) filter.created_at = { $gte: start_date };
    if (end_date) filter.created_at = { ...filter.created_at, $lte: end_date };

    const deposits = await Deposit.find({ ...scopeFilter(req), ...filter }).sort({ created_at: -1 }).lean();
    const totalAmount = deposits.reduce((s, d) => s + (Number(d.amount) || 0), 0);

    res.json({ total_deposits: deposits.length, total_amount: totalAmount, deposits });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @openapi
 * /extra-reports/register-report:
 *   get:
 *     tags: [Extra Reports]
 *     summary: Get register (shift) report
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *         description: Start date (ISO)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *         description: End date (ISO)
 *     responses:
 *       200:
 *         description: Register report data
 */
router.get('/register-report', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    const filter: any = {};
    if (start_date) filter.created_at = { $gte: start_date };
    if (end_date) filter.created_at = { ...filter.created_at, $lte: end_date };

    const reports = await ShiftReport.find({ ...scopeFilter(req), ...filter }).sort({ created_at: -1 }).lean();
    const totalOpening = reports.reduce((s, r) => s + (Number(r.opening_cash) || 0), 0);
    const totalClosing = reports.reduce((s, r) => s + (Number(r.closing_cash) || 0), 0);
    const totalVariance = reports.reduce((s, r) => s + (Number(r.variance) || 0), 0);

    res.json({
      total_reports: reports.length,
      total_opening_cash: totalOpening,
      total_closing_cash: totalClosing,
      total_variance: totalVariance,
      reports,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
