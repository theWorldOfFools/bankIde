import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { pool } from '../db.js';
import {
  clearSessionCookie,
  requireAuth,
  setSessionCookie,
} from '../auth.js';
import {
  sendAdminPendingUserEmail,
  sendVerificationEmail,
} from '../services/email.js';
import { asyncHandler } from '../errors.js';

const router = Router();

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

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

const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Terlalu banyak permintaan. Coba lagi nanti.' },
});

const resendSchema = z.object({
  email: z.string().trim().email().max(200),
});

const verifySchema = z.object({
  token: z.string().trim().min(32).max(200),
});

const hashToken = (token) => createHash('sha256').update(token).digest('hex');

const pendingVerificationResponse = {
  message: 'Jika email terdaftar dan belum diverifikasi, kami telah mengirim tautan verifikasi baru.',
};

async function createVerificationToken(db, userId) {
  const token = randomBytes(32).toString('hex');
  await db.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hashToken(token), new Date(Date.now() + VERIFICATION_TTL_MS)]
  );
  return token;
}

async function notifyAdmins(user) {
  const { rows } = await pool.query(
    "SELECT email FROM users WHERE role = 'admin' AND status = 'active'"
  );
  await Promise.allSettled(
    rows.map((admin) => sendAdminPendingUserEmail(admin.email, user))
  );
}

router.get('/registration-status', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    "SELECT count(*)::int AS total FROM users WHERE role = 'admin'"
  );
  const adminBootstrap = rows[0].total === 0;

  res.json({
    adminBootstrap,
    userRegistrationOpen: !adminBootstrap && config.emailEnabled,
    emailConfigured: config.emailEnabled,
  });
}));

router.post('/register', registerLimiter, asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const email = input.email.toLowerCase();
  const client = await pool.connect();
  let pendingUser = null;
  let verificationToken = null;

  try {
    await client.query('BEGIN');
    await client.query('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE');

    const { rows } = await client.query(
      "SELECT count(*)::int AS total FROM users WHERE role = 'admin'"
    );
    const bootstrap = rows[0].total === 0;
    const passwordHash = await bcrypt.hash(input.password, 12);

    if (bootstrap) {
      const inserted = await client.query(
        `INSERT INTO users (email, password_hash, role, status, email_verified_at)
         VALUES ($1, $2, 'admin', 'active', NOW())
         RETURNING id, email, role, status`,
        [email, passwordHash]
      );
      await client.query('COMMIT');
      setSessionCookie(res, inserted.rows[0]);
      return res.status(201).json({
        authenticated: true,
        user: {
          id: Number(inserted.rows[0].id),
          email: inserted.rows[0].email,
          role: inserted.rows[0].role,
        },
      });
    }

    if (!config.emailEnabled) {
      await client.query('ROLLBACK');
      return res.status(503).json({
        message: 'Registrasi user belum tersedia karena email belum dikonfigurasi.',
      });
    }

    const existing = await client.query(
      'SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1',
      [email]
    );
    if (existing.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Email sudah terdaftar.' });
    }

    const inserted = await client.query(
      `INSERT INTO users (email, password_hash, role, status)
       VALUES ($1, $2, 'user', 'pending_email')
       RETURNING id, email`,
      [email, passwordHash]
    );
    pendingUser = inserted.rows[0];
    verificationToken = await createVerificationToken(client, pendingUser.id);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error?.code === '23505') {
      return res.status(409).json({ message: 'Email sudah terdaftar.' });
    }
    throw error;
  } finally {
    client.release();
  }

  try {
    await sendVerificationEmail(email, verificationToken);
  } catch (error) {
    console.error('[auth] gagal mengirim email verifikasi:', error.message);
    await pool.query('DELETE FROM users WHERE id = $1', [pendingUser.id]);
    return res.status(502).json({
      message: 'Akun gagal dibuat karena email verifikasi tidak dapat dikirim. Coba lagi nanti.',
    });
  }

  return res.status(201).json({
    authenticated: false,
    status: 'pending_email',
    email: pendingUser.email,
  });
}));

