import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin, requireAuth } from '../auth.js';
import { asyncHandler } from '../errors.js';
import {
  getPublicAiSettings,
  resetAiSettings,
  saveAiSettings,
  testAiConnection,
} from '../services/aiConfig.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const baseUrlSchema = z.string()
  .trim()
  .max(500, 'Base URL maksimal 500 karakter.')
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname);
    } catch {
      return false;
    }
  }, 'Base URL harus berupa URL http:// atau https:// yang valid.');

const saveSchema = z.object({
  enabled: z.boolean().optional().default(true),
  apiKey: z.string().trim().max(1000, 'API key terlalu panjang.').optional().default(''),
  clearApiKey: z.boolean().optional().default(false),
  baseUrl: baseUrlSchema.optional().default(''),
  model: z.string().trim().max(200, 'Model maksimal 200 karakter.').optional().default(''),
  timeoutMs: z.coerce.number()
    .int('Timeout harus berupa angka bulat.')
    .min(1000, 'Timeout minimal 1000 ms.')
    .max(120000, 'Timeout maksimal 120000 ms.')
    .optional()
    .default(20000),
}).strict();

const testSchema = z.object({
  apiKey: z.string().trim().max(1000, 'API key terlalu panjang.').optional().default(''),
  baseUrl: baseUrlSchema.optional().default(''),
  model: z.string().trim().max(200, 'Model maksimal 200 karakter.').optional().default(''),
  timeoutMs: z.coerce.number()
    .int('Timeout harus berupa angka bulat.')
    .min(1000, 'Timeout minimal 1000 ms.')
    .max(120000, 'Timeout maksimal 120000 ms.')
    .optional(),
}).strict();

router.get('/', asyncHandler(async (req, res) => {
  res.json({ settings: await getPublicAiSettings() });
}));

router.put('/', asyncHandler(async (req, res) => {
  const input = saveSchema.parse(req.body);
  const settings = await saveAiSettings({
    ...input,
    userId: req.user.id,
  });
  res.json({ settings });
}));

router.post('/test', asyncHandler(async (req, res) => {
  const input = testSchema.parse(req.body);
  const result = await testAiConnection(input);
  res.json({ result });
}));

router.delete('/', asyncHandler(async (req, res) => {
  const settings = await resetAiSettings();
  res.json({ settings });
}));

export default router;
