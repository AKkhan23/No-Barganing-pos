import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Product } from '../models/Product';
import { StockMovement } from '../models/StockMovement';
import { Order } from '../models/Order';
import { generateId, computeEAN13, generateBarcode12 } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const CreateProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  category: z.string().optional(),
  price: z.number().positive(),
  cost: z.number().default(0),
  tax_rate: z.number().default(0),
  stock: z.number().default(0),
  low_stock_threshold: z.number().default(5),
  unit: z.string().default('pcs'),
  sell_by: z.string().default('pcs'),
  image_url: z.string().optional(),
  brand: z.string().optional(),
  rack: z.string().optional(),
  variant_group_id: z.string().optional(),
  variant_name: z.string().optional(),
});

const UpdateProductSchema = z.object({
  name: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string().optional(),
  price: z.number().positive().optional(),
  cost: z.number().optional(),
  tax_rate: z.number().optional(),
  stock: z.number().optional(),
  low_stock_threshold: z.number().optional(),
  unit: z.string().optional(),
  sell_by: z.string().optional(),
  image_url: z.string().optional(),
  active: z.boolean().optional(),
  brand: z.string().optional(),
  rack: z.string().optional(),
  variant_group_id: z.string().optional(),
  variant_name: z.string().optional(),
});

const VariantItemSchema = z.object({
  variant_name: z.string().min(1),
  sku: z.string().min(1),
  price: z.number().positive(),
  cost: z.number().default(0),
  stock: z.number().default(0),
  barcode: z.string().optional(),
});

const CreateProductWithVariantsSchema = CreateProductSchema.extend({
  variants: z.array(VariantItemSchema).optional(),
});

router.get('/', verifyJWT, requireRoles('admin', 'manager', 'cashier'), async (req: Request, res: Response) => {
  const q = req.query.q as string | undefined;
  const category = req.query.category as string | undefined;
  const lowStock = req.query.low_stock as string | undefined;
  const limit = parseInt(req.query.limit as string || '200', 10);
  const filter: any = {};
  if (q) { filter.$or = [{ name: { $regex: q, $options: 'i' } }, { sku: { $regex: q, $options: 'i' } }, { barcode: { $regex: q, $options: 'i' } }]; }
  if (category) filter.category = category;
  if (lowStock === 'true') filter.$expr = { $lte: ['$stock', '$low_stock_threshold'] };
  const products = await Product.find(filter as any).limit(limit).select('-_id -__v').lean();

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const productIds = products.map((p: any) => p.id);
  const todaySales = await Order.aggregate([
    { $match: { created_at: { $gte: todayStart.toISOString(), $lte: todayEnd.toISOString() } } },
    { $unwind: '$items' },
    { $match: { 'items.product_id': { $in: productIds } } },
    { $group: { _id: '$items.product_id', qty: { $sum: '$items.quantity' }, rev: { $sum: '$items.total' } } },
  ]);
  const soldMap: Record<string, { qty: number; rev: number }> = {};
  for (const s of todaySales) { soldMap[s._id] = { qty: s.qty || 0, rev: s.rev || 0 }; }

  res.json(products.map((p: any) => ({
    ...p,
    sold_today: soldMap[p.id]?.qty || 0,
    revenue_today: soldMap[p.id]?.rev || 0,
  })));
});

router.get('/barcode/:code', verifyJWT, requireRoles('admin', 'manager', 'cashier'), async (req: Request, res: Response) => {
  const code = req.params.code;
  let product = await Product.findOne({ $or: [{ barcode: code }, { sku: code }] }).select('-_id -__v').lean();
  // Scanner may strip EAN-13 check digit → try both with and without it
  if (!product && /^\d{12}$/.test(code)) {
    const withCheck = computeEAN13(code);
    product = await Product.findOne({ barcode: withCheck }).select('-_id -__v').lean();
  }
  if (!product && /^\d{13}$/.test(code)) {
    const withoutCheck = code.slice(0, -1);
    product = await Product.findOne({ barcode: withoutCheck }).select('-_id -__v').lean();
  }
  // Some products may have barcode stored as trimmed number (no leading zeros)
  if (!product) {
    const stripped = String(Number(code));
    product = await Product.findOne({ $or: [{ barcode: stripped }, { sku: stripped }] }).select('-_id -__v').lean();
  }
  if (!product) {
    const withCheck = /^\d{12}$/.test(code) ? computeEAN13(code) : null;
    res.status(404).json({ detail: 'Product not found', scanned: code, computed_ean13: withCheck });
    return;
  }
  res.json(product);
});

