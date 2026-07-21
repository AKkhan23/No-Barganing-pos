import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Product } from '../models/Product';
import { StockMovement } from '../models/StockMovement';
import { Order } from '../models/Order';
import { generateId, computeEAN13, generateBarcode12 } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { scopeFilter } from '../middleware/scope';

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

/**
 * @openapi
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: List products with optional filters
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search by name, SKU, or barcode
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Filter by category ID
 *       - in: query
 *         name: low_stock
 *         schema: { type: string, enum: ["true"] }
 *         description: Filter low stock products
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 200 }
 *     responses:
 *       200:
 *         description: List of products with today's sales data
 */
router.get('/', verifyJWT, requireRoles('admin', 'manager', 'cashier'), async (req: Request, res: Response) => {
  const q = req.query.q as string | undefined;
  const category = req.query.category as string | undefined;
  const lowStock = req.query.low_stock as string | undefined;
  const limit = parseInt(req.query.limit as string || '200', 10);
  const filter: any = {};
  if (q) { filter.$or = [{ name: { $regex: q, $options: 'i' } }, { sku: { $regex: q, $options: 'i' } }, { barcode: { $regex: q, $options: 'i' } }]; }
  if (category) filter.category = category;
  if (lowStock === 'true') filter.$expr = { $lte: ['$stock', '$low_stock_threshold'] };
  const products = await Product.find({ ...scopeFilter(req), ...filter } as any).limit(limit).select('-_id -__v').lean();

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const productIds = products.map((p: any) => p.id);
  const sf = scopeFilter(req);
  const todaySales = await Order.aggregate([
    { $match: { ...sf, created_at: { $gte: todayStart.toISOString(), $lte: todayEnd.toISOString() } } },
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

/**
 * @openapi
 * /products/barcode/{code}:
 *   get:
 *     tags: [Products]
 *     summary: Lookup product by barcode or SKU
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *         description: Barcode or SKU to lookup
 *     responses:
 *       200:
 *         description: Product found
 *       404:
 *         description: Product not found
 */
router.get('/barcode/:code', verifyJWT, requireRoles('admin', 'manager', 'cashier'), async (req: Request, res: Response) => {
  const code = req.params.code;
  let product = await Product.findOne({ $and: [scopeFilter(req), { $or: [{ barcode: code }, { sku: code }] }] }).select('-_id -__v').lean();
  // Scanner may strip EAN-13 check digit → try both with and without it
  if (!product && /^\d{12}$/.test(code)) {
    const withCheck = computeEAN13(code);
    product = await Product.findOne({ ...scopeFilter(req), barcode: withCheck }).select('-_id -__v').lean();
  }
  if (!product && /^\d{13}$/.test(code)) {
    const withoutCheck = code.slice(0, -1);
    product = await Product.findOne({ ...scopeFilter(req), barcode: withoutCheck }).select('-_id -__v').lean();
  }
  // Some products may have barcode stored as trimmed number (no leading zeros)
  if (!product) {
    const stripped = String(Number(code));
    product = await Product.findOne({ $and: [scopeFilter(req), { $or: [{ barcode: stripped }, { sku: stripped }] }] }).select('-_id -__v').lean();
  }
  if (!product) {
    const withCheck = /^\d{12}$/.test(code) ? computeEAN13(code) : null;
    res.status(404).json({ detail: 'Product not found', scanned: code, computed_ean13: withCheck });
    return;
  }
  res.json(product);
});

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get a single product by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product data
 *       404:
 *         description: Product not found
 */
router.get('/:id', verifyJWT, requireRoles('admin', 'manager', 'cashier'), async (req: Request, res: Response) => {
  const product = await Product.findOne({ ...scopeFilter(req), id: req.params.id }).select('-_id -__v').lean();
  if (!product) { res.status(404).json({ detail: 'Product not found' }); return; }
  res.json(product);
});

/**
 * @openapi
 * /products/{id}/variants:
 *   get:
 *     tags: [Products]
 *     summary: Get all variants of a product
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of variant products
 */
router.get('/:id/variants', verifyJWT, requireRoles('admin', 'manager', 'cashier'), async (req: Request, res: Response) => {
  const product = await Product.findOne({ ...scopeFilter(req), id: req.params.id }).select('variant_group_id').lean();
  if (!product || !product.variant_group_id) { res.json([]); return; }
  const variants = await Product.find({ ...scopeFilter(req), variant_group_id: product.variant_group_id }).select('-_id -__v').lean();
  res.json(variants);
});

/**
 * @openapi
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Create a new product with optional variants
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, sku, price]
 *             properties:
 *               name: { type: string }
 *               sku: { type: string }
 *               barcode: { type: string }
 *               category: { type: string }
 *               price: { type: number }
 *               cost: { type: number, default: 0 }
 *               tax_rate: { type: number, default: 0 }
 *               stock: { type: number, default: 0 }
 *               low_stock_threshold: { type: number, default: 5 }
 *               unit: { type: string, default: "pcs" }
 *               sell_by: { type: string, default: "pcs" }
 *               brand: { type: string }
 *               rack: { type: string }
 *               variants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     variant_name: { type: string }
 *                     sku: { type: string }
 *                     price: { type: number }
 *                     cost: { type: number }
 *                     stock: { type: number }
 *                     barcode: { type: string }
 *     responses:
 *       201:
 *         description: Product created (with variants if any)
 *       409:
 *         description: SKU already exists
 */
router.post('/', verifyJWT, requireRoles('admin', 'manager'), validate(CreateProductWithVariantsSchema), async (req: Request, res: Response) => {
  const existing = await Product.findOne({ ...scopeFilter(req), sku: req.body.sku });
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
    created_by: req.user?.id,
    created_at: now, updated_at: now,
  });
  await product.save();

  const createdVariants: any[] = [];
  if (req.body.variants?.length) {
    for (const v of req.body.variants) {
      const vSku = v.sku;
      const vExists = await Product.findOne({ ...scopeFilter(req), sku: vSku });
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
        created_by: req.user?.id,
        created_at: now, updated_at: now,
      });
      await variant.save();
      createdVariants.push(variant.toJSON());
    }
  }

  res.status(201).json({ product: product.toJSON(), variants: createdVariants });
});

