import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Customer } from '../models/Customer';
import { Order } from '../models/Order';
import { LedgerEntry } from '../models/LedgerEntry';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const ReceivePaymentSchema = z.object({
  customer_name: z.string().min(1),
  amount: z.number().positive(),
  mode: z.string().min(1),
  note: z.string().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const orders = await Order.aggregate([
      { $match: { due: { $gt: 0 } } },
      {
        $group: {
          _id: '$customer_name',
          customer_name: { $first: '$customer_name' },
          due: { $sum: '$due' },
          since: { $min: '$created_at' },
        },
      },
      { $sort: { since: -1 } },
    ]);
    res.json(orders.map((o: any) => ({
      id: o._id,
      customer_name: o.customer_name,
      phone: '',
      due: Math.round(o.due * 100) / 100,
      since: o.since,
    })));
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

router.post('/receive-payment', validate(ReceivePaymentSchema), async (req: Request, res: Response) => {
  try {
    const { customer_name, amount, mode, note } = req.body;
    const now = new Date().toISOString();

    let customer = await Customer.findOne({ name: customer_name });
    if (!customer) {
      customer = await Customer.create({
        id: generateId(),
        name: customer_name,
        phone: '-',
        receivable: 0,
        total_spent: 0,
        created_at: now,
        updated_at: now,
      });
    }
    customer.receivable = Math.max(0, (customer.receivable || 0) - amount);
    await customer.save();

    const entry = new LedgerEntry({
      id: generateId(), date: now.slice(0, 10), account: mode,
      party_type: 'customer', party_id: customer.id,
      debit: 0, credit: amount, reference: `Payment from ${customer.name}`,
      note: note || '', created_by_id: req.user!.id, created_by_name: req.user!.name,
      created_at: now,
    });
    await entry.save();

    let remaining = amount;
    const unpaidOrders = await Order.find({ customer_name, due: { $gt: 0 } }).sort({ created_at: 1 });
    for (const order of unpaidOrders) {
      if (remaining <= 0) break;
      const reduce = Math.min(remaining, order.due);
      await Order.findOneAndUpdate({ id: order.id }, { $inc: { due: -reduce } });
      remaining -= reduce;
    }

    res.json({
      customer: { id: customer.id, name: customer.name, receivable: customer.receivable },
      ledger_entry: { id: entry.id, date: entry.date, account: entry.account, credit: entry.credit, note: entry.note },
    });
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

export default router;
