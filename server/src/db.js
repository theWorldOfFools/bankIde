import pg from 'pg';
import { config } from './config.js';

pg.types.setTypeParser(20, (value) => Number(value));

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
});

pool.on('error', (error) => {
  console.error('[db] unexpected pool error', error);
});
