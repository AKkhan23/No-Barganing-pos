import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SupplierPayment } from '../models/SupplierPayment';
import { Supplier } from '../models/Supplier';
import { LedgerEntry } from '../models/LedgerEntry';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const CreatePaymentSchema = z.object({
  supplier_id: z.string().min(1),
  amount: z.number().positive(),
  mode: z.enum(['cash', 'bank', 'upi', 'wallet']),
  note: z.string().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  const filter: any = {};
  if (req.query.supplier_id) { filter.supplier_id = req.query.supplier_id; }
  const limit = parseInt(req.query.limit as string || '100', 10);
  const payments = await SupplierPayment.find(filter).sort({ created_at: -1 }).limit(limit).lean();
  res.json(payments.map((p: any) => ({ id: p.id, outlet_id: p.outlet_id, supplier_id: p.supplier_id, supplier_name: p.supplier_name, amount: p.amount, mode: p.mode, note: p.note, created_at: p.created_at, created_by_id: p.created_by_id, created_by_name: p.created_by_name })));
});

router.get('/:id', async (req: Request, res: Response) => {
  const payment = await SupplierPayment.findOne({ id: req.params.id }).lean();
  if (!payment) { res.status(404).json({ detail: 'Supplier payment not found' }); return; }
  res.json({ id: payment.id, outlet_id: payment.outlet_id, supplier_id: payment.supplier_id, supplier_name: payment.supplier_name, amount: payment.amount, mode: payment.mode, note: payment.note, created_at: payment.created_at, created_by_id: payment.created_by_id, created_by_name: payment.created_by_name });
});

router.post('/', validate(CreatePaymentSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const supplier = await Supplier.findOne({ id: req.body.supplier_id });
  if (!supplier) { res.status(404).json({ detail: 'Supplier not found' }); return; }

  const payment = new SupplierPayment({
    ...req.body,
    id: generateId(),
    supplier_name: supplier.name,
    created_at: now,
  });
  await payment.save();

  supplier.current_balance -= req.body.amount;
  await supplier.save();

  const debitEntry = new LedgerEntry({
    id: generateId(),
    date: now,
    account: 'Supplier Payable',
    party_type: 'supplier',
    party_id: supplier.id,
    debit: req.body.amount,
    credit: 0,
    reference: `Payment-${payment.id}`,
    note: req.body.note || `Payment to ${supplier.name}`,
    created_at: now,
  });
  await debitEntry.save();

  const creditEntry = new LedgerEntry({
    id: generateId(),
    date: now,
    account: req.body.mode.charAt(0).toUpperCase() + req.body.mode.slice(1),
    debit: 0,
    credit: req.body.amount,
    reference: `Payment-${payment.id}`,
    note: req.body.note || `Payment to ${supplier.name}`,
    created_at: now,
  });
  await creditEntry.save();

  res.status(201).json({ id: payment.id, outlet_id: payment.outlet_id, supplier_id: payment.supplier_id, supplier_name: payment.supplier_name, amount: payment.amount, mode: payment.mode, note: payment.note, created_at: payment.created_at, created_by_id: payment.created_by_id, created_by_name: payment.created_by_name });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const payment = await SupplierPayment.findOne({ id: req.params.id });
  if (!payment) { res.status(404).json({ detail: 'Payment not found' }); return; }

  await Supplier.updateOne({ id: payment.supplier_id }, { $inc: { current_balance: payment.amount } });
  await LedgerEntry.deleteMany({ reference: `Payment-${payment.id}` });
  await SupplierPayment.deleteOne({ id: req.params.id });

  res.json({ ok: true });
});

export default router;
