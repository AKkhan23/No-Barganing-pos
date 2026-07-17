import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Attendance } from '../models/Attendance';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const CheckInSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const CheckOutSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

router.post('/check-in', verifyJWT, validate(CheckInSchema), async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const existing = await Attendance.findOne({ user_id: req.user!.id, date: dateStr }).lean();
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
    });
    await record.save();
    res.status(201).json({ id: record.id, user_id: record.user_id, user_name: record.user_name, check_in: record.check_in, date: record.date });
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

router.post('/check-out', verifyJWT, validate(CheckOutSchema), async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const record = await Attendance.findOne({ user_id: req.user!.id, date: dateStr, check_out: { $exists: false } });
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

router.get('/', verifyJWT, requireRoles('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const filter: any = {};
    if (req.query.date) filter.date = req.query.date;
    if (req.query.user_id) filter.user_id = req.query.user_id;
    const records = await Attendance.find(filter).sort({ date: -1 }).lean();
    res.json(records.map((r: any) => ({ id: r.id, user_id: r.user_id, user_name: r.user_name, role: r.role, check_in: r.check_in, check_out: r.check_out, date: r.date, total_hours: r.total_hours })));
  } catch (err: any) { res.status(500).json({ detail: err.message }); }
});

router.get('/summary', verifyJWT, requireRoles('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const month = req.query.month as string;
    if (!month) { res.status(400).json({ detail: 'month query param required (e.g. 2026-07)' }); return; }
    const records = await Attendance.find({ date: { $regex: `^${month}` } }).lean();
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
