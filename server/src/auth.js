import jwt from 'jsonwebtoken';
import { config } from './config.js';

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

export function setSessionCookie(res, admin) {
  const token = jwt.sign(
    { sub: String(admin.id), email: admin.email },
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

export function requireAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    return res.status(401).json({ message: 'Silakan masuk terlebih dahulu.' });
  }

  try {
    req.admin = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    clearSessionCookie(res);
    return res.status(401).json({ message: 'Sesi tidak valid atau telah berakhir.' });
  }
}
