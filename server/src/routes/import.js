import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';
import { asyncHandler } from '../errors.js';
import { syncReminderDeliveries } from '../services/reminders.js';

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!/\.(xlsx|xls)$/i.test(file.originalname)) {
      const error = new Error('File harus berformat .xlsx atau .xls.');
      error.status = 400;
      return cb(error);
    }
    return cb(null, true);
  },
});

const HEADER_ALIASES = {
  title: ['title', 'judul', 'nama ide', 'nama proyek'],
  category: ['category', 'kategori'],
  context: ['context', 'konteks', 'latar belakang', 'deskripsi', 'tren konteks di indonesia'],
  v1_features: ['v1_features', 'v1 features', 'fitur v1', 'fitur', 'fitur v1 yang diakomodir'],
  solution: ['solution', 'solusi', 'solusi yang dibereskan'],
  agency_prompt: [
    'agency_prompt',
    'agency prompt',
    'prompt agensi',
    'prompt',
    'prompt untuk agency',
    'prompt detail eksekusi',
  ],
  status: ['status'],
  reminder_at: ['reminder_at', 'reminder at', 'reminder', 'pengingat', 'tanggal pengingat', 'jadwal pengingat'],
};

const MULTI_VALUE_FIELDS = new Set(['agency_prompt']);

const STATUS_MAP = new Map([
  ['idea', 'idea'],
  ['ide', 'idea'],
  ['planned', 'planned'],
  ['rencana', 'planned'],
  ['direncanakan', 'planned'],
  ['in progress', 'in_progress'],
  ['proses', 'in_progress'],
  ['dikerjakan', 'in_progress'],
  ['sedang dikerjakan', 'in_progress'],
  ['done', 'done'],
  ['selesai', 'done'],
  ['archived', 'archived'],
  ['arsip', 'archived'],
  ['diarsipkan', 'archived'],
]);

const rowSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(80),
  context: z.string().max(10000),
  v1_features: z.string().max(10000),
  solution: z.string().max(10000),
  agency_prompt: z.string().max(10000),
  status: z.enum(['idea', 'planned', 'in_progress', 'done', 'archived']),
  reminder_at: z.string().datetime().nullable(),
});

const normalize = (value) => String(value ?? '')
  .normalize('NFKD')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const statusKey = (value) => normalize(value).replace(/_/g, ' ');

const aliases = new Map();
for (const [field, names] of Object.entries(HEADER_ALIASES)) {
  for (const name of names) {
    aliases.set(normalize(name), field);
  }
}

function mapHeaders(headers) {
  const mapped = {};
  for (const header of headers) {
    const field = aliases.get(normalize(header));
    if (!field) continue;
    if (MULTI_VALUE_FIELDS.has(field)) {
      mapped[field] = [...(mapped[field] ?? []), header];
    } else if (!mapped[field]) {
      mapped[field] = header;
    }
  }
  return mapped;
}

const asText = (value) => String(value ?? '').trim();

const readField = (row, headers) => {
  if (!headers) return '';
  if (Array.isArray(headers)) {
    return headers.map((header) => asText(row[header])).filter(Boolean).join('\n\n');
  }
  return asText(row[headers]);
};
const pad = (value) => String(value).padStart(2, '0');

