import { config } from '../config.js';

export function enabledChannels() {
  return [
    config.pushEnabled ? 'push' : null,
    config.emailEnabled ? 'email' : null,
  ].filter(Boolean);
}

export async function syncReminderDeliveries(db, idea) {
  await db.query(
    `DELETE FROM reminder_deliveries
     WHERE idea_id = $1 AND status IN ('pending', 'failed')`,
    [idea.id]
  );

  if (!idea.reminder_at || ['done', 'archived'].includes(idea.status)) {
    return;
  }

  for (const channel of enabledChannels()) {
    await db.query(
      `INSERT INTO reminder_deliveries
        (idea_id, reminder_at, channel, next_attempt_at)
       VALUES ($1, $2, $3, $2)
       ON CONFLICT (idea_id, reminder_at, channel) DO NOTHING`,
      [idea.id, idea.reminder_at, channel]
    );
  }
}
