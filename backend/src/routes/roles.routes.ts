import { Router, Request, Response } from 'express';
import { Role } from '../models/Role';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';

const router = Router();
router.use(verifyJWT, requireRoles('admin'));

router.get('/', async (_req: Request, res: Response) => {
  const items = await Role.find({}).lean();
  res.json(items);
});

router.post('/', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item = new Role({ id: generateId(), ...req.body, created_at: now, updated_at: now });
  await item.save();
  res.status(201).json(item.toJSON());
});

router.patch('/:id', async (req: Request, res: Response) => {
  const item = await Role.findOneAndUpdate({ id: req.params.id }, { $set: { ...req.body, updated_at: new Date().toISOString() } }, { new: true }).lean();
  if (!item) { res.status(404).json({ detail: 'Role not found' }); return; }
  res.json(item);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const role = await Role.findOne({ id: req.params.id }).lean();
  if (!role) { res.status(404).json({ detail: 'Role not found' }); return; }
  if (role.is_system) { res.status(400).json({ detail: 'Cannot delete system role' }); return; }
  await Role.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
