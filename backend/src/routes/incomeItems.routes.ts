import { Router, Request, Response } from 'express';
import { IncomeItem } from '../models/IncomeItem';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

router.get('/', async (_req: Request, res: Response) => {
  const items = await IncomeItem.find({}).lean();
  res.json(items);
});

router.post('/', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item = new IncomeItem({ id: generateId(), ...req.body, created_at: now });
  await item.save();
  res.status(201).json(item.toJSON());
});

router.patch('/:id', async (req: Request, res: Response) => {
  const item = await IncomeItem.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true }).lean();
  if (!item) { res.status(404).json({ detail: 'IncomeItem not found' }); return; }
  res.json(item);
});

router.delete('/:id', async (req: Request, res: Response) => {
  await IncomeItem.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
