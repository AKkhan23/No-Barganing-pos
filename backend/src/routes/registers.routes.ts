import { Router, Request, Response } from 'express';
import { Register } from '../models/Register';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

router.get('/', async (_req: Request, res: Response) => {
  const items = await Register.find({}).lean();
  res.json(items);
});

router.get('/current', async (_req: Request, res: Response) => {
  const item = await Register.findOne({ is_active: true }).lean();
  if (!item) { res.status(404).json({ detail: 'No active register found' }); return; }
  res.json(item);
});

router.post('/', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item = new Register({ id: generateId(), ...req.body, created_at: now });
  await item.save();
  res.status(201).json(item.toJSON());
});

router.patch('/:id', async (req: Request, res: Response) => {
  const item = await Register.findOneAndUpdate(
    { id: req.params.id },
    { $set: { ...req.body, updated_at: new Date().toISOString() } },
    { new: true }
  ).lean();
  if (!item) { res.status(404).json({ detail: 'Register not found' }); return; }
  res.json(item);
});

router.delete('/:id', async (req: Request, res: Response) => {
  await Register.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
