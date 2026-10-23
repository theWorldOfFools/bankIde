import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';
import { asyncHandler } from '../errors.js';
import { generateRecommendations } from '../services/recommendationEngine.js';

const router = Router();
router.use(requireAuth);

const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Batas generate rekomendasi tercapai. Coba lagi nanti.' },
});

const generateSchema = z.object({
  category: z.string().trim().min(2).max(80),
  count: z.coerce.number().int().min(1).max(8).optional().default(4),
  context: z.string().trim().max(1000).optional().default(''),
});

const listSchema = z.object({
  category: z.string().trim().max(80).optional().default(''),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

router.get('/', asyncHandler(async (req, res) => {
  const input = listSchema.parse(req.query);
  const params = [];
  let where = '';

  if (input.category) {
    params.push(input.category);
    where = 'WHERE category = $1';
  }
  params.push(input.limit);

  const { rows } = await pool.query(`
    SELECT id, title, category, description,
           potential_score AS "potentialScore", source,
           created_at AS "createdAt"
    FROM recommended_ideas
    ${where}
    ORDER BY potential_score DESC, created_at DESC
    LIMIT $${params.length}
  `, params);

  res.json({ items: rows });
}));

router.post('/generate', generateLimiter, asyncHandler(async (req, res) => {
  const input = generateSchema.parse(req.body);
  const result = await generateRecommendations(input);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    for (const idea of result.ideas) {
      await client.query(`
        INSERT INTO recommended_ideas
          (title, category, description, potential_score, source)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (lower(title), category) DO NOTHING
      `, [
        idea.title,
        input.category,
        idea.description,
        idea.potential_score,
        result.source,
      ]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const { rows } = await pool.query(`
    SELECT id, title, category, description,
           potential_score AS "potentialScore", source,
           created_at AS "createdAt"
    FROM recommended_ideas
    WHERE category = $1
    ORDER BY potential_score DESC, created_at DESC
    LIMIT $2
  `, [input.category, input.count]);

  res.json({
    source: result.source,
    warning: result.warning,
    items: rows,
  });
}));

export default router;
