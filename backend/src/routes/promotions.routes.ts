import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Promotion } from '../models/Promotion';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const CreatePromotionSchema = z.object({
  name: z.string().min(1),
  type: z.string().default('percentage'),
  discount_value: z.number().default(0),
  min_purchase: z.number().default(0),
  valid_from: z.string().optional().default(''),
  valid_to: z.string().optional().default(''),
  applicable_products: z.array(z.string()).default([]),
  applicable_categories: z.array(z.string()).default([]),
  active: z.boolean().default(true),
  max_discount: z.number().optional(),
  usage_limit: z.number().optional(),
});

const UpdatePromotionSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  discount_value: z.number().optional(),
  min_purchase: z.number().optional(),
  valid_from: z.string().optional(),
  valid_to: z.string().optional(),
  applicable_products: z.array(z.string()).optional(),
  applicable_categories: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  max_discount: z.number().optional(),
  usage_limit: z.number().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  const { active_only } = req.query;
  const filter: any = {};
  if (active_only === 'true') filter.active = true;
  const items = await Promotion.find(filter).lean();
  res.json(items.map((p: any) => ({ id: p.id, name: p.name, type: p.type, discount_value: p.discount_value, min_purchase: p.min_purchase, valid_from: p.valid_from, valid_to: p.valid_to, applicable_products: p.applicable_products, applicable_categories: p.applicable_categories, active: p.active, max_discount: p.max_discount, usage_limit: p.usage_limit, used_count: p.used_count, created_at: p.created_at })));
});

router.post('/', validate(CreatePromotionSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const promo = new Promotion({ ...req.body, id: generateId(), created_at: now, created_by_id: req.user?.id });
  await promo.save();
  res.status(201).json({ id: promo.id, name: promo.name, type: promo.type, discount_value: promo.discount_value, min_purchase: promo.min_purchase, valid_from: promo.valid_from, valid_to: promo.valid_to, applicable_products: promo.applicable_products, applicable_categories: promo.applicable_categories, active: promo.active, max_discount: promo.max_discount, usage_limit: promo.usage_limit, used_count: promo.used_count, created_at: promo.created_at });
});

router.patch('/:id', validate(UpdatePromotionSchema), async (req: Request, res: Response) => {
  const promo = await Promotion.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true }).lean();
  if (!promo) { res.status(404).json({ detail: 'Promotion not found' }); return; }
  res.json({ id: promo.id, name: promo.name, type: promo.type, discount_value: promo.discount_value, min_purchase: promo.min_purchase, valid_from: promo.valid_from, valid_to: promo.valid_to, applicable_products: promo.applicable_products, applicable_categories: promo.applicable_categories, active: promo.active, max_discount: promo.max_discount, usage_limit: promo.usage_limit, used_count: promo.used_count });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const promo = await Promotion.findOneAndDelete({ id: req.params.id });
  if (!promo) { res.status(404).json({ detail: 'Promotion not found' }); return; }
  res.json({ ok: true });
});

export default router;
