import { config } from '../config.js';

export async function syncReminderDeliveries(db, idea) {
  await db.query(
    `DELETE FROM reminder_deliveries
     WHERE idea_id = $1 AND status IN ('pending', 'failed')`,
    [idea.id]
  );

  if (!idea.reminder_at || ['done', 'archived'].includes(idea.status) || !idea.owner_id) {
    return;
  }

  const channels = [];

  if (config.emailEnabled) {
    const { rows } = await db.query(
      "SELECT email FROM users WHERE id = $1 AND status = 'active' LIMIT 1",
      [idea.owner_id]
    );
    if (rows[0]?.email) channels.push('email');
  }

  if (config.pushEnabled) {
    const { rowCount } = await db.query(
      'SELECT 1 FROM push_subscriptions WHERE user_id = $1 LIMIT 1',
      [idea.owner_id]
    );
    if (rowCount > 0) channels.push('push');
  }

  for (const channel of channels) {
    await db.query(
      `INSERT INTO reminder_deliveries
        (idea_id, reminder_at, channel, next_attempt_at)
       VALUES ($1, $2, $3, $2)
       ON CONFLICT (idea_id, reminder_at, channel) DO NOTHING`,
      [idea.id, idea.reminder_at, channel]
    );
  }
}
