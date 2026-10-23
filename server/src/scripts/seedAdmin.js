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
    INSERT INTO admin_users (email, password_hash)
    VALUES ($1, $2)
    ON CONFLICT (lower(email)) DO UPDATE
    SET email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash
  `, [email, hash]);
  console.log(`[seed] admin ${email} siap digunakan.`);
} catch (error) {
  console.error('[seed] gagal membuat admin:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
