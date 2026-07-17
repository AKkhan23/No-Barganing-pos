import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Quotation } from '../models/Quotation';
import { generateId, generateInvoiceNo } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const CreateQuotationSchema = z.object({
  customer_id: z.string().optional(),
  customer_name: z.string(),
  items: z.array(z.object({
    product_id: z.string().optional(),
    product_name: z.string(),
    quantity: z.number().default(1),
    price: z.number().default(0),
    tax: z.number().default(0),
    total: z.number().default(0),
  })),
  subtotal: z.number(),
  tax_total: z.number(),
  discount: z.number().default(0),
  grand_total: z.number(),
  valid_until: z.string(),
  notes: z.string().optional(),
});

const UpdateQuotationSchema = z.object({
  customer_id: z.string().optional(),
  customer_name: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string().optional(),
    product_name: z.string(),
    quantity: z.number().default(1),
    price: z.number().default(0),
    tax: z.number().default(0),
    total: z.number().default(0),
  })).optional(),
  subtotal: z.number().optional(),
  tax_total: z.number().optional(),
  discount: z.number().optional(),
  grand_total: z.number().optional(),
  valid_until: z.string().optional(),
  notes: z.string().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  const items = await Quotation.find().lean();
  res.json(items.map((q: any) => ({ id: q.id, quote_no: q.quote_no, customer_id: q.customer_id, customer_name: q.customer_name, items: q.items, subtotal: q.subtotal, tax_total: q.tax_total, discount: q.discount, grand_total: q.grand_total, status: q.status, valid_until: q.valid_until, notes: q.notes, created_at: q.created_at })));
});

router.post('/', validate(CreateQuotationSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const count = await Quotation.countDocuments();
  const quote_no = `Q-${now.slice(0, 4).replace(/-/g, '')}-${String(count + 1).padStart(6, '0')}`;
  const q = new Quotation({ ...req.body, id: generateId(), quote_no, status: 'draft', created_at: now, created_by_id: req.user?.id });
  await q.save();
  res.status(201).json({ id: q.id, quote_no: q.quote_no, customer_id: q.customer_id, customer_name: q.customer_name, items: q.items, subtotal: q.subtotal, tax_total: q.tax_total, discount: q.discount, grand_total: q.grand_total, status: q.status, valid_until: q.valid_until, notes: q.notes, created_at: q.created_at });
});

router.get('/:id', async (req: Request, res: Response) => {
  const q = await Quotation.findOne({ id: req.params.id }).lean();
  if (!q) { res.status(404).json({ detail: 'Quotation not found' }); return; }
  res.json({ id: q.id, quote_no: q.quote_no, customer_id: q.customer_id, customer_name: q.customer_name, items: q.items, subtotal: q.subtotal, tax_total: q.tax_total, discount: q.discount, grand_total: q.grand_total, status: q.status, valid_until: q.valid_until, notes: q.notes, created_at: q.created_at });
});

router.patch('/:id', validate(UpdateQuotationSchema), async (req: Request, res: Response) => {
  const q = await Quotation.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true }).lean();
  if (!q) { res.status(404).json({ detail: 'Quotation not found' }); return; }
  res.json({ id: q.id, quote_no: q.quote_no, customer_id: q.customer_id, customer_name: q.customer_name, items: q.items, subtotal: q.subtotal, tax_total: q.tax_total, discount: q.discount, grand_total: q.grand_total, status: q.status, valid_until: q.valid_until, notes: q.notes });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const q = await Quotation.findOneAndDelete({ id: req.params.id });
  if (!q) { res.status(404).json({ detail: 'Quotation not found' }); return; }
  res.json({ ok: true });
});

export default router;
