import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Supplier } from '../models/Supplier';
import { LedgerEntry } from '../models/LedgerEntry';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const CreateSupplierSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
  opening_balance: z.number().default(0),
});

const UpdateSupplierSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
  opening_balance: z.number().optional(),
});

/**
 * @openapi
 * /suppliers:
 *   get:
 *     tags: [Suppliers]
 *     summary: List suppliers
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search by name or phone
 *     responses:
 *       200:
 *         description: Array of suppliers
 */
router.get('/', async (req: Request, res: Response) => {
  const q = req.query.q as string | undefined;
  const filter: any = {};
  if (q) { filter.$or = [{ name: { $regex: q, $options: 'i' } }, { phone: { $regex: q, $options: 'i' } }]; }
  const items = await Supplier.find(filter).lean();
  res.json(items.map((s: any) => ({ id: s.id, name: s.name, phone: s.phone, email: s.email, address: s.address, gstin: s.gstin, opening_balance: s.opening_balance, current_balance: s.current_balance, created_at: s.created_at })));
});

/**
 * @openapi
 * /suppliers:
 *   post:
 *     tags: [Suppliers]
 *     summary: Create a supplier
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               address: { type: string }
 *               gstin: { type: string }
 *               opening_balance: { type: number }
 *     responses:
 *       201:
 *         description: Created supplier
 */
router.post('/', validate(CreateSupplierSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const supplier = new Supplier({ ...req.body, id: generateId(), current_balance: req.body.opening_balance || 0, created_at: now });
  await supplier.save();
  res.status(201).json({ id: supplier.id, name: supplier.name, phone: supplier.phone, email: supplier.email, address: supplier.address, gstin: supplier.gstin, opening_balance: supplier.opening_balance, current_balance: supplier.current_balance, created_at: supplier.created_at });
});

/**
 * @openapi
 * /suppliers/{id}:
 *   get:
 *     tags: [Suppliers]
 *     summary: Get a supplier by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Supplier details
 *       404:
 *         description: Supplier not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  const supplier = await Supplier.findOne({ id: req.params.id }).lean();
  if (!supplier) { res.status(404).json({ detail: 'Supplier not found' }); return; }
  res.json({ id: supplier.id, name: supplier.name, phone: supplier.phone, email: supplier.email, address: supplier.address, gstin: supplier.gstin, opening_balance: supplier.opening_balance, current_balance: supplier.current_balance, created_at: supplier.created_at });
});

/**
 * @openapi
 * /suppliers/{id}:
 *   patch:
 *     tags: [Suppliers]
 *     summary: Update a supplier
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               address: { type: string }
 *               gstin: { type: string }
 *               opening_balance: { type: number }
 *     responses:
 *       200:
 *         description: Updated supplier
 *       404:
 *         description: Supplier not found
 */
router.patch('/:id', validate(UpdateSupplierSchema), async (req: Request, res: Response) => {
  const update = { ...req.body, updated_at: new Date().toISOString() };
  if (update.opening_balance !== undefined && update.current_balance === undefined) {
    const existing = await Supplier.findOne({ id: req.params.id }).lean();
    if (existing) {
      const diff = update.opening_balance - existing.opening_balance;
      update.current_balance = existing.current_balance + diff;
    }
  }
  const supplier = await Supplier.findOneAndUpdate({ id: req.params.id }, { $set: update }, { new: true }).lean();
  if (!supplier) { res.status(404).json({ detail: 'Supplier not found' }); return; }
  res.json({ id: supplier.id, name: supplier.name, phone: supplier.phone, email: supplier.email, address: supplier.address, gstin: supplier.gstin, opening_balance: supplier.opening_balance, current_balance: supplier.current_balance });
});

/**
 * @openapi
 * /suppliers/{id}:
 *   delete:
 *     tags: [Suppliers]
 *     summary: Delete a supplier
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deletion confirmed
 *       404:
 *         description: Supplier not found
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const supplier = await Supplier.findOneAndDelete({ id: req.params.id });
  if (!supplier) { res.status(404).json({ detail: 'Supplier not found' }); return; }
  res.json({ ok: true });
});

/**
 * @openapi
 * /suppliers/{id}/ledger:
 *   get:
 *     tags: [Suppliers]
 *     summary: Get supplier ledger entries
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of ledger entries
 */
router.get('/:id/ledger', async (req: Request, res: Response) => {
  const entries = await LedgerEntry.find({
    party_type: 'supplier',
    party_id: req.params.id,
    account: 'Supplier Payable',
  }).sort({ created_at: -1 }).lean();
  res.json(entries.map((e: any) => ({ id: e.id, date: e.date, account: e.account, debit: e.debit, credit: e.credit, reference: e.reference, note: e.note, created_at: e.created_at })));
});

/**
 * @openapi
 * /suppliers/{id}/purchases:
 *   get:
 *     tags: [Suppliers]
 *     summary: Get purchases for a supplier
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of purchase orders
 */
router.get('/:id/purchases', async (req: Request, res: Response) => {
  const purchases = await PurchaseOrder.find({ supplier_id: req.params.id }).sort({ created_at: -1 }).lean();
  res.json(purchases.map((po: any) => ({
    id: po.id,
    supplier_id: po.supplier_id,
    supplier_name: po.supplier_name,
    reference: po.reference,
    status: po.status,
    items: po.items,
    subtotal: po.subtotal,
    tax_total: po.tax_total,
    total: po.total,
    note: po.note,
    created_at: po.created_at,
  })));
});

export default router;
