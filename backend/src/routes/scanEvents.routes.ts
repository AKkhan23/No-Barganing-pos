import { Router, Request, Response } from 'express';
import { ScanEvent } from '../models/ScanEvent';
import { generateId } from '../utils/invoice';
import { verifyJWT } from '../middleware/auth';

const router = Router();
router.use(verifyJWT);

// Cleanup old scan events every 10 minutes
const CLEANUP_AFTER_MS = 10 * 60 * 1000;
setInterval(async () => {
  const cutoff = new Date(Date.now() - CLEANUP_AFTER_MS).toISOString();
  await ScanEvent.deleteMany({ created_at: { $lt: cutoff } });
}, CLEANUP_AFTER_MS).unref();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { barcode, product_id } = req.body;
    if (!barcode || !product_id) {
      return res.status(400).json({ detail: 'barcode and product_id are required' });
    }
    const event = await ScanEvent.create({
      id: generateId(),
      barcode,
      product_id,
      scanned_by: (req as any).user.id,
      created_at: new Date().toISOString(),
    });
    res.status(201).json(event);
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const since = req.query.since as string;
    const userId = (req as any).user.id;
    const filter: any = { scanned_by: { $ne: userId } };
    if (since) {
      filter.created_at = { $gt: since };
    }
    const events = await ScanEvent.find(filter).sort({ created_at: 1 }).limit(10).lean();
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});

export default router;
