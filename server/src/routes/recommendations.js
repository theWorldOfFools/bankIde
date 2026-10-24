import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';
import { HttpError, asyncHandler } from '../errors.js';
import { findCuratedIdea } from '../services/curatedIdeas.js';
import { enrichIdeaFields, generateRecommendations } from '../services/recommendationEngine.js';

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
           v1_features AS "v1Features", solution,
           agency_prompt AS "agencyPrompt",
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
          (title, category, description, v1_features, solution,
           agency_prompt, potential_score, source)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (lower(title), category) DO UPDATE SET
          description = EXCLUDED.description,
          v1_features = EXCLUDED.v1_features,
          solution = EXCLUDED.solution,
          agency_prompt = EXCLUDED.agency_prompt,
          potential_score = EXCLUDED.potential_score,
          source = EXCLUDED.source
      `, [
        idea.title,
        input.category,
        idea.description,
        idea.v1_features,
        idea.solution,
        idea.agency_prompt,
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
           v1_features AS "v1Features", solution,
           agency_prompt AS "agencyPrompt",
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

router.post('/:id/save', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 'ID rekomendasi tidak valid.');
  }

  const { rows } = await pool.query(
    'SELECT * FROM recommended_ideas WHERE id = $1',
    [id]
  );
  const item = rows[0];
  if (!item) throw new HttpError(404, 'Rekomendasi tidak ditemukan.');

  let v1Features = item.v1_features;
  let solution = item.solution;
  let agencyPrompt = item.agency_prompt;

  if (!v1Features || !solution || !agencyPrompt) {
    const curated = findCuratedIdea(item.title, item.category);
    if (curated) {
      v1Features ||= curated.v1_features;
      solution ||= curated.solution;
      agencyPrompt ||= curated.agency_prompt;
    }

    if (!v1Features || !solution || !agencyPrompt) {
      const enriched = await enrichIdeaFields({
        title: item.title,
        category: item.category,
        description: item.description,
      });
      if (enriched) {
        v1Features ||= enriched.v1_features;
        solution ||= enriched.solution;
        agencyPrompt ||= enriched.agency_prompt;
      }
    }

    if (v1Features || solution || agencyPrompt) {
      await pool.query(
        `UPDATE recommended_ideas
         SET v1_features = $1, solution = $2, agency_prompt = $3
         WHERE id = $4`,
        [v1Features, solution, agencyPrompt, id]
      );
    }
  }

  const { rows: ideaRows } = await pool.query(
    `INSERT INTO ideas
      (title, category, context, v1_features, solution, agency_prompt, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'idea')
     RETURNING *`,
    [item.title, item.category, item.description, v1Features, solution, agencyPrompt]
  );
  const idea = ideaRows[0];

  res.status(201).json({
    idea: {
      id: Number(idea.id),
      title: idea.title,
      category: idea.category,
      context: idea.context,
      v1Features: idea.v1_features,
      solution: idea.solution,
      agencyPrompt: idea.agency_prompt,
      status: idea.status,
    },
  });
}));

export default router;
