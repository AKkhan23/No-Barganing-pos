import { Router, Request, Response } from 'express';
import { CheckInOut } from '../models/CheckInOut';
import { generateId } from '../utils/invoice';
import { verifyJWT } from '../middleware/auth';
import { scopeFilter } from '../middleware/scope';

const router = Router();
router.use(verifyJWT);

/**
 * @openapi
 * /check-in-out/check-in:
 *   post:
 *     tags: [Check In Out]
 *     summary: Record a check-in action
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, user_name]
 *             properties:
 *               user_id: { type: string }
 *               user_name: { type: string }
 *               note: { type: string }
 *     responses:
 *       201:
 *         description: Check-in recorded
 */
router.post('/check-in', async (req: Request, res: Response) => {
  if (!req.body.note?.trim()) { res.status(400).json({ detail: 'Note is required for check-in' }); return; }
  const now = new Date().toISOString();
  const item = new CheckInOut({
    id: generateId(),
    user_id: req.body.user_id,
    user_name: req.body.user_name,
    action: 'check_in',
    timestamp: now,
    note: req.body.note.trim(),
    created_at: now,
    created_by: req.user!.id,
  });
  await item.save();
  res.status(201).json(item.toJSON());
});

/**
 * @openapi
 * /check-in-out/check-out:
 *   post:
 *     tags: [Check In Out]
 *     summary: Record a check-out action
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id: { type: string }
 *               note: { type: string }
 *     responses:
 *       201:
 *         description: Check-out recorded
 */
router.post('/check-out', async (req: Request, res: Response) => {
  if (!req.body.note?.trim()) { res.status(400).json({ detail: 'Note is required for check-out' }); return; }
  const now = new Date().toISOString();
  const userName = req.body.user_name || (await CheckInOut.findOne(
    { user_id: req.body.user_id, action: 'check_in' },
  ).sort({ timestamp: -1 }).lean())?.user_name || 'Staff';
  const item = new CheckInOut({
    id: generateId(),
    user_id: req.body.user_id,
    user_name: userName,
    action: 'check_out',
    timestamp: now,
    note: req.body.note.trim(),
    created_at: now,
    created_by: req.user!.id,
  });
  await item.save();
  res.status(201).json(item.toJSON());
});

/**
 * @openapi
 * /check-in-out/today:
 *   get:
 *     tags: [Check In Out]
 *     summary: Get today's check-in/check-out records
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of today's records
 */
router.get('/today', async (_req: Request, res: Response) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const items = await CheckInOut.find({
    ...scopeFilter(_req),
    timestamp: { $gte: start.toISOString(), $lte: end.toISOString() },
  }).sort({ timestamp: -1 }).lean();
  res.json(items);
});

/**
 * @openapi
 * /check-in-out/user/{userId}:
 *   get:
 *     tags: [Check In Out]
 *     summary: Get check-in/check-out records for a user
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of user records
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  const items = await CheckInOut.find({ ...scopeFilter(req), user_id: req.params.userId })
    .sort({ timestamp: -1 }).lean();
  res.json(items);
});

/**
 * @openapi
 * /check-in-out/{id}:
 *   delete:
 *     tags: [Check In Out]
 *     summary: Delete a check-in/out record
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Record deleted
 *       404:
 *         description: Record not found
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const record = await CheckInOut.findOneAndDelete({ id: req.params.id });
  if (!record) { res.status(404).json({ detail: 'Record not found' }); return; }
  res.json({ ok: true, deleted: record.id });
});

export default router;
