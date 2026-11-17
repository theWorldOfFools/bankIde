import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';
import { HttpError, asyncHandler } from '../errors.js';

const router = Router({ mergeParams: true });
router.use(requireAuth);

const TASK_STATUSES = ['todo', 'in_progress', 'done'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const isCalendarDate = (value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus berformat YYYY-MM-DD.')
  .refine(isCalendarDate, 'Tanggal tidak valid.');

const wibDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const todayWib = () => {
  const parts = wibDateFormatter.formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

const parseId = (value, label = 'ID') => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, `${label} tidak valid.`);
  }
  return id;
};

const safeMimeType = (value) => (
  /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i.test(String(value || ''))
    ? value
    : 'application/octet-stream'
);

const stripControlCharacters = (value) => Array.from(value)
  .map((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127 ? '_' : character;
  })
  .join('');

const safeFileName = (value) => {
  const base = stripControlCharacters(String(value || 'lampiran'))
    .replace(/^.*[\\/]/, '')
    .replace(/"/g, '_')
    .trim();
  return (base || 'lampiran').slice(0, 180);
};

const mapChecklistItem = (row) => ({
  id: Number(row.id),
  label: row.label,
  sortOrder: row.sort_order,
  isDone: Boolean(row.is_done),
  createdAt: row.created_at,
});

const mapTask = (row) => ({
  id: Number(row.id),
  title: row.title,
  status: row.status,
  notes: row.notes,
  workedOn: row.worked_on,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapAttachment = (row) => ({
  id: Number(row.id),
  fileName: row.file_name,
  mimeType: row.mime_type,
  sizeBytes: Number(row.size_bytes),
  taskId: row.task_id ? Number(row.task_id) : null,
  createdAt: row.created_at,
});

async function loadIdea(req) {
  const ideaId = parseId(req.params.ideaId, 'ID ide');
  const isAdmin = req.user.role === 'admin';
  const params = [ideaId];
  let ownerClause = '';

  if (!isAdmin) {
    params.push(req.user.id);
    ownerClause = ' AND owner_id = $2';
  }

  const { rows } = await pool.query(
    `SELECT id, title, demo_url FROM ideas WHERE id = $1${ownerClause}`,
    params
  );

  if (!rows[0]) throw new HttpError(404, 'Ide tidak ditemukan.');

  return {
    id: Number(rows[0].id),
    title: rows[0].title,
    demoUrl: rows[0].demo_url,
  };
}

async function getDayId(ideaId, date) {
  const { rows } = await pool.query(
    `INSERT INTO monitoring_days (idea_id, log_date)
     VALUES ($1, $2)
     ON CONFLICT (idea_id, log_date)
     DO UPDATE SET log_date = monitoring_days.log_date
     RETURNING id`,
    [ideaId, date]
  );
  return Number(rows[0].id);
}

router.get('/', asyncHandler(async (req, res) => {
  const input = z.object({ date: dateSchema.optional() }).strict().parse(req.query);
  const idea = await loadIdea(req);
  const date = input.date || todayWib();

  const [checklistResult, dayResult, tasksResult, attachmentsResult] = await Promise.all([
    pool.query(
      `SELECT ci.id, ci.label, ci.sort_order, ci.created_at,
              COALESCE(cc.is_done, FALSE) AS is_done
       FROM monitoring_checklist_items ci
       LEFT JOIN monitoring_checklist_checks cc
         ON cc.item_id = ci.id AND cc.log_date = $2
       WHERE ci.idea_id = $1 AND ci.archived_at IS NULL
       ORDER BY ci.sort_order ASC, ci.id ASC`,
      [idea.id, date]
    ),
    pool.query(
      `SELECT id, to_char(log_date, 'YYYY-MM-DD') AS log_date, notes, blockers
       FROM monitoring_days
       WHERE idea_id = $1 AND log_date = $2`,
      [idea.id, date]
    ),
    pool.query(
      `SELECT id, title, status, notes,
              to_char(worked_on, 'YYYY-MM-DD') AS worked_on,
              created_at, updated_at
       FROM monitoring_tasks
       WHERE idea_id = $1
       ORDER BY CASE status
                  WHEN 'in_progress' THEN 0
                  WHEN 'todo' THEN 1
                  ELSE 2
                END,
                created_at DESC, id DESC`,
      [idea.id]
    ),
    pool.query(
      `SELECT a.id, a.file_name, a.mime_type, a.size_bytes, a.task_id, a.created_at
       FROM monitoring_attachments a
       JOIN monitoring_days d ON d.id = a.day_id
       WHERE a.idea_id = $1 AND d.log_date = $2
       ORDER BY a.created_at DESC, a.id DESC`,
      [idea.id, date]
    ),
  ]);

  res.json({
    date,
    idea,
    checklist: checklistResult.rows.map(mapChecklistItem),
    day: dayResult.rows[0]
      ? {
        id: Number(dayResult.rows[0].id),
        date: dayResult.rows[0].log_date,
        notes: dayResult.rows[0].notes,
        blockers: dayResult.rows[0].blockers,
      }
      : null,
    tasks: tasksResult.rows.map(mapTask),
    attachments: attachmentsResult.rows.map(mapAttachment),
  });
}));

router.post('/checklist', asyncHandler(async (req, res) => {
  const input = z.object({
    label: z.string().trim().min(1, 'Label checklist wajib diisi.').max(200),
  }).strict().parse(req.body);
  const idea = await loadIdea(req);

  const { rows } = await pool.query(
    `INSERT INTO monitoring_checklist_items (idea_id, label, sort_order)
     SELECT $1, $2, COALESCE(MAX(sort_order), 0) + 1
     FROM monitoring_checklist_items
     WHERE idea_id = $1
     RETURNING id, label, sort_order, created_at`,
    [idea.id, input.label]
  );

  res.status(201).json(mapChecklistItem({ ...rows[0], is_done: false }));
}));

router.patch('/checklist/:itemId', asyncHandler(async (req, res) => {
  const itemId = parseId(req.params.itemId, 'ID checklist');
  const input = z.object({
    label: z.string().trim().min(1, 'Label checklist wajib diisi.').max(200),
  }).strict().parse(req.body);
  const idea = await loadIdea(req);

  const { rows } = await pool.query(
    `UPDATE monitoring_checklist_items
     SET label = $1
     WHERE id = $2 AND idea_id = $3
     RETURNING id, label, sort_order, created_at`,
    [input.label, itemId, idea.id]
  );

  if (!rows[0]) throw new HttpError(404, 'Item checklist tidak ditemukan.');
  res.json(mapChecklistItem({ ...rows[0], is_done: false }));
}));

router.delete('/checklist/:itemId', asyncHandler(async (req, res) => {
  const itemId = parseId(req.params.itemId, 'ID checklist');
  const idea = await loadIdea(req);

  const { rowCount } = await pool.query(
    `DELETE FROM monitoring_checklist_items WHERE id = $1 AND idea_id = $2`,
    [itemId, idea.id]
  );

  if (!rowCount) throw new HttpError(404, 'Item checklist tidak ditemukan.');
  res.status(204).end();
}));

router.put('/checklist/:itemId/check', asyncHandler(async (req, res) => {
  const itemId = parseId(req.params.itemId, 'ID checklist');
  const input = z.object({
    date: dateSchema,
    done: z.boolean(),
  }).strict().parse(req.body);
  const idea = await loadIdea(req);

  const item = await pool.query(
    'SELECT id FROM monitoring_checklist_items WHERE id = $1 AND idea_id = $2',
    [itemId, idea.id]
  );
  if (!item.rows[0]) throw new HttpError(404, 'Item checklist tidak ditemukan.');

  const { rows } = await pool.query(
    `INSERT INTO monitoring_checklist_checks (item_id, log_date, is_done)
     VALUES ($1, $2, $3)
     ON CONFLICT (item_id, log_date)
     DO UPDATE SET is_done = EXCLUDED.is_done, updated_at = NOW()
     RETURNING item_id, to_char(log_date, 'YYYY-MM-DD') AS log_date, is_done`,
    [itemId, input.date, input.done]
  );

  res.json({
    itemId: Number(rows[0].item_id),
    date: rows[0].log_date,
    isDone: rows[0].is_done,
  });
}));

router.put('/day', asyncHandler(async (req, res) => {
  const input = z.object({
    date: dateSchema,
    notes: z.string().max(10000).optional(),
    blockers: z.string().max(10000).optional(),
  }).strict().parse(req.body);
  const idea = await loadIdea(req);

  const { rows } = await pool.query(
    `INSERT INTO monitoring_days (idea_id, log_date, notes, blockers)
     VALUES ($1, $2, COALESCE($3, ''), COALESCE($4, ''))
     ON CONFLICT (idea_id, log_date)
     DO UPDATE SET
       notes = COALESCE($3, monitoring_days.notes),
       blockers = COALESCE($4, monitoring_days.blockers)
     RETURNING id, to_char(log_date, 'YYYY-MM-DD') AS log_date, notes, blockers`,
    [idea.id, input.date, input.notes ?? null, input.blockers ?? null]
  );

  res.json({
    id: Number(rows[0].id),
    date: rows[0].log_date,
    notes: rows[0].notes,
    blockers: rows[0].blockers,
  });
}));

router.post('/tasks', asyncHandler(async (req, res) => {
  const input = z.object({
    title: z.string().trim().min(1, 'Judul task wajib diisi.').max(200),
    status: z.enum(TASK_STATUSES).optional().default('todo'),
    notes: z.string().max(10000).optional().default(''),
    workedOn: dateSchema.nullable().optional().default(null),
  }).strict().parse(req.body);
  const idea = await loadIdea(req);

  const { rows } = await pool.query(
    `INSERT INTO monitoring_tasks (idea_id, title, status, notes, worked_on)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, status, notes,
               to_char(worked_on, 'YYYY-MM-DD') AS worked_on,
               created_at, updated_at`,
    [idea.id, input.title, input.status, input.notes, input.workedOn]
  );

  res.status(201).json(mapTask(rows[0]));
}));

router.patch('/tasks/:taskId', asyncHandler(async (req, res) => {
  const taskId = parseId(req.params.taskId, 'ID task');
  const input = z.object({
    title: z.string().trim().min(1, 'Judul task wajib diisi.').max(200).optional(),
    status: z.enum(TASK_STATUSES).optional(),
    notes: z.string().max(10000).optional(),
    workedOn: dateSchema.nullable().optional(),
  }).strict().parse(req.body);
  const idea = await loadIdea(req);

  const fieldMap = {
    title: 'title',
    status: 'status',
    notes: 'notes',
    workedOn: 'worked_on',
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

  values.push(taskId, idea.id);
  const taskIndex = values.length - 1;
  const ideaIndex = values.length;

  const { rows } = await pool.query(
    `UPDATE monitoring_tasks
     SET ${assignments.join(', ')}
     WHERE id = $${taskIndex} AND idea_id = $${ideaIndex}
     RETURNING id, title, status, notes,
               to_char(worked_on, 'YYYY-MM-DD') AS worked_on,
               created_at, updated_at`,
    values
  );

  if (!rows[0]) throw new HttpError(404, 'Task tidak ditemukan.');
  res.json(mapTask(rows[0]));
}));

router.delete('/tasks/:taskId', asyncHandler(async (req, res) => {
  const taskId = parseId(req.params.taskId, 'ID task');
  const idea = await loadIdea(req);

  const { rowCount } = await pool.query(
    'DELETE FROM monitoring_tasks WHERE id = $1 AND idea_id = $2',
    [taskId, idea.id]
  );

  if (!rowCount) throw new HttpError(404, 'Task tidak ditemukan.');
  res.status(204).end();
}));

router.post('/attachments', upload.single('file'), asyncHandler(async (req, res) => {
  const idea = await loadIdea(req);

  if (!req.file || !req.file.size) {
    throw new HttpError(400, 'File wajib diunggah pada field "file".');
  }

  const input = z.object({
    date: dateSchema.optional(),
    taskId: z.coerce.number().int().positive().optional(),
  }).strict().parse(req.body);
  const date = input.date || todayWib();

  if (input.taskId) {
    const task = await pool.query(
      'SELECT id FROM monitoring_tasks WHERE id = $1 AND idea_id = $2',
      [input.taskId, idea.id]
    );
    if (!task.rows[0]) throw new HttpError(404, 'Task tidak ditemukan.');
  }

  const dayId = await getDayId(idea.id, date);
  const { rows } = await pool.query(
    `INSERT INTO monitoring_attachments
      (idea_id, day_id, task_id, file_name, mime_type, size_bytes, data, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, file_name, mime_type, size_bytes, task_id, created_at`,
    [
      idea.id,
      dayId,
      input.taskId || null,
      safeFileName(req.file.originalname),
      safeMimeType(req.file.mimetype),
      req.file.size,
      req.file.buffer,
      req.user.id,
    ]
  );

  res.status(201).json(mapAttachment(rows[0]));
}));

router.get('/attachments/:attachmentId', asyncHandler(async (req, res) => {
  const attachmentId = parseId(req.params.attachmentId, 'ID lampiran');
  const idea = await loadIdea(req);

  const { rows } = await pool.query(
    `SELECT file_name, mime_type, size_bytes, data
     FROM monitoring_attachments
     WHERE id = $1 AND idea_id = $2`,
    [attachmentId, idea.id]
  );

  const attachment = rows[0];
  if (!attachment) throw new HttpError(404, 'Lampiran tidak ditemukan.');

  const inlineTypes = new Set([
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'application/pdf',
  ]);
  const mimeType = safeMimeType(attachment.mime_type);
  const disposition = inlineTypes.has(mimeType) ? 'inline' : 'attachment';
  const fallbackName = attachment.file_name
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\]/g, '_');

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Length', attachment.size_bytes);
  res.setHeader('Content-Disposition', `${disposition}; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(attachment.file_name).replace(/'/g, '%27')}`);
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.send(attachment.data);
}));

router.delete('/attachments/:attachmentId', asyncHandler(async (req, res) => {
  const attachmentId = parseId(req.params.attachmentId, 'ID lampiran');
  const idea = await loadIdea(req);

  const { rowCount } = await pool.query(
    'DELETE FROM monitoring_attachments WHERE id = $1 AND idea_id = $2',
    [attachmentId, idea.id]
  );

  if (!rowCount) throw new HttpError(404, 'Lampiran tidak ditemukan.');
  res.status(204).end();
}));

export default router;