router.post('/verify-email', asyncHandler(async (req, res) => {
  const input = verifySchema.parse(req.body);
  const client = await pool.connect();
  let verifiedUser = null;
  let alreadyVerified = false;
  let resultStatus = 'pending_approval';

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT t.id AS token_id, t.user_id, t.used_at,
              u.email, u.role, u.status, u.email_verified_at
       FROM email_verification_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = $1
         AND t.expires_at > NOW()
       FOR UPDATE OF t`,
      [hashToken(input.token)]
    );

    const record = rows[0];
    if (!record) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: 'Tautan verifikasi tidak valid atau sudah kedaluwarsa.',
      });
    }

    if (record.role !== 'user' || record.status === 'rejected') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: 'Akun ini tidak dapat diverifikasi. Hubungi admin workspace.',
      });
    }

    if (record.used_at) {
      if (!record.email_verified_at) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          message: 'Tautan verifikasi tidak valid atau sudah kedaluwarsa.',
        });
      }

      const status = record.status === 'active' ? 'active' : 'pending_approval';
      await client.query('COMMIT');
      return res.json({
        status,
        alreadyVerified: true,
        message: 'Email sudah diverifikasi sebelumnya.',
      });
    }

    await client.query(
      'UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1',
      [record.token_id]
    );

    if (record.status === 'pending_email') {
      const updated = await client.query(
        `UPDATE users
         SET status = 'pending_approval',
             email_verified_at = COALESCE(email_verified_at, NOW())
         WHERE id = $1
         RETURNING id, email`,
        [record.user_id]
      );
      verifiedUser = updated.rows[0];
    } else {
      alreadyVerified = true;
      resultStatus = record.status === 'active' ? 'active' : 'pending_approval';
      await client.query(
        `UPDATE users
         SET email_verified_at = COALESCE(email_verified_at, NOW())
         WHERE id = $1`,
        [record.user_id]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  if (verifiedUser) {
    notifyAdmins(verifiedUser).catch((error) => {
      console.error('[auth] gagal memberi tahu admin:', error.message);
    });
  }

  return res.json({
    status: resultStatus,
    alreadyVerified,
    message: verifiedUser
      ? 'Email berhasil diverifikasi. Pendaftaran menunggu persetujuan admin.'
      : 'Email sudah diverifikasi sebelumnya.',
  });
}));

router.post('/resend-verification', resendLimiter, asyncHandler(async (req, res) => {
  const input = resendSchema.parse(req.body);

  if (!config.emailEnabled) {
    return res.status(503).json({
      message: 'Pengiriman email belum dikonfigurasi pada server.',
    });
  }

  const email = input.email.toLowerCase();
  const client = await pool.connect();
  let user;
  let token;

  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, email, status
       FROM users
       WHERE lower(email) = lower($1) AND role = 'user'
       LIMIT 1
       FOR UPDATE`,
      [email]
    );
    user = rows[0];

    if (!user || user.status !== 'pending_email') {
      await client.query('ROLLBACK');
      return res.json(pendingVerificationResponse);
    }

    const latest = await client.query(
      `SELECT created_at FROM email_verification_tokens
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id]
    );
    const lastSentAt = latest.rows[0]?.created_at
      ? new Date(latest.rows[0].created_at).getTime()
      : 0;

    if (Date.now() - lastSentAt < RESEND_COOLDOWN_MS) {
      await client.query('ROLLBACK');
      return res.json(pendingVerificationResponse);
    }

    await client.query(
      'UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [user.id]
    );
    token = await createVerificationToken(client, user.id);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  try {
    await sendVerificationEmail(user.email, token);
  } catch (error) {
    console.error('[auth] gagal mengirim ulang email verifikasi:', error.message);
    return res.status(502).json({
      message: 'Email verifikasi tidak dapat dikirim. Coba lagi nanti.',
    });
  }

  return res.json(pendingVerificationResponse);
}));

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const { rows } = await pool.query(
    `SELECT id, email, password_hash, role, status
     FROM users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [input.email]
  );

  const user = rows[0];
  const valid = user
    ? await bcrypt.compare(input.password, user.password_hash)
    : false;

  if (!valid) {
    return res.status(401).json({ message: 'Email atau password salah.' });
  }

  if (user.status === 'pending_email') {
    return res.status(403).json({
      code: 'email_unverified',
      message: 'Email belum diverifikasi. Periksa kotak masuk atau kirim ulang verifikasi.',
    });
  }

  if (user.status === 'pending_approval') {
    return res.status(403).json({
      code: 'pending_approval',
      message: 'Pendaftaran Anda menunggu persetujuan admin.',
    });
  }

  if (user.status === 'rejected') {
    return res.status(403).json({
      code: 'rejected',
      message: 'Pendaftaran akun Anda ditolak. Hubungi admin workspace.',
    });
  }

  setSessionCookie(res, user);
  return res.json({
    user: {
      id: Number(user.id),
      email: user.email,
      role: user.role,
    },
  });
}));

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.post('/logout', requireAuth, (req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

export default router;
