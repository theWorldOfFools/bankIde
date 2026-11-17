import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { asyncHandler } from '../errors.js';
import { buildInsightReport } from '../services/insightEngine.js';

const router = Router();
router.use(requireAuth);

const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Batas analisis AI tercapai. Coba lagi nanti.' },
});

const periodSchema = z.coerce.number()
  .int()
  .refine((value) => [7, 30, 90].includes(value), 'Periode harus 7, 30, atau 90 hari.')
  .optional()
  .default(30);

router.get('/', asyncHandler(async (req, res) => {
  const period = periodSchema.parse(req.query.period);
  const report = await buildInsightReport({
    ownerId: req.user.id,
    periodDays: period,
    useAi: false,
  });
  res.json(report);
}));

router.post('/analyze', analyzeLimiter, asyncHandler(async (req, res) => {
  const input = z.object({ period: periodSchema }).strict().parse(req.body);
  const report = await buildInsightReport({
    ownerId: req.user.id,
    periodDays: input.period,
    useAi: true,
  });
  res.json(report);
}));

export default router;
