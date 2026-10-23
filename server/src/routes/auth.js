import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { pool } from '../db.js';
import {
  clearSessionCookie,
  requireAuth,
  setSessionCookie,
} from '../auth.js';
import { asyncHandler } from '../errors.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Terlalu banyak percobaan login. Coba lagi nanti.' },
});

const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const { rows } = await pool.query(
    'SELECT id, email, password_hash FROM admin_users WHERE lower(email) = lower($1) LIMIT 1',
    [input.email]
  );

  const admin = rows[0];
  const valid = admin
    ? await bcrypt.compare(input.password, admin.password_hash)
    : false;

  if (!valid) {
    return res.status(401).json({ message: 'Email atau password salah.' });
  }

  setSessionCookie(res, admin);
  return res.json({ admin: { id: admin.id, email: admin.email } });
}));

router.get('/me', requireAuth, (req, res) => {
  res.json({ admin: { email: req.admin.email } });
});

router.post('/logout', requireAuth, (req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

export default router;
