import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DeliveryPartner } from '../models/DeliveryPartner';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager'));

const CreatePartnerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  vehicle_no: z.string().optional(),
  commission_type: z.string().default('fixed'),
  commission_value: z.number().default(0),
  active: z.boolean().default(true),
});

const UpdatePartnerSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  vehicle_no: z.string().optional(),
  commission_type: z.string().optional(),
  commission_value: z.number().optional(),
  active: z.boolean().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  const filter: any = {};
  if (req.query.active_only === 'true') filter.active = true;
  const partners = await DeliveryPartner.find(filter).lean();
  res.json(partners.map((p: any) => ({ id: p.id, name: p.name, phone: p.phone, email: p.email, address: p.address, vehicle_no: p.vehicle_no, commission_type: p.commission_type, commission_value: p.commission_value, active: p.active, created_at: p.created_at })));
});

router.post('/', validate(CreatePartnerSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const partner = new DeliveryPartner({ ...req.body, id: generateId(), created_at: now });
  await partner.save();
  res.status(201).json({ id: partner.id, name: partner.name, phone: partner.phone, email: partner.email, address: partner.address, vehicle_no: partner.vehicle_no, commission_type: partner.commission_type, commission_value: partner.commission_value, active: partner.active, created_at: partner.created_at });
});

router.patch('/:id', validate(UpdatePartnerSchema), async (req: Request, res: Response) => {
  const partner = await DeliveryPartner.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true }).lean();
  if (!partner) { res.status(404).json({ detail: 'Delivery partner not found' }); return; }
  res.json({ id: partner.id, name: partner.name, phone: partner.phone, email: partner.email, address: partner.address, vehicle_no: partner.vehicle_no, commission_type: partner.commission_type, commission_value: partner.commission_value, active: partner.active });
});

router.delete('/:id', async (req: Request, res: Response) => {
  await DeliveryPartner.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
