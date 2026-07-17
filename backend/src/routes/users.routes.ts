import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateId } from '../utils/invoice';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.string().default('cashier'),
  password: z.string().min(6),
});

const UpdateUserSchema = z.object({
  name: z.string().optional(),
  role: z.string().optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

router.post('/verify-security', async (req: Request, res: Response) => {
  const { user_id, answer } = req.body;
  if (!user_id || !answer) { res.status(400).json({ detail: 'user_id and answer are required' }); return; }
  const user = await User.findOne({ id: user_id }).lean();
  if (!user) { res.status(404).json({ detail: 'User not found' }); return; }
  if (user.security_answer !== answer) { res.status(400).json({ detail: 'Incorrect answer' }); return; }
  res.json({ ok: true });
});

router.get('/profile', verifyJWT, async (req: Request, res: Response) => {
  const user = await User.findOne({ id: req.user?.id }, { password_hash: 0, security_answer: 0 }).lean();
  if (!user) { res.status(404).json({ detail: 'User not found' }); return; }
  res.json(user);
});

router.patch('/profile', verifyJWT, async (req: Request, res: Response) => {
  const { name, email, phone } = req.body;
  const update: any = { updated_at: new Date().toISOString() };
  if (name !== undefined) update.name = name;
  if (email !== undefined) update.email = email;
  if (phone !== undefined) update.phone = phone;
  const user = await User.findOneAndUpdate({ id: req.user?.id }, { $set: update }, { new: true }).select('id email name phone role').lean();
  if (!user) { res.status(404).json({ detail: 'User not found' }); return; }
  res.json(user);
});

router.post('/change-password', verifyJWT, async (req: Request, res: Response) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) { res.status(400).json({ detail: 'current_password and new_password are required' }); return; }
  if (new_password.length < 6) { res.status(400).json({ detail: 'Password must be at least 6 characters' }); return; }
  const user = await User.findOne({ id: req.user?.id });
  if (!user) { res.status(404).json({ detail: 'User not found' }); return; }
  if (!verifyPassword(current_password, user.password_hash)) { res.status(400).json({ detail: 'Current password is incorrect' }); return; }
  user.password_hash = hashPassword(new_password);
  user.updated_at = new Date().toISOString();
  await user.save();
  res.json({ ok: true });
});

router.use(verifyJWT, requireRoles('admin'));

router.get('/', async (req: Request, res: Response) => {
  const users = await User.find({}, { password_hash: 0 }).lean();
  res.json(users.map((u: any) => ({ id: u.id, email: u.email, name: u.name, role: u.role, active: u.active, created_at: u.created_at })));
});

router.post('/', validate(CreateUserSchema), async (req: Request, res: Response) => {
  const existing = await User.findOne({ email: req.body.email.toLowerCase() });
  if (existing) { res.status(409).json({ detail: 'Email already exists' }); return; }
  const now = new Date().toISOString();
  const user = new User({
    id: generateId(), email: req.body.email.toLowerCase(), name: req.body.name,
    role: req.body.role || 'cashier', active: true,
    password_hash: hashPassword(req.body.password),
    created_at: now, updated_at: now,
  });
  await user.save();
  res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role, active: user.active, created_at: user.created_at });
});

router.patch('/:id', validate(UpdateUserSchema), async (req: Request, res: Response) => {
  const update: any = { ...req.body, updated_at: new Date().toISOString() };
  if (update.password) { update.password_hash = hashPassword(update.password); delete update.password; }
  const user = await User.findOneAndUpdate({ id: req.params.id }, { $set: update }, { new: true }).lean();
  if (!user) { res.status(404).json({ detail: 'User not found' }); return; }
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, active: user.active });
});

router.patch('/:id/security', async (req: Request, res: Response) => {
  const { security_question, security_answer } = req.body;
  if (!security_question || !security_answer) { res.status(400).json({ detail: 'security_question and security_answer are required' }); return; }
  const user = await User.findOneAndUpdate(
    { id: req.params.id },
    { $set: { security_question, security_answer, updated_at: new Date().toISOString() } },
    { new: true }
  ).lean();
  if (!user) { res.status(404).json({ detail: 'User not found' }); return; }
  res.json({ ok: true });
});

router.delete('/:id', async (req: Request, res: Response) => {
  if (req.user?.id === req.params.id) { res.status(400).json({ detail: 'Cannot delete yourself' }); return; }
  await User.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
