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

/**
 * @openapi
 * /users/verify-security:
 *   post:
 *     tags: [Users]
 *     summary: Verify security answer for password recovery
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id: { type: string }
 *               answer: { type: string }
 *     responses:
 *       200:
 *         description: Answer verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *       400:
 *         description: Missing fields or incorrect answer
 *       404:
 *         description: User not found
 */
router.post('/verify-security', async (req: Request, res: Response) => {
  const { user_id, answer } = req.body;
  if (!user_id || !answer) { res.status(400).json({ detail: 'user_id and answer are required' }); return; }
  const user = await User.findOne({ id: user_id }).lean();
  if (!user) { res.status(404).json({ detail: 'User not found' }); return; }
  if (user.security_answer !== answer) { res.status(400).json({ detail: 'Incorrect answer' }); return; }
  res.json({ ok: true });
});

/**
 * @openapi
 * /users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: User profile data
 *       404:
 *         description: User not found
 */
router.get('/profile', verifyJWT, async (req: Request, res: Response) => {
  const user = await User.findOne({ id: req.user?.id }, { password_hash: 0, security_answer: 0 }).lean();
  if (!user) { res.status(404).json({ detail: 'User not found' }); return; }
  res.json(user);
});

/**
 * @openapi
 * /users/profile:
 *   patch:
 *     tags: [Users]
 *     summary: Update current user profile
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 *       404:
 *         description: User not found
 */
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

/**
 * @openapi
 * /users/change-password:
 *   post:
 *     tags: [Users]
 *     summary: Change current user password
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               current_password: { type: string }
 *               new_password: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Password changed
 *       400:
 *         description: Invalid current password or validation error
 *       404:
 *         description: User not found
 */
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

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/', async (req: Request, res: Response) => {
  const users = await User.find({}, { password_hash: 0 }).lean();
  res.json(users.map((u: any) => ({ id: u.id, email: u.email, name: u.name, role: u.role, active: u.active, created_at: u.created_at })));
});

/**
 * @openapi
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Create a new user (admin only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, name, password]
 *             properties:
 *               email: { type: string, example: "user@example.com" }
 *               name: { type: string }
 *               role: { type: string, default: "cashier" }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       201:
 *         description: User created
 *       409:
 *         description: Email already exists
 */
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

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update a user (admin only)
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
 *               role: { type: string }
 *               active: { type: boolean }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: User updated
 *       404:
 *         description: User not found
 */
router.patch('/:id', validate(UpdateUserSchema), async (req: Request, res: Response) => {
  const update: any = { ...req.body, updated_at: new Date().toISOString() };
  if (update.password) { update.password_hash = hashPassword(update.password); delete update.password; }
  const user = await User.findOneAndUpdate({ id: req.params.id }, { $set: update }, { new: true }).lean();
  if (!user) { res.status(404).json({ detail: 'User not found' }); return; }
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, active: user.active });
});

/**
 * @openapi
 * /users/{id}/security:
 *   patch:
 *     tags: [Users]
 *     summary: Set security question for a user (admin only)
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
 *             required: [security_question, security_answer]
 *             properties:
 *               security_question: { type: string }
 *               security_answer: { type: string }
 *     responses:
 *       200:
 *         description: Security question set
 *       400:
 *         description: Missing fields
 *       404:
 *         description: User not found
 */
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

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User deleted
 *       400:
 *         description: Cannot delete yourself
 */
router.delete('/:id', async (req: Request, res: Response) => {
  if (req.user?.id === req.params.id) { res.status(400).json({ detail: 'Cannot delete yourself' }); return; }
  await User.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

export default router;
