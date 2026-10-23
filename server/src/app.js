import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import authRouter from './routes/auth.js';
import ideasRouter from './routes/ideas.js';
import importRouter from './routes/import.js';
import dashboardRouter from './routes/dashboard.js';
import recommendationsRouter from './routes/recommendations.js';
import pushRouter from './routes/push.js';
import { errorHandler, notFound } from './errors.js';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    emailReminders: config.emailEnabled,
    pushReminders: config.pushEnabled,
    aiRecommendations: config.aiEnabled,
  });
});

app.use('/api/auth', authRouter);
app.use('/api/ideas', ideasRouter);
app.use('/api/import', importRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/push', pushRouter);
app.use('/api', notFound);

const indexFile = path.join(config.clientDist, 'index.html');
if (fs.existsSync(indexFile)) {
  app.use('/assets', express.static(path.join(config.clientDist, 'assets'), {
    immutable: true,
    maxAge: '1y',
  }));
  app.use(express.static(config.clientDist, { index: false }));
  app.get('*', (req, res, next) => {
    if (req.path.includes('.')) return next();
    res.set('Cache-Control', 'no-cache');
    return res.sendFile(indexFile);
  });
}

app.use((req, res) => {
  res.status(404).json({ message: 'Halaman tidak ditemukan.' });
});

app.use(errorHandler);
