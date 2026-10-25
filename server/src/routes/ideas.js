import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';
import { HttpError, asyncHandler } from '../errors.js';
import { syncReminderDeliveries } from '../services/reminders.js';

const router = Router();
router.use(requireAuth);

const STATUSES = ['idea', 'planned', 'in_progress', 'done', 'archived'];

const ideaSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(80),
  context: z.string().max(10000).optional().default(''),
  v1Features: z.string().max(10000).optional().default(''),
  solution: z.string().max(10000).optional().default(''),
  agencyPrompt: z.string().max(10000).optional().default(''),
  status: z.enum(STATUSES).optional().default('idea'),
  reminderAt: z.string().datetime({ offset: true }).nullable().optional().default(null),
}).strict();

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  context: z.string().max(10000).optional(),
  v1Features: z.string().max(10000).optional(),
  solution: z.string().max(10000).optional(),
  agencyPrompt: z.string().max(10000).optional(),
  status: z.enum(STATUSES).optional(),
  reminderAt: z.string().datetime({ offset: true }).nullable().optional(),
}).strict();

const listSchema = z.object({
  search: z.string().trim().max(200).optional().default(''),
  category: z.string().trim().max(80).optional().default(''),
  status: z.enum([...STATUSES, '']).optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
  sort: z.enum(['created_at', 'updated_at', 'title', 'reminder_at']).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

const mapIdea = (row) => ({
  id: Number(row.id),
  ownerId: row.owner_id ? Number(row.owner_id) : null,
  ownerEmail: row.owner_email ?? null,
  title: row.title,
  category: row.category,
  context: row.context,
  v1Features: row.v1_features,
  solution: row.solution,
  agencyPrompt: row.agency_prompt,
  status: row.status,
  reminderAt: row.reminder_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const parseId = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 'ID ide tidak valid.');
  }
  return id;
};

router.get('/categories', asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const { rows } = await pool.query(
    `SELECT DISTINCT category FROM ideas
     ${isAdmin ? '' : 'WHERE owner_id = $1'}
     ORDER BY category ASC`,
    isAdmin ? [] : [req.user.id]
  );
  res.json({ items: rows.map((row) => row.category) });
}));

router.get('/', asyncHandler(async (req, res) => {
  const input = listSchema.parse(req.query);
  const conditions = [];
  const params = [];

  if (req.user.role !== 'admin') {
    params.push(req.user.id);
    conditions.push(`i.owner_id = $${params.length}`);
  }
  if (input.search) {
    params.push(`%${input.search}%`);
    conditions.push(
      `(i.title || ' ' || i.category || ' ' || i.context || ' ' || i.v1_features || ' ' || i.solution) ILIKE $${params.length}`
    );
  }
  if (input.category) {
    params.push(input.category);
    conditions.push(`i.category = $${params.length}`);
  }
  if (input.status) {
    params.push(input.status);
    conditions.push(`i.status::text = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (input.page - 1) * input.limit;
  const countParams = [...params];

  params.push(input.limit, offset);
  const limitIndex = params.length - 1;
  const offsetIndex = params.length;

  const [itemsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT i.*, u.email AS owner_email
       FROM ideas i
       LEFT JOIN users u ON u.id = i.owner_id
       ${where}
       ORDER BY i.${input.sort} ${input.order.toUpperCase()}, i.id DESC
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      params
    ),
    pool.query(
      `SELECT count(*)::int AS total FROM ideas i ${where}`,
      countParams
    ),
  ]);

  const total = countResult.rows[0]?.total || 0;
  res.json({
    items: itemsResult.rows.map(mapIdea),
    meta: {
      page: input.page,
      pageSize: input.limit,
      total,
      totalPages: Math.ceil(total / input.limit),
    },
  });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const isAdmin = req.user.role === 'admin';
  const { rows } = await pool.query(
    `SELECT i.*, u.email AS owner_email
     FROM ideas i
     LEFT JOIN users u ON u.id = i.owner_id
     WHERE i.id = $1 ${isAdmin ? '' : 'AND i.owner_id = $2'}`,
    isAdmin ? [id] : [id, req.user.id]
  );
  if (!rows[0]) throw new HttpError(404, 'Ide tidak ditemukan.');
  res.json(mapIdea(rows[0]));
}));

router.post('/', asyncHandler(async (req, res) => {
  const input = ideaSchema.parse(req.body);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO ideas
        (owner_id, title, category, context, v1_features, solution, agency_prompt, status, reminder_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        req.user.id,
        input.title,
        input.category,
        input.context,
        input.v1Features,
        input.solution,
        input.agencyPrompt,
        input.status,
        input.reminderAt,
      ]
    );
    await syncReminderDeliveries(client, rows[0]);
    await client.query('COMMIT');
    res.status(201).json(mapIdea(rows[0]));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const input = updateSchema.parse(req.body);
  const fieldMap = {
    title: 'title',
    category: 'category',
    context: 'context',
    v1Features: 'v1_features',
    solution: 'solution',
    agencyPrompt: 'agency_prompt',
    status: 'status',
    reminderAt: 'reminder_at',
  };

  const assignments = [];
  const values = [];
  for (const [apiKey, column] of Object.entries(fieldMap)) {
    if (Object.prototype.hasOwnProperty.call(input, apiKey)) {
      values.push(input[apiKey]);
      assignments.push(`${column} = $${values.length}`);
    }
  }

  if (assignments.length === 0) {
    throw new HttpError(400, 'Tidak ada perubahan yang dikirim.');
  }

  values.push(id);
  const idIndex = values.length;
  let ownerClause = '';
  if (req.user.role !== 'admin') {
    values.push(req.user.id);
    ownerClause = ` AND owner_id = $${values.length}`;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE ideas SET ${assignments.join(', ')}
       WHERE id = $${idIndex}${ownerClause}
       RETURNING *`,
      values
    );

    if (!rows[0]) throw new HttpError(404, 'Ide tidak ditemukan.');
    await syncReminderDeliveries(client, rows[0]);
    await client.query('COMMIT');
    res.json(mapIdea(rows[0]));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const isAdmin = req.user.role === 'admin';
  const { rowCount } = await pool.query(
    `DELETE FROM ideas WHERE id = $1 ${isAdmin ? '' : 'AND owner_id = $2'}`,
    isAdmin ? [id] : [id, req.user.id]
  );
  if (!rowCount) throw new HttpError(404, 'Ide tidak ditemukan.');
  res.status(204).end();
}));

export default router;
