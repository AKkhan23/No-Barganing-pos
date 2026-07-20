import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Customer } from '../models/Customer';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(verifyJWT, requireRoles('admin', 'manager', 'cashier'));

const CreateCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().optional(),
  address: z.string().optional(),
  opening_balance: z.number().default(0),
});

const UpdateCustomerSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  opening_balance: z.number().optional(),
});

/**
 * @openapi
 * /customers:
 *   get:
 *     tags: [Customers]
 *     summary: List all customers
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search by name, phone or email
 *     responses:
 *       200:
 *         description: Array of customers
 */
router.get('/', async (req: Request, res: Response) => {
  const q = req.query.q as string | undefined;
  const filter: any = {};
  if (q) { filter.$or = [{ name: { $regex: q, $options: 'i' } }, { phone: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }]; }
  const customers = await Customer.find(filter).lean();
  res.json(customers.map((c: any) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email, address: c.address, opening_balance: c.opening_balance, created_at: c.created_at })));
});

/**
 * @openapi
 * /customers:
 *   post:
 *     tags: [Customers]
 *     summary: Create a new customer
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone]
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               address: { type: string }
 *               opening_balance: { type: number }
 *     responses:
 *       201:
 *         description: Customer created
 *       422:
 *         description: Validation error
 */
router.post('/', validate(CreateCustomerSchema), async (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const customer = new Customer({ ...req.body, id: generateId(), created_at: now, updated_at: now });
  await customer.save();
  res.status(201).json({ id: customer.id, name: customer.name, phone: customer.phone, email: customer.email, address: customer.address, opening_balance: customer.opening_balance, created_at: customer.created_at });
});

/**
 * @openapi
 * /customers/{id}:
 *   patch:
 *     tags: [Customers]
 *     summary: Update a customer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               address: { type: string }
 *               opening_balance: { type: number }
 *     responses:
 *       200:
 *         description: Customer updated
 *       404:
 *         description: Customer not found
 *       422:
 *         description: Validation error
 */
router.patch('/:id', validate(UpdateCustomerSchema), async (req: Request, res: Response) => {
  const update = { ...req.body, updated_at: new Date().toISOString() };
  const customer = await Customer.findOneAndUpdate({ id: req.params.id }, { $set: update }, { new: true }).lean();
  if (!customer) { res.status(404).json({ detail: 'Customer not found' }); return; }
  res.json({ id: customer.id, name: customer.name, phone: customer.phone, email: customer.email, address: customer.address, opening_balance: customer.opening_balance });
});

/**
 * @openapi
 * /customers/{id}:
 *   delete:
 *     tags: [Customers]
 *     summary: Delete a customer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer deleted
 */
router.delete('/:id', async (req: Request, res: Response) => {
  await Customer.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;