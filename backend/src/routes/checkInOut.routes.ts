import { Router, Request, Response } from 'express';
import { CheckInOut } from '../models/CheckInOut';
import { generateId } from '../utils/invoice';
import { verifyJWT } from '../middleware/auth';

const router = Router();
router.use(verifyJWT);

router.post('/check-in', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item = new CheckInOut({
    id: generateId(),
    user_id: req.body.user_id,
    user_name: req.body.user_name,
    action: 'check_in',
    timestamp: now,
    note: req.body.note || '',
    created_at: now,
  });
  await item.save();
  res.status(201).json(item.toJSON());
});

router.post('/check-out', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item = new CheckInOut({
    id: generateId(),
    user_id: req.body.user_id,
    user_name: '',
    action: 'check_out',
    timestamp: now,
    note: req.body.note || '',
    created_at: now,
  });
  await item.save();
  res.status(201).json(item.toJSON());
});

router.get('/today', async (_req: Request, res: Response) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const items = await CheckInOut.find({
    timestamp: { $gte: start.toISOString(), $lte: end.toISOString() },
  }).sort({ timestamp: -1 }).lean();
  res.json(items);
});

router.get('/user/:userId', async (req: Request, res: Response) => {
  const items = await CheckInOut.find({ user_id: req.params.userId })
    .sort({ timestamp: -1 }).lean();
  res.json(items);
});

export default router;
