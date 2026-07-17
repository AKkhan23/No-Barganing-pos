import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DamageStock } from '../models/DamageStock';
import { Product } from '../models/Product';
import { StockMovement } from '../models/StockMovement';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const CreateDamageSchema = z.object({
  product_id: z.string().min(1),
  product_name: z.string().min(1),
  quantity: z.number().positive(),
  reason: z.string().min(1),
  note: z.string().optional(),
});

router.post('/', validate(CreateDamageSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const product = await Product.findOne({ id: req.body.product_id });
  if (!product) { res.status(404).json({ detail: 'Product not found' }); return; }
  if (product.stock < req.body.quantity) { res.status(400).json({ detail: 'Insufficient stock' }); return; }
  const damage = new DamageStock({ ...req.body, id: generateId(), created_at: now, created_by_id: (req as any).user?.id, created_by_name: (req as any).user?.name });
  await damage.save();
  await Product.updateOne({ id: req.body.product_id }, { $inc: { stock: -req.body.quantity }, updated_at: now });
  const movement = new StockMovement({
    id: generateId(),
    product_id: req.body.product_id,
    product_name: req.body.product_name,
    type: 'damage',
    reason: req.body.reason,
    change: -req.body.quantity,
    quantity: product.stock - req.body.quantity,
    ref: damage.id,
    note: req.body.note,
    user_id: (req as any).user?.id || '',
    user_name: (req as any).user?.name || '',
    created_at: now,
  });
  await movement.save();
  res.status(201).json({ id: damage.id, product_id: damage.product_id, product_name: damage.product_name, quantity: damage.quantity, reason: damage.reason, note: damage.note, created_at: damage.created_at });
});

router.get('/', async (req: Request, res: Response) => {
  const filter: any = {};
  if (req.query.product_id) filter.product_id = req.query.product_id;
  const items = await DamageStock.find(filter).lean();
  res.json(items.map((d: any) => ({ id: d.id, product_id: d.product_id, product_name: d.product_name, quantity: d.quantity, reason: d.reason, note: d.note, created_at: d.created_at })));
});

export default router;