/**
 * @openapi
 * /products/bulk-update:
 *   post:
 *     tags: [Products]
 *     summary: Bulk update products (admin only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids, updates]
 *             properties:
 *               ids:
 *                 type: array
 *                 items: { type: string }
 *               updates:
 *                 type: object
 *                 properties:
 *                   field: { type: string }
 *                   value: {}
 *     responses:
 *       200:
 *         description: Products updated
 *       400:
 *         description: Invalid request body
 */
router.post('/bulk-update', verifyJWT, requireRoles('admin'), async (req: Request, res: Response) => {
  const { ids, updates } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) { res.status(400).json({ detail: 'ids must be a non-empty array' }); return; }
  if (!updates || !updates.field || updates.value === undefined) { res.status(400).json({ detail: 'updates must have field and value' }); return; }
  const result = await Product.updateMany(
    { ...scopeFilter(req), id: { $in: ids } },
    { $set: { [updates.field]: updates.value, updated_at: new Date().toISOString() } }
  );
  res.json({ ok: true, modified: result.modifiedCount });
});

/**
 * @openapi
 * /products/{id}:
 *   patch:
 *     tags: [Products]
 *     summary: Update a product
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               sku: { type: string }
 *               barcode: { type: string }
 *               category: { type: string }
 *               price: { type: number }
 *               cost: { type: number }
 *               tax_rate: { type: number }
 *               stock: { type: number }
 *               low_stock_threshold: { type: number }
 *               unit: { type: string }
 *               sell_by: { type: string }
 *               brand: { type: string }
 *               rack: { type: string }
 *               active: { type: boolean }
 *     responses:
 *       200:
 *         description: Product updated
 *       404:
 *         description: Product not found
 */
router.patch('/:id', verifyJWT, requireRoles('admin', 'manager'), validate(UpdateProductSchema), async (req: Request, res: Response) => {
  const update: any = { ...req.body, updated_at: new Date().toISOString() };
  if (!update.barcode) {
    const existing = await Product.findOne({ ...scopeFilter(req), id: req.params.id }).lean();
    if (existing && !existing.barcode) {
      update.barcode = generateBarcode12(existing.sku + generateId().replace(/-/g, '').slice(0, 4));
    }
  }
  const product = await Product.findOneAndUpdate({ ...scopeFilter(req), id: req.params.id }, { $set: update }, { new: true }).lean();
  if (!product) { res.status(404).json({ detail: 'Product not found' }); return; }
  res.json(product);
});

/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product deleted
 */
router.delete('/:id', verifyJWT, requireRoles('admin', 'manager'), async (req: Request, res: Response) => {
  await Product.deleteOne({ ...scopeFilter(req), id: req.params.id });
  res.json({ ok: true });
});

