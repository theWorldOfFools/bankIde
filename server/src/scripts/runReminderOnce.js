import { pool } from '../db.js';
import { runReminderDispatch } from '../jobs/reminderCron.js';

try {
  const result = await runReminderDispatch();
  console.log('[reminder] hasil dispatch:', result);
} catch (error) {
  console.error('[reminder] gagal menjalankan dispatch:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
