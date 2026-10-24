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

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Terlalu banyak percobaan registrasi. Coba lagi nanti.' },
});

const registerSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(12).max(200),
});

router.get('/registration-status', asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT count(*)::int AS total FROM admin_users');
  res.json({ registrationOpen: rows[0].total === 0 });
}));

router.post('/register', registerLimiter, asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('LOCK TABLE admin_users IN SHARE ROW EXCLUSIVE MODE');

    const { rows } = await client.query(
      'SELECT count(*)::int AS total FROM admin_users'
    );
    if (rows[0].total > 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Registrasi sudah ditutup.' });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const inserted = await client.query(
      `INSERT INTO admin_users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email`,
      [input.email.toLowerCase(), passwordHash]
    );

    await client.query('COMMIT');
    setSessionCookie(res, inserted.rows[0]);
    return res.status(201).json({ admin: inserted.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error?.code === '23505') {
      return res.status(409).json({ message: 'Email sudah terdaftar.' });
    }
    throw error;
  } finally {
    client.release();
  }
}));

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
