import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Counter } from '../models/Counter';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { scopeFilter } from '../middleware/scope';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

function buildFilter(id: string) {
  const filter: any[] = [{ id }];
  if (/^[0-9a-fA-F]{24}$/.test(id)) filter.push({ _id: new mongoose.Types.ObjectId(id) });
  return { $or: filter };
}

/**
 * @openapi
 * /counters:
 *   get:
 *     tags: [Counters]
 *     summary: List counters
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of counters
 */
router.get('/', async (_req: Request, res: Response) => {
  const items = await Counter.find(scopeFilter(_req)).lean();
  const mapped = [];
  for (const c of items) {
    if (!c.id) {
      c.id = generateId();
      try { await Counter.updateOne({ _id: c._id }, { $set: { id: c.id } }); } catch {
        try { await Counter.collection.updateOne({ _id: c._id as any }, { $set: { id: c.id } }); } catch {}
      }
    }
    mapped.push({ _id: c._id, id: c.id, name: c.name, outlet_id: c.outlet_id, printer_id: c.printer_id, description: c.description, created_at: c.created_at, updated_at: c.updated_at });
  }
  res.json(mapped);
});

/**
 * @openapi
 * /counters:
 *   post:
 *     tags: [Counters]
 *     summary: Create a counter
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               outlet_id:
 *                 type: string
 *               printer_id:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created counter
 */
router.post('/', async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const item = new Counter({ id: generateId(), ...req.body, created_at: now, created_by: req.user!.id });
  await item.save();
  res.status(201).json(item.toJSON());
});

/**
 * @openapi
 * /counters/{id}:
 *   patch:
 *     tags: [Counters]
 *     summary: Update a counter
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Counter ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               outlet_id:
 *                 type: string
 *               printer_id:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated counter
 *       404:
 *         description: Not found
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const sf = scopeFilter(req);
  const item = await Counter.findOneAndUpdate({ $and: [buildFilter(req.params.id), sf] }, { $set: req.body }, { new: true }).lean();
  if (!item) { res.status(404).json({ detail: 'Counter not found' }); return; }
  res.json({ id: item.id, name: item.name, outlet_id: item.outlet_id, printer_id: item.printer_id, description: item.description, created_at: item.created_at, updated_at: item.updated_at });
});

/**
 * @openapi
 * /counters/{id}:
 *   delete:
 *     tags: [Counters]
 *     summary: Delete a counter
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Counter ID
 *     responses:
 *       200:
 *         description: Deleted successfully
 *       404:
 *         description: Not found
 */
router.delete('/:id', async (req: Request, res: Response) => {
  let r = await Counter.deleteOne({ $and: [buildFilter(req.params.id), scopeFilter(req)] });
  if (r.deletedCount === 0) {
    r = await Counter.collection.deleteOne({ $or: [{ _id: req.params.id as any }, { id: req.params.id }] });
  }
  if (r.deletedCount === 0) { res.status(404).json({ detail: 'Counter not found' }); return; }
  res.json({ ok: true });
});

export default router;
