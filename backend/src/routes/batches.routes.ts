import { Router, Request, Response } from 'express';
import { StockBatch } from '../models/StockBatch';
import { Product } from '../models/Product';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

router.get('/product/:productId', async (req: Request, res: Response) => {
  const batches = await StockBatch.find({ product_id: req.params.productId }).sort({ expiry_date: 1, created_at: 1 }).lean();
  res.json(batches);
});

router.get('/expired', async (req: Request, res: Response) => {
  const today = new Date().toISOString().slice(0, 10);
  const batches = await StockBatch.find({ expiry_date: { $lte: today }, quantity: { $gt: 0 } }).sort({ expiry_date: 1 }).lean();
  res.json(batches);
});

router.post('/', async (req: Request, res: Response) => {
  const { product_id, batch_no, expiry_date, mfg_date, quantity, cost_price } = req.body;
  const product = await Product.findOne({ id: product_id }).lean();
  if (!product) { res.status(404).json({ detail: 'Product not found' }); return; }
  const existing = await StockBatch.findOne({ product_id, batch_no }).lean();
  if (existing) {
    await StockBatch.updateOne({ product_id, batch_no }, { $inc: { quantity: Number(quantity) || 0 } });
    const updated = await StockBatch.findOne({ product_id, batch_no }).lean();
    res.json(updated);
    return;
  }
  const batch = new StockBatch({
    id: generateId(),
    product_id,
    product_name: product.name,
    batch_no,
    expiry_date: expiry_date || '',
    mfg_date: mfg_date || '',
    quantity: Number(quantity) || 0,
    cost_price: Number(cost_price) || 0,
    created_at: new Date().toISOString(),
  });
  await batch.save();
  await Product.findOneAndUpdate({ id: product_id }, { $inc: { stock: Number(quantity) || 0 } });
  res.status(201).json(batch.toJSON());
});

router.patch('/:id', async (req: Request, res: Response) => {
  const batch = await StockBatch.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true }).lean();
  if (!batch) { res.status(404).json({ detail: 'Batch not found' }); return; }
  res.json(batch);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const batch = await StockBatch.findOne({ id: req.params.id }).lean();
  if (!batch) { res.status(404).json({ detail: 'Batch not found' }); return; }
  await Product.findOneAndUpdate({ id: batch.product_id }, { $inc: { stock: -batch.quantity } });
  await StockBatch.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

router.post('/deduct-fifo', async (req: Request, res: Response) => {
  const { product_id, quantity } = req.body;
  const needed = Number(quantity) || 0;
  if (needed <= 0) { res.status(400).json({ detail: 'Invalid quantity' }); return; }

  const product = await Product.findOne({ id: product_id }).lean();
  if (!product) { res.status(404).json({ detail: 'Product not found' }); return; }

  const batches = await StockBatch.find({ product_id, quantity: { $gt: 0 } }).sort({ expiry_date: 1, created_at: 1 }).lean();
  let remaining = needed;
  const deducted: any[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const batch of batches) {
    if (remaining <= 0) break;
    if (batch.expiry_date && batch.expiry_date <= today) continue;

    const deduct = Math.min(remaining, batch.quantity);
    await StockBatch.updateOne({ id: batch.id }, { $inc: { quantity: -deduct } });
    remaining -= deduct;
    deducted.push({ batch_id: batch.id, batch_no: batch.batch_no, quantity: deduct });
  }

  if (remaining > 0) {
    res.status(400).json({ detail: `Insufficient non-expired stock. Short by ${remaining} units.` });
    return;
  }

  await Product.findOneAndUpdate({ id: product_id }, { $inc: { stock: -needed } });
  res.json({ deducted, product_id, quantity: needed });
});

router.get('/check-expiry/:productId', async (req: Request, res: Response) => {
  const today = new Date().toISOString().slice(0, 10);
  const product = await Product.findOne({ id: req.params.productId }).lean();
  if (!product) { res.status(404).json({ detail: 'Product not found' }); return; }

  const expiredBatches = await StockBatch.find({
    product_id: req.params.productId,
    expiry_date: { $lte: today, $ne: '' },
    quantity: { $gt: 0 },
  }).sort({ expiry_date: 1 }).lean();

  const totalExpired = expiredBatches.reduce((s, b) => s + b.quantity, 0);
  const totalBatches = await StockBatch.find({ product_id: req.params.productId, quantity: { $gt: 0 } }).lean();
  const hasNonExpired = totalBatches.some(b => !b.expiry_date || b.expiry_date > today);

  res.json({
    product_id: req.params.productId,
    product_name: product.name,
    has_expired: expiredBatches.length > 0,
    expired_quantity: totalExpired,
    has_non_expired: hasNonExpired,
    expired_batches: expiredBatches.map(b => ({
      batch_no: b.batch_no, expiry_date: b.expiry_date, quantity: b.quantity,
    })),
  });
});

export default router;
