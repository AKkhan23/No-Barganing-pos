import { Router, Request, Response } from 'express';
import { Servicing } from '../models/Servicing';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

router.get('/', async (_req: Request, res: Response) => {
  const items = await Servicing.find({}).lean();
  res.json(items);
});

router.post('/', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item = new Servicing({ id: generateId(), ...req.body, created_at: now });
  await item.save();
  res.status(201).json(item.toJSON());
});

router.patch('/:id', async (req: Request, res: Response) => {
  const item = await Servicing.findOneAndUpdate(
    { id: req.params.id },
    { $set: { ...req.body, updated_at: new Date().toISOString() } },
    { new: true }
  ).lean();
  if (!item) { res.status(404).json({ detail: 'Servicing not found' }); return; }
  res.json(item);
});

router.patch('/:id/status', async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['pending', 'in_progress', 'completed', 'delivered'].includes(status)) {
    res.status(400).json({ detail: 'Invalid status' });
    return;
  }
  const item = await Servicing.findOneAndUpdate(
    { id: req.params.id },
    { $set: { status, updated_at: new Date().toISOString() } },
    { new: true }
  ).lean();
  if (!item) { res.status(404).json({ detail: 'Servicing not found' }); return; }
  res.json(item);
});

router.delete('/:id', async (req: Request, res: Response) => {
  await Servicing.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
