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
  const now = new Date().toISOString();
  const item = new CheckInOut({
    id: generateId(),
    user_id: req.body.user_id,
    user_name: req.body.user_name,
    action: 'check_in',
    timestamp: now,
    note: req.body.note || '',
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
  const now = new Date().toISOString();
  const item = new CheckInOut({
    id: generateId(),
    user_id: req.body.user_id,
    user_name: '',
    action: 'check_out',
    timestamp: now,
    note: req.body.note || '',
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

export default router;
