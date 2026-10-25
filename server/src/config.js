import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(sourceDir, '../..');

dotenv.config({ path: path.join(rootDir, '.env') });

const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Environment variable ${key} wajib diisi.`);
  }
}

if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET minimal 32 karakter.');
}

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const smtp = {
  host: process.env.SMTP_HOST || '',
  port: toNumber(process.env.SMTP_PORT, 587),
  secure: toBoolean(process.env.SMTP_SECURE),
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || 'BankIde <no-reply@bankide.local>',
};

const vapid = {
  subject: process.env.VAPID_SUBJECT || '',
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
};

const ai = {
  apiKey: process.env.AI_API_KEY || '',
  baseUrl: (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
  model: process.env.AI_MODEL || '',
  timeoutMs: toNumber(process.env.AI_TIMEOUT_MS, 20000),
};

export const config = {
  rootDir,
  clientDist: path.join(rootDir, 'client', 'dist'),
  isProduction: process.env.NODE_ENV === 'production',
  port: toNumber(process.env.BANKIDE_PORT || process.env.PORT, 4000),
  publicAppUrl: (process.env.PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  cronTimezone: process.env.CRON_TIMEZONE || 'Asia/Jakarta',
  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: toBoolean(process.env.DATABASE_SSL),
  jwtSecret: process.env.JWT_SECRET,
  cookieSecure: toBoolean(process.env.COOKIE_SECURE, process.env.NODE_ENV === 'production'),
  adminEmail: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  smtp,
  emailEnabled: Boolean(smtp.host),
  vapid,
  pushEnabled: Boolean(vapid.subject && vapid.publicKey && vapid.privateKey),
  ai,
  aiEnabled: Boolean(ai.apiKey && ai.model),
};
