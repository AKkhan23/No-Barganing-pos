import { Router, Request, Response } from 'express';
import { Unit } from '../models/Unit';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

router.get('/', async (_req: Request, res: Response) => {
  const items = await Unit.find({}).lean();
  res.json(items);
});

router.post('/', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item = new Unit({ id: generateId(), ...req.body, created_at: now });
  await item.save();
  res.status(201).json(item.toJSON());
});

router.patch('/:id', async (req: Request, res: Response) => {
  const item = await Unit.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true }).lean();
  if (!item) { res.status(404).json({ detail: 'Unit not found' }); return; }
  res.json(item);
});

router.delete('/:id', async (req: Request, res: Response) => {
  await Unit.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
