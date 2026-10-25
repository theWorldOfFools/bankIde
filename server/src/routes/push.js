import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';
import { asyncHandler } from '../errors.js';

const router = Router();
router.use(requireAuth);

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
});

router.get('/public-key', (req, res) => {
  res.json({
    publicKey: config.pushEnabled ? config.vapid.publicKey : null,
  });
});

router.post('/subscribe', asyncHandler(async (req, res) => {
  if (!config.pushEnabled) {
    return res.status(503).json({
      message: 'Web Push belum dikonfigurasi pada server.',
    });
  }

  const input = subscriptionSchema.parse(req.body);
  await pool.query(`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, last_used_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (endpoint) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        last_used_at = NOW()
  `, [req.user.id, input.endpoint, input.keys.p256dh, input.keys.auth]);

  await pool.query(`
    INSERT INTO reminder_deliveries (idea_id, reminder_at, channel, next_attempt_at)
    SELECT id, reminder_at, 'push', reminder_at
    FROM ideas
    WHERE owner_id = $1
      AND reminder_at IS NOT NULL
      AND reminder_at > NOW()
      AND status NOT IN ('done', 'archived')
    ON CONFLICT (idea_id, reminder_at, channel) DO NOTHING
  `, [req.user.id]);

  res.status(201).json({ ok: true });
}));

router.delete('/subscribe', asyncHandler(async (req, res) => {
  const input = unsubscribeSchema.parse(req.body);
  await pool.query(
    'DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2',
    [input.endpoint, req.user.id]
  );
  res.status(204).end();
}));

export default router;
