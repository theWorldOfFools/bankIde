import webpush from 'web-push';
import { config } from '../config.js';
import { pool } from '../db.js';

if (config.pushEnabled) {
  webpush.setVapidDetails(
    config.vapid.subject,
    config.vapid.publicKey,
    config.vapid.privateKey
  );
}

export async function sendPushReminder(idea) {
  if (!config.pushEnabled) {
    throw new Error('Web Push belum dikonfigurasi.');
  }

  if (!idea.owner_id) return { sent: 0 };

  const { rows } = await pool.query(
    'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
    [idea.owner_id]
  );
  if (rows.length === 0) return { sent: 0 };

  const when = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: config.cronTimezone,
  }).format(new Date(idea.reminder_at));

  const payload = JSON.stringify({
    title: `Pengingat: ${idea.title}`,
    body: `${idea.category} - ${when}`,
    url: `/ideas?focus=${idea.id}`,
    tag: `bankide-idea-${idea.id}`,
  });

  const results = await Promise.allSettled(
    rows.map((subscription) => webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      payload,
      { TTL: 3600 }
    ))
  );

  const expiredIds = [];
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const statusCode = result.reason?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        expiredIds.push(rows[index].id);
      } else {
        console.warn('[push] pengiriman gagal:', result.reason?.message);
      }
    }
  });

  if (expiredIds.length > 0) {
    await pool.query(
      'DELETE FROM push_subscriptions WHERE id = ANY($1::bigint[])',
      [expiredIds]
    );
  }

  const sent = results.filter((result) => result.status === 'fulfilled').length;
  const retryableFailures = results.filter((result, index) => (
    result.status === 'rejected' && !expiredIds.includes(rows[index].id)
  )).length;

  if (retryableFailures > 0 && sent === 0) {
    throw new Error('Semua pengiriman Web Push gagal.');
  }

  return { sent };
}