router.get('/:id', verifyJWT, requireRoles('admin', 'manager', 'cashier'), async (req: Request, res: Response) => {
  const product = await Product.findOne({ id: req.params.id }).select('-_id -__v').lean();
  if (!product) { res.status(404).json({ detail: 'Product not found' }); return; }
  res.json(product);
});

router.get('/:id/variants', verifyJWT, requireRoles('admin', 'manager', 'cashier'), async (req: Request, res: Response) => {
  const product = await Product.findOne({ id: req.params.id }).select('variant_group_id').lean();
  if (!product || !product.variant_group_id) { res.json([]); return; }
  const variants = await Product.find({ variant_group_id: product.variant_group_id }).select('-_id -__v').lean();
  res.json(variants);
});

router.post('/', verifyJWT, requireRoles('admin', 'manager'), validate(CreateProductWithVariantsSchema), async (req: Request, res: Response) => {
  const existing = await Product.findOne({ sku: req.body.sku });
  if (existing) { res.status(409).json({ detail: 'SKU already exists' }); return; }
  const now = new Date().toISOString();
  let barcode = req.body.barcode;
  if (!barcode) {
    barcode = generateBarcode12(req.body.sku + generateId().replace(/-/g, '').slice(0, 4));
  }
  const variantGroupId = req.body.variants?.length ? generateId() : undefined;
  const product = new Product({
    ...req.body,
    barcode,
    id: generateId(),
    variant_group_id: variantGroupId,
    stock: req.body.stock || 0,
    created_at: now, updated_at: now,
  });
  await product.save();

  const createdVariants: any[] = [];
  if (req.body.variants?.length) {
    for (const v of req.body.variants) {
      const vSku = v.sku;
      const vExists = await Product.findOne({ sku: vSku });
      if (vExists) continue;
      let vBarcode = v.barcode;
      if (!vBarcode) {
        vBarcode = generateBarcode12(vSku + generateId().replace(/-/g, '').slice(0, 4));
      }
      const variant = new Product({
        name: `${req.body.name} ${v.variant_name}`,
        sku: vSku,
        barcode: vBarcode,
        category: req.body.category,
        price: v.price,
        cost: v.cost || 0,
        tax_rate: req.body.tax_rate,
        stock: v.stock || 0,
        low_stock_threshold: req.body.low_stock_threshold,
        unit: req.body.unit,
        sell_by: req.body.sell_by,
        variant_group_id: variantGroupId,
        variant_name: v.variant_name,
        id: generateId(),
        active: true,
        created_at: now, updated_at: now,
      });
      await variant.save();
      createdVariants.push(variant.toJSON());
    }
  }

  res.status(201).json({ product: product.toJSON(), variants: createdVariants });
});

router.post('/bulk-update', verifyJWT, requireRoles('admin'), async (req: Request, res: Response) => {
  const { ids, updates } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) { res.status(400).json({ detail: 'ids must be a non-empty array' }); return; }
  if (!updates || !updates.field || updates.value === undefined) { res.status(400).json({ detail: 'updates must have field and value' }); return; }
  const result = await Product.updateMany(
    { id: { $in: ids } },
    { $set: { [updates.field]: updates.value, updated_at: new Date().toISOString() } }
  );
  res.json({ ok: true, modified: result.modifiedCount });
});

router.patch('/:id', verifyJWT, requireRoles('admin', 'manager'), validate(UpdateProductSchema), async (req: Request, res: Response) => {
  const update: any = { ...req.body, updated_at: new Date().toISOString() };
  if (!update.barcode) {
    const existing = await Product.findOne({ id: req.params.id }).lean();
    if (existing && !existing.barcode) {
      update.barcode = generateBarcode12(existing.sku + generateId().replace(/-/g, '').slice(0, 4));
    }
  }
  const product = await Product.findOneAndUpdate({ id: req.params.id }, { $set: update }, { new: true }).lean();
  if (!product) { res.status(404).json({ detail: 'Product not found' }); return; }
  res.json(product);
});

