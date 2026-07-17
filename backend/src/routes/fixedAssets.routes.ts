import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { FixedAsset } from '../models/FixedAsset';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const CreateAssetSchema = z.object({
  name: z.string().min(1),
  purchase_date: z.string().optional(),
  purchase_price: z.number().default(0),
  current_value: z.number().optional(),
  depreciation_method: z.string().optional(),
  depreciation_rate: z.number().optional(),
  useful_life_years: z.number().default(5),
  location: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().default(true),
});

const UpdateAssetSchema = z.object({
  name: z.string().optional(),
  purchase_date: z.string().optional(),
  purchase_price: z.number().optional(),
  current_value: z.number().optional(),
  depreciation_method: z.string().optional(),
  depreciation_rate: z.number().optional(),
  useful_life_years: z.number().optional(),
  location: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  const assets = await FixedAsset.find().lean();
  res.json(assets.map((a: any) => ({ id: a.id, name: a.name, purchase_date: a.purchase_date, purchase_price: a.purchase_price, current_value: a.current_value, depreciation_method: a.depreciation_method, depreciation_rate: a.depreciation_rate, useful_life_years: a.useful_life_years, location: a.location, category: a.category, notes: a.notes, active: a.active, created_at: a.created_at })));
});

router.post('/', validate(CreateAssetSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const current_value = req.body.current_value ?? req.body.purchase_price;
  const asset = new FixedAsset({ ...req.body, current_value, id: generateId(), created_at: now });
  await asset.save();
  res.status(201).json({ id: asset.id, name: asset.name, purchase_date: asset.purchase_date, purchase_price: asset.purchase_price, current_value: asset.current_value, depreciation_method: asset.depreciation_method, depreciation_rate: asset.depreciation_rate, useful_life_years: asset.useful_life_years, location: asset.location, category: asset.category, notes: asset.notes, active: asset.active, created_at: asset.created_at });
});

router.patch('/:id', validate(UpdateAssetSchema), async (req: Request, res: Response) => {
  const asset = await FixedAsset.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true }).lean();
  if (!asset) { res.status(404).json({ detail: 'Fixed asset not found' }); return; }
  res.json({ id: asset.id, name: asset.name, purchase_date: asset.purchase_date, purchase_price: asset.purchase_price, current_value: asset.current_value, depreciation_method: asset.depreciation_method, depreciation_rate: asset.depreciation_rate, useful_life_years: asset.useful_life_years, location: asset.location, category: asset.category, notes: asset.notes, active: asset.active });
});

router.delete('/:id', async (req: Request, res: Response) => {
  await FixedAsset.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
