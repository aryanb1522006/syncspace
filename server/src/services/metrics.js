import { timingSafeEqual } from 'node:crypto';
import client from 'prom-client';
import { env } from '../config/env.js';

export const metricsRegistry = new client.Registry();
client.collectDefaultMetrics({ register: metricsRegistry, prefix: 'syncspace_' });

const requestDuration = new client.Histogram({
  name: 'syncspace_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [metricsRegistry],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
});

export function observeRequests(req, res, next) {
  const stop = requestDuration.startTimer();
  res.on('finish', () => {
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;
    stop({ method: req.method, route, status_code: String(res.statusCode) });
  });
  next();
}

const safeTokenMatch = (candidate, expected) => {
  if (!candidate || !expected) return false;
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
};

export function authorizeMetrics(req, res, next) {
  if (!env.metricsEnabled) return res.status(404).json({ error: { message: 'Route not found' } });
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !safeTokenMatch(token, env.metricsToken)) {
    return res.status(401).json({ error: { message: 'Metrics authentication required' } });
  }
  next();
}

export async function renderMetrics(req, res) {
  res.type(metricsRegistry.contentType).send(await metricsRegistry.metrics());
}
