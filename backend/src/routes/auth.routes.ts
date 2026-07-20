import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { verifyPassword, hashPassword } from '../utils/password';
import { signToken, verifyToken } from '../utils/jwt';
import { generateId } from '../utils/invoice';
import { validate } from '../middleware/validate';
import { verifyJWT } from '../middleware/auth';

const router = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email/password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, example: "admin@nobargaining.com" }
 *               password: { type: string, example: "admin123" }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     email: { type: string }
 *                     name: { type: string }
 *                     role: { type: string }
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account is inactive
 */
router.post('/login', validate(LoginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ detail: 'Invalid email or password' });
    return;
  }
  if (!user.active) {
    res.status(403).json({ detail: 'Account is inactive' });
    return;
  }
  const jwtPayload = { id: user.id, email: user.email, role: user.role, name: user.name };
  const token = signToken(jwtPayload);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user info
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *                 email: { type: string }
 *                 name: { type: string }
 *                 role: { type: string }
 */
router.get('/me', verifyJWT, (req: Request, res: Response) => {
  res.json({ id: req.user!.id, email: req.user!.email, name: req.user!.name, role: req.user!.role });
});

export default router;