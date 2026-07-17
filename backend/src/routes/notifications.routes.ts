import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Notification } from '../models/Notification';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const CreateNotificationSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  ref: z.string().optional(),
});

router.post('/', validate(CreateNotificationSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const notification = new Notification({ ...req.body, id: generateId(), read: false, created_at: now });
  await notification.save();
  res.status(201).json({ id: notification.id, type: notification.type, title: notification.title, message: notification.message, ref: notification.ref, read: notification.read, created_at: notification.created_at });
});

router.get('/', async (req: Request, res: Response) => {
  const filter: any = {};
  if (req.query.unread_only === 'true') filter.read = false;
  const notifications = await Notification.find(filter).sort({ created_at: -1 }).lean();
  res.json(notifications.map((n: any) => ({ id: n.id, type: n.type, title: n.title, message: n.message, ref: n.ref, read: n.read, created_at: n.created_at })));
});

router.get('/unread-count', async (_req: Request, res: Response) => {
  const count = await Notification.countDocuments({ read: false });
  res.json({ count });
});

router.patch('/:id/read', async (req: Request, res: Response) => {
  const notification = await Notification.findOneAndUpdate({ id: req.params.id }, { $set: { read: true } }, { new: true }).lean();
  if (!notification) { res.status(404).json({ detail: 'Notification not found' }); return; }
  res.json({ id: notification.id, type: notification.type, title: notification.title, message: notification.message, ref: notification.ref, read: notification.read, created_at: notification.created_at });
});

router.post('/generate', async (_req: Request, res: Response) => {
  const now = new Date().toISOString();
  const created: any[] = [];

  const lowStockProducts = await (Product.find({ $expr: { $lte: ['$stock', '$low_stock_threshold'] }, active: true } as any).lean() as Promise<any[]>);
  for (const product of lowStockProducts) {
    const exists = await Notification.findOne({ type: 'low_stock', ref: product.id, read: false });
    if (!exists) {
      const n = new Notification({
        id: generateId(),
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `${product.name} has only ${product.stock} units left (threshold: ${product.low_stock_threshold})`,
        ref: product.id,
        read: false,
        created_at: now,
      });
      await n.save();
      created.push(n);
    }
  }

  const dueCustomers = await Customer.find({ receivable: { $gt: 0 } }).lean();
  for (const customer of dueCustomers) {
    const exists = await Notification.findOne({ type: 'due', ref: customer.id, read: false });
    if (!exists) {
      const n = new Notification({
        id: generateId(),
        type: 'due',
        title: 'Payment Due',
        message: `${customer.name} has a receivable balance of ${customer.receivable}`,
        ref: customer.id,
        read: false,
        created_at: now,
      });
      await n.save();
      created.push(n);
    }
  }

  res.json({ count: created.length });
});

export default router;
