import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';
import { asyncHandler } from '../errors.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const ownerId = req.user.role === 'admin' ? null : req.user.id;
  const scoped = `
    WITH scoped AS (
      SELECT * FROM ideas
      WHERE $1::bigint IS NULL OR owner_id = $1
    )
  `;

  const [statsResult, categoriesResult, statusesResult, remindersResult, recentResult, recommendationResult] = await Promise.all([
    pool.query(`
      ${scoped}
      SELECT
        (SELECT count(*)::int FROM scoped) AS "totalIdeas",
        (SELECT count(*)::int FROM scoped WHERE status IN ('planned', 'in_progress')) AS "activeProjects",
        (SELECT count(*)::int FROM scoped
          WHERE reminder_at IS NOT NULL AND status NOT IN ('done', 'archived')) AS "activeReminders",
        (SELECT category FROM scoped
          GROUP BY category
          ORDER BY count(*) DESC, category ASC
          LIMIT 1) AS "topCategory"
    `, [ownerId]),
    pool.query(`
      ${scoped}
      SELECT category, count(*)::int AS count
      FROM scoped
      GROUP BY category
      ORDER BY count DESC, category ASC
      LIMIT 6
    `, [ownerId]),
    pool.query(`
      ${scoped}
      SELECT status, count(*)::int AS count
      FROM scoped
      GROUP BY status
    `, [ownerId]),
    pool.query(`
      ${scoped}
      SELECT id, title, category, status, reminder_at AS "reminderAt"
      FROM scoped
      WHERE reminder_at IS NOT NULL AND status NOT IN ('done', 'archived')
      ORDER BY reminder_at ASC
      LIMIT 6
    `, [ownerId]),
    pool.query(`
      ${scoped}
      SELECT id, title, category, status, created_at AS "createdAt"
      FROM scoped
      ORDER BY created_at DESC, id DESC
      LIMIT 5
    `, [ownerId]),
    pool.query(`
      SELECT id, title, category, description, potential_score AS "potentialScore"
      FROM recommended_ideas
      ORDER BY created_at DESC, potential_score DESC
      LIMIT 3
    `),
  ]);

  res.json({
    stats: statsResult.rows[0],
    categories: categoriesResult.rows,
    statuses: statusesResult.rows,
    reminders: remindersResult.rows,
    recentIdeas: recentResult.rows,
    recommendations: recommendationResult.rows,
  });
}));

export default router;
