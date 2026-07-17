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

router.get('/me', verifyJWT, (req: Request, res: Response) => {
  res.json({ id: req.user!.id, email: req.user!.email, name: req.user!.name, role: req.user!.role });
});

export default router;