import crypto from 'node:crypto';
import { config } from '../config.js';
import { pool } from '../db.js';
import { HttpError } from '../errors.js';

const CACHE_TTL_MS = 10_000;
const encryptionKey = crypto.createHash('sha256')
  .update(`bankide-ai-settings:${config.jwtSecret}`)
  .digest();

let cached = null;
let cachedAt = 0;
let tableWarningLogged = false;

function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    'v1',
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

function decryptSecret(value) {
  if (!value) return '';
  try {
    const [version, ivValue, tagValue, dataValue] = String(value).split(':');
    if (version !== 'v1' || !ivValue || !tagValue || !dataValue) return '';
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      encryptionKey,
      Buffer.from(ivValue, 'base64')
    );
    decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataValue, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch (error) {
    console.warn('[ai] gagal mendekripsi API key tersimpan:', error.message);
    return '';
  }
}

function normalizeBaseUrl(value, fallback) {
  return String(value || fallback || 'https://api.openai.com/v1').replace(/\/+$/, '');
}

async function loadSettingsRow() {
  try {
    const { rows } = await pool.query(
      `SELECT id, api_key_encrypted, base_url, model, timeout_ms, enabled,
              updated_by, updated_at
       FROM ai_settings
       WHERE id = 1`
    );
    return rows[0] || null;
  } catch (error) {
    if (error.code === '42P01') {
      if (!tableWarningLogged) {
        console.warn('[ai] tabel ai_settings belum tersedia; memakai konfigurasi environment.');
        tableWarningLogged = true;
      }
      return null;
    }
    throw error;
  }
}

function buildInternalConfig(row) {
  const databaseKey = row?.api_key_encrypted ? decryptSecret(row.api_key_encrypted) : '';
  const apiKey = databaseKey || config.ai.apiKey;
  const model = row?.model || config.ai.model;
  const baseUrl = normalizeBaseUrl(row?.base_url, config.ai.baseUrl);
  const timeoutMs = Number(row?.timeout_ms) || config.ai.timeoutMs;
  const enabledBySetting = row ? Boolean(row.enabled) : true;

  return {
    apiKey,
    baseUrl,
    model,
    timeoutMs,
    enabled: enabledBySetting && Boolean(apiKey && model),
    enabledSetting: enabledBySetting,
    apiKeySource: databaseKey ? 'database' : config.ai.apiKey ? 'environment' : 'none',
    baseUrlSource: row?.base_url ? 'database' : 'environment',
    modelSource: row?.model ? 'database' : config.ai.model ? 'environment' : 'none',
    usingDatabase: Boolean(row),
    updatedAt: row?.updated_at || null,
    updatedBy: row?.updated_by || null,
  };
}

function toPublicSettings(settings) {
  return {
    enabled: settings.enabled,
    enabledSetting: settings.enabledSetting,
    model: settings.model,
    baseUrl: settings.baseUrl,
    timeoutMs: settings.timeoutMs,
    apiKeyConfigured: Boolean(settings.apiKey),
    apiKeyHint: settings.apiKey ? `••••••••${settings.apiKey.slice(-4)}` : '',
    apiKeySource: settings.apiKeySource,
    baseUrlSource: settings.baseUrlSource,
    modelSource: settings.modelSource,
    usingDatabase: settings.usingDatabase,
    updatedAt: settings.updatedAt,
    updatedBy: settings.updatedBy,
    envDefaults: {
      model: config.ai.model,
      baseUrl: config.ai.baseUrl,
      timeoutMs: config.ai.timeoutMs,
      apiKeyConfigured: Boolean(config.ai.apiKey),
    },
  };
}

export function invalidateAiConfigCache() {
  cached = null;
  cachedAt = 0;
}

export async function getAiConfig() {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached;

  const row = await loadSettingsRow();
  cached = buildInternalConfig(row);
  cachedAt = Date.now();
  return cached;
}

export async function getPublicAiSettings() {
  const settings = await getAiConfig();
  let updatedBy = null;

  if (settings.updatedBy) {
    const { rows } = await pool.query(
      'SELECT email FROM users WHERE id = $1 LIMIT 1',
      [settings.updatedBy]
    );
    updatedBy = rows[0]?.email || null;
  }

  return toPublicSettings({ ...settings, updatedBy });
}

export async function saveAiSettings({
  apiKey = '',
  clearApiKey = false,
  enabled = true,
  baseUrl,
  model = '',
  timeoutMs = 20000,
  userId = null,
}) {
  const existing = await loadSettingsRow();
  let encryptedKey = existing?.api_key_encrypted || null;
  if (clearApiKey) encryptedKey = null;
  else if (apiKey) encryptedKey = encryptSecret(apiKey);

  const baseUrlValue = String(baseUrl || '').trim().replace(/\/+$/, '');

  await pool.query(
    `INSERT INTO ai_settings
       (id, api_key_encrypted, base_url, model, timeout_ms, enabled, updated_by, updated_at)
     VALUES (1, $1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (id) DO UPDATE SET
       api_key_encrypted = EXCLUDED.api_key_encrypted,
       base_url = EXCLUDED.base_url,
       model = EXCLUDED.model,
       timeout_ms = EXCLUDED.timeout_ms,
       enabled = EXCLUDED.enabled,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()`,
    [encryptedKey, baseUrlValue, model.trim(), timeoutMs, enabled, userId]
  );

  invalidateAiConfigCache();
  return getPublicAiSettings();
}

export async function resetAiSettings() {
  await pool.query('DELETE FROM ai_settings WHERE id = 1');
  invalidateAiConfigCache();
  return getPublicAiSettings();
}

export async function testAiConnection(overrides = {}) {
  const current = await getAiConfig();
  const apiKey = overrides.apiKey ? overrides.apiKey.trim() : current.apiKey;
  const baseUrl = normalizeBaseUrl(overrides.baseUrl, current.baseUrl);
  const model = overrides.model ? overrides.model.trim() : current.model;
  const timeoutMs = Number(overrides.timeoutMs) || current.timeoutMs;

  if (!apiKey || !model) {
    throw new HttpError(400, 'API key dan model wajib tersedia untuk menguji koneksi.');
  }

  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new HttpError(400, 'Base URL AI tidak valid.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new HttpError(400, 'Base URL AI harus menggunakan http:// atau https://.');
  }

  const startedAt = Date.now();
  let response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      }),
      signal: AbortSignal.timeout(Math.min(timeoutMs, 30000)),
    });
  } catch (error) {
    throw new HttpError(400, `Koneksi AI gagal: ${error.message}`);
  }

  const text = await response.text();
  if (!response.ok) {
    let detail = '';
    try {
      const payload = JSON.parse(text);
      detail = payload?.error?.message || payload?.message || '';
    } catch {
      detail = text.slice(0, 240);
    }
    throw new HttpError(
      400,
      `Koneksi AI gagal (HTTP ${response.status})${detail ? `: ${detail}` : '.'}`
    );
  }

  return {
    ok: true,
    latencyMs: Date.now() - startedAt,
    model,
    baseUrl,
  };
}
