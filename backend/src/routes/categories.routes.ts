import { Router, Request, Response } from 'express';
import { Category } from '../models/Category';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

router.get('/', async (_req: Request, res: Response) => {
  const categories = await Category.find({}).lean();
  res.json(categories.map((c: any) => ({ id: c.id, name: c.name, description: c.description, created_at: c.created_at })));
});

router.post('/', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const cat = new Category({ id: generateId(), name: req.body.name, description: req.body.description || '', created_at: now });
  await cat.save();
  res.status(201).json({ id: cat.id, name: cat.name, description: cat.description, created_at: cat.created_at });
});

router.patch('/:id', async (req: Request, res: Response) => {
  const cat = await Category.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true }).lean();
  if (!cat) { res.status(404).json({ detail: 'Category not found' }); return; }
  res.json({ id: cat.id, name: cat.name, description: cat.description, created_at: cat.created_at });
});

router.delete('/:id', async (req: Request, res: Response) => {
  await Category.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;