function parseDate(value) {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value === 'number') {
    const parts = XLSX.SSF.parse_date_code(value);
    if (!parts) return null;
    const iso = `${parts.y}-${pad(parts.m)}-${pad(parts.d)}T${pad(parts.H)}:${pad(parts.M)}:${pad(Math.floor(parts.S))}+07:00`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const text = String(value).trim();
  const local = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (local) {
    const iso = `${local[3]}-${pad(local[2])}-${pad(local[1])}T${pad(local[4] || 0)}:${pad(local[5] || 0)}:00+07:00`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const isoLike = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/);
  if (isoLike) {
    const date = new Date(`${isoLike[1]}-${isoLike[2]}-${isoLike[3]}T${isoLike[4] ?? '00'}:${isoLike[5] ?? '00'}:00+07:00`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

router.post('/ideas', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'File wajib diunggah pada field "file".' });
  }

  let workbook;
  try {
    workbook = XLSX.read(req.file.buffer, {
      type: 'buffer',
      cellDates: true,
      sheetRows: 5002,
    });
  } catch {
    return res.status(400).json({ message: 'File spreadsheet tidak dapat dibaca.' });
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    return res.status(400).json({ message: 'Spreadsheet tidak memiliki sheet data.' });
  }

  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
  const headerIndex = matrix
    .slice(0, 50)
    .findIndex((cells) => Boolean(mapHeaders(cells.map(asText)).title));

  if (headerIndex === -1) {
    const detected = (matrix.find((cells) => cells.some((cell) => asText(cell) !== '')) ?? [])
      .map(asText)
      .filter(Boolean);

    return res.status(400).json({
      message: `Kolom "title" atau "judul" tidak ditemukan. Header terbaca: ${detected.length ? detected.join(' | ') : '(kosong)'}.`,
      detectedHeaders: detected,
      acceptedHeaders: HEADER_ALIASES,
    });
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true, range: headerIndex });
  if (rows.length === 0) {
    return res.status(400).json({ message: 'Spreadsheet kosong.' });
  }
  if (rows.length > 5000) {
    return res.status(413).json({ message: 'Maksimal 5.000 baris data per import.' });
  }

  const mapped = mapHeaders(Object.keys(rows[0]));

  const errors = [];
  const warnings = [];
  const validRows = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const rawStatus = mapped.status ? row[mapped.status] : '';
    const rawReminder = mapped.reminder_at ? row[mapped.reminder_at] : '';
    const parsedDate = parseDate(rawReminder);

    if (rawReminder !== '' && rawReminder !== null && rawReminder !== undefined && !parsedDate) {
      warnings.push({
        row: rowNumber,
        message: 'Tanggal pengingat tidak valid; reminder dikosongkan.',
      });
    }

    if (rawStatus && !STATUS_MAP.has(statusKey(rawStatus))) {
      warnings.push({
        row: rowNumber,
        message: `Status "${asText(rawStatus)}" tidak dikenali; menggunakan "idea".`,
      });
    }

    try {
      const parsed = rowSchema.parse({
        title: readField(row, mapped.title),
        category: readField(row, mapped.category) || 'Lainnya',
        context: readField(row, mapped.context),
        v1_features: readField(row, mapped.v1_features),
        solution: readField(row, mapped.solution),
        agency_prompt: readField(row, mapped.agency_prompt),
        status: STATUS_MAP.get(statusKey(rawStatus)) ?? 'idea',
        reminder_at: parsedDate,
      });
      validRows.push(parsed);
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: error.issues?.map((issue) => issue.message).join('; ') || 'Baris tidak valid.',
      });
    }
  });

  let inserted = 0;
  let skipped = 0;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT lower(title) AS title, category FROM ideas');
    const existingKeys = new Set(
      existing.rows.map((row) => `${row.title}\u0000${row.category}`)
    );

    for (const idea of validRows) {
      const key = `${idea.title.toLowerCase()}\u0000${idea.category}`;
      if (existingKeys.has(key)) {
        skipped += 1;
        continue;
      }

      const result = await client.query(
        `INSERT INTO ideas
          (title, category, context, v1_features, solution, agency_prompt, status, reminder_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          idea.title,
          idea.category,
          idea.context,
          idea.v1_features,
          idea.solution,
          idea.agency_prompt,
          idea.status,
          idea.reminder_at,
        ]
      );

      await syncReminderDeliveries(client, result.rows[0]);
      existingKeys.add(key);
      inserted += 1;
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  res.json({
    inserted,
    skipped,
    invalid: errors.length,
    errors: errors.slice(0, 20),
    warnings: warnings.slice(0, 20),
  });
}));

export default router;