router.delete('/:id', verifyJWT, requireRoles('admin', 'manager'), async (req: Request, res: Response) => {
  await Product.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

router.post('/:id/adjust-stock', verifyJWT, requireRoles('admin', 'manager'), async (req: Request, res: Response) => {
  const { quantity, note, type } = req.body;
  const product = await Product.findOne({ id: req.params.id });
  if (!product) { res.status(404).json({ detail: 'Product not found' }); return; }
  const adjQty = Number(quantity) || 0;
  product.stock += adjQty;
  product.updated_at = new Date().toISOString();
  await product.save();
  await StockMovement.create({
    id: generateId(), product_id: product.id, product_name: product.name,
    type: type || 'adjustment', quantity: adjQty,
    note: note || '', created_by_id: req.user?.id,
    created_at: new Date().toISOString(),
  });
  res.json({ id: product.id, stock: product.stock });
});

router.post('/:id/repack', verifyJWT, requireRoles('admin', 'manager'), async (req: Request, res: Response) => {
  const { packet_weight, packet_count, packet_name, packet_price } = req.body;
  const source = await Product.findOne({ id: req.params.id });
  if (!source) { res.status(404).json({ detail: 'Source product not found' }); return; }
  const totalWeight = packet_weight * packet_count;
  if (source.stock < totalWeight) { res.status(400).json({ detail: 'Insufficient stock' }); return; }
  source.stock -= totalWeight;
  source.updated_at = new Date().toISOString();
  await source.save();
  const now = new Date().toISOString();
  const childSku = `${source.sku}-PKT`;
  const childBarcode = generateBarcode12(childSku + generateId().replace(/-/g, '').slice(0, 4));
  const newProduct = new Product({
    id: generateId(), name: packet_name || `${source.name} ${packet_weight}${source.unit}`,
    sku: childSku, barcode: childBarcode, category: source.category,
    price: packet_price || (source.price * packet_weight),
    cost: source.cost * packet_weight, tax_rate: source.tax_rate,
    stock: packet_count, low_stock_threshold: source.low_stock_threshold,
    unit: source.unit, sell_by: source.sell_by,
    repack_parent_id: source.id,
    created_at: now, updated_at: now,
  });
  await newProduct.save();
  await StockMovement.create({
    id: generateId(), product_id: source.id, product_name: source.name,
    type: 'repack_out', quantity: -totalWeight,
    note: `Repacked into ${packet_count} x ${packet_weight}${source.unit} packets`,
    created_by_id: req.user?.id, created_at: now,
  });
  res.status(201).json({ source: { id: source.id, stock: source.stock }, packet: newProduct.toJSON() });
});

router.get('/:id/repack-children', verifyJWT, async (req: Request, res: Response) => {
  const children = await Product.find({ repack_parent_id: req.params.id }).sort({ created_at: -1 });
  res.json(children);
});

router.post('/backfill-repack-parents', verifyJWT, requireRoles('admin'), async (_req: Request, res: Response) => {
  const orphans = await Product.find({ repack_parent_id: { $in: [null, '', undefined] }, sku: /-PKT$/ }).lean();
  let linked = 0; let barcoded = 0;
  for (const p of orphans) {
    const parentSku = (p as any).sku.replace(/-PKT$/, '');
    const parent = await Product.findOne({ sku: parentSku }).lean();
    if (parent) {
      await Product.updateOne({ id: (p as any).id }, { $set: { repack_parent_id: (parent as any).id } });
      linked++;
    }
    if (!(p as any).barcode) {
      const barcode = generateBarcode12((p as any).sku + generateId().replace(/-/g, '').slice(0, 4));
      await Product.updateOne({ id: (p as any).id }, { $set: { barcode } });
      barcoded++;
    }
  }
  res.json({ ok: true, linked, barcoded });
});

router.post('/backfill-barcodes', verifyJWT, requireRoles('admin'), async (_req: Request, res: Response) => {
  const products = await Product.find({ barcode: { $in: [null, '', undefined] } }).lean();
  let count = 0;
  for (const p of products) {
    const barcode = generateBarcode12((p as any).sku + generateId().replace(/-/g, '').slice(0, 4));
    await Product.updateOne({ id: (p as any).id }, { $set: { barcode } });
    count++;
  }
  res.json({ ok: true, backfilled: count });
});

export default router;