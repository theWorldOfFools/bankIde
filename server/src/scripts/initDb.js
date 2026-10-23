import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(scriptDir, '../../db/schema.sql');

try {
  const schema = await fs.readFile(schemaPath, 'utf8');
  await pool.query(schema);
  console.log('[db] schema berhasil diterapkan.');
} catch (error) {
  console.error('[db] gagal menerapkan schema:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
