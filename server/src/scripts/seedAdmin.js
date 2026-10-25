import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { pool } from '../db.js';

const email = config.adminEmail;
const password = config.adminPassword;

if (!email || !password) {
  console.error('[seed] ADMIN_EMAIL dan ADMIN_PASSWORD wajib diisi.');
  process.exit(1);
}
if (password.length < 12) {
  console.error('[seed] ADMIN_PASSWORD minimal 12 karakter.');
  process.exit(1);
}

try {
  const hash = await bcrypt.hash(password, 12);
  await pool.query(`
    INSERT INTO users (email, password_hash, role, status, email_verified_at)
    VALUES ($1, $2, 'admin', 'active', NOW())
    ON CONFLICT (lower(email)) DO UPDATE
    SET email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        role = 'admin',
        status = 'active',
        email_verified_at = COALESCE(users.email_verified_at, NOW())
  `, [email, hash]);
  console.log(`[seed] admin ${email} siap digunakan.`);
} catch (error) {
  console.error('[seed] gagal membuat admin:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
