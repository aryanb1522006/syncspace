import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import path from 'node:path';
import { query } from './config/db.js';
import { env } from './config/env.js';
import { requestLogger } from './config/logger.js';
import authRoutes from './routes/auth.js';
import applicationRoutes from './routes/applications.js';
import notificationRoutes from './routes/notifications.js';
import projectRoutes from './routes/projects.js';
import recommendationRoutes from './routes/recommendations.js';
import studentRoutes from './routes/students.js';
import taskRoutes from './routes/tasks.js';
import teamRoutes from './routes/teams.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { authorizeMetrics, observeRequests, renderMetrics } from './services/metrics.js';
import { AppError } from './utils/AppError.js';

export const app = express();

app.disable('x-powered-by');
if (env.trustProxy) app.set('trust proxy', 1);
app.use(requestLogger);
app.use(observeRequests);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.clientOrigins.includes(origin)) return callback(null, true);
    callback(new AppError(403, 'Origin is not allowed by CORS'));
  },
  credentials: false
}));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.resolve(process.cwd(), env.uploadDir)));

const globalLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/health')
});
const authLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.authRateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});

app.use('/api', globalLimiter);
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'syncspace-api' }));
app.get('/api/health/live', (req, res) => res.json({ status: 'ok' }));
app.get('/api/health/ready', async (req, res, next) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ready', database: 'connected' });
  } catch (error) {
    req.log?.warn({ err: error }, 'Readiness check failed');
    res.status(503).json({ status: 'not_ready', database: 'unavailable' });
  }
});
app.get('/api/metrics', authorizeMetrics, renderMetrics);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);