/**
 * @openapi
 * /products/{id}/adjust-stock:
 *   post:
 *     tags: [Products]
 *     summary: Adjust stock quantity for a product
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity: { type: number, description: "Can be positive or negative" }
 *               note: { type: string }
 *               type: { type: string, default: "adjustment" }
 *     responses:
 *       200:
 *         description: Stock adjusted
 *       404:
 *         description: Product not found
 */
router.post('/:id/adjust-stock', verifyJWT, requireRoles('admin', 'manager'), async (req: Request, res: Response) => {
  const { quantity, note, type } = req.body;
  const product = await Product.findOne({ ...scopeFilter(req), id: req.params.id });
  if (!product) { res.status(404).json({ detail: 'Product not found' }); return; }
  const adjQty = Number(quantity) || 0;
  product.stock += adjQty;
  product.updated_at = new Date().toISOString();
  await product.save();
  await StockMovement.create({
    id: generateId(), product_id: product.id, product_name: product.name,
    type: type || 'adjustment', quantity: adjQty,
    note: note || '', created_by_id: req.user?.id, created_by: req.user?.id,
    created_at: new Date().toISOString(),
  });
  res.json({ id: product.id, stock: product.stock });
});

/**
 * @openapi
 * /products/{id}/repack:
 *   post:
 *     tags: [Products]
 *     summary: Repack a bulk product into smaller packets
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [packet_weight, packet_count]
 *             properties:
 *               packet_weight: { type: number }
 *               packet_count: { type: number }
 *               packet_name: { type: string }
 *               packet_price: { type: number }
 *     responses:
 *       201:
 *         description: Repack successful
 *       400:
 *         description: Insufficient stock
 *       404:
 *         description: Source product not found
 */
router.post('/:id/repack', verifyJWT, requireRoles('admin', 'manager'), async (req: Request, res: Response) => {
  const { packet_weight, packet_count, packet_name, packet_price } = req.body;
  const source = await Product.findOne({ ...scopeFilter(req), id: req.params.id });
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
    created_by: req.user?.id,
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

/**
 * @openapi
 * /products/{id}/repack-children:
 *   get:
 *     tags: [Products]
 *     summary: Get all repack children of a product
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of repack children
 */
router.get('/:id/repack-children', verifyJWT, async (req: Request, res: Response) => {
  const children = await Product.find({ ...scopeFilter(req), repack_parent_id: req.params.id }).sort({ created_at: -1 });
  res.json(children);
});

/**
 * @openapi
 * /products/backfill-repack-parents:
 *   post:
 *     tags: [Products]
 *     summary: Backfill missing repack parent references (admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Backfill results
 */
router.post('/backfill-repack-parents', verifyJWT, requireRoles('admin'), async (_req: Request, res: Response) => {
  const orphans = await Product.find({ ...scopeFilter(_req), repack_parent_id: { $in: [null, '', undefined] }, sku: /-PKT$/ }).lean();
  let linked = 0; let barcoded = 0;
  for (const p of orphans) {
    const parentSku = (p as any).sku.replace(/-PKT$/, '');
    const parent = await Product.findOne({ ...scopeFilter(_req), sku: parentSku }).lean();
    if (parent) {
      await Product.updateOne({ ...scopeFilter(_req), id: (p as any).id }, { $set: { repack_parent_id: (parent as any).id } });
      linked++;
    }
    if (!(p as any).barcode) {
      const barcode = generateBarcode12((p as any).sku + generateId().replace(/-/g, '').slice(0, 4));
      await Product.updateOne({ ...scopeFilter(_req), id: (p as any).id }, { $set: { barcode } });
      barcoded++;
    }
  }
  res.json({ ok: true, linked, barcoded });
});

/**
 * @openapi
 * /products/backfill-barcodes:
 *   post:
 *     tags: [Products]
 *     summary: Backfill missing barcodes for all products (admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Number of products backfilled
 */
router.post('/backfill-barcodes', verifyJWT, requireRoles('admin'), async (_req: Request, res: Response) => {
  const products = await Product.find({ ...scopeFilter(_req), barcode: { $in: [null, '', undefined] } }).lean();
  let count = 0;
  for (const p of products) {
    const barcode = generateBarcode12((p as any).sku + generateId().replace(/-/g, '').slice(0, 4));
    await Product.updateOne({ ...scopeFilter(_req), id: (p as any).id }, { $set: { barcode } });
    count++;
  }
  res.json({ ok: true, backfilled: count });
});

export default router;