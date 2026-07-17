import { Router, Request, Response } from 'express';
import { StockMovement } from '../models/StockMovement';
import { verifyJWT, requireRoles } from '../middleware/auth';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

router.get('/', async (req: Request, res: Response) => {
  const product_id = req.query.product_id as string | undefined;
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '100', 10);
  const skip = (page - 1) * limit;
  const filter: any = {};
  if (product_id) filter.product_id = product_id;
  const movements = await StockMovement.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).lean();
  res.json(movements.map((m: any) => ({ ...m, _id: undefined, __v: undefined })));
});

export default router;
