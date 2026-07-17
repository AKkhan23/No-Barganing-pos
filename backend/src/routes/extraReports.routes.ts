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

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

router.get('/cash-flow', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    const filter: any = {};
    if (start_date) filter.created_at = { $gte: start_date };
    if (end_date) filter.created_at = { ...filter.created_at, $lte: end_date };

    const sales = await Order.aggregate([
      { $match: { ...filter, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: { $substr: ['$created_at', 0, 10] },
          total: { $sum: '$grand_total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const expenses = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $substr: ['$created_at', 0, 10] },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const purchases = await PurchaseOrder.aggregate([
      { $match: { ...filter, status: { $in: ['received', 'completed'] } } },
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

router.get('/customer-balance', async (req: Request, res: Response) => {
  try {
    const result = await LedgerEntry.aggregate([
      { $match: { party_type: 'customer' } },
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

router.get('/customer-ledger/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const entries = await LedgerEntry.find({ party_type: 'customer', party_id: customerId })
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

router.get('/supplier-balance', async (req: Request, res: Response) => {
  try {
    const result = await LedgerEntry.aggregate([
      { $match: { party_type: 'supplier' } },
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

router.get('/supplier-ledger/:supplierId', async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;
    const entries = await LedgerEntry.find({ party_type: 'supplier', party_id: supplierId })
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

router.get('/balance-statement', async (req: Request, res: Response) => {
  try {
    const accounts = await Account.find().lean();
    const totalAssets = accounts.reduce((s, a) => s + (Number(a.current_balance) || 0), 0);

    const supplierPayments = await SupplierPayment.aggregate([
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

router.get('/deposit-report', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    const filter: any = {};
    if (start_date) filter.created_at = { $gte: start_date };
    if (end_date) filter.created_at = { ...filter.created_at, $lte: end_date };

    const deposits = await Deposit.find(filter).sort({ created_at: -1 }).lean();
    const totalAmount = deposits.reduce((s, d) => s + (Number(d.amount) || 0), 0);

    res.json({ total_deposits: deposits.length, total_amount: totalAmount, deposits });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/register-report', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    const filter: any = {};
    if (start_date) filter.created_at = { $gte: start_date };
    if (end_date) filter.created_at = { ...filter.created_at, $lte: end_date };

    const reports = await ShiftReport.find(filter).sort({ created_at: -1 }).lean();
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
