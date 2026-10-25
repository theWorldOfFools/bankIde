import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAdmin, requireAuth } from '../auth.js';
import {
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
} from '../services/email.js';
import { HttpError, asyncHandler } from '../errors.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const STATUSES = ['pending_email', 'pending_approval', 'active', 'rejected'];

const listSchema = z.object({
  status: z.enum([...STATUSES, '']).optional().default(''),
});

const mapUser = (row) => ({
  id: Number(row.id),
  email: row.email,
  role: row.role,
  status: row.status,
  emailVerifiedAt: row.email_verified_at,
  createdAt: row.created_at,
});

const parseId = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 'ID user tidak valid.');
  }
  return id;
};

router.get('/users', asyncHandler(async (req, res) => {
  const input = listSchema.parse(req.query);
  const params = [];
  let where = '';

  if (input.status) {
    params.push(input.status);
    where = 'WHERE status = $1';
  }

  const { rows } = await pool.query(
    `SELECT id, email, role, status, email_verified_at, created_at
     FROM users
     ${where}
     ORDER BY created_at DESC, id DESC
     LIMIT 200`,
    params
  );

  res.json({ items: rows.map(mapUser) });
}));

router.post('/users/:id/approve', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const client = await pool.connect();
  let user;
  let changed = false;

  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT * FROM users WHERE id = $1 FOR UPDATE',
      [id]
    );
    const found = rows[0];

    if (!found) throw new HttpError(404, 'User tidak ditemukan.');
    if (found.role !== 'user') {
      throw new HttpError(400, 'Akun admin tidak memerlukan persetujuan.');
    }
    if (found.status === 'pending_email') {
      throw new HttpError(400, 'User belum memverifikasi email.');
    }
    if (found.status === 'rejected') {
      throw new HttpError(400, 'Pendaftaran user sudah ditolak.');
    }

    if (found.status === 'pending_approval') {
      const updated = await client.query(
        `UPDATE users SET status = 'active' WHERE id = $1 RETURNING *`,
        [id]
      );
      user = updated.rows[0];
      changed = true;
    } else {
      user = found;
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  if (changed) {
    sendAccountApprovedEmail(user.email).catch((error) => {
      console.error('[admin] gagal mengirim email persetujuan:', error.message);
    });
  }

  return res.json({ user: mapUser(user) });
}));

router.post('/users/:id/reject', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const client = await pool.connect();
  let user;
  let changed = false;

  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT * FROM users WHERE id = $1 FOR UPDATE',
      [id]
    );
    const found = rows[0];

    if (!found) throw new HttpError(404, 'User tidak ditemukan.');
    if (found.role !== 'user') {
      throw new HttpError(400, 'Akun admin tidak dapat ditolak.');
    }
    if (found.status === 'active') {
      throw new HttpError(400, 'User yang sudah aktif tidak dapat ditolak.');
    }

    if (found.status === 'rejected') {
      user = found;
    } else {
      const updated = await client.query(
        `UPDATE users SET status = 'rejected' WHERE id = $1 RETURNING *`,
        [id]
      );
      user = updated.rows[0];
      changed = true;
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  if (changed) {
    sendAccountRejectedEmail(user.email).catch((error) => {
      console.error('[admin] gagal mengirim email penolakan:', error.message);
    });
  }

  return res.json({ user: mapUser(user) });
}));

export default router;
