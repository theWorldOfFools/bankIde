import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { pool } from './db.js';

export const SESSION_COOKIE = 'bankide_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.cookieSecure,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}

export function setSessionCookie(res, user) {
  const token = jwt.sign(
    { sub: String(user.id), email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
  res.cookie(SESSION_COOKIE, token, cookieOptions());
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.cookieSecure,
    path: '/',
  });
}

export async function requireAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    return res.status(401).json({ message: 'Silakan masuk terlebih dahulu.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    clearSessionCookie(res);
    return res.status(401).json({ message: 'Sesi tidak valid atau telah berakhir.' });
  }

  try {
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) {
      clearSessionCookie(res);
      return res.status(401).json({ message: 'Sesi tidak valid atau telah berakhir.' });
    }

    const { rows } = await pool.query(
      'SELECT id, email, role, status FROM users WHERE id = $1 LIMIT 1',
      [id]
    );
    const user = rows[0];

    if (!user || user.status !== 'active') {
      clearSessionCookie(res);
      return res.status(401).json({ message: 'Sesi tidak valid atau telah berakhir.' });
    }

    req.user = {
      id: Number(user.id),
      email: user.email,
      role: user.role,
      status: user.status,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Akses hanya untuk admin.' });
  }
  return next();
}
