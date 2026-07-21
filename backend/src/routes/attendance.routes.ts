import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Attendance } from '../models/Attendance';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { scopeFilter } from '../middleware/scope';

const router = Router();

const CheckInSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const CheckOutSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

/**
 * @openapi
 * /attendance/check-in:
 *   post:
 *     tags: [Attendance]
 *     summary: Check in for the day
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               latitude: { type: number }
 *               longitude: { type: number }
 *     responses:
 *       201:
 *         description: Check-in record created
 *       400:
 *         description: Already checked in today
 */
router.post('/check-in', verifyJWT, validate(CheckInSchema), async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const existing = await Attendance.findOne({ ...scopeFilter(req), user_id: req.user!.id, date: dateStr }).lean();
    if (existing) { res.status(400).json({ detail: 'Already checked in today' }); return; }
    const record = new Attendance({
      id: generateId(),
      user_id: req.user!.id,
      user_name: req.user!.name,
      role: req.user!.role,
      check_in: now.toISOString(),
      date: dateStr,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      total_hours: 0,
      created_at: now.toISOString(),
      created_by: req.user!.id,
    });
    await record.save();
    res.status(201).json({ id: record.id, user_id: record.user_id, user_name: record.user_name, check_in: record.check_in, date: record.date });
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

/**
 * @openapi
 * /attendance/check-out:
 *   post:
 *     tags: [Attendance]
 *     summary: Check out for the day
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               latitude: { type: number }
 *               longitude: { type: number }
 *     responses:
 *       200:
 *         description: Check-out record updated
 *       400:
 *         description: No open check-in record found
 */
router.post('/check-out', verifyJWT, validate(CheckOutSchema), async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const record = await Attendance.findOne({ ...scopeFilter(req), user_id: req.user!.id, date: dateStr, check_out: { $exists: false } });
    if (!record) { res.status(400).json({ detail: 'No open check-in record found for today' }); return; }
    record.check_out = now.toISOString();
    const checkInTime = new Date(record.check_in!).getTime();
    const diffMs = now.getTime() - checkInTime;
    record.total_hours = Math.round((diffMs / 3600000) * 100) / 100;
    if (req.body.latitude !== undefined) record.latitude = req.body.latitude;
    if (req.body.longitude !== undefined) record.longitude = req.body.longitude;
    await record.save();
    res.json({ id: record.id, user_id: record.user_id, user_name: record.user_name, check_in: record.check_in, check_out: record.check_out, total_hours: record.total_hours, date: record.date });
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

/**
 * @openapi
 * /attendance:
 *   get:
 *     tags: [Attendance]
 *     summary: List attendance records
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string }
 *         description: Filter by date (YYYY-MM-DD)
 *       - in: query
 *         name: user_id
 *         schema: { type: string }
 *         description: Filter by user ID
 *     responses:
 *       200:
 *         description: Array of attendance records
 */
router.get('/', verifyJWT, requireRoles('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const filter: any = {};
    if (req.query.date) filter.date = req.query.date;
    if (req.query.user_id) filter.user_id = req.query.user_id;
    const sf = scopeFilter(req);
    const records = await Attendance.find({ ...sf, ...filter }).sort({ date: -1 }).lean();
    res.json(records.map((r: any) => ({ id: r.id, user_id: r.user_id, user_name: r.user_name, role: r.role, check_in: r.check_in, check_out: r.check_out, date: r.date, total_hours: r.total_hours })));
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

/**
 * @openapi
 * /attendance/summary:
 *   get:
 *     tags: [Attendance]
 *     summary: Get attendance summary for a month
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: string }
 *         description: Month in YYYY-MM format (e.g. 2026-07)
 *     responses:
 *       200:
 *         description: Array of user attendance summaries
 */
router.get('/summary', verifyJWT, requireRoles('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const month = req.query.month as string;
    if (!month) { res.status(400).json({ detail: 'month query param required (e.g. 2026-07)' }); return; }
    const sf = scopeFilter(req);
    const records = await Attendance.find({ ...sf, date: { $regex: `^${month}` } }).lean();
    const grouped: Record<string, { user_id: string; user_name: string; total_days: number; total_hours: number }> = {};
    for (const r of records) {
      if (!grouped[r.user_id]) grouped[r.user_id] = { user_id: r.user_id, user_name: r.user_name, total_days: 0, total_hours: 0 };
      grouped[r.user_id].total_days += 1;
      grouped[r.user_id].total_hours += r.total_hours || 0;
    }
    res.json(Object.values(grouped));
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

export default router;
