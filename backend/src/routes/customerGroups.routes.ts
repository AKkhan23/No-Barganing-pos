import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CustomerGroup } from '../models/CustomerGroup';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const CreateGroupSchema = z.object({
  name: z.string().min(1),
  discount_percent: z.number().default(0),
  description: z.string().optional(),
});

const UpdateGroupSchema = z.object({
  name: z.string().optional(),
  discount_percent: z.number().optional(),
  description: z.string().optional(),
});

router.get('/', async (_req: Request, res: Response) => {
  const groups = await CustomerGroup.find().lean();
  res.json(groups.map((g: any) => ({ id: g.id, name: g.name, discount_percent: g.discount_percent, description: g.description, created_at: g.created_at })));
});

router.post('/', validate(CreateGroupSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const group = new CustomerGroup({ ...req.body, id: generateId(), created_at: now });
  await group.save();
  res.status(201).json({ id: group.id, name: group.name, discount_percent: group.discount_percent, description: group.description, created_at: group.created_at });
});

router.patch('/:id', validate(UpdateGroupSchema), async (req: Request, res: Response) => {
  const update = { ...req.body, updated_at: new Date().toISOString() };
  const group = await CustomerGroup.findOneAndUpdate({ id: req.params.id }, { $set: update }, { new: true }).lean();
  if (!group) { res.status(404).json({ detail: 'Customer group not found' }); return; }
  res.json({ id: group.id, name: group.name, discount_percent: group.discount_percent, description: group.description });
});

router.delete('/:id', async (req: Request, res: Response) => {
  await CustomerGroup.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
