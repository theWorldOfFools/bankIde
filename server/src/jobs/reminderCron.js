import cron from 'node-cron';
import { config } from '../config.js';
import { pool } from '../db.js';
import { sendEmailReminder } from '../services/email.js';
import { sendPushReminder } from '../services/push.js';

let running = false;

export async function runReminderDispatch() {
  if (running) return { processed: 0, skipped: true };

  running = true;
  try {
    await pool.query(`
      UPDATE reminder_deliveries
      SET status = 'pending',
          next_attempt_at = NOW(),
          updated_at = NOW()
      WHERE status = 'processing'
        AND attempts < 3
        AND updated_at < NOW() - INTERVAL '10 minutes'
    `);

    const { rows: jobs } = await pool.query(`
      WITH due AS (
        SELECT id
        FROM reminder_deliveries
        WHERE status IN ('pending', 'failed')
          AND next_attempt_at <= NOW()
          AND attempts < 3
        ORDER BY next_attempt_at ASC
        LIMIT 25
        FOR UPDATE SKIP LOCKED
      )
      UPDATE reminder_deliveries d
      SET status = 'processing',
          attempts = d.attempts + 1,
          updated_at = NOW()
      FROM due
      WHERE d.id = due.id
      RETURNING d.id, d.idea_id, d.channel, d.attempts
    `);

    if (jobs.length === 0) return { processed: 0 };

    const ideaIds = [...new Set(jobs.map((job) => job.idea_id))];
    const { rows: ideas } = await pool.query(
      `SELECT i.id, i.owner_id, i.title, i.category, i.context, i.reminder_at, i.status,
              u.email AS owner_email, u.status AS owner_status
       FROM ideas i
       LEFT JOIN users u ON u.id = i.owner_id
       WHERE i.id = ANY($1::bigint[])`,
      [ideaIds]
    );
    const ideaById = new Map(ideas.map((idea) => [String(idea.id), idea]));

    for (const job of jobs) {
      const idea = ideaById.get(String(job.idea_id));
      try {
        if (!idea) throw new Error('Ide untuk pengingat tidak ditemukan.');

        if (job.channel === 'push') {
          await sendPushReminder(idea);
        } else if (job.channel === 'email') {
          if (idea.owner_status !== 'active' || !idea.owner_email) {
            throw new Error('Pemilik ide tidak aktif atau tidak memiliki email.');
          }
          await sendEmailReminder(idea, idea.owner_email);
        } else {
          throw new Error(`Channel tidak dikenal: ${job.channel}`);
        }

        await pool.query(`
          UPDATE reminder_deliveries
          SET status = 'sent',
              sent_at = NOW(),
              last_error = NULL,
              updated_at = NOW()
          WHERE id = $1
        `, [job.id]);
      } catch (error) {
        const finalAttempt = job.attempts >= 3;
        const delaySeconds = Math.min(60 * (2 ** Math.max(job.attempts - 1, 0)), 3600);

        await pool.query(`
          UPDATE reminder_deliveries
          SET status = $2,
              last_error = $3,
              next_attempt_at = NOW() + ($4::int * INTERVAL '1 second'),
              updated_at = NOW()
          WHERE id = $1
        `, [
          job.id,
          finalAttempt ? 'failed' : 'pending',
          String(error.message).slice(0, 1000),
          delaySeconds,
        ]);

        console.error(`[reminder] delivery ${job.id} gagal:`, error.message);
      }
    }

    return { processed: jobs.length };
  } finally {
    running = false;
  }
}

export function startReminderCron() {
  const task = cron.schedule('* * * * *', () => {
    runReminderDispatch().catch((error) => {
      console.error('[reminder] cron error:', error);
    });
  }, {
    timezone: config.cronTimezone,
  });

  setTimeout(() => {
    runReminderDispatch().catch((error) => {
      console.error('[reminder] startup error:', error);
    });
  }, 2000).unref();

  console.log(`[reminder] cron aktif setiap menit (${config.cronTimezone})`);
  return task;
}
