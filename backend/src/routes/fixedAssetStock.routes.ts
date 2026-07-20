import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { FixedAssetStock } from '../models/FixedAssetStock';
import { FixedAsset } from '../models/FixedAsset';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const CreateMovementSchema = z.object({
  asset_id: z.string().min(1),
  type: z.enum(['in', 'out']),
  quantity: z.number().positive(),
  notes: z.string().optional(),
  reference: z.string().optional(),
  created_by: z.string().optional(),
});

router.post('/', validate(CreateMovementSchema), async (req: Request, res: Response) => {
  try {
    const asset = await FixedAsset.findOne({ id: req.body.asset_id }).lean();
    if (!asset) {
      res.status(404).json({ detail: 'Fixed asset not found' });
      return;
    }
    if (req.body.type === 'out') {
      const movements = await FixedAssetStock.find({ asset_id: req.body.asset_id }).lean();
      const totalIn = movements.filter(m => m.type === 'in').reduce((s, m) => s + m.quantity, 0);
      const totalOut = movements.filter(m => m.type === 'out').reduce((s, m) => s + m.quantity, 0);
      if (req.body.quantity > (totalIn - totalOut)) {
        res.status(400).json({ detail: 'Insufficient stock: cannot move out more than current balance' });
        return;
      }
    }
    const now = new Date().toISOString();
    const movement = new FixedAssetStock({
      ...req.body,
      id: generateId(),
      asset_name: asset.name,
      created_at: now,
    });
    await movement.save();
    res.status(201).json({
      id: movement.id, asset_id: movement.asset_id, asset_name: movement.asset_name,
      type: movement.type, quantity: movement.quantity, quantity_unit: movement.quantity_unit,
      notes: movement.notes, reference: movement.reference, created_by: movement.created_by, created_at: movement.created_at,
    });
  } catch (err: any) {
    res.status(400).json({ detail: err.message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const filter: any = {};
    if (req.query.asset_id) filter.asset_id = req.query.asset_id;
    const movements = await FixedAssetStock.find(filter).sort({ created_at: -1 }).lean();
    res.json(movements.map(m => ({
      id: m.id, asset_id: m.asset_id, asset_name: m.asset_name,
      type: m.type, quantity: m.quantity, quantity_unit: m.quantity_unit,
      notes: m.notes, reference: m.reference, created_by: m.created_by, created_at: m.created_at,
    })));
  } catch (err: any) {
    res.status(400).json({ detail: err.message });
  }
});

router.get('/asset/:assetId', async (req: Request, res: Response) => {
  try {
    const asset = await FixedAsset.findOne({ id: req.params.assetId }).lean();
    if (!asset) {
      res.status(404).json({ detail: 'Fixed asset not found' });
      return;
    }
    const movements = await FixedAssetStock.find({ asset_id: req.params.assetId }).lean();
    const totalIn = movements.filter(m => m.type === 'in').reduce((s, m) => s + m.quantity, 0);
    const totalOut = movements.filter(m => m.type === 'out').reduce((s, m) => s + m.quantity, 0);
    res.json({ asset_id: req.params.assetId, asset_name: asset.name, total_in: totalIn, total_out: totalOut, current_balance: totalIn - totalOut });
  } catch (err: any) {
    res.status(400).json({ detail: err.message });
  }
});

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const movements = await FixedAssetStock.find().lean();
    const grouped: Record<string, { asset_id: string; asset_name: string; total_in: number; total_out: number }> = {};
    for (const m of movements) {
      if (!grouped[m.asset_id]) {
        grouped[m.asset_id] = { asset_id: m.asset_id, asset_name: m.asset_name, total_in: 0, total_out: 0 };
      }
      if (m.type === 'in') grouped[m.asset_id].total_in += m.quantity;
      else grouped[m.asset_id].total_out += m.quantity;
    }
    const result = Object.values(grouped).map(g => ({ ...g, balance: g.total_in - g.total_out }));
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ detail: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await FixedAssetStock.deleteOne({ id: req.params.id });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ detail: err.message });
  }
});

export default router;
